use crate::db::connect::establish_connection;
use diesel::prelude::*;
use std::sync::Mutex;
use tauri::State;

use crate::domain::movements::{
    balance_effect_for_row, BalanceEffect, MovementError, MovementInput, UpdateMovementInput,
    EXPENSE_ID, TRANSFER_ID,
};
use crate::models::general::AppState;
use crate::models::movements::{Movement, MovementInstallment, MovementRow, MovementType};

#[cfg(test)]
#[path = "./movements_test.rs"]
mod movements_test;

const MOVEMENT_EXPENSE_ID: i32 = EXPENSE_ID;
const MOVEMENT_TRANSFER_ID: i32 = TRANSFER_ID;

#[tauri::command]
pub fn get_movement_types(state: State<'_, Mutex<AppState>>) -> Result<Vec<MovementType>, String> {
    let state = crate::utils::lock_app_state(&state)?;

    Ok(state.movement_types.clone())
}

#[tauri::command]
pub fn get_movements(state: State<'_, Mutex<AppState>>) -> Result<Vec<Movement>, String> {
    tracing::debug!("Executing command get_movements");

    let state = crate::utils::lock_app_state(&state)?;

    let connection = &mut establish_connection(&state.config.database_url);

    get_movements_internal(connection)
}

#[tauri::command]
pub fn get_movement(
    state: State<'_, Mutex<AppState>>,
    movement_id: i32,
) -> Result<Movement, String> {
    tracing::debug!("Executing command get_movement id={}", movement_id);

    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);

    get_movement_internal(connection, movement_id)
}

pub(crate) fn get_movement_internal(
    connection: &mut SqliteConnection,
    movement_id_val: i32,
) -> Result<Movement, String> {
    crate::db::movements::find(connection, movement_id_val).map(Movement::from).map_err(|e| {
        tracing::error!("Failed loading movement {}: {}", movement_id_val, e);
        e.to_string()
    })
}

fn get_movements_internal(connection: &mut SqliteConnection) -> Result<Vec<Movement>, String> {
    crate::db::movements::list(connection)
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

    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);

    get_movement_installments_internal(connection, movement_id)
}

fn get_movement_installments_internal(
    connection: &mut SqliteConnection,
    movement_id_val: i32,
) -> Result<Vec<MovementInstallment>, String> {
    crate::db::movements::installments(connection, movement_id_val)
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

    let state = crate::utils::lock_app_state(&state)?;

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
    let input = MovementInput::new(
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        account_amount,
        installments,
        timestamp,
        description.map(str::to_string),
        planning_id,
    )
    .map_err(|error| error.to_string())?;

    create_movement(connection, input).map_err(|error| error.to_string())
}

pub(crate) fn create_movement(
    connection: &mut SqliteConnection,
    input: MovementInput,
) -> Result<Movement, MovementError> {
    connection.transaction::<Movement, MovementError, _>(|connection| {
        create_movement_in_transaction(connection, &input)
    })
}

pub(crate) fn create_movement_in_transaction(
    connection: &mut SqliteConnection,
    input: &MovementInput,
) -> Result<Movement, MovementError> {
    let row = (|| -> Result<MovementRow, MovementError> {
        let mut pending_occ_id_to_complete: Option<i32> = None;

        if let Some(p_id) = input.planning_id {
            use crate::functions::plannings::is_category_compatible_db;
            use crate::models::plannings::{
                PlanningOccurrenceRow, PlanningRecurringRuleRow, PlanningRow,
                PLANNING_STATUS_PENDING,
            };
            use crate::schema::{planning_occurrences, planning_recurring_rules, plannings};

            let planning_row = plannings::table
                .find(p_id)
                .select(PlanningRow::as_select())
                .first::<PlanningRow>(connection)?;

            let rule_row = planning_recurring_rules::table
                .find(planning_row.recurring_rule_id)
                .select(PlanningRecurringRuleRow::as_select())
                .first::<PlanningRecurringRuleRow>(connection)?;

            if !rule_row.is_active {
                return Err(MovementError::PlanningInactive);
            }

            if planning_row.account_id != input.account_id()
                || planning_row.type_id != i32::from(input.kind())
                || planning_row.currency_id != input.currency_id
            {
                return Err(MovementError::PlanningIncompatible);
            }

            if !is_category_compatible_db(connection, input.category_id, planning_row.category_id) {
                return Err(MovementError::PlanningIncompatible);
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
                None => return Err(MovementError::PendingOccurrenceNotFound),
            }
        }

        ensure_account_exists(connection, input.account_id())
            .map_err(|_| MovementError::AccountNotFound(input.account_id()))?;
        if let Some(to_account_id) = input.to_account_id() {
            ensure_account_exists(connection, to_account_id)
                .map_err(|_| MovementError::AccountNotFound(to_account_id))?;
        }

        let row = crate::db::movements::insert(connection, input)?;

        apply_balance_effect(connection, &input.balance_effect()?)?;

        create_installments_if_credit(
            connection,
            row.id,
            i32::from(input.kind()),
            input.account_id(),
            input.account_amount.value(),
            input.installments,
            input.timestamp,
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

            if let Some(p_id) = input.planning_id {
                reconcile_current_occurrence(connection, p_id)?;
            }
        }

        Ok(row)
    })()?;

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

    let state = crate::utils::lock_app_state(&state)?;

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

    let movement = MovementInput::new(
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        account_amount,
        installments,
        timestamp,
        description,
        None,
    )
    .map_err(|error| error.to_string())?;

    update_movement_service(connection, UpdateMovementInput { id, movement })
        .map_err(|error| error.to_string())
}

#[cfg(test)]
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
    let movement = MovementInput::new(
        type_id,
        account_id,
        to_account_id,
        category_id,
        currency_id,
        original_amount,
        account_amount,
        installments,
        timestamp,
        description.map(str::to_string),
        None,
    )
    .map_err(|error| error.to_string())?;

    update_movement_service(connection, UpdateMovementInput { id, movement })
        .map_err(|error| error.to_string())
}

fn update_movement_service(
    connection: &mut SqliteConnection,
    input: UpdateMovementInput,
) -> Result<Movement, MovementError> {
    let movement_id = input.id;
    let movement = input.movement;

    let row = connection.transaction::<MovementRow, MovementError, _>(|connection| {
        let old_row = crate::db::movements::find(connection, movement_id)?;

        if old_row.type_id != i32::from(movement.kind()) {
            return Err(MovementError::MovementTypeChange);
        }

        use crate::functions::plannings::is_category_compatible_db;
        use crate::models::plannings::{PlanningOccurrenceRow, PlanningRow};
        use crate::schema::{planning_occurrences, plannings};

        let linked_occ = planning_occurrences::table
            .filter(planning_occurrences::movement_id.eq(Some(movement_id)))
            .select(PlanningOccurrenceRow::as_select())
            .first::<PlanningOccurrenceRow>(connection)
            .optional()?;

        if let Some(linked_occ) = linked_occ {
            let planning = plannings::table
                .find(linked_occ.planning_id)
                .select(PlanningRow::as_select())
                .first::<PlanningRow>(connection)?;

            if planning.account_id != movement.account_id()
                || planning.type_id != i32::from(movement.kind())
                || planning.currency_id != movement.currency_id
                || !is_category_compatible_db(
                    connection,
                    movement.category_id,
                    planning.category_id,
                )
            {
                return Err(MovementError::PlanningIncompatible);
            }
        }

        ensure_account_exists(connection, movement.account_id())
            .map_err(|_| MovementError::AccountNotFound(movement.account_id()))?;
        if let Some(to_account_id) = movement.to_account_id() {
            ensure_account_exists(connection, to_account_id)
                .map_err(|_| MovementError::AccountNotFound(to_account_id))?;
        }

        reverse_movement_from_accounts(connection, &old_row)?;
        crate::db::movements::delete_installments(connection, movement_id)?;
        let updated_row = crate::db::movements::update(connection, movement_id, &movement)?;
        apply_movement_to_accounts(connection, &updated_row)?;
        create_installments_if_credit(
            connection,
            movement_id,
            i32::from(movement.kind()),
            movement.account_id(),
            movement.account_amount.value(),
            movement.installments,
            movement.timestamp,
        )?;

        Ok(updated_row)
    })?;

    tracing::info!("Movement updated id={}", row.id);
    Ok(Movement::from(row))
}

#[tauri::command]
pub fn remove_movement(state: State<'_, Mutex<AppState>>, id: i32) -> Result<usize, String> {
    tracing::debug!("Executing command remove_movement id={}", id);

    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);

    remove_movement_internal(connection, id)
}

fn remove_movement_internal(connection: &mut SqliteConnection, id: i32) -> Result<usize, String> {
    remove_movement_service(connection, id).map_err(|error| error.to_string())
}

fn remove_movement_service(
    connection: &mut SqliteConnection,
    id: i32,
) -> Result<usize, MovementError> {
    use crate::schema::movements::dsl::movements;

    let deleted_count = connection.transaction::<usize, MovementError, _>(|connection| {
        let old_row =
            movements.find(id).select(MovementRow::as_select()).first::<MovementRow>(connection)?;

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

        crate::db::movements::delete_installments(connection, id)?;
        let count = crate::db::movements::delete(connection, id)?;

        if let Some(linked_occ) = linked_occ_opt {
            reconcile_current_occurrence(connection, linked_occ.planning_id)?;
        }

        Ok(count)
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
    let effect = balance_effect_for_row(movement).map_err(|_| diesel::result::Error::NotFound)?;
    apply_balance_effect(connection, &effect)
}

fn reverse_movement_from_accounts(
    connection: &mut SqliteConnection,
    movement: &MovementRow,
) -> QueryResult<()> {
    let effect = balance_effect_for_row(movement).map_err(|_| diesel::result::Error::NotFound)?;
    apply_balance_effect(connection, &effect.reverse())
}

fn apply_balance_effect(
    connection: &mut SqliteConnection,
    effect: &BalanceEffect,
) -> QueryResult<()> {
    match effect {
        BalanceEffect::Single { account_id, delta } => {
            add_to_account_balance(connection, *account_id, delta.value())
        }
        BalanceEffect::Transfer { from_account_id, from_delta, to_account_id, to_delta } => {
            add_to_account_balance(connection, *from_account_id, from_delta.value())?;
            add_to_account_balance(connection, *to_account_id, to_delta.value())
        }
    }
}

fn ensure_account_exists(connection: &mut SqliteConnection, id: i32) -> QueryResult<()> {
    crate::db::accounts::ensure_exists(connection, id)
}

pub(crate) fn add_to_account_balance(
    connection: &mut SqliteConnection,
    account_id: i32,
    delta: f64,
) -> QueryResult<()> {
    crate::db::accounts::adjust_balance(connection, account_id, delta)
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
            let typed_amount = crate::domain::money::AccountAmount::new(account_amount)
                .map_err(|error| diesel::result::Error::SerializationError(Box::new(error)))?;
            let purchase_date = crate::domain::date::ms_to_local_date(timestamp)
                .map_err(|error| diesel::result::Error::SerializationError(Box::new(error)))?;
            let drafts = crate::domain::installments::calculate_installments(
                typed_amount,
                total_inst,
                purchase_date,
                credit_info.cutoff_day as u32,
                credit_info.days_to_pay as u32,
            )
            .map_err(|error| diesel::result::Error::SerializationError(Box::new(error)))?;
            use crate::models::movements::MovementInstallmentInsert;
            use crate::schema::movement_installments::dsl::movement_installments;

            for draft in drafts {
                let due_timestamp = crate::domain::date::local_date_to_start_ms(draft.due_date)
                    .map_err(|error| diesel::result::Error::SerializationError(Box::new(error)))?;

                let installment = MovementInstallmentInsert {
                    movement_id,
                    installment_number: draft.number,
                    total_installments: draft.total,
                    amount: draft.amount,
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

#[cfg(test)]
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

    connection
        .transaction::<Vec<i32>, diesel::result::Error, _>(|connection| {
            mark_installments_as_paid_in_transaction(connection, &unique_ids)
        })
        .map_err(|e| {
            if matches!(e, diesel::result::Error::NotFound) {
                "Uno o más IDs de mensualidades no existen".to_string()
            } else {
                e.to_string()
            }
        })
}

pub(crate) fn mark_installments_as_paid_in_transaction(
    connection: &mut SqliteConnection,
    unique_ids: &[i32],
) -> QueryResult<Vec<i32>> {
    use crate::schema::movement_installments::dsl::{
        id, movement_id, movement_installments, paid, paid_timestamp,
    };

    let unique_options: Vec<Option<i32>> = unique_ids.iter().map(|&value| Some(value)).collect();
    let count: i64 =
        movement_installments.filter(id.eq_any(&unique_options)).count().get_result(connection)?;

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
}
