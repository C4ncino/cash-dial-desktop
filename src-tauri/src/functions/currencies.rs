use std::sync::Mutex;
use tauri::State;

use crate::models::{currencies::Currency, general::AppState};

#[tauri::command]
pub fn get_currencies(state: State<'_, Mutex<AppState>>) -> Result<Vec<Currency>, String> {
    tracing::debug!("Executing command get_accounts");

    let state = state.lock().unwrap();

    Ok(state.currencies.clone())
}
