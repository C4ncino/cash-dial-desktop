use crate::db::connect::establish_connection;
use diesel::prelude::*;
use std::sync::Mutex;
use tauri::State;

use crate::models::general::AppState;
use crate::models::movements::{
    Movement, MovementInsert, MovementInstallment, MovementInstallmentRow, MovementRow,
    MovementType,
};

#[cfg(test)]
#[path = "./movements_test.rs"]
mod movements_test;

const MOVEMENT_INCOME_ID: i32 = 1;
const MOVEMENT_EXPENSE_ID: i32 = 2;
const MOVEMENT_TRANSFER_ID: i32 = 3;

const TRANSFER_CATEGORY_ID: i32 = 88;

#[tauri::command]
pub fn get_movement_types(state: State<'_, Mutex<AppState>>) -> Result<Vec<MovementType>, String> {
    let state = state.lock().unwrap();

    Ok(state.movement_types.clone())
}

#[tauri::command]
pub fn get_movements(state: State<'_, Mutex<AppState>>) -> Result<Vec<Movement>, String> {
    tracing::debug!("Executing command get_movements");

    let state = state.lock().unwrap();

    let connection = &mut establish_connection(&state.config.database_url);

    get_movements_internal(connection)
}

#[tauri::command]
pub fn get_movement(
    state: State<'_, Mutex<AppState>>,
    movement_id: i32,
) -> Result<Movement, String> {
    tracing::debug!("Executing command get_movement id={}", movement_id);

    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    get_movement_internal(connection, movement_id)
}

pub(crate) fn get_movement_internal(
    connection: &mut SqliteConnection,
    movement_id_val: i32,
) -> Result<Movement, String> {
    use crate::schema::movements::dsl::movements;

    movements
        .find(movement_id_val)
        .select(MovementRow::as_select())
        .first::<MovementRow>(connection)
        .map(Movement::from)
        .map_err(|e| {
            tracing::error!("Failed loading movement {}: {}", movement_id_val, e);
            e.to_string()
        })
}

fn get_movements_internal(connection: &mut SqliteConnection) -> Result<Vec<Movement>, String> {
    use crate::schema::movements::dsl::{movements, timestamp};

    movements
        .order(timestamp.desc())
        .select(MovementRow::as_select())
        .load::<MovementRow>(connection)
        .map(|rows| rows.into_iter().map(Movement::from).collect())
        .map_err(|e| {
            tracing::error!("Failed loading movements: {}", e);
            e.to_string()
        })
}

#[tauri::command]
pub fn get_movement_installments(
    state: State<'_, Mutex<AppState>>,
    movement_id: i32,
) -> Result<Vec<MovementInstallment>, String> {
    tracing::debug!("Executing command get_movement_installments movement_id={}", movement_id);

    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    get_movement_installments_internal(connection, movement_id)
}

fn get_movement_installments_internal(
    connection: &mut SqliteConnection,
    movement_id_val: i32,
) -> Result<Vec<MovementInstallment>, String> {
    use crate::schema::movement_installments::dsl::{
        installment_number, movement_id, movement_installments,
    };

    movement_installments
        .filter(movement_id.eq(movement_id_val))
        .order(installment_number.asc())
        .select(MovementInstallmentRow::as_select())
        .load::<MovementInstallmentRow>(connection)
        .map(|rows| rows.into_iter().map(MovementInstallment::from).collect())
        .map_err(|e| {
            tracing::error!("Failed loading installments for movement {}: {}", movement_id_val, e);
            e.to_string()
        })
}

#[tauri::command]
pub fn add_movement(
    state: State<'_, Mutex<AppState>>,
    type_id: i32,
    account_id: i32,
    to_account_id: Option<i32>,
    category_id: i32,
    currency_id: i32,
    original_amount: f64,
    account_amount: f64,
    installments: Option<i32>,
    timestamp: i64,
    description: Option<String>,
    planning_id: Option<i32>,
) -> Result<Movement, String> {
    tracing::debug!("Executing command add_movement type_id={} account_id={}", type_id, account_id);

    let state = state.lock().unwrap();

    validate_movement(
        &state,
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        installments,
    )
    .map_err(|e| e.join(", "))?;

    if !account_amount.is_finite() || account_amount <= 0.0 {
        return Err("El monto en la cuenta debe ser mayor a 0".to_string());
    }

    let connection = &mut establish_connection(&state.config.database_url);

    add_movement_internal(
        connection,
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        account_amount,
        installments,
        timestamp,
        description.as_deref(),
        planning_id,
    )
}

pub(crate) fn add_movement_internal(
    connection: &mut SqliteConnection,
    type_id: i32,
    account_id: i32,
    to_account_id: Option<i32>,
    category_id: i32,
    currency_id: i32,
    original_amount: f64,
    account_amount: f64,
    installments: Option<i32>,
    timestamp: i64,
    description: Option<&str>,
    planning_id: Option<i32>,
) -> Result<Movement, String> {
    use crate::schema::movements::dsl::movements;

    let row = connection
        .transaction::<MovementRow, diesel::result::Error, _>(|connection| {
            let mut pending_occ_id_to_complete: Option<i32> = None;

            if let Some(p_id) = planning_id {
                use crate::functions::plannings::is_category_compatible_db;
                use crate::models::plannings::{
                    PlanningOccurrenceRow, PlanningRecurringRuleRow, PlanningRow,
                    PLANNING_STATUS_PENDING,
                };
                use crate::schema::{
                    planning_occurrences, planning_recurring_rules, plannings,
                };

                let planning_row = plannings::table
                    .find(p_id)
                    .select(PlanningRow::as_select())
                    .first::<PlanningRow>(connection)?;

                let rule_row = planning_recurring_rules::table
                    .find(planning_row.recurring_rule_id)
                    .select(PlanningRecurringRuleRow::as_select())
                    .first::<PlanningRecurringRuleRow>(connection)?;

                if !rule_row.is_active {
                    return Err(diesel::result::Error::RollbackTransaction);
                }

                if planning_row.account_id != account_id
                    || planning_row.type_id != type_id
                    || planning_row.currency_id != currency_id
                {
                    return Err(diesel::result::Error::RollbackTransaction);
                }

                if !is_category_compatible_db(connection, category_id, planning_row.category_id) {
                    return Err(diesel::result::Error::RollbackTransaction);
                }

                let pending_occ = planning_occurrences::table
                    .filter(planning_occurrences::planning_id.eq(p_id))
                    .filter(planning_occurrences::status_id.eq(PLANNING_STATUS_PENDING))
                    .order(planning_occurrences::expected_date.asc())
                    .select(PlanningOccurrenceRow::as_select())
                    .first::<PlanningOccurrenceRow>(connection)
                    .optional()?;

                match pending_occ {
                    Some(occ) => pending_occ_id_to_complete = Some(occ.id),
                    None => return Err(diesel::result::Error::RollbackTransaction),
                }
            }

            ensure_account_exists(connection, account_id)?;
            if let Some(to_account_id) = to_account_id {
                ensure_account_exists(connection, to_account_id)?;
            }

            let final_account_amount = account_amount;

            let new_movement = MovementInsert {
                type_id,
                account_id,
                to_account_id,
                category_id: if type_id == MOVEMENT_TRANSFER_ID {
                    TRANSFER_CATEGORY_ID
                } else {
                    category_id
                },
                currency_id,
                original_amount,
                account_amount: final_account_amount,
                installments,
                timestamp,
                description,
            };

            let inserted_row = diesel::insert_into(movements)
                .values(&new_movement)
                .returning(MovementRow::as_returning())
                .get_result::<MovementRow>(connection)?;

            let effective_rate = if original_amount > 0.0 {
                final_account_amount / original_amount
            } else {
                1.0
            };
            diesel::update(movements.find(inserted_row.id))
                .set(crate::schema::movements::conversion_rate.eq(effective_rate))
                .execute(connection)?;
            let row = movements.find(inserted_row.id).select(MovementRow::as_select()).first(connection)?;

            apply_movement_to_accounts(connection, &row)?;

            create_installments_if_credit(
                connection,
                row.id,
                type_id,
                account_id,
                account_amount,
                installments,
                timestamp,
            )?;

            if let Some(occ_id) = pending_occ_id_to_complete {
                use crate::functions::plannings::reconcile_current_occurrence;
                use crate::models::plannings::PLANNING_STATUS_COMPLETED;
                use crate::schema::planning_occurrences;

                diesel::update(planning_occurrences::table.find(occ_id))
                    .set((
                        planning_occurrences::status_id.eq(PLANNING_STATUS_COMPLETED),
                        planning_occurrences::movement_id.eq(Some(row.id)),
                    ))
                    .execute(connection)?;

                if let Some(p_id) = planning_id {
                    reconcile_current_occurrence(connection, p_id)?;
                }
            }

            Ok(row)
        })
        .map_err(|e| {
            tracing::error!("Failed inserting movement: {}", e);
            e.to_string()
        })?;

    tracing::info!("Movement created id={}", row.id);

    Ok(Movement::from(row))
}

#[tauri::command]
pub fn update_movement(
    state: State<'_, Mutex<AppState>>,
    id: i32,
    type_id: i32,
    account_id: i32,
    to_account_id: Option<i32>,
    category_id: i32,
    currency_id: i32,
    original_amount: f64,
    account_amount: f64,
    installments: Option<i32>,
    timestamp: i64,
    description: Option<String>,
) -> Result<Movement, String> {
    tracing::debug!("Executing command update_movement id={}", id);

    let state = state.lock().unwrap();

    validate_movement(
        &state,
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        installments,
    )
    .map_err(|e| e.join(", "))?;

    if !account_amount.is_finite() || account_amount <= 0.0 {
        return Err("El monto en la cuenta debe ser mayor a 0".to_string());
    }

    let connection = &mut establish_connection(&state.config.database_url);

    update_movement_internal(
        connection,
        id,
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        account_amount,
        installments,
        timestamp,
        description.as_deref(),
    )
}

fn update_movement_internal(
    connection: &mut SqliteConnection,
    id: i32,
    type_id: i32,
    account_id: i32,
    to_account_id: Option<i32>,
    category_id: i32,
    currency_id: i32,
    original_amount: f64,
    account_amount: f64,
    installments: Option<i32>,
    timestamp: i64,
    description: Option<&str>,
) -> Result<Movement, String> {
    use crate::schema::movements::dsl::movements;

    let row = connection
        .transaction::<MovementRow, diesel::result::Error, _>(|connection| {
            let old_row = movements
                .find(id)
                .select(MovementRow::as_select())
                .first::<MovementRow>(connection)?;

            if old_row.type_id != type_id {
                return Err(diesel::result::Error::RollbackTransaction);
            }

            // Check compatibility if linked to a planning occurrence
            {
                use crate::functions::plannings::is_category_compatible_db;
                use crate::models::plannings::{PlanningOccurrenceRow, PlanningRow};
                use crate::schema::{planning_occurrences, plannings};

                let linked_occ_opt = planning_occurrences::table
                    .filter(planning_occurrences::movement_id.eq(Some(id)))
                    .select(PlanningOccurrenceRow::as_select())
                    .first::<PlanningOccurrenceRow>(connection)
                    .optional()?;

                if let Some(linked_occ) = linked_occ_opt {
                    let planning_row = plannings::table
                        .find(linked_occ.planning_id)
                        .select(PlanningRow::as_select())
                        .first::<PlanningRow>(connection)?;

                    if planning_row.account_id != account_id
                        || planning_row.type_id != type_id
                        || planning_row.currency_id != currency_id
                        || !is_category_compatible_db(connection, category_id, planning_row.category_id)
                    {
                        return Err(diesel::result::Error::RollbackTransaction);
                    }
                }
            }

            ensure_account_exists(connection, account_id)?;
            if let Some(to_account_id) = to_account_id {
                ensure_account_exists(connection, to_account_id)?;
            }

            reverse_movement_from_accounts(connection, &old_row)?;

            // Delete old installments
            {
                use crate::schema::movement_installments::dsl::{
                    movement_id as inst_movement_id, movement_installments,
                };
                diesel::delete(movement_installments.filter(inst_movement_id.eq(id)))
                    .execute(connection)?;
            }

            let final_account_amount = account_amount;

            let updated_row = diesel::update(movements.find(id))
                .set((
                    crate::schema::movements::account_id.eq(account_id),
                    crate::schema::movements::to_account_id.eq(to_account_id),
                    crate::schema::movements::category_id.eq(if type_id == MOVEMENT_TRANSFER_ID {
                        TRANSFER_CATEGORY_ID
                    } else {
                        category_id
                    }),
                    crate::schema::movements::currency_id.eq(currency_id),
                    crate::schema::movements::original_amount.eq(original_amount),
                    crate::schema::movements::account_amount.eq(final_account_amount),
                    crate::schema::movements::conversion_rate.eq(if original_amount > 0.0 {
                        final_account_amount / original_amount
                    } else {
                        1.0
                    }),
                    crate::schema::movements::installments.eq(installments),
                    crate::schema::movements::timestamp.eq(timestamp),
                    crate::schema::movements::description.eq(description),
                ))
                .returning(MovementRow::as_returning())
                .get_result::<MovementRow>(connection)?;

            apply_movement_to_accounts(connection, &updated_row)?;

            create_installments_if_credit(
                connection,
                id,
                type_id,
                account_id,
                account_amount,
                installments,
                timestamp,
            )?;

            Ok(updated_row)
        })
        .map_err(|e| {
            if matches!(e, diesel::result::Error::RollbackTransaction) {
                tracing::warn!("Rejected movement update due to type change or planning incompatibility id={}", id);
                "El tipo de movimiento no se puede cambiar o los datos son incompatibles con la planificación vinculada".to_string()
            } else {
                tracing::error!("Failed updating movement {}: {}", id, e);
                e.to_string()
            }
        })?;

    tracing::info!("Movement updated id={}", row.id);

    Ok(Movement::from(row))
}

#[tauri::command]
pub fn remove_movement(state: State<'_, Mutex<AppState>>, id: i32) -> Result<usize, String> {
    tracing::debug!("Executing command remove_movement id={}", id);

    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    remove_movement_internal(connection, id)
}

fn remove_movement_internal(connection: &mut SqliteConnection, id: i32) -> Result<usize, String> {
    use crate::schema::movements::dsl::movements;

    let deleted_count = connection
        .transaction::<usize, diesel::result::Error, _>(|connection| {
            let old_row = movements
                .find(id)
                .select(MovementRow::as_select())
                .first::<MovementRow>(connection)?;

            // Check if movement is linked to any planning occurrence
            use crate::functions::plannings::reconcile_current_occurrence;
            use crate::models::plannings::{PlanningOccurrenceRow, PLANNING_STATUS_PENDING};
            use crate::schema::planning_occurrences;

            let linked_occ_opt = planning_occurrences::table
                .filter(planning_occurrences::movement_id.eq(Some(id)))
                .select(PlanningOccurrenceRow::as_select())
                .first::<PlanningOccurrenceRow>(connection)
                .optional()?;

            if let Some(ref linked_occ) = linked_occ_opt {
                diesel::update(planning_occurrences::table.find(linked_occ.id))
                    .set((
                        planning_occurrences::movement_id.eq(None::<i32>),
                        planning_occurrences::status_id.eq(PLANNING_STATUS_PENDING),
                    ))
                    .execute(connection)?;
            }

            reverse_movement_from_accounts(connection, &old_row)?;

            // Delete installments
            {
                use crate::schema::movement_installments::dsl::{
                    movement_id as inst_movement_id, movement_installments,
                };
                diesel::delete(movement_installments.filter(inst_movement_id.eq(id)))
                    .execute(connection)?;
            }

            let count = diesel::delete(movements.find(id)).execute(connection)?;

            if let Some(linked_occ) = linked_occ_opt {
                reconcile_current_occurrence(connection, linked_occ.planning_id)?;
            }

            Ok(count)
        })
        .map_err(|e| {
            tracing::error!("Failed deleting movement {}: {}", id, e);
            e.to_string()
        })?;

    tracing::info!("Movement deleted id={} count={}", id, deleted_count);

    Ok(deleted_count)
}

fn validate_movement(
    state: &AppState,
    type_id: i32,
    account_id: i32,
    to_account_id: Option<i32>,
    category_id: i32,
    currency_id: i32,
    original_amount: f64,
    installments: Option<i32>,
) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    if !state.movement_types.iter().any(|movement_type| movement_type.id == type_id) {
        errors.push("El tipo de movimiento no existe".to_string());
    }

    if account_id <= 0 {
        errors.push("La cuenta es requerida".to_string());
    }

    if type_id == MOVEMENT_TRANSFER_ID {
        match to_account_id {
            Some(to_account_id) if to_account_id == account_id => {
                errors.push("La cuenta destino debe ser diferente".to_string());
            }
            Some(_) => {}
            None => errors.push("La cuenta destino es requerida".to_string()),
        }
    } else if to_account_id.is_some() {
        errors.push("La cuenta destino solo aplica para transferencias".to_string());
    }

    if type_id != MOVEMENT_TRANSFER_ID && !state.categories.iter().any(|c| c.id == category_id) {
        errors.push("La categoría seleccionada no existe".to_string());
    }

    if !state.currencies.iter().any(|c| c.id == currency_id) {
        errors.push("La moneda seleccionada no existe".to_string());
    }

    if !original_amount.is_finite() || original_amount <= 0.0 {
        errors.push("El monto debe ser mayor a 0".to_string());
    }

    if installments.is_some_and(|value| !(1..=48).contains(&value)) {
        errors.push("Las mensualidades deben ser entre 1 y 48".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn apply_movement_to_accounts(
    connection: &mut SqliteConnection,
    movement: &MovementRow,
) -> QueryResult<()> {
    match movement.type_id {
        MOVEMENT_INCOME_ID => {
            add_to_account_balance(connection, movement.account_id, movement.account_amount)
        }
        MOVEMENT_EXPENSE_ID => {
            add_to_account_balance(connection, movement.account_id, -movement.account_amount)
        }
        MOVEMENT_TRANSFER_ID => {
            // For transfers, original_amount is the amount charged to the
            // origin account and account_amount is what the destination
            // account actually receives.
            add_to_account_balance(connection, movement.account_id, -movement.original_amount)?;
            add_to_account_balance(
                connection,
                movement.to_account_id.ok_or(diesel::result::Error::NotFound)?,
                movement.account_amount,
            )
        }
        _ => Err(diesel::result::Error::NotFound),
    }
}

fn reverse_movement_from_accounts(
    connection: &mut SqliteConnection,
    movement: &MovementRow,
) -> QueryResult<()> {
    match movement.type_id {
        MOVEMENT_INCOME_ID => {
            add_to_account_balance(connection, movement.account_id, -movement.account_amount)
        }
        MOVEMENT_EXPENSE_ID => {
            add_to_account_balance(connection, movement.account_id, movement.account_amount)
        }
        MOVEMENT_TRANSFER_ID => {
            add_to_account_balance(connection, movement.account_id, movement.original_amount)?;
            add_to_account_balance(
                connection,
                movement.to_account_id.ok_or(diesel::result::Error::NotFound)?,
                -movement.account_amount,
            )
        }
        _ => Err(diesel::result::Error::NotFound),
    }
}

fn ensure_account_exists(connection: &mut SqliteConnection, id: i32) -> QueryResult<()> {
    use crate::schema::accounts::dsl::accounts;

    accounts.find(id).select(crate::schema::accounts::id).first::<i32>(connection)?;

    Ok(())
}

pub(crate) fn add_to_account_balance(
    connection: &mut SqliteConnection,
    account_id: i32,
    delta: f64,
) -> QueryResult<()> {
    use crate::schema::accounts::dsl::{accounts, balance};

    let current_balance = accounts.find(account_id).select(balance).first::<f64>(connection)?;

    let updated_count = diesel::update(accounts.find(account_id))
        .set(balance.eq(current_balance + delta))
        .execute(connection)?;

    if updated_count == 0 {
        Err(diesel::result::Error::NotFound)
    } else {
        Ok(())
    }
}

fn create_installments_if_credit(
    connection: &mut SqliteConnection,
    movement_id: i32,
    type_id: i32,
    account_id: i32,
    account_amount: f64,
    installments: Option<i32>,
    timestamp: i64,
) -> QueryResult<()> {
    if type_id == MOVEMENT_EXPENSE_ID {
        use crate::schema::accounts_credit_info::dsl::{
            account_id as credit_acc_id, accounts_credit_info,
        };
        let credit_info_row: Option<crate::models::accounts::AccountCreditInfoRow> =
            accounts_credit_info
                .filter(credit_acc_id.eq(account_id))
                .first::<crate::models::accounts::AccountCreditInfoRow>(connection)
                .optional()?;

        if let Some(credit_info) = credit_info_row {
            let total_inst = installments.unwrap_or(1);
            let total_cents = (account_amount * 100.0).round() as i64;
            let base_cents = total_cents / i64::from(total_inst);
            let final_cents = total_cents - base_cents * i64::from(total_inst - 1);

            use crate::models::movements::MovementInstallmentInsert;
            use crate::schema::movement_installments::dsl::movement_installments;
            use crate::utils::date::calculate_credit_payment_date_for_installment;

            for i in 1..=total_inst {
                let installment_cents = if i == total_inst { final_cents } else { base_cents };
                let due_timestamp = calculate_credit_payment_date_for_installment(
                    timestamp,
                    credit_info.cutoff_day as u32,
                    credit_info.days_to_pay as u32,
                    i,
                );

                let installment = MovementInstallmentInsert {
                    movement_id,
                    installment_number: i,
                    total_installments: total_inst,
                    amount: installment_cents as f64 / 100.0,
                    due_timestamp,
                    paid: false,
                    paid_timestamp: None,
                };

                diesel::insert_into(movement_installments)
                    .values(&installment)
                    .execute(connection)?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn mark_installments_as_paid(
    state: State<'_, Mutex<AppState>>,
    installment_ids: Vec<i32>,
) -> Result<Vec<i32>, String> {
    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    mark_installments_as_paid_internal(connection, installment_ids)
}

pub(crate) fn mark_installments_as_paid_internal(
    connection: &mut SqliteConnection,
    installment_ids: Vec<i32>,
) -> Result<Vec<i32>, String> {
    if installment_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut unique_ids = installment_ids;
    unique_ids.sort();
    unique_ids.dedup();

    let unique_options: Vec<Option<i32>> = unique_ids.iter().map(|&x| Some(x)).collect();

    connection
        .transaction::<Vec<i32>, diesel::result::Error, _>(|connection| {
            use crate::schema::movement_installments::dsl::{
                id, movement_id, movement_installments, paid, paid_timestamp,
            };

            let count: i64 = movement_installments
                .filter(id.eq_any(&unique_options))
                .count()
                .get_result(connection)?;

            if count != unique_ids.len() as i64 {
                return Err(diesel::result::Error::NotFound);
            }

            let now_ms = chrono::Local::now().timestamp_millis();
            diesel::update(movement_installments.filter(id.eq_any(&unique_options)))
                .set((paid.eq(true), paid_timestamp.eq(Some(now_ms))))
                .execute(connection)?;

            let mut movement_ids = movement_installments
                .filter(id.eq_any(&unique_options))
                .select(movement_id)
                .load::<i32>(connection)?;

            movement_ids.sort();
            movement_ids.dedup();

            Ok(movement_ids)
        })
        .map_err(|e| {
            if matches!(e, diesel::result::Error::NotFound) {
                "Uno o más IDs de mensualidades no existen".to_string()
            } else {
                e.to_string()
            }
        })
}
