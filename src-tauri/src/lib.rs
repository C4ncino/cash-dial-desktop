use std::sync::Mutex;

use tauri::{Manager, State};

mod db;
mod domain;
mod functions;
mod logging;
mod models;
mod schema;
mod utils;

#[cfg(test)]
mod tests;

use crate::db::query::{
    get_account_types, get_budget_period_types, get_categories, get_currencies, get_movement_types,
};
use crate::models::general::AppState;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn initialize(state: State<'_, Mutex<AppState>>) -> Result<bool, String> {
    let mut state = utils::lock_app_state(&state)?;

    state.initialized = true;

    Ok(state.initialized)
}

#[tauri::command]
fn get_initialize_state(state: State<'_, Mutex<AppState>>) -> Result<bool, String> {
    let state = utils::lock_app_state(&state)?;

    Ok(state.initialized)
}

#[tauri::command]
fn log_frontend_error(level: String, message: String, stack: Option<String>) -> Result<(), String> {
    match level.as_str() {
        "error" => tracing::error!(%message, stack = ?stack),
        "warn" => tracing::warn!(%message, stack = ?stack),
        _ => tracing::info!(%message, stack = ?stack),
    }

    Ok(())
}

#[tauri::command]
fn export_logs() -> Result<String, String> {
    match logging::export_logs_zip() {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn create_init_state() -> Result<AppState, String> {
    use crate::db::run_migrations;

    let mut state = AppState::default();

    state.config = models::general::Config::from_env().map_err(|error| error.to_string())?;

    let lang = utils::preferred_lang();

    let connection = &mut db::connect::establish_connection(&state.config.database_url);

    run_migrations(&state.config.database_url, &state.config.environment)?;

    let currencies_results = get_currencies(connection, lang.clone())?;

    state.currencies =
        functions::currencies::get_conversions_rate(connection, &currencies_results)?;

    let accounts_types_results = get_account_types(connection, lang.clone())?;

    state.account_types = accounts_types_results.clone();

    let categories_results = get_categories(connection, lang.clone())?;

    state.categories = categories_results.clone();

    let movement_types_results = get_movement_types(connection, lang.clone())?;

    state.movement_types = movement_types_results.clone();

    let budget_period_types_results = get_budget_period_types(connection, lang.clone())?;

    state.budget_period_types = budget_period_types_results.clone();

    let planning_recurring_types_results =
        functions::plannings::get_planning_recurring_types_internal(connection, lang.clone())?;

    state.planning_recurring_types = planning_recurring_types_results;

    let planning_statuses_results =
        functions::plannings::get_planning_statuses_internal(connection, lang)?;

    state.planning_statuses = planning_statuses_results;

    Ok(state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build(),
                )?;
            }

            // initialize logging after plugin so we don't race setting the global logger
            if let Err(e) = logging::init_logging() {
                println!("Failed to initialize logging: {}", e);
            }

            tracing::info!("Application starting");

            let state = create_init_state()?;

            let lang = tauri_plugin_os::locale();
            tracing::info!("Current locale: {:?}", lang);

            app.manage(Mutex::new(state));

            tracing::info!("Application initialized");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initialize,
            get_initialize_state,
            functions::accounts::add_account,
            functions::accounts::get_account_types,
            functions::accounts::get_accounts,
            functions::accounts::update_account,
            functions::accounts::remove_account,
            functions::accounts::get_account_balance,
            functions::currencies::get_currencies,
            functions::currencies::refresh_currency_rates,
            functions::categories::get_categories,
            functions::movements::add_movement,
            functions::movements::get_movement_types,
            functions::movements::get_movements,
            functions::movements::get_movement,
            functions::movements::update_movement,
            functions::movements::remove_movement,
            functions::movements::get_movement_installments,
            functions::budgets::get_budget_period_types,
            functions::budgets::get_all_budgets,
            functions::budgets::get_budget,
            functions::budgets::create_budget,
            functions::budgets::delete_budget,
            functions::budgets::update_budget_amount,
            functions::budgets::update_budget_name,
            functions::budgets::get_affected_budget_ids,
            functions::accounts::get_credit_cards_next_payment,
            functions::accounts::pay_credit_card,
            functions::statistics::get_statistics,
            functions::plannings::get_planning_recurring_types,
            functions::plannings::get_planning_statuses,
            functions::plannings::get_plannings,
            functions::plannings::get_planning,
            functions::plannings::get_planning_occurrences,
            functions::plannings::create_planning,
            functions::plannings::update_planning,
            functions::plannings::delete_planning,
            functions::plannings::activate_planning,
            functions::plannings::deactivate_planning,
            functions::plannings::cancel_planning_occurrence,
            functions::plannings::complete_planning_occurrence,
            export_logs,
            log_frontend_error
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
