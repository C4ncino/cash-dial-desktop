use std::sync::Mutex;

use tauri::{Manager, State};

mod db;
mod functions;
mod models;
mod schema;
mod utils;

#[cfg(test)]
mod tests;

use crate::db::query::{get_account_types, get_currencies};
use crate::models::general::AppState;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn initialize(state: State<'_, Mutex<AppState>>) -> Result<bool, String> {
    let mut state = state.lock().unwrap();

    state.initialized = true;

    Ok(state.initialized)
}

#[tauri::command]
fn get_initialize_state(state: State<'_, Mutex<AppState>>) -> Result<bool, String> {
    let state = state.lock().unwrap();

    Ok(state.initialized)
}

fn create_init_state() -> Result<AppState, String> {
    use crate::db::run_migrations;

    let mut state = AppState::default();

    state.config = models::general::Config::from_env().unwrap();

    let lang = utils::preferred_lang();

    let connection = &mut db::connect::establish_connection(&state.config.database_url);

    run_migrations(&state.config.database_url)?;

    let currencies_results = get_currencies(connection, lang.clone())?;

    state.currencies = currencies_results.clone();

    let accounts_types_results = get_account_types(connection, lang)?;

    state.account_types = accounts_types_results.clone();

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

            let state = create_init_state()?;

            let lang = tauri_plugin_os::locale();
            println!("Current locale: {:?}", lang);

            app.manage(Mutex::new(state));

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
            functions::currencies::get_currencies
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
