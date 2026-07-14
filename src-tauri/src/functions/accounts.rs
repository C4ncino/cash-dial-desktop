use crate::db::connect::establish_connection;
use diesel::prelude::*;
use std::sync::Mutex;
use tauri::State;

use crate::models::accounts::{
    Account, AccountCreditInfo, AccountCreditInfoRow, AccountInsert, AccountRow, AccountType,
};
use crate::models::general::AppState;

#[cfg(test)]
#[path = "./accounts_test.rs"]
mod accounts_test;

#[repr(i32)]
enum AccountTypeEnum {
    Cash = 1,
    DebitCard = 2,
    CreditCard = 3,
}

#[tauri::command]
pub fn get_account_types(state: State<'_, Mutex<AppState>>) -> Result<Vec<AccountType>, String> {
    let state = state.lock().unwrap();

    Ok(state.account_types.clone())
}

#[tauri::command]
pub fn get_accounts(state: State<'_, Mutex<AppState>>) -> Result<Vec<Account>, String> {
    tracing::debug!("Executing command get_accounts");

    let state = state.lock().unwrap();

    let account_types = state.account_types.clone();

    let connection = &mut establish_connection(&state.config.database_url);

    get_accounts_internal(connection, &account_types)
}

fn get_accounts_internal(
    connection: &mut SqliteConnection,
    account_types: &[AccountType],
) -> Result<Vec<Account>, String> {
    tracing::debug!("Loading accounts from db");

    use crate::schema::accounts::dsl::*;
    use crate::schema::accounts_credit_info::dsl::*;

    let results = accounts
        .left_join(accounts_credit_info)
        .select((AccountRow::as_select(), Option::<AccountCreditInfoRow>::as_select()))
        .load::<(AccountRow, Option<AccountCreditInfoRow>)>(connection)
        .map_err(|e| {
            tracing::error!("Failed loading accounts: {}", e);
            e.to_string()
        })?;

    Ok(results
        .into_iter()
        .map(|(row, credit_row)| {
            let account_type = get_account_type(account_types, row.type_id);

            let credit_info = credit_row.map(|info| AccountCreditInfo {
                credit_limit: info.credit_limit,
                cutoff_day: info.cutoff_day as u8,
                days_to_pay: info.days_to_pay as u8,
            });

            Account {
                id: row.id,
                r#type: account_type,
                currency_id: row.currency_id as u8,
                name: row.name,
                balance: row.balance,
                credit_info,
                is_active: row.is_active,
            }
        })
        .collect())
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

    let state = state.lock().unwrap();

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
    use crate::schema::accounts::dsl::accounts;

    tracing::debug!(
        "Creating account name={} type_id={} currency_id={}",
        name,
        type_id,
        currency_id
    );

    let new_account = AccountInsert { type_id, currency_id: currency_id as i32, name, balance };

    let account_row = diesel::insert_into(accounts)
        .values(&new_account)
        .returning(AccountRow::as_returning())
        .get_result(connection)
        .map_err(|e| {
            tracing::error!("Failed inserting account: {}", e);
            e.to_string()
        })?;

    if let Some(info) = &credit_info {
        upsert_credit_info(connection, account_row.id, info).map_err(|e| {
            tracing::error!("Failed upserting credit info for account {}: {}", account_row.id, e);
            e.to_string()
        })?;
    }

    let account_type = get_account_type(account_types, type_id);

    tracing::info!("Account created id={} name={}", account_row.id, account_row.name);

    Ok(Account {
        id: account_row.id,
        r#type: account_type,
        currency_id,
        name: account_row.name,
        balance: account_row.balance,
        credit_info,
        is_active: account_row.is_active,
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

    let state = state.lock().unwrap();

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
    use crate::schema::accounts::dsl::accounts;

    tracing::debug!("Updating account id={}", id);

    match &credit_info {
        Some(info) => {
            upsert_credit_info(connection, id, info).map_err(|e| {
                tracing::error!("Failed upserting credit info for update {}: {}", id, e);
                e.to_string()
            })?;
        }
        None => {
            delete_credit_info(connection, id).map_err(|e| {
                tracing::error!("Failed deleting credit info for update {}: {}", id, e);
                e.to_string()
            })?;
        }
    }

    let account_row = diesel::update(accounts.find(id))
        .set((
            crate::schema::accounts::name.eq(name),
            crate::schema::accounts::balance.eq(balance),
            crate::schema::accounts::type_id.eq(type_id),
            crate::schema::accounts::currency_id.eq(currency_id as i32),
        ))
        .returning(AccountRow::as_returning())
        .get_result::<AccountRow>(connection)
        .map_err(|e| {
            tracing::error!("Failed updating account {}: {}", id, e);
            e.to_string()
        })?;

    let account_type = get_account_type(account_types, account_row.type_id);

    tracing::info!("Account updated id={}", account_row.id);

    Ok(Account {
        id: account_row.id,
        r#type: account_type,
        currency_id: account_row.currency_id as u8,
        name: account_row.name,
        balance: account_row.balance,
        credit_info,
        is_active: true,
    })
}

#[tauri::command]
pub fn remove_account(state: State<'_, Mutex<AppState>>, id: i32) -> Result<usize, String> {
    tracing::debug!("Executing command remove_account id={}", id);

    let state = state.lock().unwrap();

    let connection = &mut establish_connection(&state.config.database_url);

    remove_account_internal(connection, id)
}

fn remove_account_internal(connection: &mut SqliteConnection, id: i32) -> Result<usize, String> {
    use crate::schema::accounts::dsl::accounts;

    tracing::warn!("Deleting account id={}", id);

    let deleted_count = diesel::delete(accounts.find(id)).execute(connection).map_err(|e| {
        tracing::error!("Failed deleting account {}: {}", id, e);
        e.to_string()
    })?;

    if deleted_count == 0 {
        tracing::warn!("Account id={} not found", id);
        return Err("Account not found".to_string());
    }

    tracing::info!("Account deleted id={} count={}", id, deleted_count);

    Ok(deleted_count)
}

#[tauri::command]
pub fn get_account_balance(state: State<'_, Mutex<AppState>>, id: i32) -> Result<f64, String> {
    tracing::debug!("Executing command get_account_balance id={}", id);

    let state = state.lock().unwrap();
    let connection = &mut establish_connection(&state.config.database_url);

    get_account_balance_internal(connection, id)
}

fn get_account_balance_internal(
    connection: &mut SqliteConnection,
    account_id: i32,
) -> Result<f64, String> {
    use crate::schema::accounts::dsl::{accounts, balance};

    accounts
        .find(account_id)
        .select(balance)
        .first::<f64>(connection)
        .map_err(|e| {
            tracing::error!("Failed getting account balance for id {}: {}", account_id, e);
            e.to_string()
        })
}

fn get_account_type(account_types: &[AccountType], type_id: i32) -> AccountType {
    account_types.iter().find(|t| t.id == type_id).unwrap().clone()
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

    if !state.account_types.iter().any(|t| t.id == type_id) {
        errors.push("El tipo de cuenta no existe".to_string());
    }

    if !state.currencies.iter().any(|c| c.id == currency_id as i32) {
        errors.push("La moneda seleccionada no existe".to_string());
    }

    if type_id == AccountTypeEnum::CreditCard as i32 {
        match credit_info {
            Some(info) => {
                if info.credit_limit <= 0.0 {
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
