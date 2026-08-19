use crate::db::connect::establish_connection;
use crate::db::statistics_query;
use crate::models::general::AppState;
use crate::models::statistics::*;
use chrono::Local;
use std::sync::Mutex;
use tauri::State;

#[cfg(test)]
#[path = "./statistics_test.rs"]
mod statistics_test;

/// Calculate the local timezone offset in milliseconds at epoch
fn get_origin_ms_for_local_timezone() -> i64 {
    let now = Local::now();
    let offset = now.offset().local_minus_utc();

    // Calculate the ms timestamp of local midnight (00:00:00) on 1970-01-01
    // UTC epoch (1970-01-01 00:00:00 UTC) minus the local timezone offset
    (offset as i64) * 1000
}

/// Single public Tauri command for fetching statistics
#[tauri::command]
pub fn get_statistics(
    state: State<'_, Mutex<AppState>>,
    start_ms: i64,
    end_ms: i64,
    currency_id: i32,
    granularity: String,
    options: Option<StatisticsOptions>,
) -> Result<StatisticsResponse, String> {
    tracing::debug!(
        "Executing command get_statistics: start_ms={}, end_ms={}, currency_id={}, granularity={}",
        start_ms,
        end_ms,
        currency_id,
        granularity
    );

    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    // Validate inputs
    validate_statistics_input(start_ms, end_ms, &granularity, currency_id, &state)?;

    let opts = options.unwrap_or_default();
    let include_obligations = opts.include_obligations.unwrap_or(true);

    // Get now timestamp for obligations query
    let now_ms =
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()
            as i64;

    // Fetch overview (income, expenses)
    let (income, expenses) = statistics_query::overview(connection, start_ms, end_ms, currency_id)?;
    let net_cash_flow = income - expenses;
    let savings_rate = savings_rate(income, expenses);

    let overview = Overview { income, expenses, net_cash_flow, savings_rate };

    // Fetch time series
    let origin_ms = opts
        .origin_timezone_override
        .and_then(|_tz| Some(get_origin_ms_for_local_timezone()))
        .unwrap_or_else(get_origin_ms_for_local_timezone);

    let timeseries = statistics_query::timeseries_grouped(
        connection,
        start_ms,
        end_ms,
        currency_id,
        &granularity,
        origin_ms,
    )?;

    let balance_trend = statistics_query::balance_trend(
        connection,
        start_ms,
        end_ms,
        currency_id,
        &granularity,
        origin_ms,
    )?;

    // Fetch category aggregation
    let category_id = opts.category_id;
    let include_descendants = opts.include_descendants.unwrap_or(true);
    let (by_category_hierarchy, by_category_flat, total_expenses) =
        statistics_query::categories_aggregation(
            connection,
            start_ms,
            end_ms,
            currency_id,
            category_id,
            include_descendants,
        )?;

    let categories = Categories { total_expenses, by_category_hierarchy, by_category_flat };

    // Fetch obligations
    let obligations = if include_obligations {
        statistics_query::obligations(connection, now_ms, currency_id)?
    } else {
        Obligations {
            totals: ObligationTotals { next_7_days: 0.0, next_30_days: 0.0, next_90_days: 0.0 },
            items: Vec::new(),
        }
    };

    // Fetch secondary metrics
    let secondary = statistics_query::secondary_metrics(connection, start_ms, end_ms, currency_id)?;

    Ok(StatisticsResponse {
        currency_id,
        start_ms,
        end_ms,
        overview,
        timeseries,
        balance_trend,
        categories,
        obligations,
        secondary,
    })
}

fn savings_rate(income: f64, expenses: f64) -> Option<f64> {
    if income > 0.0 {
        Some(((income - expenses) / income) * 100.0)
    } else {
        None
    }
}

/// Validate inputs: date range, granularity, currency
fn validate_statistics_input(
    start_ms: i64,
    end_ms: i64,
    granularity: &str,
    currency_id: i32,
    state: &AppState,
) -> Result<(), String> {
    // Validate date range
    if start_ms >= end_ms {
        return Err("Invalid date range: start must be < end".to_string());
    }

    // Validate granularity
    if !["day", "week", "month", "year"].contains(&granularity) {
        return Err("Invalid granularity: allowed values are day, week, month, year".to_string());
    }

    // Validate currency exists
    let currency_exists = state.currencies.iter().any(|c| c.id == currency_id);
    if !currency_exists {
        return Err(format!("Invalid currency id: {}", currency_id));
    }

    Ok(())
}

impl Default for StatisticsOptions {
    fn default() -> Self {
        StatisticsOptions {
            category_id: None,
            include_descendants: Some(true),
            include_obligations: Some(true),
            origin_timezone_override: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_statistics_invalid_range() {
        let state = AppState::default();

        let result = validate_statistics_input(100, 100, "day", 1, &state);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid date range"));
    }

    #[test]
    fn test_validate_statistics_invalid_granularity() {
        let state = AppState::default();

        let result = validate_statistics_input(100, 200, "invalid", 1, &state);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid granularity"));
    }

    #[test]
    fn test_savings_rate_returns_null_when_income_is_zero() {
        assert_eq!(savings_rate(0.0, 100.0), None);
        assert_eq!(savings_rate(100.0, 25.0), Some(75.0));
    }

    #[test]
    fn test_validate_statistics_invalid_currency() {
        let mut state = AppState::default();
        state.currencies.push(crate::models::currencies::Currency {
            id: 1,
            name: "USD".to_string(),
            symbol: "$".to_string(),
            code: "USD".to_string(),
            conversion_rate: 1.1576,
            conversion_rate_date: Some("2026-08-18".to_string()),
        });

        let result = validate_statistics_input(100, 200, "day", 2, &state);
        assert_eq!(result.unwrap_err(), "Invalid currency id: 2");
    }
}
