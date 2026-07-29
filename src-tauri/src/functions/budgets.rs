use crate::db::connect::establish_connection;
use chrono::{Datelike, Duration, NaiveDate, TimeZone, Local};
use diesel::prelude::*;
use std::sync::Mutex;
use tauri::State;

use crate::models::categories::CategoryRow;
use crate::models::{
    budgets::{BudgetDetails, BudgetHistoryInsert, BudgetHistoryRow, BudgetInsert, BudgetPeriodDetails, BudgetPeriodType, BudgetRow},
    general::AppState,
};
use crate::utils::date::last_day_of_month_or_clamp;

#[cfg(test)]
#[path = "./budgets_test.rs"]
mod budgets_test;

#[tauri::command]
pub fn get_budget_period_types(
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<BudgetPeriodType>, String> {
    tracing::debug!("Executing command get_budget_period_types");
    let state = state.lock().unwrap();
    Ok(state.budget_period_types.clone())
}

#[tauri::command]
pub fn get_all_budgets(state: State<'_, Mutex<AppState>>) -> Result<Vec<BudgetDetails>, String> {
    tracing::debug!("Executing command get_all_budgets");
    
    let state = state.lock().unwrap();
    
    let connection = &mut establish_connection(&state.config.database_url);
    
    get_all_budgets_internal(connection, get_ms_from_naive(Local::now().date_naive()))
}

#[tauri::command]
pub fn get_budget(state: State<'_, Mutex<AppState>>, id: i32) -> Result<BudgetDetails, String> {
    tracing::debug!("Executing command get_budget id={}", id);
    
    let state = state.lock().unwrap();
    
    let connection = &mut establish_connection(&state.config.database_url);
    
    get_budget_internal(connection, id, get_ms_from_naive(Local::now().date_naive()))
}

#[tauri::command]
pub fn create_budget(
    state: State<'_, Mutex<AppState>>,
    budget_period_type_id: i32,
    category_id: i32,
    currency_id: i32,
    name: String,
    amount_limit: f64,
    start_date: i64,
) -> Result<BudgetDetails, String> {
    tracing::debug!(
        "Executing command create_budget name={} period_id={} category_id={} currency_id={}",
        name,
        budget_period_type_id,
        category_id,
        currency_id
    );

    let state = state.lock().unwrap();

    validate_budget(
        &state,
        &name,
        amount_limit,
        budget_period_type_id,
        category_id,
        currency_id,
    )
    .map_err(|e| {
        tracing::warn!("Validation failed for new budget: {:?}", e);
        e.join(", ")
    })?;

    let connection = &mut establish_connection(&state.config.database_url);

    let new_budget = create_budget_internal(
        connection,
        budget_period_type_id,
        category_id,
        currency_id,
        &name,
        amount_limit,
        start_date,
    )?;

    get_budget_internal(connection, new_budget.id, get_ms_from_naive(Local::now().date_naive()))
}

#[tauri::command]
pub fn delete_budget(state: State<'_, Mutex<AppState>>, id: i32) -> Result<usize, String> {
    tracing::debug!("Executing command delete_budget id={}", id);

    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    let deleted_count = delete_budget_internal(connection, id)?;

    if deleted_count == 0 {
        tracing::warn!("Budget id={} not found", id);
        return Err("Budget not found".to_string());
    }

    tracing::info!("Budget deleted id={} count={}", id, deleted_count);
    Ok(deleted_count)
}

#[tauri::command]
pub fn update_budget_amount(
    state: State<'_, Mutex<AppState>>,
    id: i32,
    amount_limit: f64,
    update_type: String,
) -> Result<BudgetDetails, String> {
    tracing::debug!(
        "Executing command update_budget_amount id={} amount_limit={} update_type={}",
        id,
        amount_limit,
        update_type
    );

    let state = state.lock().unwrap();

    if amount_limit < 0.0 {
        return Err("El límite de presupuesto debe ser mayor o igual a 0".to_string());
    }

    let connection = &mut establish_connection(&state.config.database_url);

     let today_ms = get_ms_from_naive(Local::now().date_naive());

    let updated_budget = match update_type.as_str() {
        "correct" => correct_budget_internal(connection, id, amount_limit),
        "today" => change_budget_from_today_internal(connection, id, amount_limit, today_ms),
        "next_period" => change_budget_next_period_internal(connection, id, amount_limit, today_ms),
        _ => Err("Invalid update type. Allowed values: 'correct', 'today', 'next_period'.".to_string()),
    }?;

    get_budget_internal(connection, updated_budget.id, today_ms)
}

#[tauri::command]
pub fn update_budget_name(state: State<'_, Mutex<AppState>>, id: i32, name: String) -> Result<String, String> {
    tracing::debug!(
        "Executing command update_budget_name id={} name={}",
        id,
        name,
    );

    let state = state.lock().unwrap();

    if name.trim().chars().count() > 50 {
        return Err("El nombre debe tener máximo 50 caracteres".to_string());
    }

    let connection = &mut establish_connection(&state.config.database_url);

    
    change_budget_name(connection, id, name)
}

#[tauri::command]
pub fn get_affected_budget_ids(
    state: State<'_, Mutex<AppState>>,
    category_id: i32,
    previous_category_id: Option<i32>,
) -> Result<Vec<i32>, String> {
    tracing::debug!(
        "Executing command get_affected_budget_ids category_id={} previous_category_id={:?}",
        category_id,
        previous_category_id
    );

    let state = state.lock().unwrap();
    let categories_hierarchy: Vec<(i32, Option<i32>)> = state
        .categories
        .iter()
        .map(|c| (c.id, c.father_id))
        .collect();

    let connection = &mut establish_connection(&state.config.database_url);

    get_affected_budget_ids_internal(
        connection,
        category_id,
        previous_category_id,
        &categories_hierarchy,
    )
    .map_err(|e| e.to_string())
}
// --- Internal Business Logic Functions ---

fn get_descendant_categories(start_id: i32, all_categories: &[CategoryRow]) -> Vec<i32> {
    let mut descendants = vec![start_id];
    let mut to_process = vec![start_id];

    while !to_process.is_empty() {
        let mut next_level = Vec::new();
        for parent_id in to_process {
            for cat in all_categories {
                if cat.father_id == Some(parent_id) {
                    if !descendants.contains(&cat.id) {
                        descendants.push(cat.id);
                        next_level.push(cat.id);
                    }
                }
            }
        }
        to_process = next_level;
    }

    descendants
}

fn get_ms_from_naive(date: NaiveDate) -> i64 {
    Local.from_local_datetime(&date.and_hms_opt(0, 0, 0).unwrap())
    .single()
    .unwrap()
    .timestamp_millis()
}

pub fn generate_periods(start_date_ms: i64, period_type: &str, today_ms: i64) -> Vec<(i64, i64)> {
    let start_date = Local.timestamp_millis_opt(start_date_ms).unwrap().date_naive();
    let today_date = Local.timestamp_millis_opt(today_ms).unwrap().date_naive();

    if today_date < start_date {
        return Vec::new();
    }

    let mut periods = Vec::new();
    let mut current_start_date = start_date;
    let mut index = 0;

    loop {
        let next_start_date = match period_type {
            "weekly" => {
                current_start_date + Duration::days(7)
            }
            "monthly" => {
                index += 1;
                add_months(start_date, index)
            }
            "yearly" => {
                index += 1;
                add_years(start_date, index)
            }
            _ => {
                current_start_date + Duration::days(1)
            }
        };

        let current_start_ms = get_ms_from_naive(current_start_date);

        let next_start_ms = get_ms_from_naive(next_start_date);

        periods.push((current_start_ms, next_start_ms - 1));

        if next_start_date > today_date {
            break;
        }

        current_start_date = next_start_date;
    }

    periods
}

fn get_budget_details_list(
    connection: &mut SqliteConnection,
    budget_ids: Option<Vec<i32>>,
    today_ms: i64,
) -> Result<Vec<BudgetDetails>, String> {
    use crate::schema::budgets::dsl::{budgets, id as b_id};
    use crate::schema::budget_history::dsl::{budget_history, budget_id as bh_budget_id, start_date as bh_start_date};
    use crate::schema::categories::dsl::categories;
    use crate::schema::movements::dsl::{movements, category_id as m_category_id, timestamp as m_timestamp};
    use crate::schema::budget_period_types::dsl::budget_period_types;
    use crate::models::movements::MovementRow;
    use crate::models::categories::CategoryRow;

    // 1. Load budgets
    let budget_rows = if let Some(ref ids) = budget_ids {
        budgets
            .filter(b_id.eq_any(ids))
            .load::<BudgetRow>(connection)
            .map_err(|e| e.to_string())?
    } else {
        budgets
            .load::<BudgetRow>(connection)
            .map_err(|e| e.to_string())?
    };

    if budget_rows.is_empty() {
        return Ok(Vec::new());
    }

    let loaded_budget_ids: Vec<i32> = budget_rows.iter().map(|b| b.id).collect();

    // 2. Load all budget histories for these budgets
    let history_rows = budget_history
        .filter(bh_budget_id.eq_any(&loaded_budget_ids))
        .order(bh_start_date.asc())
        .load::<BudgetHistoryRow>(connection)
        .map_err(|e| e.to_string())?;

    // Group histories by budget_id
    let mut histories_by_budget: std::collections::HashMap<i32, Vec<BudgetHistoryRow>> = std::collections::HashMap::new();
    for hist in history_rows {
        histories_by_budget.entry(hist.budget_id).or_default().push(hist);
    }

    // 3. Load all categories to traverse hierarchy
    let all_categories = categories
        .load::<CategoryRow>(connection)
        .map_err(|e| e.to_string())?;

    // Group budgets by category_id to collect needed categories
    let mut category_to_descendants: std::collections::HashMap<i32, Vec<i32>> = std::collections::HashMap::new();
    let mut all_needed_category_ids = std::collections::HashSet::new();
    let mut min_start_date = i64::MAX;

    for row in &budget_rows {
        let descendants = get_descendant_categories(row.category_id, &all_categories);
        for &cid in &descendants {
            all_needed_category_ids.insert(cid);
        }
        category_to_descendants.insert(row.category_id, descendants);

        if let Some(hist_list) = histories_by_budget.get(&row.id) {
            if let Some(first_hist) = hist_list.first() {
                if first_hist.start_date < min_start_date {
                    min_start_date = first_hist.start_date;
                }
            }
        }
    }

    // 4. Load period type keys for budgets
    let period_types = budget_period_types
        .load::<crate::models::budgets::BudgetPeriodTypeRow>(connection)
        .map_err(|e| e.to_string())?;
    let period_type_map: std::collections::HashMap<i32, String> = period_types
        .into_iter()
        .map(|t| (t.id, t.key))
        .collect();

    // 5. Load movements
    let movement_rows = if !all_needed_category_ids.is_empty() && min_start_date != i64::MAX {
        let cat_ids_vec: Vec<i32> = all_needed_category_ids.into_iter().collect();
        movements
            .filter(m_category_id.eq_any(cat_ids_vec))
            .filter(m_timestamp.ge(min_start_date))
            .load::<MovementRow>(connection)
            .map_err(|e| e.to_string())?
    } else {
        Vec::new()
    };

    // Build the results
    let mut results = Vec::new();

    for row in budget_rows {
        let hist_list = match histories_by_budget.get(&row.id) {
            Some(list) if !list.is_empty() => list,
            _ => return Err(format!("No history found for budget {}", row.id)),
        };

        let initial_history = &hist_list[0];
        let start_date_val = initial_history.start_date;

        // Find active history for today_ms: start_date <= today_ms AND today_ms <= end_date
        let active_history = hist_list
            .iter()
            .find(|h| h.start_date <= today_ms && today_ms <= h.end_date)
            .unwrap_or(initial_history);

        let period_type_key = period_type_map
            .get(&row.budget_period_type_id)
            .ok_or_else(|| format!("Unknown period type id: {}", row.budget_period_type_id))?;

        // Generate periods from start_date_val to today_ms
        let period_ranges = generate_periods(start_date_val, period_type_key, today_ms);

        let descendant_cats = category_to_descendants
            .get(&row.category_id)
            .cloned()
            .unwrap_or_default();

        let mut period_details_list = Vec::new();

        for (p_start, p_end) in period_ranges {
            // Find active limit for this period end date
            let period_limit = hist_list
                .iter()
                .find(|h| h.start_date <= p_end && p_end <= h.end_date)
                .map(|h| h.amount_limit)
                .unwrap_or(active_history.amount_limit);

            // Filter movements inside this period with descendant categories
            let mut amount_spend = 0.0;
            let mut movement_ids = Vec::new();

            for m in &movement_rows {
                if descendant_cats.contains(&m.category_id) && m.timestamp >= p_start && m.timestamp <= p_end {
                    amount_spend += m.original_amount;
                    movement_ids.push(m.id);
                }
            }

            period_details_list.push(BudgetPeriodDetails {
                start_date: p_start,
                end_date: p_end,
                amount_limit: period_limit,
                amount_spend,
                movement_ids,
            });
        }

        results.push(BudgetDetails {
            budget: row,
            periods: period_details_list,
        });
    }

    Ok(results)
}

fn get_all_budgets_internal(
    connection: &mut SqliteConnection,
    today_ms: i64,
) -> Result<Vec<BudgetDetails>, String> {
    get_budget_details_list(connection, None, today_ms)
}

fn get_budget_internal(
    connection: &mut SqliteConnection,
    budget_id_val: i32,
    today_ms: i64,
) -> Result<BudgetDetails, String> {
    let mut details_list = get_budget_details_list(connection, Some(vec![budget_id_val]), today_ms)?;
    details_list.pop().ok_or_else(|| "Budget not found".to_string())
}

fn create_budget_internal(
    connection: &mut SqliteConnection,
    budget_period_type_id: i32,
    category_id: i32,
    currency_id: i32,
    name: &str,
    amount_limit_val: f64,
    start_date_val: i64,
) -> Result<BudgetRow, String> {
    use crate::schema::budget_history::dsl::budget_history;
    use crate::schema::budgets::dsl::budgets;

    connection
        .transaction::<BudgetRow, diesel::result::Error, _>(|connection| {
            let new_budget = BudgetInsert {
                budget_period_type_id,
                category_id,
                currency_id,
                name,
            };

            let budget_row = diesel::insert_into(budgets)
                .values(&new_budget)
                .returning(BudgetRow::as_returning())
                .get_result::<BudgetRow>(connection)?;

            let new_history = BudgetHistoryInsert {
                budget_id: budget_row.id,
                amount_limit: amount_limit_val,
                start_date: start_date_val,
                end_date: i64::MAX,
            };

            diesel::insert_into(budget_history)
                .values(&new_history)
                .execute(connection)?;

            Ok(budget_row)
        })
        .map_err(|e| {
            tracing::error!("Failed creating budget in transaction: {}", e);
            e.to_string()
        })
}

fn delete_budget_internal(
    connection: &mut SqliteConnection,
    budget_id_val: i32,
) -> Result<usize, String> {
    use crate::schema::budget_history::dsl::{budget_history, budget_id as bh_budget_id};
    use crate::schema::budgets::dsl::budgets;

    connection
        .transaction::<usize, diesel::result::Error, _>(|connection| {
            // Delete history first
            diesel::delete(budget_history.filter(bh_budget_id.eq(budget_id_val)))
                .execute(connection)?;

            let deleted_count = diesel::delete(budgets.find(budget_id_val)).execute(connection)?;

            Ok(deleted_count)
        })
        .map_err(|e| {
            tracing::error!("Failed deleting budget: {}", e);
            e.to_string()
        })
}

fn correct_budget_internal(
    connection: &mut SqliteConnection,
    budget_id_val: i32,
    new_amount: f64,
) -> Result<BudgetRow, String> {
    use crate::schema::budget_history::dsl::{
        amount_limit as bh_amount_limit, budget_history, budget_id as bh_budget_id, end_date,
    };
    use crate::schema::budgets::dsl::budgets;

    connection
        .transaction::<BudgetRow, diesel::result::Error, _>(|connection| {
            // Update the active history record (where end_date is i64::MAX)
            diesel::update(
                budget_history
                    .filter(bh_budget_id.eq(budget_id_val))
                    .filter(end_date.eq(i64::MAX)),
            )
            .set(bh_amount_limit.eq(new_amount))
            .execute(connection)?;

            let budget_row = budgets.find(budget_id_val).first::<BudgetRow>(connection)?;

            Ok(budget_row)
        })
        .map_err(|e| {
            tracing::error!("Failed correcting budget: {}", e);
            e.to_string()
        })
}

fn change_budget_from_today_internal(
    connection: &mut SqliteConnection,
    budget_id_val: i32,
    new_amount: f64,
    today_ms: i64,
) -> Result<BudgetRow, String> {
    use crate::schema::budget_history::dsl::{
        budget_history, budget_id as bh_budget_id, end_date, start_date,
    };
    use crate::schema::budgets::dsl::budgets;

    connection
        .transaction::<BudgetRow, diesel::result::Error, _>(|connection| {
            // Delete any history records starting at or after today_ms
            diesel::delete(
                budget_history
                    .filter(bh_budget_id.eq(budget_id_val))
                    .filter(start_date.ge(today_ms)),
            )
            .execute(connection)?;

            // Find the remaining history record with the largest start_date (must be < today_ms)
            let prev_record_opt = budget_history
                .filter(bh_budget_id.eq(budget_id_val))
                .order(start_date.desc())
                .first::<BudgetHistoryRow>(connection)
                .optional()?;

            if let Some(prev_record) = prev_record_opt {
                // Close it at today_ms - 1
                diesel::update(budget_history.find(prev_record.id))
                    .set(end_date.eq(today_ms - 1))
                    .execute(connection)?;
            }

            // Insert new active history record starting today
            let new_history = BudgetHistoryInsert {
                budget_id: budget_id_val,
                amount_limit: new_amount,
                start_date: today_ms,
                end_date: i64::MAX,
            };

            diesel::insert_into(budget_history)
                .values(&new_history)
                .execute(connection)?;

            let budget_row = budgets.find(budget_id_val).first::<BudgetRow>(connection)?;

            Ok(budget_row)
        })
        .map_err(|e| {
            tracing::error!("Failed changing budget from today: {}", e);
            e.to_string()
        })
}

fn change_budget_next_period_internal(
    connection: &mut SqliteConnection,
    budget_id_val: i32,
    new_amount: f64,
    today_ms: i64,
) -> Result<BudgetRow, String> {
    use crate::schema::budget_history::dsl::{
        budget_history, budget_id as bh_budget_id, end_date, start_date,
    };
    use crate::schema::budget_period_types::dsl::{budget_period_types, key as bpt_key};    
    use crate::schema::budgets::dsl::budgets;

    connection
        .transaction::<BudgetRow, diesel::result::Error, _>(|connection| {
            let budget_row = budgets.find(budget_id_val).first::<BudgetRow>(connection)?;

            let period_type_key = budgets
                .find(budget_id_val)
                .inner_join(budget_period_types)
                .select(bpt_key)
                .first::<String>(connection)?;

            let initial_history = budget_history
                .filter(bh_budget_id.eq(budget_id_val))
                .order(start_date.asc())
                .first::<BudgetHistoryRow>(connection)?;

            // Calculate next period start
            let next_period_start = calculate_next_period_start(
                initial_history.start_date,
                &period_type_key,
                today_ms,
            );

            // Delete any history records starting at or after next_period_start
            diesel::delete(
                budget_history
                    .filter(bh_budget_id.eq(budget_id_val))
                    .filter(start_date.ge(next_period_start)),
            )
            .execute(connection)?;

            // Find the remaining history record with the largest start_date (must be < next_period_start)
            let prev_record_opt = budget_history
                .filter(bh_budget_id.eq(budget_id_val))
                .order(start_date.desc())
                .first::<BudgetHistoryRow>(connection)
                .optional()?;

            if let Some(prev_record) = prev_record_opt {
                // Close it at next_period_start - 1
                diesel::update(budget_history.find(prev_record.id))
                    .set(end_date.eq(next_period_start - 1))
                    .execute(connection)?;
            }

            // Insert new active history record starting at next_period_start
            let new_history = BudgetHistoryInsert {
                budget_id: budget_id_val,
                amount_limit: new_amount,
                start_date: next_period_start,
                end_date: i64::MAX,
            };

            diesel::insert_into(budget_history)
                .values(&new_history)
                .execute(connection)?;

            Ok(budget_row)
        })
        .map_err(|e| {
            tracing::error!("Failed changing budget next period: {}", e);
            e.to_string()
        })
}

fn change_budget_name( connection: &mut SqliteConnection, budget_id: i32, name: String) -> Result<String, String> {
    use crate::schema::budgets::dsl::{budgets, name as b_name, id};

    connection.transaction(|connection| {
        diesel::update(budgets.filter(id.eq(budget_id)))
        .set(b_name.eq(name.clone()))
        .execute(connection)

    }).map_err(|e| {
        tracing::error!("Failed updating budget name in transaction: {}", e);
        e.to_string()
    })?;

    return Ok(name);

}

fn get_affected_budget_ids_internal(
    connection: &mut SqliteConnection,
    category_id: i32,
    previous_category_id: Option<i32>,
    categories_hierarchy: &[(i32, Option<i32>)],
) -> QueryResult<Vec<i32>> {
    use crate::schema::budgets::dsl::{budgets, category_id as budget_category_id, id as budget_id};

    // Get ancestors for current category
    let mut ancestors = get_ancestor_category_ids(category_id, categories_hierarchy);

    // Get ancestors for previous category, if provided (useful for updates)
    if let Some(prev_id) = previous_category_id {
        if prev_id != category_id {
            let prev_ancestors = get_ancestor_category_ids(prev_id, categories_hierarchy);
            ancestors.extend(prev_ancestors);
        }
    }

    // Deduplicate the ancestors list to ensure we don't query duplicates
    ancestors.sort_unstable();
    ancestors.dedup();

    if ancestors.is_empty() {
        return Ok(Vec::new());
    }

    // Query budgets affected by any of the target/ancestor categories in a single query
    let affected_budgets = budgets
        .filter(budget_category_id.eq_any(ancestors))
        .select(budget_id)
        .load::<i32>(connection)?;

    Ok(affected_budgets)
}
// --- Date and Period Helper Functions ---

fn add_months(date: NaiveDate, months: i32) -> NaiveDate {
    let mut year = date.year();
    let mut month = date.month() as i32 + months;
    while month > 12 {
        year += 1;
        month -= 12;
    }
    while month < 1 {
        year -= 1;
        month += 12;
    }
    let day = date.day();
    last_day_of_month_or_clamp(year, month as u32, day)
}

fn add_years(date: NaiveDate, years: i32) -> NaiveDate {
    let year = date.year() + years;
    let month = date.month();
    let day = date.day();
    last_day_of_month_or_clamp(year, month, day)
}

pub fn calculate_next_period_start(start_date_ms: i64, period_type: &str, today_ms: i64) -> i64 {
    let start_date = Local.timestamp_millis_opt(start_date_ms).unwrap().date_naive();
    let today_date = Local.timestamp_millis_opt(today_ms).unwrap().date_naive();

    if today_date < start_date {
        return start_date_ms;
    }

    let next_date = match period_type {
        "weekly" => {
            let days_diff = (today_date - start_date).num_days();
            let weeks = days_diff / 7;
            start_date + Duration::days((weeks + 1) * 7)
        }
        "monthly" => {
            let mut next = start_date;
            let mut months = 0;
            while next <= today_date {
                months += 1;
                next = add_months(start_date, months);
            }
            next
        }
        "yearly" => {
            let mut next = start_date;
            let mut years = 0;
            while next <= today_date {
                years += 1;
                next = add_years(start_date, years);
            }
            next
        }
        _ => today_date + Duration::days(1),
    };

    get_ms_from_naive(next_date)
}

// --- Validation Functions ---

fn validate_budget(
    state: &AppState,
    name: &str,
    amount_limit: f64,
    budget_period_type_id: i32,
    category_id: i32,
    currency_id: i32,
) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    if name.trim().is_empty() {
        errors.push("El nombre es requerido".to_string());
    }

    if name.trim().chars().count() > 50 {
        errors.push("El nombre debe tener máximo 50 caracteres".to_string());
    }

    if amount_limit < 0.0 {
        errors.push("El límite de presupuesto debe ser mayor o igual a 0".to_string());
    }

    if !state.budget_period_types.iter().any(|t| t.id == budget_period_type_id) {
        errors.push("El tipo de período de presupuesto no existe".to_string());
    }

    if !state.categories.iter().any(|c| c.id == category_id) {
        errors.push("La categoría seleccionada no existe".to_string());
    }

    if !state.currencies.iter().any(|c| c.id == currency_id) {
        errors.push("La moneda seleccionada no existe".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn get_ancestor_category_ids(
    start_id: i32,
    categories: &[(i32, Option<i32>)],
) -> Vec<i32> {
    if !categories.iter().any(|(id, _)| *id == start_id) {
        return Vec::new();
    }

    let mut ancestors = vec![start_id];
    let mut current_id = start_id;
    let max_depth = 100;
    let mut depth = 0;

    while depth < max_depth {
        if let Some((_, father_id)) = categories.iter().find(|(id, _)| *id == current_id) {
            if let Some(parent_id) = father_id {
                // Prevent duplicate ancestors or cycle loops
                if ancestors.contains(parent_id) {
                    break;
                }
                ancestors.push(*parent_id);
                current_id = *parent_id;
                depth += 1;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    ancestors
}