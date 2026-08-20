use crate::db::connect::establish_connection;
use diesel::prelude::*;
use std::sync::Mutex;
use tauri::State;

use crate::models::general::AppState;
use crate::models::plannings::{
    CreatePlanningRequest, Planning, PlanningInsert, PlanningOccurrence, PlanningOccurrenceInsert,
    PlanningOccurrenceRow, PlanningRecurringRuleDetail, PlanningRecurringRuleInsert,
    PlanningRecurringRuleRow, PlanningRecurringType, PlanningRecurringTypeRow,
    PlanningRecurringTypeTranslationRow, PlanningRow, PlanningStatus, PlanningStatusRow,
    PlanningStatusTranslationRow, PlanningYearDay, UpdatePlanningRequest, PLANNING_STATUS_CANCELED,
    PLANNING_STATUS_COMPLETED, PLANNING_STATUS_PENDING, RECURRING_TYPE_DAILY,
    RECURRING_TYPE_MONTHLY, RECURRING_TYPE_WEEKLY, RECURRING_TYPE_YEARLY,
};
use crate::utils::recurrence::{
    calculate_next_occurrence, local_today_start_of_day_ms,
    try_local_naive_date_to_start_of_day_ms, try_timestamp_to_local_naive_date,
    RecurrenceRuleDefinition,
};

#[cfg(test)]
#[path = "./plannings_test.rs"]
mod plannings_test;

const MOVEMENT_INCOME_ID: i32 = 1;
const MOVEMENT_EXPENSE_ID: i32 = 2;
const ACCOUNT_TYPE_CREDIT_CARD_ID: i32 = 3;

// ---------------------------------------------------------
// Metadata Queries
// ---------------------------------------------------------

#[tauri::command]
pub fn get_planning_recurring_types(
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<PlanningRecurringType>, String> {
    let state = crate::utils::lock_app_state(&state)?;
    Ok(state.planning_recurring_types.clone())
}

#[tauri::command]
pub fn get_planning_statuses(
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<PlanningStatus>, String> {
    let state = crate::utils::lock_app_state(&state)?;
    Ok(state.planning_statuses.clone())
}

pub fn get_planning_recurring_types_internal(
    connection: &mut SqliteConnection,
    lang: String,
) -> Result<Vec<PlanningRecurringType>, String> {
    use crate::schema::{planning_recurring_types, planning_recurring_types_translations};

    planning_recurring_types::table
        .inner_join(
            planning_recurring_types_translations::table.on(planning_recurring_types::id
                .eq(planning_recurring_types_translations::planning_recurring_type_id)
                .and(planning_recurring_types_translations::lang.eq(lang))),
        )
        .select((
            PlanningRecurringTypeRow::as_select(),
            PlanningRecurringTypeTranslationRow::as_select(),
        ))
        .load::<(PlanningRecurringTypeRow, PlanningRecurringTypeTranslationRow)>(connection)
        .map(|rows| rows.into_iter().map(PlanningRecurringType::from).collect())
        .map_err(|e| {
            tracing::error!("Failed loading planning recurring types: {}", e);
            e.to_string()
        })
}

pub fn get_planning_statuses_internal(
    connection: &mut SqliteConnection,
    lang: String,
) -> Result<Vec<PlanningStatus>, String> {
    use crate::schema::{planning_status, planning_status_translations};

    planning_status::table
        .inner_join(
            planning_status_translations::table.on(planning_status::id
                .eq(planning_status_translations::planning_status_id)
                .and(planning_status_translations::lang.eq(lang))),
        )
        .select((PlanningStatusRow::as_select(), PlanningStatusTranslationRow::as_select()))
        .load::<(PlanningStatusRow, PlanningStatusTranslationRow)>(connection)
        .map(|rows| rows.into_iter().map(PlanningStatus::from).collect())
        .map_err(|e| {
            tracing::error!("Failed loading planning statuses: {}", e);
            e.to_string()
        })
}

// ---------------------------------------------------------
// Planning Queries
// ---------------------------------------------------------

#[tauri::command]
pub fn get_plannings(state: State<'_, Mutex<AppState>>) -> Result<Vec<Planning>, String> {
    tracing::debug!("Executing command get_plannings");
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    get_plannings_internal(connection)
}

#[tauri::command]
pub fn get_planning(
    state: State<'_, Mutex<AppState>>,
    planning_id: i32,
) -> Result<Planning, String> {
    tracing::debug!("Executing command get_planning id={}", planning_id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    get_planning_internal(connection, planning_id)
}

#[tauri::command]
pub fn get_planning_occurrences(
    state: State<'_, Mutex<AppState>>,
    planning_id: i32,
) -> Result<Vec<PlanningOccurrence>, String> {
    tracing::debug!("Executing command get_planning_occurrences planning_id={}", planning_id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    get_planning_occurrences_internal(connection, planning_id)
}

pub fn get_planning_occurrences_internal(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Vec<PlanningOccurrence>, String> {
    use crate::schema::planning_occurrences;

    let today_start_ms = local_today_start_of_day_ms();

    planning_occurrences::table
        .filter(planning_occurrences::planning_id.eq(planning_id_val))
        .order(planning_occurrences::expected_date.desc())
        .select(PlanningOccurrenceRow::as_select())
        .load::<PlanningOccurrenceRow>(connection)
        .map(|rows| {
            rows.into_iter().map(|r| PlanningOccurrence::from_row(r, today_start_ms)).collect()
        })
        .map_err(|e| {
            tracing::error!(
                "Failed loading planning occurrences for planning_id={}: {}",
                planning_id_val,
                e
            );
            e.to_string()
        })
}

pub fn get_plannings_internal(connection: &mut SqliteConnection) -> Result<Vec<Planning>, String> {
    use crate::schema::plannings::dsl::plannings;

    let planning_rows = plannings
        .select(PlanningRow::as_select())
        .load::<PlanningRow>(connection)
        .map_err(|e| {
            tracing::error!("Failed loading plannings: {}", e);
            e.to_string()
        })?;

    let today_start_ms = local_today_start_of_day_ms();
    let mut results = Vec::with_capacity(planning_rows.len());

    for row in planning_rows {
        let rule_detail = fetch_recurring_rule_detail(connection, row.recurring_rule_id)
            .map_err(|e| e.to_string())?;
        let current_occurrence =
            get_actionable_occurrence_for_planning(connection, row.id, today_start_ms)
                .map_err(|e| e.to_string())?;

        results.push(Planning {
            id: row.id,
            type_id: row.type_id,
            account_id: row.account_id,
            category_id: row.category_id,
            currency_id: row.currency_id,
            name: row.name,
            amount: row.amount,
            recurring_rule: rule_detail,
            current_occurrence,
        });
    }

    Ok(results)
}

pub fn get_planning_internal(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Planning, String> {
    use crate::schema::plannings::dsl::plannings;

    let row = plannings
        .find(planning_id_val)
        .select(PlanningRow::as_select())
        .first::<PlanningRow>(connection)
        .map_err(|e| {
            tracing::error!("Failed loading planning id={}: {}", planning_id_val, e);
            e.to_string()
        })?;

    let rule_detail = fetch_recurring_rule_detail(connection, row.recurring_rule_id)
        .map_err(|e| e.to_string())?;
    let today_start_ms = local_today_start_of_day_ms();
    let current_occurrence =
        get_actionable_occurrence_for_planning(connection, row.id, today_start_ms)
            .map_err(|e| e.to_string())?;

    Ok(Planning {
        id: row.id,
        type_id: row.type_id,
        account_id: row.account_id,
        category_id: row.category_id,
        currency_id: row.currency_id,
        name: row.name,
        amount: row.amount,
        recurring_rule: rule_detail,
        current_occurrence,
    })
}

// ---------------------------------------------------------
// Planning CRUD & Reconciler
// ---------------------------------------------------------

#[tauri::command]
pub fn create_planning(
    state: State<'_, Mutex<AppState>>,
    request: CreatePlanningRequest,
) -> Result<Planning, String> {
    tracing::debug!("Executing command create_planning name={}", request.name);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    create_planning_internal(connection, &state, request)
}

pub fn create_planning_internal(
    connection: &mut SqliteConnection,
    state: &AppState,
    request: CreatePlanningRequest,
) -> Result<Planning, String> {
    create_planning_service(connection, state, request).map_err(|error| error.to_string())
}

fn create_planning_service(
    connection: &mut SqliteConnection,
    state: &AppState,
    request: CreatePlanningRequest,
) -> Result<Planning, crate::domain::planning::PlanningError> {
    validate_planning_request(state, connection, &request)
        .map_err(crate::domain::planning::PlanningError::Validation)?;

    connection
        .transaction::<Planning, crate::domain::planning::PlanningError, _>(|connection| {
            use crate::schema::{planning_recurring_rules, plannings};

            let rule_insert = PlanningRecurringRuleInsert {
                recurring_type_id: request.recurring_type_id,
                interval_step: request.interval_step,
                start_date: request.start_date,
                end_date: request.end_date,
                is_active: true,
            };

            let rule_row = diesel::insert_into(planning_recurring_rules::table)
                .values(&rule_insert)
                .returning(PlanningRecurringRuleRow::as_returning())
                .get_result::<PlanningRecurringRuleRow>(connection)?;

            insert_rule_days(
                connection,
                rule_row.id,
                request.recurring_type_id,
                request.week_days.as_deref(),
                request.month_days.as_deref(),
                request.year_days.as_deref(),
            )?;

            let planning_insert = PlanningInsert {
                type_id: request.type_id,
                account_id: request.account_id,
                category_id: request.category_id,
                currency_id: request.currency_id,
                name: &request.name,
                amount: request.amount,
                recurring_rule_id: rule_row.id,
            };

            let planning_row = diesel::insert_into(plannings::table)
                .values(&planning_insert)
                .returning(PlanningRow::as_returning())
                .get_result::<PlanningRow>(connection)?;

            reconcile_current_occurrence(connection, planning_row.id)?;

            let rule_detail = fetch_recurring_rule_detail(connection, rule_row.id)?;
            let today_start_ms = local_today_start_of_day_ms();
            let current_occurrence = get_actionable_occurrence_for_planning(
                connection,
                planning_row.id,
                today_start_ms,
            )?;

            Ok(Planning {
                id: planning_row.id,
                type_id: planning_row.type_id,
                account_id: planning_row.account_id,
                category_id: planning_row.category_id,
                currency_id: planning_row.currency_id,
                name: planning_row.name,
                amount: planning_row.amount,
                recurring_rule: rule_detail,
                current_occurrence,
            })
        })
        .map_err(|error| {
            tracing::error!("Failed creating planning: {}", error);
            error
        })
}

#[tauri::command]
pub fn update_planning(
    state: State<'_, Mutex<AppState>>,
    id: i32,
    request: UpdatePlanningRequest,
) -> Result<Planning, String> {
    tracing::debug!("Executing command update_planning id={}", id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    update_planning_internal(connection, &state, id, request)
}

pub fn update_planning_internal(
    connection: &mut SqliteConnection,
    state: &AppState,
    planning_id_val: i32,
    request: UpdatePlanningRequest,
) -> Result<Planning, String> {
    update_planning_service(connection, state, planning_id_val, request)
        .map_err(|error| error.to_string())
}

fn update_planning_service(
    connection: &mut SqliteConnection,
    state: &AppState,
    planning_id_val: i32,
    request: UpdatePlanningRequest,
) -> Result<Planning, crate::domain::planning::PlanningError> {
    let create_equivalent = CreatePlanningRequest {
        type_id: request.type_id,
        account_id: request.account_id,
        category_id: request.category_id,
        currency_id: request.currency_id,
        name: request.name.clone(),
        amount: request.amount,
        recurring_type_id: request.recurring_type_id,
        interval_step: request.interval_step,
        start_date: request.start_date,
        end_date: request.end_date,
        week_days: request.week_days.clone(),
        month_days: request.month_days.clone(),
        year_days: request.year_days.clone(),
    };

    validate_planning_request(state, connection, &create_equivalent)
        .map_err(crate::domain::planning::PlanningError::Validation)?;

    connection
        .transaction::<Planning, crate::domain::planning::PlanningError, _>(|connection| {
            use crate::schema::{
                planning_recurring_month_days, planning_recurring_rules,
                planning_recurring_week_days, planning_recurring_year_days, plannings,
            };

            let existing_planning = plannings::table
                .find(planning_id_val)
                .select(PlanningRow::as_select())
                .first::<PlanningRow>(connection)?;

            diesel::update(plannings::table.find(planning_id_val))
                .set((
                    plannings::type_id.eq(request.type_id),
                    plannings::account_id.eq(request.account_id),
                    plannings::category_id.eq(request.category_id),
                    plannings::currency_id.eq(request.currency_id),
                    plannings::name.eq(&request.name),
                    plannings::amount.eq(request.amount),
                ))
                .execute(connection)?;

            diesel::update(
                planning_recurring_rules::table.find(existing_planning.recurring_rule_id),
            )
            .set((
                planning_recurring_rules::recurring_type_id.eq(request.recurring_type_id),
                planning_recurring_rules::interval_step.eq(request.interval_step),
                planning_recurring_rules::start_date.eq(request.start_date),
                planning_recurring_rules::end_date.eq(request.end_date),
            ))
            .execute(connection)?;

            // Clear old days
            diesel::delete(
                planning_recurring_week_days::table.filter(
                    planning_recurring_week_days::recurring_rule_id
                        .eq(existing_planning.recurring_rule_id),
                ),
            )
            .execute(connection)?;

            diesel::delete(
                planning_recurring_month_days::table.filter(
                    planning_recurring_month_days::recurring_rule_id
                        .eq(existing_planning.recurring_rule_id),
                ),
            )
            .execute(connection)?;

            diesel::delete(
                planning_recurring_year_days::table.filter(
                    planning_recurring_year_days::recurring_rule_id
                        .eq(existing_planning.recurring_rule_id),
                ),
            )
            .execute(connection)?;

            insert_rule_days(
                connection,
                existing_planning.recurring_rule_id,
                request.recurring_type_id,
                request.week_days.as_deref(),
                request.month_days.as_deref(),
                request.year_days.as_deref(),
            )?;

            // If rule definition changed, reconcile pending occurrences
            // Remove obsolete pending occurrence if rule changed, then generate new pending occurrence
            reconcile_current_occurrence_after_rule_update(connection, planning_id_val)?;

            let rule_detail =
                fetch_recurring_rule_detail(connection, existing_planning.recurring_rule_id)?;
            let today_start_ms = local_today_start_of_day_ms();
            let current_occurrence = get_actionable_occurrence_for_planning(
                connection,
                planning_id_val,
                today_start_ms,
            )?;

            Ok(Planning {
                id: planning_id_val,
                type_id: request.type_id,
                account_id: request.account_id,
                category_id: request.category_id,
                currency_id: request.currency_id,
                name: request.name,
                amount: request.amount,
                recurring_rule: rule_detail,
                current_occurrence,
            })
        })
        .map_err(|error| {
            tracing::error!("Failed updating planning id={}: {}", planning_id_val, error);
            error
        })
}

#[tauri::command]
pub fn delete_planning(state: State<'_, Mutex<AppState>>, id: i32) -> Result<usize, String> {
    tracing::debug!("Executing command delete_planning id={}", id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    delete_planning_internal(connection, id)
}

pub fn delete_planning_internal(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<usize, String> {
    delete_planning_service(connection, planning_id_val).map_err(|error| error.to_string())
}

fn delete_planning_service(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<usize, crate::domain::planning::PlanningError> {
    connection
        .transaction::<usize, crate::domain::planning::PlanningError, _>(|connection| {
            use crate::schema::{
                planning_occurrences, planning_recurring_month_days, planning_recurring_rules,
                planning_recurring_week_days, planning_recurring_year_days, plannings,
            };

            let planning_row = plannings::table
                .find(planning_id_val)
                .select(PlanningRow::as_select())
                .first::<PlanningRow>(connection)?;

            // Unlink any completed occurrences from movements before deleting occurrences (preserving movements)
            diesel::update(
                planning_occurrences::table
                    .filter(planning_occurrences::planning_id.eq(planning_id_val)),
            )
            .set(planning_occurrences::movement_id.eq(None::<i32>))
            .execute(connection)?;

            let count =
                diesel::delete(plannings::table.find(planning_id_val)).execute(connection)?;

            // Delete rule days and rule
            diesel::delete(planning_recurring_week_days::table.filter(
                planning_recurring_week_days::recurring_rule_id.eq(planning_row.recurring_rule_id),
            ))
            .execute(connection)?;

            diesel::delete(planning_recurring_month_days::table.filter(
                planning_recurring_month_days::recurring_rule_id.eq(planning_row.recurring_rule_id),
            ))
            .execute(connection)?;

            diesel::delete(planning_recurring_year_days::table.filter(
                planning_recurring_year_days::recurring_rule_id.eq(planning_row.recurring_rule_id),
            ))
            .execute(connection)?;

            diesel::delete(planning_recurring_rules::table.find(planning_row.recurring_rule_id))
                .execute(connection)?;

            Ok(count)
        })
        .map_err(|error| {
            tracing::error!("Failed deleting planning id={}: {}", planning_id_val, error);
            error
        })
}

#[tauri::command]
pub fn activate_planning(state: State<'_, Mutex<AppState>>, id: i32) -> Result<Planning, String> {
    tracing::debug!("Executing command activate_planning id={}", id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    activate_planning_internal(connection, id)
}

pub fn activate_planning_internal(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Planning, String> {
    activate_planning_service(connection, planning_id_val).map_err(|error| error.to_string())
}

fn activate_planning_service(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Planning, crate::domain::planning::PlanningError> {
    connection
        .transaction::<Planning, crate::domain::planning::PlanningError, _>(|connection| {
            use crate::schema::{planning_recurring_rules, plannings};

            let planning_row = plannings::table
                .find(planning_id_val)
                .select(PlanningRow::as_select())
                .first::<PlanningRow>(connection)?;

            diesel::update(planning_recurring_rules::table.find(planning_row.recurring_rule_id))
                .set(planning_recurring_rules::is_active.eq(true))
                .execute(connection)?;

            reconcile_current_occurrence(connection, planning_id_val)?;

            let rule_detail =
                fetch_recurring_rule_detail(connection, planning_row.recurring_rule_id)?;
            let today_start_ms = local_today_start_of_day_ms();
            let current_occurrence = get_actionable_occurrence_for_planning(
                connection,
                planning_id_val,
                today_start_ms,
            )?;

            Ok(Planning {
                id: planning_row.id,
                type_id: planning_row.type_id,
                account_id: planning_row.account_id,
                category_id: planning_row.category_id,
                currency_id: planning_row.currency_id,
                name: planning_row.name,
                amount: planning_row.amount,
                recurring_rule: rule_detail,
                current_occurrence,
            })
        })
        .map_err(|error| {
            tracing::error!("Failed activating planning id={}: {}", planning_id_val, error);
            error
        })
}

#[tauri::command]
pub fn deactivate_planning(state: State<'_, Mutex<AppState>>, id: i32) -> Result<Planning, String> {
    tracing::debug!("Executing command deactivate_planning id={}", id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    deactivate_planning_internal(connection, id)
}

pub fn deactivate_planning_internal(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Planning, String> {
    deactivate_planning_service(connection, planning_id_val).map_err(|error| error.to_string())
}

fn deactivate_planning_service(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Planning, crate::domain::planning::PlanningError> {
    connection
        .transaction::<Planning, crate::domain::planning::PlanningError, _>(|connection| {
            use crate::schema::{planning_recurring_rules, plannings};

            let planning_row = plannings::table
                .find(planning_id_val)
                .select(PlanningRow::as_select())
                .first::<PlanningRow>(connection)?;

            diesel::update(planning_recurring_rules::table.find(planning_row.recurring_rule_id))
                .set(planning_recurring_rules::is_active.eq(false))
                .execute(connection)?;

            reconcile_current_occurrence(connection, planning_id_val)?;

            let rule_detail =
                fetch_recurring_rule_detail(connection, planning_row.recurring_rule_id)?;
            let today_start_ms = local_today_start_of_day_ms();
            let current_occurrence = get_actionable_occurrence_for_planning(
                connection,
                planning_id_val,
                today_start_ms,
            )?;

            Ok(Planning {
                id: planning_row.id,
                type_id: planning_row.type_id,
                account_id: planning_row.account_id,
                category_id: planning_row.category_id,
                currency_id: planning_row.currency_id,
                name: planning_row.name,
                amount: planning_row.amount,
                recurring_rule: rule_detail,
                current_occurrence,
            })
        })
        .map_err(|error| {
            tracing::error!("Failed deactivating planning id={}: {}", planning_id_val, error);
            error
        })
}

// ---------------------------------------------------------
// Occurrence Transitions
// ---------------------------------------------------------

#[tauri::command]
pub fn cancel_planning_occurrence(
    state: State<'_, Mutex<AppState>>,
    occurrence_id: i32,
) -> Result<PlanningOccurrence, String> {
    tracing::debug!("Executing command cancel_planning_occurrence id={}", occurrence_id);
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    cancel_planning_occurrence_internal(connection, occurrence_id)
}

pub fn cancel_planning_occurrence_internal(
    connection: &mut SqliteConnection,
    occurrence_id_val: i32,
) -> Result<PlanningOccurrence, String> {
    cancel_planning_occurrence_service(connection, occurrence_id_val)
        .map_err(|error| error.to_string())
}

fn cancel_planning_occurrence_service(
    connection: &mut SqliteConnection,
    occurrence_id_val: i32,
) -> Result<PlanningOccurrence, crate::domain::planning::PlanningError> {
    connection
        .transaction::<PlanningOccurrence, crate::domain::planning::PlanningError, _>(
            |connection| {
                let row = crate::db::plannings::find_occurrence(connection, occurrence_id_val)?;

                if row.status_id != PLANNING_STATUS_PENDING {
                    return Err(crate::domain::planning::PlanningError::OccurrenceCannotCancel);
                }

                let updated_row = crate::db::plannings::set_occurrence_status(
                    connection,
                    occurrence_id_val,
                    PLANNING_STATUS_CANCELED,
                )?;

                reconcile_current_occurrence(connection, row.planning_id)?;

                let today_start_ms = local_today_start_of_day_ms();
                Ok(PlanningOccurrence::from_row(updated_row, today_start_ms))
            },
        )
        .map_err(|error| {
            tracing::error!(
                "Failed canceling planning occurrence id={}: {}",
                occurrence_id_val,
                error
            );
            error
        })
}

#[tauri::command]
pub fn complete_planning_occurrence(
    state: State<'_, Mutex<AppState>>,
    occurrence_id: i32,
    movement_id: i32,
) -> Result<PlanningOccurrence, String> {
    tracing::debug!(
        "Executing command complete_planning_occurrence id={} movement_id={}",
        occurrence_id,
        movement_id
    );
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);
    complete_planning_occurrence_internal(connection, &state, occurrence_id, movement_id)
}

pub fn complete_planning_occurrence_internal(
    connection: &mut SqliteConnection,
    state: &AppState,
    occurrence_id_val: i32,
    movement_id_val: i32,
) -> Result<PlanningOccurrence, String> {
    complete_planning_occurrence_service(connection, state, occurrence_id_val, movement_id_val)
        .map_err(|error| error.to_string())
}

fn complete_planning_occurrence_service(
    connection: &mut SqliteConnection,
    state: &AppState,
    occurrence_id_val: i32,
    movement_id_val: i32,
) -> Result<PlanningOccurrence, crate::domain::planning::PlanningError> {
    connection
        .transaction::<PlanningOccurrence, crate::domain::planning::PlanningError, _>(
            |connection| {
                use crate::schema::movements;

                let occ_row = crate::db::plannings::find_occurrence(connection, occurrence_id_val)?;

                if occ_row.status_id != PLANNING_STATUS_PENDING {
                    return Err(crate::domain::planning::PlanningError::OccurrenceCannotComplete);
                }

                let planning_row = crate::db::plannings::find(connection, occ_row.planning_id)?;

                let rule_row =
                    crate::db::plannings::find_rule(connection, planning_row.recurring_rule_id)?;

                if !rule_row.is_active {
                    return Err(crate::domain::planning::PlanningError::PlanningInactive);
                }

                use crate::models::movements::MovementRow;
                let mov_row = movements::table
                    .find(movement_id_val)
                    .select(MovementRow::as_select())
                    .first::<MovementRow>(connection)?;

                // Compatibility check
                if mov_row.account_id != planning_row.account_id
                    || mov_row.type_id != planning_row.type_id
                    || mov_row.currency_id != planning_row.currency_id
                {
                    return Err(crate::domain::planning::PlanningError::MovementIncompatible);
                }

                if !is_category_compatible(state, mov_row.category_id, planning_row.category_id) {
                    return Err(crate::domain::planning::PlanningError::MovementIncompatible);
                }

                let updated_row = crate::db::plannings::complete_occurrence(
                    connection,
                    occurrence_id_val,
                    PLANNING_STATUS_COMPLETED,
                    movement_id_val,
                )?;

                reconcile_current_occurrence(connection, planning_row.id)?;

                let today_start_ms = local_today_start_of_day_ms();
                Ok(PlanningOccurrence::from_row(updated_row, today_start_ms))
            },
        )
        .map_err(|error| {
            tracing::error!(
                "Failed completing planning occurrence id={}: {}",
                occurrence_id_val,
                error
            );
            error
        })
}

// ---------------------------------------------------------
// Core Occurrence Reconciler Logic
// ---------------------------------------------------------

/// Reconciles the occurrence chain for a planning.
///
/// Invariants:
/// 1. A planning may have multiple pending occurrences (e.g. after movement deletion recovery).
/// 2. Returns the oldest pending occurrence as the actionable one.
/// 3. Only generates a new occurrence if there are NO pending occurrences and the planning is active.
/// 4. When calculating a new occurrence, starts from the newest existing occurrence's expected_date using the current rule.
/// 5. Steps over dates that already have an occurrence (pending, completed, or canceled).
pub fn reconcile_current_occurrence(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Option<PlanningOccurrenceRow>, diesel::result::Error> {
    let planning_row = crate::db::plannings::find(connection, planning_id_val)?;
    let rule_row = crate::db::plannings::find_rule(connection, planning_row.recurring_rule_id)?;
    let all_occurrences = crate::db::plannings::list_occurrences(connection, planning_id_val)?;

    // If planning is inactive: cancel any pending occurrences
    if !rule_row.is_active {
        for occ in all_occurrences {
            if occ.status_id == PLANNING_STATUS_PENDING {
                crate::db::plannings::set_occurrence_status(
                    connection,
                    occ.id,
                    PLANNING_STATUS_CANCELED,
                )?;
            }
        }
        return Ok(None);
    }

    // If end_date is set, cancel any pending occurrences that exceed end_date
    if let Some(end_date_val) = rule_row.end_date {
        for occ in &all_occurrences {
            if occ.status_id == PLANNING_STATUS_PENDING && occ.expected_date > end_date_val {
                crate::db::plannings::set_occurrence_status(
                    connection,
                    occ.id,
                    PLANNING_STATUS_CANCELED,
                )?;
            }
        }
    }

    // Reload active pending occurrences (ordered by expected_date ASC)
    let pending_occurrences = crate::db::plannings::list_pending_occurrences(
        connection,
        planning_id_val,
        PLANNING_STATUS_PENDING,
    )?;

    // If we have any pending occurrence, return the oldest one
    if let Some(oldest_pending) = pending_occurrences.into_iter().next() {
        return Ok(Some(oldest_pending));
    }

    // No pending occurrences exist -> calculate and create the next occurrence
    let rule_def = fetch_recurring_rule_definition(connection, rule_row.id)?;

    // Start calculation from the newest existing occurrence's expected_date
    let (from_date, inclusive) = if let Some(newest_occ) =
        all_occurrences.iter().max_by_key(|o| o.expected_date)
    {
        (
            try_timestamp_to_local_naive_date(newest_occ.expected_date)
                .map_err(|error| diesel::result::Error::DeserializationError(Box::new(error)))?,
            false,
        )
    } else {
        (rule_def.start_date, true)
    };

    let mut current_search = from_date;
    let mut current_inclusive = inclusive;

    for _ in 0..100 {
        let candidate_opt = calculate_next_occurrence(&rule_def, current_search, current_inclusive);
        let candidate_date = match candidate_opt {
            Some(date) => date,
            None => return Ok(None), // Recurrence range ended
        };

        let candidate_ts = try_local_naive_date_to_start_of_day_ms(candidate_date)
            .map_err(|error| diesel::result::Error::SerializationError(Box::new(error)))?;

        // Check if an occurrence already exists on this expected_date
        let exists = all_occurrences.iter().any(|o| o.expected_date == candidate_ts);
        if exists {
            current_search = candidate_date;
            current_inclusive = false;
            continue;
        }

        // Insert new pending occurrence
        let new_insert = PlanningOccurrenceInsert {
            planning_id: planning_id_val,
            movement_id: None,
            status_id: PLANNING_STATUS_PENDING,
            expected_date: candidate_ts,
        };

        let created_row = crate::db::plannings::insert_occurrence(connection, &new_insert)?;

        return Ok(Some(created_row));
    }

    Ok(None)
}

fn reconcile_current_occurrence_after_rule_update(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
) -> Result<Option<PlanningOccurrenceRow>, diesel::result::Error> {
    // Delete obsolete pending occurrences that were future projections under the old rule
    crate::db::plannings::delete_pending_occurrences(
        connection,
        planning_id_val,
        PLANNING_STATUS_PENDING,
    )?;

    reconcile_current_occurrence(connection, planning_id_val)
}

fn get_actionable_occurrence_for_planning(
    connection: &mut SqliteConnection,
    planning_id_val: i32,
    today_start_ms: i64,
) -> Result<Option<PlanningOccurrence>, diesel::result::Error> {
    let pending_opt = crate::db::plannings::list_pending_occurrences(
        connection,
        planning_id_val,
        PLANNING_STATUS_PENDING,
    )?
    .into_iter()
    .next();

    Ok(pending_opt.map(|row| PlanningOccurrence::from_row(row, today_start_ms)))
}

// ---------------------------------------------------------
// Helper & Validation Functions
// ---------------------------------------------------------

pub fn is_category_compatible(
    state: &AppState,
    movement_category_id: i32,
    planning_category_id: i32,
) -> bool {
    crate::domain::categories::CategoryHierarchy::new(
        state.categories.iter().map(|category| (category.id, category.father_id)),
    )
    .is_descendant_of(movement_category_id, planning_category_id)
    .unwrap_or(false)
}

pub fn is_category_compatible_db(
    connection: &mut SqliteConnection,
    movement_category_id: i32,
    planning_category_id: i32,
) -> bool {
    use crate::models::categories::CategoryRow;
    use crate::schema::categories::dsl::categories;

    let rows = match categories.select(CategoryRow::as_select()).load::<CategoryRow>(connection) {
        Ok(rows) => rows,
        Err(_) => return false,
    };
    crate::domain::categories::CategoryHierarchy::new(
        rows.iter().map(|category| (category.id, category.father_id)),
    )
    .is_descendant_of(movement_category_id, planning_category_id)
    .unwrap_or(false)
}

fn insert_rule_days(
    connection: &mut SqliteConnection,
    rule_id: i32,
    recurring_type_id: i32,
    week_days: Option<&[i32]>,
    month_days: Option<&[i32]>,
    year_days: Option<&[PlanningYearDay]>,
) -> Result<(), diesel::result::Error> {
    use crate::schema::{
        planning_recurring_month_days, planning_recurring_week_days, planning_recurring_year_days,
    };

    match recurring_type_id {
        RECURRING_TYPE_WEEKLY => {
            if let Some(days) = week_days {
                for &day in days {
                    diesel::insert_into(planning_recurring_week_days::table)
                        .values((
                            planning_recurring_week_days::recurring_rule_id.eq(rule_id),
                            planning_recurring_week_days::day_of_week.eq(day),
                        ))
                        .execute(connection)?;
                }
            }
        }
        RECURRING_TYPE_MONTHLY => {
            if let Some(days) = month_days {
                for &day in days {
                    diesel::insert_into(planning_recurring_month_days::table)
                        .values((
                            planning_recurring_month_days::recurring_rule_id.eq(rule_id),
                            planning_recurring_month_days::day_of_month.eq(day),
                        ))
                        .execute(connection)?;
                }
            }
        }
        RECURRING_TYPE_YEARLY => {
            if let Some(dates) = year_days {
                for date in dates {
                    diesel::insert_into(planning_recurring_year_days::table)
                        .values((
                            planning_recurring_year_days::recurring_rule_id.eq(rule_id),
                            planning_recurring_year_days::month.eq(date.month),
                            planning_recurring_year_days::day_of_month.eq(date.day_of_month),
                        ))
                        .execute(connection)?;
                }
            }
        }
        _ => {}
    }

    Ok(())
}

fn fetch_recurring_rule_detail(
    connection: &mut SqliteConnection,
    rule_id: i32,
) -> Result<PlanningRecurringRuleDetail, diesel::result::Error> {
    use crate::schema::{
        planning_recurring_month_days, planning_recurring_rules, planning_recurring_week_days,
        planning_recurring_year_days,
    };

    let rule_row = planning_recurring_rules::table
        .find(rule_id)
        .select(PlanningRecurringRuleRow::as_select())
        .first::<PlanningRecurringRuleRow>(connection)?;

    let week_days = planning_recurring_week_days::table
        .filter(planning_recurring_week_days::recurring_rule_id.eq(rule_id))
        .select(planning_recurring_week_days::day_of_week)
        .load::<i32>(connection)?;

    let month_days = planning_recurring_month_days::table
        .filter(planning_recurring_month_days::recurring_rule_id.eq(rule_id))
        .select(planning_recurring_month_days::day_of_month)
        .load::<i32>(connection)?;

    let year_day_rows = planning_recurring_year_days::table
        .filter(planning_recurring_year_days::recurring_rule_id.eq(rule_id))
        .select((planning_recurring_year_days::month, planning_recurring_year_days::day_of_month))
        .load::<(i32, i32)>(connection)?;

    let year_days = year_day_rows
        .into_iter()
        .map(|(m, d)| PlanningYearDay { month: m, day_of_month: d })
        .collect();

    Ok(PlanningRecurringRuleDetail {
        id: rule_row.id,
        recurring_type_id: rule_row.recurring_type_id,
        interval_step: rule_row.interval_step,
        start_date: rule_row.start_date,
        end_date: rule_row.end_date,
        is_active: rule_row.is_active,
        week_days,
        month_days,
        year_days,
    })
}

fn fetch_recurring_rule_definition(
    connection: &mut SqliteConnection,
    rule_id: i32,
) -> Result<RecurrenceRuleDefinition, diesel::result::Error> {
    let detail = fetch_recurring_rule_detail(connection, rule_id)?;

    Ok(RecurrenceRuleDefinition {
        recurring_type_id: detail.recurring_type_id,
        interval_step: detail.interval_step,
        start_date: try_timestamp_to_local_naive_date(detail.start_date)
            .map_err(|error| diesel::result::Error::DeserializationError(Box::new(error)))?,
        end_date: detail
            .end_date
            .map(try_timestamp_to_local_naive_date)
            .transpose()
            .map_err(|error| diesel::result::Error::DeserializationError(Box::new(error)))?,
        week_days: detail.week_days,
        month_days: detail.month_days,
        year_days: detail.year_days.into_iter().map(|yd| (yd.month, yd.day_of_month)).collect(),
    })
}

fn validate_planning_request(
    state: &AppState,
    connection: &mut SqliteConnection,
    req: &CreatePlanningRequest,
) -> Result<(), Vec<String>> {
    use crate::schema::accounts;

    let mut errors = Vec::new();

    if req.name.trim().is_empty() {
        errors.push("El nombre de la planificación es requerido".to_string());
    }

    if !req.amount.is_finite() || req.amount < 0.0 {
        errors.push("El monto debe ser mayor o igual a cero".to_string());
    }

    if req.type_id != MOVEMENT_INCOME_ID && req.type_id != MOVEMENT_EXPENSE_ID {
        errors.push("Solo se permiten movimientos de tipo ingreso o egreso".to_string());
    }

    if !state.currencies.iter().any(|c| c.id == req.currency_id) {
        errors.push("La moneda seleccionada no existe".to_string());
    }

    if !state.categories.iter().any(|c| c.id == req.category_id) {
        errors.push("La categoría seleccionada no existe".to_string());
    }

    // Account validation
    let account_row_opt = accounts::table
        .find(req.account_id)
        .select((accounts::id, accounts::type_id))
        .first::<(i32, i32)>(connection)
        .optional()
        .unwrap_or(None);

    match account_row_opt {
        Some((_, acc_type_id)) => {
            if acc_type_id == ACCOUNT_TYPE_CREDIT_CARD_ID && req.type_id != MOVEMENT_EXPENSE_ID {
                errors.push(
                    "Las tarjetas de crédito solo permiten planificaciones de tipo gasto"
                        .to_string(),
                );
            }
        }
        None => {
            errors.push("La cuenta seleccionada no existe".to_string());
        }
    }

    // Recurring rule validation
    if req.interval_step <= 0 {
        errors.push("El intervalo debe ser mayor a cero".to_string());
    }

    if let Some(end_date) = req.end_date {
        if end_date < req.start_date {
            errors.push("La fecha final no puede ser menor a la fecha inicial".to_string());
        }
    }

    match req.recurring_type_id {
        RECURRING_TYPE_DAILY => {}
        RECURRING_TYPE_WEEKLY => match &req.week_days {
            Some(days) if !days.is_empty() => {
                for &d in days {
                    if !(0..=6).contains(&d) {
                        errors
                            .push("Día de la semana inválido (debe estar entre 0 y 6)".to_string());
                        break;
                    }
                }
            }
            _ => errors.push("Debe seleccionar al menos un día de la semana".to_string()),
        },
        RECURRING_TYPE_MONTHLY => match &req.month_days {
            Some(days) if !days.is_empty() => {
                for &d in days {
                    if !(1..=28).contains(&d) {
                        errors.push("Día del mes inválido (debe estar entre 1 y 28)".to_string());
                        break;
                    }
                }
            }
            _ => errors.push("Debe seleccionar al menos un día del mes (1 al 28)".to_string()),
        },
        RECURRING_TYPE_YEARLY => match &req.year_days {
            Some(dates) if !dates.is_empty() => {
                for yd in dates {
                    if !(1..=12).contains(&yd.month) || !(1..=28).contains(&yd.day_of_month) {
                        errors.push("Fecha anual inválida (mes 1-12 y día 1-28)".to_string());
                        break;
                    }
                }
            }
            _ => errors.push("Debe seleccionar al menos una fecha del año".to_string()),
        },
        _ => errors.push("El tipo de recurrencia no es válido".to_string()),
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
