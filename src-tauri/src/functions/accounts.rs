use crate::db::connect::establish_connection;
use diesel::prelude::*;
use std::sync::Mutex;
use tauri::State;

use crate::models::accounts::{
    Account, AccountCreditInfo, AccountCreditInfoRow, AccountInsert, AccountRow, AccountType,
    CreditCardPaymentResult,
};
use crate::models::general::AppState;

#[cfg(test)]
#[path = "./accounts_test.rs"]
mod accounts_test;

#[repr(i32)]
enum AccountTypeEnum {
    CreditCard = 3,
}

#[tauri::command]
pub fn get_account_types(state: State<'_, Mutex<AppState>>) -> Result<Vec<AccountType>, String> {
    let state = crate::utils::lock_app_state(&state)?;

    Ok(state.account_types.clone())
}

#[tauri::command]
pub fn get_accounts(state: State<'_, Mutex<AppState>>) -> Result<Vec<Account>, String> {
    tracing::debug!("Executing command get_accounts");

    let state = crate::utils::lock_app_state(&state)?;

    let account_types = state.account_types.clone();

    let connection = &mut establish_connection(&state.config.database_url);

    get_accounts_internal(connection, &account_types)
}

fn get_accounts_internal(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
) -> Result<Vec<Account>, String> {
    get_accounts_service(connection, account_types).map_err(|error| error.to_string())
}

fn get_accounts_service(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
) -> Result<Vec<Account>, crate::domain::accounts::AccountError> {
    tracing::debug!("Loading accounts from db");

    use crate::schema::accounts::dsl::*;
    use crate::schema::accounts_credit_info::dsl::*;

    let results = accounts
        .left_join(accounts_credit_info)
        .select((AccountRow::as_select(), Option::<AccountCreditInfoRow>::as_select()))
        .load::<(AccountRow, Option<AccountCreditInfoRow>)>(connection)?;

    results
        .into_iter()
        .map(|(row, credit_row)| {
            let account_type = get_account_type(account_types, row.type_id)?;

            let credit_info = credit_row.map(|info| AccountCreditInfo {
                credit_limit: info.credit_limit,
                cutoff_day: info.cutoff_day as u8,
                days_to_pay: info.days_to_pay as u8,
            });

            Ok(Account {
                id: row.id,
                r#type: account_type,
                currency_id: row.currency_id as u8,
                name: row.name,
                balance: row.balance,
                credit_info,
                is_active: row.is_active,
            })
        })
        .collect()
}

#[tauri::command]
pub fn add_account(
    state: State<'_, Mutex<AppState>>,
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    credit_info: Option<AccountCreditInfo>,
) -> Result<Account, String> {
    tracing::debug!(
        "Executing command add_account name={} type_id={} currency_id={}",
        name,
        type_id,
        currency_id
    );

    let state = crate::utils::lock_app_state(&state)?;

    let account_types = {
        validate_account(&state, name, balance, type_id, currency_id, &credit_info).map_err(
            |e| {
                tracing::warn!("Validation failed for new account: {:?}", e);
                e.join(", ")
            },
        )?;

        state.account_types.clone()
    };

    let connection = &mut establish_connection(&state.config.database_url);

    add_account_internal(
        connection,
        &account_types,
        name,
        balance,
        type_id,
        currency_id,
        credit_info,
    )
}

fn add_account_internal(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    credit_info: Option<AccountCreditInfo>,
) -> Result<Account, String> {
    add_account_service(connection, account_types, name, balance, type_id, currency_id, credit_info)
        .map_err(|error| error.to_string())
}

fn add_account_service(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    credit_info: Option<AccountCreditInfo>,
) -> Result<Account, crate::domain::accounts::AccountError> {
    tracing::debug!(
        "Creating account name={} type_id={} currency_id={}",
        name,
        type_id,
        currency_id
    );

    let details = crate::domain::accounts::AccountDetails::new(
        type_id,
        balance,
        credit_info.as_ref().map(|info| (info.credit_limit, info.cutoff_day, info.days_to_pay)),
    )?;
    let credit_info = match details {
        crate::domain::accounts::AccountDetails::Regular => None,
        crate::domain::accounts::AccountDetails::Credit(details) => Some(AccountCreditInfo {
            credit_limit: details.credit_limit.value(),
            cutoff_day: details.cutoff_day,
            days_to_pay: details.days_to_pay,
        }),
    };

    connection
        .transaction::<Account, crate::domain::accounts::AccountError, _>(|connection| {
            use crate::schema::accounts::dsl::accounts;

            let new_account =
                AccountInsert { type_id, currency_id: currency_id as i32, name, balance };
            let account_row = diesel::insert_into(accounts)
                .values(&new_account)
                .returning(AccountRow::as_returning())
                .get_result(connection)?;

            if let Some(info) = &credit_info {
                upsert_credit_info(connection, account_row.id, info)?;
            }

            let account_type = get_account_type(account_types, type_id)?;
            Ok(Account {
                id: account_row.id,
                r#type: account_type,
                currency_id,
                name: account_row.name,
                balance: account_row.balance,
                credit_info,
                is_active: account_row.is_active,
            })
        })
        .map_err(|error| {
            tracing::error!("Failed inserting account: {}", error);
            error
        })
}

#[tauri::command]
pub fn update_account(
    state: State<'_, Mutex<AppState>>,
    id: i32,
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    _credit_info: Option<AccountCreditInfo>,
) -> Result<Account, String> {
    tracing::debug!("Executing command update_account id={} name={}", id, name);

    let state = crate::utils::lock_app_state(&state)?;

    let account_types = {
        validate_account(&state, name, balance, type_id, currency_id, &_credit_info).map_err(
            |e| {
                tracing::warn!("Validation failed for update_account id={}: {:?}", id, e);
                e.join(", ")
            },
        )?;

        state.account_types.clone()
    };

    let connection = &mut establish_connection(&state.config.database_url);

    update_account_internal(
        connection,
        &account_types,
        id,
        name,
        balance,
        type_id,
        currency_id,
        _credit_info,
    )
}

// This helper mirrors the established account update payload.
#[allow(clippy::too_many_arguments)]
fn update_account_internal(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
    id: i32,
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    credit_info: Option<AccountCreditInfo>,
) -> Result<Account, String> {
    update_account_service(
        connection,
        account_types,
        id,
        name,
        balance,
        type_id,
        currency_id,
        credit_info,
    )
    .map_err(|error| error.to_string())
}

#[allow(clippy::too_many_arguments)]
fn update_account_service(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
    id: i32,
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    credit_info: Option<AccountCreditInfo>,
) -> Result<Account, crate::domain::accounts::AccountError> {
    tracing::debug!("Updating account id={}", id);
    let details = crate::domain::accounts::AccountDetails::new(
        type_id,
        balance,
        credit_info.as_ref().map(|info| (info.credit_limit, info.cutoff_day, info.days_to_pay)),
    )?;
    let credit_info = match details {
        crate::domain::accounts::AccountDetails::Regular => None,
        crate::domain::accounts::AccountDetails::Credit(details) => Some(AccountCreditInfo {
            credit_limit: details.credit_limit.value(),
            cutoff_day: details.cutoff_day,
            days_to_pay: details.days_to_pay,
        }),
    };
    connection
        .transaction::<Account, crate::domain::accounts::AccountError, _>(|connection| {
            use crate::schema::accounts::dsl::accounts;

            match &credit_info {
                Some(info) => upsert_credit_info(connection, id, info)?,
                None => delete_credit_info(connection, id)?,
            }

            let account_row = diesel::update(accounts.find(id))
                .set((
                    crate::schema::accounts::name.eq(name),
                    crate::schema::accounts::balance.eq(balance),
                    crate::schema::accounts::type_id.eq(type_id),
                    crate::schema::accounts::currency_id.eq(currency_id as i32),
                ))
                .returning(AccountRow::as_returning())
                .get_result::<AccountRow>(connection)?;
            let account_type = get_account_type(account_types, account_row.type_id)?;
            Ok(Account {
                id: account_row.id,
                r#type: account_type,
                currency_id: account_row.currency_id as u8,
                name: account_row.name,
                balance: account_row.balance,
                credit_info,
                is_active: account_row.is_active,
            })
        })
        .map_err(|error| {
            tracing::error!("Failed updating account {}: {}", id, error);
            error
        })
}

#[tauri::command]
pub fn remove_account(state: State<'_, Mutex<AppState>>, id: i32) -> Result<usize, String> {
    tracing::debug!("Executing command remove_account id={}", id);

    let state = crate::utils::lock_app_state(&state)?;

    let connection = &mut establish_connection(&state.config.database_url);

    remove_account_internal(connection, id)
}

fn remove_account_internal(connection: &mut SqliteConnection, id: i32) -> Result<usize, String> {
    remove_account_service(connection, id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn activate_account(state: State<'_, Mutex<AppState>>, id: i32) -> Result<Account, String> {
    set_account_active(state, id, true)
}

#[tauri::command]
pub fn deactivate_account(state: State<'_, Mutex<AppState>>, id: i32) -> Result<Account, String> {
    set_account_active(state, id, false)
}

fn set_account_active(
    state: State<'_, Mutex<AppState>>,
    id: i32,
    active: bool,
) -> Result<Account, String> {
    let state = crate::utils::lock_app_state(&state)?;
    let account_types = state.account_types.clone();
    let connection = &mut establish_connection(&state.config.database_url);
    set_account_active_internal(connection, &account_types, id, active)
}

pub(crate) fn set_account_active_internal(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
    id: i32,
    active: bool,
) -> Result<Account, String> {
    use crate::schema::accounts::dsl::{accounts, is_active};

    let updated = diesel::update(accounts.find(id))
        .set(is_active.eq(active))
        .execute(connection)
        .map_err(|error| error.to_string())?;
    if updated == 0 {
        return Err(crate::domain::accounts::AccountError::NotFound(id).to_string());
    }

    get_accounts_internal(connection, account_types)?
        .into_iter()
        .find(|account| account.id == id)
        .ok_or_else(|| crate::domain::accounts::AccountError::NotFound(id).to_string())
}

fn remove_account_service(
    connection: &mut SqliteConnection,
    id: i32,
) -> Result<usize, crate::domain::accounts::AccountError> {
    use crate::schema::accounts::dsl::accounts;

    tracing::warn!("Deleting account id={}", id);

    let deleted_count = diesel::delete(accounts.find(id)).execute(connection)?;

    if deleted_count == 0 {
        tracing::warn!("Account id={} not found", id);
        return Err(crate::domain::accounts::AccountError::NotFound(id));
    }

    tracing::info!("Account deleted id={} count={}", id, deleted_count);

    Ok(deleted_count)
}

#[tauri::command]
pub fn get_account_balance(state: State<'_, Mutex<AppState>>, id: i32) -> Result<f64, String> {
    tracing::debug!("Executing command get_account_balance id={}", id);

    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);

    get_account_balance_internal(connection, id)
}

fn get_account_balance_internal(
    connection: &mut SqliteConnection,
    account_id: i32,
) -> Result<f64, String> {
    get_account_balance_service(connection, account_id).map_err(|error| error.to_string())
}

fn get_account_balance_service(
    connection: &mut SqliteConnection,
    account_id: i32,
) -> Result<f64, crate::domain::accounts::AccountError> {
    use crate::schema::accounts::dsl::{accounts, balance};

    accounts.find(account_id).select(balance).first::<f64>(connection).map_err(Into::into)
}

fn get_account_type(
    account_types: &[AccountType],
    type_id: i32,
) -> Result<AccountType, crate::domain::accounts::AccountError> {
    account_types
        .iter()
        .find(|account_type| account_type.id == type_id)
        .cloned()
        .ok_or(crate::domain::accounts::AccountError::UnknownType(type_id))
}

fn validate_account(
    state: &AppState,
    name: &str,
    balance: f64,
    type_id: i32,
    currency_id: u8,
    credit_info: &Option<AccountCreditInfo>,
) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    if name.trim().is_empty() {
        errors.push("El nombre es requerido".to_string());
    }

    if name.trim().chars().count() > 25 {
        errors.push("El nombre debe tener máximo 25 caracteres".to_string());
    }

    if !balance.is_finite() {
        errors.push("El saldo debe ser un número válido".to_string());
    }

    if !state.account_types.iter().any(|t| t.id == type_id) {
        errors.push("El tipo de cuenta no existe".to_string());
    }

    if !state.currencies.iter().any(|c| c.id == currency_id as i32) {
        errors.push("La moneda seleccionada no existe".to_string());
    }

    if type_id == AccountTypeEnum::CreditCard as i32 {
        match credit_info {
            Some(info) => {
                if !info.credit_limit.is_finite() || info.credit_limit <= 0.0 {
                    errors.push("El límite de crédito debe ser mayor a 0".to_string());
                }

                if balance < 0.0 {
                    errors.push("El saldo usado debe ser mayor o igual a 0".to_string());
                }

                if info.cutoff_day == 0 || info.cutoff_day > 31 {
                    errors.push("El día de corte debe ser un número entre 1 y 31".to_string());
                }

                if info.days_to_pay == 0 || info.days_to_pay > 30 {
                    errors.push("El día de pago debe ser un número entre 1 y 30".to_string());
                }
            }
            None => {
                errors.push("Las tarjetas de crédito requieren información de crédito".to_string());
            }
        }
    } else if credit_info.is_some() {
        errors.push("La información de crédito solo aplica a tarjetas de crédito".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

fn upsert_credit_info(
    connection: &mut SqliteConnection,
    account_id: i32,
    info: &AccountCreditInfo,
) -> QueryResult<()> {
    use crate::schema::accounts_credit_info::dsl::{
        accounts_credit_info, credit_limit, cutoff_day, days_to_pay,
    };

    let exists = accounts_credit_info
        .find(account_id)
        .select(AccountCreditInfoRow::as_select())
        .first::<AccountCreditInfoRow>(connection)
        .optional()?;

    match exists {
        Some(_) => {
            diesel::update(accounts_credit_info.find(account_id))
                .set((
                    credit_limit.eq(info.credit_limit),
                    cutoff_day.eq(info.cutoff_day as i32),
                    days_to_pay.eq(info.days_to_pay as i32),
                ))
                .execute(connection)?;
        }
        None => {
            let row = AccountCreditInfoRow {
                account_id,
                credit_limit: info.credit_limit,
                cutoff_day: info.cutoff_day as i32,
                days_to_pay: info.days_to_pay as i32,
            };

            diesel::insert_into(accounts_credit_info).values(&row).execute(connection)?;
        }
    }

    Ok(())
}

fn delete_credit_info(connection: &mut SqliteConnection, account_id: i32) -> QueryResult<()> {
    use crate::schema::accounts_credit_info::dsl::accounts_credit_info;

    diesel::delete(accounts_credit_info.find(account_id)).execute(connection)?;

    Ok(())
}

#[tauri::command]
pub fn get_credit_cards_next_payment(
    state: State<'_, Mutex<AppState>>,
    account_id: i32,
) -> Result<crate::models::accounts::CreditCardNextPayment, String> {
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);

    get_credit_card_next_payment_internal(connection, account_id)
}

pub fn get_credit_card_next_payment_internal(
    connection: &mut SqliteConnection,
    account_id_val: i32,
) -> Result<crate::models::accounts::CreditCardNextPayment, String> {
    get_credit_card_next_payment_service(connection, account_id_val)
        .map_err(|error| error.to_string())
}

fn get_credit_card_next_payment_service(
    connection: &mut SqliteConnection,
    account_id_val: i32,
) -> Result<crate::models::accounts::CreditCardNextPayment, crate::domain::accounts::AccountError> {
    use crate::schema::accounts::dsl::{accounts, id as acc_id};
    use crate::schema::accounts_credit_info::dsl::accounts_credit_info;

    let (_account_row, credit_info_row) = accounts
        .left_join(accounts_credit_info)
        .filter(acc_id.eq(account_id_val))
        .select((AccountRow::as_select(), Option::<AccountCreditInfoRow>::as_select()))
        .first::<(AccountRow, Option<AccountCreditInfoRow>)>(connection)
        .map_err(|error| match error {
            diesel::result::Error::NotFound => {
                crate::domain::accounts::AccountError::NotFound(account_id_val)
            }
            other => other.into(),
        })?;

    let credit_info = credit_info_row
        .ok_or(crate::domain::accounts::AccountError::NotCreditCard(account_id_val))?;

    use crate::models::movements::MovementInstallmentRow;
    use crate::schema::movement_installments::dsl::{movement_installments, paid};
    use crate::schema::movements::dsl::{account_id as mov_account_id, movements};

    let unpaid_installments = movement_installments
        .inner_join(movements)
        .filter(mov_account_id.eq(account_id_val))
        .filter(paid.eq(false))
        .select(MovementInstallmentRow::as_select())
        .load::<MovementInstallmentRow>(connection)?;

    if unpaid_installments.is_empty() {
        let now_ms = chrono::Local::now().timestamp_millis();
        let payment_date = crate::utils::date::try_calculate_credit_payment_date(
            now_ms,
            credit_info.cutoff_day as u32,
            credit_info.days_to_pay as u32,
        )?;
        return Ok(crate::models::accounts::CreditCardNextPayment {
            account_id: account_id_val,
            payment_date,
            total_amount: 0.0,
            movements: Vec::new(),
        });
    }

    let installments = unpaid_installments
        .into_iter()
        .map(|installment| {
            Ok(crate::domain::accounts::PaymentInstallment {
                id: installment
                    .id
                    .ok_or(crate::domain::accounts::AccountError::MissingInstallmentId)?,
                movement_id: installment.movement_id,
                amount: installment.amount,
                due_timestamp: installment.due_timestamp,
            })
        })
        .collect::<Result<Vec<_>, crate::domain::accounts::AccountError>>()?;
    let breakdown = crate::domain::accounts::calculate_next_payment(&installments)
        .ok_or(crate::domain::accounts::AccountError::NoPendingInstallments)?;
    let movements_list = breakdown
        .movements
        .into_iter()
        .map(|movement| crate::models::accounts::CreditCardPaymentMovement {
            movement_id: movement.movement_id,
            installment_ids: movement.installment_ids,
            amount: movement.amount,
        })
        .collect();

    Ok(crate::models::accounts::CreditCardNextPayment {
        account_id: account_id_val,
        payment_date: breakdown.payment_date,
        total_amount: breakdown.total_amount,
        movements: movements_list,
    })
}

#[derive(Debug)]
enum CreditCardPaymentError {
    Db(diesel::result::Error),
    Movement(crate::domain::movements::MovementError),
    Validation(String),
}

impl From<diesel::result::Error> for CreditCardPaymentError {
    fn from(error: diesel::result::Error) -> Self {
        CreditCardPaymentError::Db(error)
    }
}

impl From<crate::domain::movements::MovementError> for CreditCardPaymentError {
    fn from(error: crate::domain::movements::MovementError) -> Self {
        Self::Movement(error)
    }
}

impl std::fmt::Display for CreditCardPaymentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CreditCardPaymentError::Db(e) => write!(f, "Error de base de datos: {}", e),
            CreditCardPaymentError::Movement(e) => write!(f, "{}", e),
            CreditCardPaymentError::Validation(msg) => write!(f, "{}", msg),
        }
    }
}

#[tauri::command]
pub fn pay_credit_card(
    state: State<'_, Mutex<AppState>>,
    credit_account_id: i32,
    payments: Vec<crate::models::accounts::CreditCardPaymentRequest>,
    installment_ids: Vec<i32>,
) -> Result<CreditCardPaymentResult, String> {
    let state = crate::utils::lock_app_state(&state)?;
    let connection = &mut establish_connection(&state.config.database_url);

    pay_credit_card_internal(connection, credit_account_id, payments, installment_ids)
}

pub fn pay_credit_card_internal(
    connection: &mut SqliteConnection,
    credit_account_id_val: i32,
    payments: Vec<crate::models::accounts::CreditCardPaymentRequest>,
    installment_ids: Vec<i32>,
) -> Result<CreditCardPaymentResult, String> {
    if payments.is_empty() || installment_ids.is_empty() {
        return Err("El pago requiere al menos una cuenta de origen y una mensualidad".to_string());
    }

    connection
        .transaction::<CreditCardPaymentResult, CreditCardPaymentError, _>(|connection| {
            use std::collections::{HashMap, HashSet};

            use crate::models::movements::MovementInstallmentRow;
            use crate::schema::accounts::dsl::{
                accounts, currency_id as acc_currency_id, id as acc_id, is_active as acc_is_active,
            };
            use crate::schema::accounts_credit_info::dsl::{
                account_id as info_acc_id, accounts_credit_info,
            };
            use crate::schema::movement_installments::dsl::{
                id as installment_id, movement_installments,
            };
            use crate::schema::movements::dsl::{
                account_id as movement_account_id, id as movement_id, movements,
            };

            // 1. Validate credit card account exists and is a credit card
            let has_credit_info = accounts_credit_info
                .filter(info_acc_id.eq(credit_account_id_val))
                .count()
                .get_result::<i64>(connection)?;

            if has_credit_info == 0 {
                let account_count = accounts
                    .filter(acc_id.eq(credit_account_id_val))
                    .count()
                    .get_result::<i64>(connection)?;

                if account_count == 0 {
                    return Err(CreditCardPaymentError::Validation(format!(
                        "La cuenta con ID {} no existe",
                        credit_account_id_val
                    )));
                } else {
                    return Err(CreditCardPaymentError::Validation(format!(
                        "La cuenta con ID {} no es una tarjeta de crédito",
                        credit_account_id_val
                    )));
                }
            }

            let target_is_active = accounts
                .filter(acc_id.eq(credit_account_id_val))
                .select(acc_is_active)
                .first::<bool>(connection)?;
            if !target_is_active {
                return Err(CreditCardPaymentError::Validation(format!(
                    "La cuenta con ID {} está inactiva",
                    credit_account_id_val
                )));
            }

            let mut unique_installment_ids = installment_ids.clone();
            unique_installment_ids.sort_unstable();
            unique_installment_ids.dedup();
            if unique_installment_ids.len() != installment_ids.len() {
                return Err(CreditCardPaymentError::Validation(
                    "No se puede pagar la misma mensualidad dos veces".to_string(),
                ));
            }

            let installment_options =
                unique_installment_ids.iter().copied().map(Some).collect::<Vec<_>>();
            let selected_installments = movement_installments
                .filter(installment_id.eq_any(&installment_options))
                .select(MovementInstallmentRow::as_select())
                .load::<MovementInstallmentRow>(connection)?;
            if selected_installments.len() != unique_installment_ids.len() {
                return Err(CreditCardPaymentError::Validation(
                    "Una o más mensualidades no existen".to_string(),
                ));
            }
            if selected_installments.iter().any(|installment| installment.paid) {
                return Err(CreditCardPaymentError::Validation(
                    "Una o más mensualidades ya fueron pagadas".to_string(),
                ));
            }
            let expected_due = selected_installments[0].due_timestamp;
            if selected_installments
                .iter()
                .any(|installment| installment.due_timestamp != expected_due)
            {
                return Err(CreditCardPaymentError::Validation(
                    "Las mensualidades deben pertenecer al mismo periodo de pago".to_string(),
                ));
            }

            let selected_movement_ids = selected_installments
                .iter()
                .map(|installment| installment.movement_id)
                .collect::<HashSet<_>>();
            let movement_accounts = movements
                .filter(
                    movement_id.eq_any(selected_movement_ids.iter().copied().collect::<Vec<_>>()),
                )
                .select((movement_id, movement_account_id))
                .load::<(i32, i32)>(connection)?
                .into_iter()
                .collect::<HashMap<_, _>>();
            if movement_accounts.len() != selected_movement_ids.len()
                || movement_accounts.values().any(|account_id| *account_id != credit_account_id_val)
            {
                return Err(CreditCardPaymentError::Validation(
                    "Las mensualidades no pertenecen a la tarjeta seleccionada".to_string(),
                ));
            }

            let expected_total = selected_installments.iter().map(|item| item.amount).sum::<f64>();
            let expected_total_cents = crate::domain::money::Money::from_delta(expected_total)
                .map_err(|error| CreditCardPaymentError::Validation(error.to_string()))?
                .rounded_minor_units();
            let mut payment_total = 0.0;
            for payment in &payments {
                crate::domain::money::OriginalAmount::new(payment.original_amount)
                    .map_err(|error| CreditCardPaymentError::Validation(error.to_string()))?;
                let account_amount =
                    crate::domain::money::AccountAmount::new(payment.account_amount)
                        .map_err(|error| CreditCardPaymentError::Validation(error.to_string()))?;
                payment_total += account_amount.value();
            }
            let payment_total_cents = crate::domain::money::Money::from_delta(payment_total)
                .map_err(|error| CreditCardPaymentError::Validation(error.to_string()))?
                .rounded_minor_units();
            if payment_total_cents != expected_total_cents {
                return Err(CreditCardPaymentError::Validation(
                    "El monto total debe cubrir exactamente las mensualidades seleccionadas"
                        .to_string(),
                ));
            }

            let mut seen_sources = HashSet::new();
            let mut movement_inputs = Vec::with_capacity(payments.len());

            for payment in &payments {
                if payment.from_account_id == credit_account_id_val {
                    return Err(CreditCardPaymentError::Validation(
                        "La cuenta de origen no puede ser la tarjeta pagada".to_string(),
                    ));
                }
                if !seen_sources.insert(payment.from_account_id) {
                    return Err(CreditCardPaymentError::Validation(
                        "No se puede usar la misma cuenta de origen dos veces".to_string(),
                    ));
                }

                let source_account = accounts
                    .filter(acc_id.eq(payment.from_account_id))
                    .select((acc_currency_id, acc_is_active))
                    .first::<(i32, bool)>(connection)
                    .optional()?;

                let Some((source_currency_id, source_is_active)) = source_account else {
                    return Err(CreditCardPaymentError::Validation(format!(
                        "La cuenta de origen con ID {} no existe",
                        payment.from_account_id
                    )));
                };
                if !source_is_active {
                    return Err(CreditCardPaymentError::Validation(format!(
                        "La cuenta de origen con ID {} está inactiva",
                        payment.from_account_id
                    )));
                }

                movement_inputs.push(crate::domain::movements::MovementInput::new(
                    crate::domain::movements::TRANSFER_ID,
                    payment.from_account_id,
                    Some(credit_account_id_val),
                    crate::domain::movements::TRANSFER_CATEGORY_ID,
                    source_currency_id,
                    payment.original_amount,
                    payment.account_amount,
                    None,
                    chrono::Local::now().timestamp_millis(),
                    Some("Pago de tarjeta de crédito".to_string()),
                    None,
                )?);
            }

            let mut transfer_movement_ids = Vec::with_capacity(movement_inputs.len());
            for input in &movement_inputs {
                let created_movement =
                    crate::functions::movements::create_movement_in_transaction(connection, input)?;
                transfer_movement_ids.push(created_movement.id);
            }

            let paid_movement_ids =
                crate::functions::movements::mark_installments_as_paid_in_transaction(
                    connection,
                    &unique_installment_ids,
                )?;

            Ok(CreditCardPaymentResult { transfer_movement_ids, paid_movement_ids })
        })
        .map_err(|e| e.to_string())
}
