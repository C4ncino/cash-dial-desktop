use crate::models::statistics::*;
use chrono::{Datelike, Duration, Local, TimeZone, Utc};
use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::{BigInt, Bool, Double, Integer, Nullable, Text};
use diesel::sqlite::SqliteConnection;
use std::collections::{HashMap, HashSet};

use crate::domain::date::DateError;
use crate::domain::statistics::StatisticsError;

type StatisticsResult<T> = Result<T, StatisticsError>;

const INCOME: i32 = 1;
const EXPENSE: i32 = 2;

#[derive(QueryableByName)]
struct AmountRow {
    #[diesel(sql_type = Nullable<Double>)]
    amount: Option<f64>,
}
#[derive(QueryableByName)]
struct SeriesRow {
    #[diesel(sql_type = BigInt)]
    bucket_start_ms: i64,
    #[diesel(sql_type = Nullable<Double>)]
    income: Option<f64>,
    #[diesel(sql_type = Nullable<Double>)]
    expense: Option<f64>,
}
#[derive(QueryableByName)]
struct BalanceMovementRow {
    #[diesel(sql_type = Integer)]
    type_id: i32,
    #[diesel(sql_type = Double)]
    original_amount: f64,
    #[diesel(sql_type = Double)]
    account_amount: f64,
    #[diesel(sql_type = BigInt)]
    timestamp: i64,
    #[diesel(sql_type = Integer)]
    source_currency_id: i32,
    #[diesel(sql_type = Integer)]
    source_account_type_id: i32,
    #[diesel(sql_type = Nullable<Integer>)]
    destination_currency_id: Option<i32>,
    #[diesel(sql_type = Nullable<Integer>)]
    destination_account_type_id: Option<i32>,
}
#[derive(QueryableByName)]
struct CategoryAmountRow {
    #[diesel(sql_type = Integer)]
    category_id: i32,
    #[diesel(sql_type = Nullable<Double>)]
    amount: Option<f64>,
}
#[derive(QueryableByName)]
struct CategoryRow {
    #[diesel(sql_type = Integer)]
    id: i32,
    #[diesel(sql_type = Text)]
    name: String,
    #[diesel(sql_type = Nullable<Integer>)]
    parent_id: Option<i32>,
}
#[derive(QueryableByName)]
struct ObligationRow {
    #[diesel(sql_type = Integer)]
    installment_id: i32,
    #[diesel(sql_type = Integer)]
    movement_id: i32,
    #[diesel(sql_type = Integer)]
    account_id: i32,
    #[diesel(sql_type = BigInt)]
    due_timestamp: i64,
    #[diesel(sql_type = Double)]
    amount: f64,
    #[diesel(sql_type = Bool)]
    paid: bool,
    #[diesel(sql_type = Nullable<Text>)]
    description: Option<String>,
    #[diesel(sql_type = Integer)]
    category_id: i32,
}
#[derive(QueryableByName)]
struct LargestRow {
    #[diesel(sql_type = Integer)]
    movement_id: i32,
    #[diesel(sql_type = Double)]
    amount: f64,
    #[diesel(sql_type = BigInt)]
    timestamp: i64,
}

pub fn overview(
    c: &mut SqliteConnection,
    start: i64,
    end: i64,
    currency: i32,
) -> StatisticsResult<(f64, f64)> {
    let row: AmountRow = sql_query("SELECT COALESCE(SUM(CASE WHEN type_id=1 THEN original_amount ELSE 0 END),0) AS amount FROM movements WHERE currency_id=? AND timestamp>=? AND timestamp<?")
        .bind::<Integer,_>(currency).bind::<BigInt,_>(start).bind::<BigInt,_>(end).get_result(c)?;
    let income = row.amount.unwrap_or(0.0);
    let row: AmountRow = sql_query("SELECT COALESCE(SUM(CASE WHEN type_id=2 THEN original_amount ELSE 0 END),0) AS amount FROM movements WHERE currency_id=? AND timestamp>=? AND timestamp<?")
        .bind::<Integer,_>(currency).bind::<BigInt,_>(start).bind::<BigInt,_>(end).get_result(c)?;
    Ok((income, row.amount.unwrap_or(0.0)))
}

pub fn timeseries_grouped(
    c: &mut SqliteConnection,
    start: i64,
    end: i64,
    currency: i32,
    granularity: &str,
    origin: i64,
) -> StatisticsResult<Vec<TimeSeriesPoint>> {
    let bucket = match granularity {
        "day" => "strftime('%s', date(timestamp/1000, 'unixepoch', 'localtime')) * 1000",
        // SQLite's `weekday 1` rolls Mondays forward, so calculate the
        // number of days since Monday explicitly (Sunday is 0).
        "week" => "strftime('%s', date(timestamp/1000, 'unixepoch', 'localtime', '-' || ((CAST(strftime('%w', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) + 6) % 7) || ' days')) * 1000",
        "month" => "strftime('%s', date(timestamp/1000, 'unixepoch', 'localtime', 'start of month')) * 1000",
        "year" => "strftime('%s', date(timestamp/1000, 'unixepoch', 'localtime', 'start of year')) * 1000",
        _ => return Err(StatisticsError::InvalidGranularity(granularity.to_string())),
    };
    let _ = origin; // SQLite localtime provides the application's local-day alignment.
    let sql = format!("SELECT {bucket} AS bucket_start_ms, COALESCE(SUM(CASE WHEN type_id=1 THEN original_amount ELSE 0 END),0) AS income, COALESCE(SUM(CASE WHEN type_id=2 THEN original_amount ELSE 0 END),0) AS expense FROM movements WHERE currency_id=? AND timestamp>=? AND timestamp<? AND type_id IN (1,2) GROUP BY bucket_start_ms ORDER BY bucket_start_ms");
    let rows = sql_query(sql)
        .bind::<Integer, _>(currency)
        .bind::<BigInt, _>(start)
        .bind::<BigInt, _>(end)
        .load::<SeriesRow>(c)?;
    let values: HashMap<i64, TimeSeriesPoint> = rows
        .into_iter()
        .map(|r| -> StatisticsResult<(i64, TimeSeriesPoint)> {
            let income = r.income.unwrap_or(0.0);
            let expense = r.expense.unwrap_or(0.0);
            // SQLite's strftime returns UTC epoch milliseconds for a local date.
            // Read that date as UTC, then encode the same calendar date as local
            // midnight, which is the transport contract of bucket_start_ms.
            let sql_date = Utc
                .timestamp_millis_opt(r.bucket_start_ms)
                .single()
                .ok_or(DateError::Timestamp(r.bucket_start_ms))?
                .date_naive();
            let bucket_date = match granularity {
                "week" => {
                    sql_date - Duration::days(sql_date.weekday().num_days_from_monday() as i64)
                }
                _ => sql_date,
            };
            let bucket_start_ms = crate::domain::date::local_date_to_start_ms(bucket_date)?;
            Ok((
                bucket_start_ms,
                TimeSeriesPoint {
                    bucket_start_ms,
                    income,
                    expense,
                    net: crate::domain::statistics::net_cash_flow(income, expense),
                },
            ))
        })
        .collect::<Result<_, _>>()?;

    // SQL returns only populated buckets. Fill the complete calendar range so
    // charts show zero-value days/weeks/months/years as well.
    let start_date = Local
        .timestamp_millis_opt(start)
        .single()
        .or_else(|| Local.timestamp_millis_opt(start).earliest())
        .ok_or(DateError::Timestamp(start))?
        .date_naive();
    let end_date = Local
        .timestamp_millis_opt(end - 1)
        .single()
        .or_else(|| Local.timestamp_millis_opt(end - 1).earliest())
        .ok_or(DateError::Timestamp(end - 1))?
        .date_naive();
    let mut date = match granularity {
        "day" => start_date,
        "week" => start_date - Duration::days(start_date.weekday().num_days_from_monday() as i64),
        "month" => crate::domain::date::date(start_date.year(), start_date.month(), 1)?,
        "year" => crate::domain::date::date(start_date.year(), 1, 1)?,
        _ => return Err(StatisticsError::InvalidGranularity(granularity.to_string())),
    };
    let mut result = Vec::new();
    loop {
        let bucket_start_ms = crate::domain::date::local_date_to_start_ms(date)?;
        if bucket_start_ms >= end {
            break;
        }
        result.push(values.get(&bucket_start_ms).cloned().unwrap_or(TimeSeriesPoint {
            bucket_start_ms,
            income: 0.0,
            expense: 0.0,
            net: 0.0,
        }));
        date = match granularity {
            "day" => date + Duration::days(1),
            "week" => date + Duration::days(7),
            "month" => {
                if date.month() == 12 {
                    crate::domain::date::date(date.year() + 1, 1, 1)?
                } else {
                    crate::domain::date::date(date.year(), date.month() + 1, 1)?
                }
            }
            "year" => crate::domain::date::date(date.year() + 1, 1, 1)?,
            _ => unreachable!(),
        };
        if date > end_date + Duration::days(8) {
            break;
        }
    }
    Ok(result)
}

fn balance_effect_in_currency(row: &BalanceMovementRow, currency: i32) -> f64 {
    let source_is_balance_account = matches!(
        row.source_account_type_id,
        crate::domain::accounts::CASH_ACCOUNT_ID | crate::domain::accounts::DEBIT_ACCOUNT_ID
    );
    let destination_is_balance_account = row.destination_account_type_id.is_some_and(|type_id| {
        matches!(
            type_id,
            crate::domain::accounts::CASH_ACCOUNT_ID | crate::domain::accounts::DEBIT_ACCOUNT_ID
        )
    });

    match row.type_id {
        1 if source_is_balance_account && row.source_currency_id == currency => row.account_amount,
        2 if source_is_balance_account && row.source_currency_id == currency => -row.account_amount,
        3 => {
            let source = if source_is_balance_account && row.source_currency_id == currency {
                -row.original_amount
            } else {
                0.0
            };
            let destination = if destination_is_balance_account
                && row.destination_currency_id == Some(currency)
            {
                row.account_amount
            } else {
                0.0
            };
            source + destination
        }
        _ => 0.0,
    }
}

fn balance_bucket_start(timestamp: i64, granularity: &str) -> StatisticsResult<i64> {
    let date = Local
        .timestamp_millis_opt(timestamp)
        .single()
        .or_else(|| Local.timestamp_millis_opt(timestamp).earliest())
        .ok_or(DateError::Timestamp(timestamp))?
        .date_naive();
    let bucket_date = match granularity {
        "day" => date,
        "week" => date - Duration::days(date.weekday().num_days_from_monday() as i64),
        "month" => crate::domain::date::date(date.year(), date.month(), 1)?,
        "year" => crate::domain::date::date(date.year(), 1, 1)?,
        _ => return Err(StatisticsError::InvalidGranularity(granularity.to_string())),
    };
    Ok(crate::domain::date::local_date_to_start_ms(bucket_date)?)
}

fn balance_movements_from(
    c: &mut SqliteConnection,
    start: i64,
) -> StatisticsResult<Vec<BalanceMovementRow>> {
    Ok(sql_query(
        "SELECT m.type_id, m.original_amount, m.account_amount, m.timestamp, source.currency_id AS source_currency_id, source.type_id AS source_account_type_id, destination.currency_id AS destination_currency_id, destination.type_id AS destination_account_type_id \
         FROM movements m \
         JOIN accounts source ON source.id = m.account_id \
         LEFT JOIN accounts destination ON destination.id = m.to_account_id \
         WHERE m.timestamp >= ?",
    )
    .bind::<BigInt, _>(start)
    .load::<BalanceMovementRow>(c)?)
}

/// Reconstructs the opening value from today's persisted account balances by
/// reversing every later effect, then reapplies in-period effects per bucket.
pub fn balance_trend(
    c: &mut SqliteConnection,
    start: i64,
    end: i64,
    currency: i32,
    granularity: &str,
    origin: i64,
) -> StatisticsResult<Vec<BalanceTrendPoint>> {
    let current: AmountRow = sql_query(
        "SELECT COALESCE(SUM(balance), 0) AS amount FROM accounts WHERE currency_id = ? AND type_id IN (?, ?)",
    )
    .bind::<Integer, _>(currency)
    .bind::<Integer, _>(crate::domain::accounts::CASH_ACCOUNT_ID)
    .bind::<Integer, _>(crate::domain::accounts::DEBIT_ACCOUNT_ID)
    .get_result(c)?;
    let movements = balance_movements_from(c, start)?;
    let future_effect =
        movements.iter().map(|row| balance_effect_in_currency(row, currency)).sum::<f64>();
    let opening = current.amount.unwrap_or(0.0) - future_effect;

    let series = timeseries_grouped(c, start, end, currency, granularity, origin)?;
    let mut effects_by_bucket = HashMap::<i64, f64>::new();
    for row in movements.iter().filter(|row| row.timestamp < end) {
        let bucket = balance_bucket_start(row.timestamp, granularity)?;
        *effects_by_bucket.entry(bucket).or_default() += balance_effect_in_currency(row, currency);
    }
    let points = series
        .iter()
        .map(|point| {
            (
                point.bucket_start_ms,
                effects_by_bucket.get(&point.bucket_start_ms).copied().unwrap_or(0.0),
            )
        })
        .collect::<Vec<_>>();
    Ok(crate::domain::statistics::cumulative_balances(opening, &points)
        .into_iter()
        .map(|(bucket_start_ms, balance)| BalanceTrendPoint { bucket_start_ms, balance })
        .collect())
}

pub fn categories_aggregation(
    c: &mut SqliteConnection,
    lang: &str,
    start: i64,
    end: i64,
    currency: i32,
    root: Option<i32>,
    include_descendants: bool,
) -> StatisticsResult<(Vec<HierarchicalCategory>, Vec<CategoryEntry>, f64)> {
    let cats: Vec<CategoryRow> = sql_query("SELECT c.id, COALESCE(t.name,c.key) AS name, c.father_id AS parent_id FROM categories c LEFT JOIN categories_translations t ON t.category_id=c.id AND t.lang=?")
        .bind::<Text, _>(lang)
        .load(c)?;
    let amounts: Vec<CategoryAmountRow> = sql_query("SELECT category_id, SUM(original_amount) AS amount FROM movements WHERE type_id=2 AND currency_id=? AND timestamp>=? AND timestamp<? GROUP BY category_id").bind::<Integer,_>(currency).bind::<BigInt,_>(start).bind::<BigInt,_>(end).load(c)?;
    let mut direct: HashMap<i32, f64> =
        amounts.into_iter().map(|r| (r.category_id, r.amount.unwrap_or(0.0))).collect();
    let by_id: HashMap<i32, CategoryRow> = cats
        .iter()
        .map(|r| (r.id, CategoryRow { id: r.id, name: r.name.clone(), parent_id: r.parent_id }))
        .collect();
    let hierarchy = crate::domain::categories::CategoryHierarchy::new(
        cats.iter().map(|category| (category.id, category.parent_id)),
    );
    let allowed = root
        .map(|id| {
            if include_descendants {
                hierarchy.descendant_ids(id).map(|ids| ids.into_iter().collect::<HashSet<_>>())
            } else {
                Ok(HashSet::from([id]))
            }
        })
        .transpose()?;
    if let Some(ref set) = allowed {
        direct.retain(|id, _| set.contains(id));
    }
    let mut rolled = direct.clone();
    for id in direct.keys().copied().collect::<Vec<_>>() {
        for parent in hierarchy.ancestor_ids(id)?.into_iter().skip(1) {
            if allowed.as_ref().map(|s| s.contains(&parent)).unwrap_or(true) {
                *rolled.entry(parent).or_insert(0.0) += direct.get(&id).copied().unwrap_or(0.0);
            }
        }
    }
    let total: f64 = direct.values().sum();
    let mut virtual_general: HashMap<i32, f64> = HashMap::new();
    for (id, amount) in &direct {
        let has_children = by_id.values().any(|category| category.parent_id == Some(*id));
        if has_children && *amount > 0.0 {
            virtual_general.insert(-*id, *amount);
        }
    }
    let mut flat: Vec<CategoryEntry> = rolled
        .iter()
        .filter_map(|(id, amount)| {
            by_id.get(id).map(|x| CategoryEntry {
                category_id: *id,
                name: x.name.clone(),
                parent_id: x.parent_id,
                amount: *amount,
                percent_of_total: crate::domain::statistics::percentage(*amount, total),
                is_virtual: false,
            })
        })
        .collect();
    flat.extend(virtual_general.iter().filter_map(|(id, amount)| {
        let parent = -*id;
        by_id.get(&parent).map(|_| CategoryEntry {
            category_id: *id,
            name: "General".to_string(),
            parent_id: Some(parent),
            amount: *amount,
            percent_of_total: crate::domain::statistics::percentage(*amount, total),
            is_virtual: true,
        })
    }));
    flat.sort_by(|a, b| b.amount.total_cmp(&a.amount));
    fn tree(
        id: i32,
        by: &HashMap<i32, CategoryRow>,
        rolled: &HashMap<i32, f64>,
        direct: &HashMap<i32, f64>,
        total: f64,
    ) -> HierarchicalCategory {
        let x = &by[&id];
        let mut children: Vec<_> = by
            .values()
            .filter(|c| c.parent_id == Some(id))
            .map(|c| tree(c.id, by, rolled, direct, total))
            .filter(|c| c.amount > 0.0)
            .collect();
        if let Some(amount) = direct.get(&id).filter(|amount| **amount > 0.0) {
            children.push(HierarchicalCategory {
                category_id: -id,
                name: "General".to_string(),
                parent_id: Some(id),
                amount: *amount,
                percent_of_total: crate::domain::statistics::percentage(*amount, total),
                is_virtual: true,
                children: Vec::new(),
            });
        }
        children.sort_by(|a, b| b.amount.total_cmp(&a.amount));
        let amount = rolled.get(&id).copied().unwrap_or(0.0);
        HierarchicalCategory {
            category_id: id,
            name: x.name.clone(),
            parent_id: x.parent_id,
            amount,
            percent_of_total: crate::domain::statistics::percentage(amount, total),
            is_virtual: false,
            children,
        }
    }
    let hierarchy = by_id
        .values()
        .filter(|x| x.parent_id.is_none() && rolled.get(&x.id).copied().unwrap_or(0.0) > 0.0)
        .map(|x| tree(x.id, &by_id, &rolled, &direct, total))
        .collect();
    Ok((hierarchy, flat, total))
}

pub fn obligations(
    c: &mut SqliteConnection,
    now: i64,
    currency: i32,
) -> StatisticsResult<Obligations> {
    let end = now + 90 * 24 * 60 * 60 * 1000;
    let rows:Vec<ObligationRow>=sql_query("SELECT mi.id AS installment_id, mi.movement_id, m.account_id, mi.due_timestamp, mi.amount, mi.paid, m.description, m.category_id FROM movement_installments mi JOIN movements m ON m.id=mi.movement_id WHERE m.currency_id=? AND mi.due_timestamp>=? AND mi.due_timestamp<? ORDER BY mi.due_timestamp").bind::<Integer,_>(currency).bind::<BigInt,_>(now).bind::<BigInt,_>(end).load(c)?;
    let obligation_values =
        rows.iter().map(|row| (row.due_timestamp, row.amount)).collect::<Vec<_>>();
    let (next_7_days, next_30_days, next_90_days) =
        crate::domain::statistics::obligation_totals(now, &obligation_values);
    Ok(Obligations {
        totals: ObligationTotals { next_7_days, next_30_days, next_90_days },
        items: rows
            .into_iter()
            .map(|r| Obligation {
                installment_id: r.installment_id,
                movement_id: r.movement_id,
                account_id: r.account_id,
                due_timestamp: r.due_timestamp,
                amount: r.amount,
                paid: r.paid,
                description: r.description,
                category_id: r.category_id,
            })
            .collect(),
    })
}

pub fn secondary_metrics(
    c: &mut SqliteConnection,
    start: i64,
    end: i64,
    currency: i32,
) -> StatisticsResult<SecondaryMetrics> {
    use crate::schema::movements::dsl::*;
    let movement_count = movements
        .filter(currency_id.eq(currency))
        .filter(timestamp.ge(start))
        .filter(timestamp.lt(end))
        .count()
        .get_result::<i64>(c)? as i32;
    let transaction_count = movements
        .filter(type_id.eq(INCOME).or(type_id.eq(EXPENSE)))
        .filter(currency_id.eq(currency))
        .filter(timestamp.ge(start))
        .filter(timestamp.lt(end))
        .count()
        .get_result::<i64>(c)? as i32;
    let avg_expense: Option<f64> = movements
        .filter(type_id.eq(EXPENSE))
        .filter(currency_id.eq(currency))
        .filter(timestamp.ge(start))
        .filter(timestamp.lt(end))
        .select(diesel::dsl::avg(original_amount))
        .first(c)?;
    let total: f64 = movements
        .filter(type_id.eq(EXPENSE))
        .filter(currency_id.eq(currency))
        .filter(timestamp.ge(start))
        .filter(timestamp.lt(end))
        .select(diesel::dsl::sum(original_amount))
        .first::<Option<f64>>(c)?
        .unwrap_or(0.0);
    let highest = timeseries_grouped(c, start, end, currency, "day", 0)?
        .into_iter()
        .map(|p| (p.bucket_start_ms, p.expense))
        .max_by(|a, b| a.1.total_cmp(&b.1))
        .filter(|x| x.1 > 0.0)
        .map(|(bucket_start_ms, amount)| HighestSpendingDay { bucket_start_ms, amount });
    let largest:Option<LargestRow>=sql_query("SELECT id AS movement_id, original_amount AS amount, timestamp FROM movements WHERE type_id=2 AND currency_id=? AND timestamp>=? AND timestamp<? ORDER BY original_amount DESC, timestamp ASC LIMIT 1").bind::<Integer,_>(currency).bind::<BigInt,_>(start).bind::<BigInt,_>(end).get_result(c).optional()?;
    Ok(SecondaryMetrics {
        movement_count,
        transaction_count,
        avg_expense,
        avg_daily_spending: crate::domain::statistics::average_daily_spending(total, start, end),
        highest_spending_day: highest,
        largest_expense: largest.map(|r| LargestExpense {
            movement_id: r.movement_id,
            amount: r.amount,
            timestamp: r.timestamp,
        }),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeded_statistics_preserve_currency_and_transfer_semantics() {
        let state = crate::tests::setup();
        let mut connection = crate::db::connect::establish_connection(&state.config.database_url);
        // Bound the query by the seeded epoch timestamps instead of local
        // calendar midnights. CI runners commonly use UTC while developer
        // machines may not, and the final two expenses occur at midnight UTC.
        let start = 1_751_328_000_000_i64;
        let end = 1_751_846_800_000_i64 + 1;
        let (income, expenses) = overview(&mut connection, start, end, 1).unwrap();
        assert_eq!(income, 3500.0);
        assert_eq!(expenses, 3170.17);

        let series = timeseries_grouped(&mut connection, start, end, 1, "day", 0).unwrap();
        // The seven seeded timestamps span seven local calendar days. Two
        // movements share the final local calendar day, but empty days remain.
        assert_eq!(series.len(), 7);
        assert_eq!(series.iter().map(|p| p.income).sum::<f64>(), income);
        assert_eq!(series.iter().map(|p| p.expense).sum::<f64>(), expenses);

        // The number of calendar weeks and months depends on the host timezone
        // (for example, the first timestamp is June 30 in Mexico and July 1 in
        // UTC), but every grouping must preserve the same totals.
        let weekly = timeseries_grouped(&mut connection, start, end, 1, "week", 0).unwrap();
        let monthly = timeseries_grouped(&mut connection, start, end, 1, "month", 0).unwrap();
        let yearly = timeseries_grouped(&mut connection, start, end, 1, "year", 0).unwrap();
        assert_eq!(yearly.len(), 1);
        for grouped in [&weekly, &monthly, &yearly] {
            assert_eq!(grouped.iter().map(|point| point.income).sum::<f64>(), income);
            assert_eq!(grouped.iter().map(|point| point.expense).sum::<f64>(), expenses);
        }
        assert!(weekly.windows(2).all(|w| w[0].bucket_start_ms < w[1].bucket_start_ms));
        assert!(monthly.windows(2).all(|w| w[0].bucket_start_ms < w[1].bucket_start_ms));
        assert!(yearly.windows(2).all(|w| w[0].bucket_start_ms < w[1].bucket_start_ms));

        // A range with no movements still returns the complete calendar
        // shape. January 1 through January 31 inclusive is sent as an
        // exclusive end of February 1.
        let january_start =
            Local.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).single().unwrap().timestamp_millis();
        let february_start =
            Local.with_ymd_and_hms(2026, 2, 1, 0, 0, 0).single().unwrap().timestamp_millis();
        assert_eq!(
            timeseries_grouped(&mut connection, january_start, february_start, 1, "day", 0)
                .unwrap()
                .len(),
            31
        );
        assert_eq!(
            timeseries_grouped(&mut connection, january_start, february_start, 1, "week", 0)
                .unwrap()
                .len(),
            5
        );
        assert_eq!(
            timeseries_grouped(&mut connection, january_start, february_start, 1, "month", 0)
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            timeseries_grouped(&mut connection, january_start, february_start, 1, "year", 0)
                .unwrap()
                .len(),
            1
        );

        let secondary = secondary_metrics(&mut connection, start, end, 1).unwrap();
        assert_eq!(secondary.movement_count, 8);
        assert_eq!(secondary.transaction_count, 7);
        assert!((secondary.avg_expense.unwrap() - (3170.17 / 6.0)).abs() < 0.0001);
        assert_eq!(secondary.highest_spending_day.unwrap().amount, 1800.0);
        assert_eq!(secondary.largest_expense.unwrap().amount, 1800.0);
    }

    #[test]
    fn balance_trend_is_cumulative_and_includes_opening_balance() {
        let state = crate::tests::setup();
        let mut c = crate::db::connect::establish_connection(&state.config.database_url);
        sql_query("INSERT OR IGNORE INTO currencies (id,symbol,code) VALUES (4,'€','EUR')")
            .execute(&mut c)
            .unwrap();
        let start =
            Local.with_ymd_and_hms(2027, 7, 1, 0, 0, 0).single().unwrap().timestamp_millis();
        let end = Local.with_ymd_and_hms(2027, 7, 4, 0, 0, 0).single().unwrap().timestamp_millis();
        let day_one = start + 60 * 60 * 1000;
        let day_two = start + 86_400_000 + 60 * 60 * 1000;
        let day_three = start + 2 * 86_400_000 + 60 * 60 * 1000;
        let future = end + 60 * 60 * 1000;

        // Account 90 is inactive intentionally: historical balances include it.
        // The persisted balances include every movement below, including the
        // future-dated one, exactly as the application balance writes do.
        sql_query("INSERT INTO accounts (id,type_id,currency_id,name,balance,is_active) VALUES (90,1,4,'EUR source',1180.0,0), (91,1,4,'EUR destination',255.0,1)")
            .execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (910,1,90,1,4,200.0,200.0,?,'before period')")
            .bind::<BigInt, _>(start - 1).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (911,1,90,1,4,110.0,100.0,?,'income')")
            .bind::<BigInt, _>(day_one).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (912,2,90,1,4,35.0,30.0,?,'expense')")
            .bind::<BigInt, _>(day_two).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,to_account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (913,3,90,91,88,4,50.0,50.0,?,'same currency transfer')")
            .bind::<BigInt, _>(day_three).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,to_account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (914,3,90,1,88,4,40.0,800.0,?,'outgoing conversion')")
            .bind::<BigInt, _>(day_three + 1).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,to_account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (915,3,1,91,88,1,10.0,180.0,?,'incoming conversion')")
            .bind::<BigInt, _>(day_three + 2).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (916,1,91,1,4,25.0,25.0,?,'future income')")
            .bind::<BigInt, _>(future).execute(&mut c).unwrap();

        let trend = balance_trend(&mut c, start, end, 4, "day", 0).unwrap();
        assert_eq!(trend.len(), 3);
        assert_eq!(trend[0].balance, 1300.0);
        assert_eq!(trend[1].balance, 1270.0);
        assert_eq!(trend[2].balance, 1410.0);
    }

    #[test]
    fn balance_trend_excludes_credit_accounts_and_keeps_eligible_transfer_sides() {
        let state = crate::tests::setup();
        let mut c = crate::db::connect::establish_connection(&state.config.database_url);
        sql_query("INSERT OR IGNORE INTO currencies (id,symbol,code) VALUES (4,'€','EUR')")
            .execute(&mut c)
            .unwrap();
        let start =
            Local.with_ymd_and_hms(2027, 8, 1, 0, 0, 0).single().unwrap().timestamp_millis();
        let end = Local.with_ymd_and_hms(2027, 8, 4, 0, 0, 0).single().unwrap().timestamp_millis();
        let day_one = start + 60 * 60 * 1000;
        let day_two = start + 86_400_000 + 60 * 60 * 1000;
        let day_three = start + 2 * 86_400_000 + 60 * 60 * 1000;
        let future = end + 60 * 60 * 1000;

        // Persisted balances include all movements below, including the future
        // ones. Only the cash and debit accounts contribute to the trend.
        sql_query("INSERT INTO accounts (id,type_id,currency_id,name,balance,is_active) VALUES (93,1,4,'Cash',95.0,1), (94,2,4,'Debit',230.0,1), (95,3,4,'Credit',1040.0,1)")
            .execute(&mut c).unwrap();
        sql_query("INSERT INTO accounts_credit_info (account_id,credit_limit,cutoff_day,days_to_pay) VALUES (95,2000.0,15,20)")
            .execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (920,2,95,1,4,50.0,50.0,?,'credit expense')")
            .bind::<BigInt, _>(day_one).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (921,1,93,1,4,20.0,20.0,?,'cash income')")
            .bind::<BigInt, _>(day_one + 1).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,to_account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (922,3,93,95,88,4,30.0,30.0,?,'cash to credit')")
            .bind::<BigInt, _>(day_two).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,to_account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (923,3,95,94,88,4,40.0,40.0,?,'credit to debit')")
            .bind::<BigInt, _>(day_two + 1).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (924,2,94,1,4,10.0,10.0,?,'debit expense')")
            .bind::<BigInt, _>(day_three).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (925,1,95,1,4,100.0,100.0,?,'future credit income')")
            .bind::<BigInt, _>(future).execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (926,1,93,1,4,5.0,5.0,?,'future cash income')")
            .bind::<BigInt, _>(future + 1).execute(&mut c).unwrap();

        let trend = balance_trend(&mut c, start, end, 4, "day", 0).unwrap();

        assert_eq!(trend.len(), 3);
        assert_eq!(trend[0].balance, 320.0);
        assert_eq!(trend[1].balance, 330.0);
        assert_eq!(trend[2].balance, 320.0);
    }

    #[test]
    fn balance_trend_respects_currency_and_empty_periods() {
        let state = crate::tests::setup();
        let mut c = crate::db::connect::establish_connection(&state.config.database_url);
        sql_query("INSERT OR IGNORE INTO currencies (id,symbol,code) VALUES (4,'€','EUR')")
            .execute(&mut c)
            .unwrap();
        let start =
            Local.with_ymd_and_hms(2026, 2, 1, 0, 0, 0).single().unwrap().timestamp_millis();
        let end = Local.with_ymd_and_hms(2026, 3, 1, 0, 0, 0).single().unwrap().timestamp_millis();
        let trend = balance_trend(&mut c, start, end, 3, "month", 0).unwrap();
        assert_eq!(trend.len(), 1);
        assert_eq!(trend[0].balance, 0.0);
    }

    #[test]
    fn categories_roll_up_children_without_double_counting() {
        let state = crate::tests::setup();
        let mut c = crate::db::connect::establish_connection(&state.config.database_url);
        let start = 1_751_328_000_000_i64;
        let end = 1_751_900_000_000_i64;
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (900,2,1,13,1,25.0,25.0,1751800000000,'child category test')")
            .execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (904,2,1,1,1,15.0,15.0,1751800000000,'parent category test')")
            .execute(&mut c).unwrap();

        let (hierarchy, flat, total) =
            categories_aggregation(&mut c, "es", start, end, 1, None, true).unwrap();
        assert!((total - 3210.17).abs() < 0.0001);
        assert_eq!(flat.iter().find(|x| x.category_id == 1).unwrap().amount, 40.0);
        assert_eq!(flat.iter().find(|x| x.category_id == 1).unwrap().name, "Comida y Bebida");
        assert_eq!(flat.iter().find(|x| x.category_id == -1).unwrap().name, "General");
        assert_eq!(
            hierarchy
                .iter()
                .find(|x| x.category_id == 1)
                .unwrap()
                .children
                .iter()
                .find(|x| x.is_virtual)
                .unwrap()
                .amount,
            15.0
        );
    }

    #[test]
    fn obligations_include_the_7_30_and_90_day_windows() {
        let state = crate::tests::setup();
        let mut c = crate::db::connect::establish_connection(&state.config.database_url);
        let now = 1_800_000_000_000_i64;
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (901,2,1,1,1,100.0,100.0,1751800000000,'obligation test')")
            .execute(&mut c).unwrap();
        for (number, offset, amount) in [
            (1, 86_400_000_i64, 10.0),
            (2, 8 * 86_400_000, 20.0),
            (3, 31 * 86_400_000, 30.0),
            (4, 91 * 86_400_000, 40.0),
        ] {
            sql_query("INSERT INTO movement_installments (movement_id,installment_number,total_installments,amount,due_timestamp,paid) VALUES (901,?,?,?, ?,0)")
                .bind::<Integer, _>(number).bind::<Integer, _>(4).bind::<Double, _>(amount).bind::<BigInt, _>(now + offset).execute(&mut c).unwrap();
        }

        let result = obligations(&mut c, now, 1).unwrap();
        assert_eq!(result.items.len(), 3);
        assert!(result.items.iter().all(|item| item.account_id == 1));
        assert_eq!(result.totals.next_7_days, 10.0);
        assert_eq!(result.totals.next_30_days, 30.0);
        assert_eq!(result.totals.next_90_days, 60.0);
    }

    #[test]
    fn currency_and_date_filters_are_isolated_and_half_open() {
        let state = crate::tests::setup();
        let mut c = crate::db::connect::establish_connection(&state.config.database_url);
        let start = 1_751_328_000_000_i64;
        let end = 1_751_900_000_000_i64;
        sql_query("INSERT OR IGNORE INTO currencies (id,symbol,code) VALUES (3,'€','EUR')")
            .execute(&mut c)
            .unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (902,1,1,1,3,777.0,777.0,1751400000000,'currency test')")
            .execute(&mut c).unwrap();
        sql_query("INSERT INTO movements (id,type_id,account_id,category_id,currency_id,original_amount,account_amount,timestamp,description) VALUES (903,1,1,1,1,111.0,111.0,1751900000000,'end boundary test')")
            .execute(&mut c).unwrap();

        let (income_mxn, _) = overview(&mut c, start, end, 1).unwrap();
        let (income_eur, _) = overview(&mut c, start, end, 3).unwrap();
        assert_eq!(income_mxn, 3500.0);
        assert_eq!(income_eur, 777.0);
        let (income_after_end, _) = overview(&mut c, start, end + 1, 1).unwrap();
        assert_eq!(income_after_end, 3611.0);
    }
}
