use std::sync::Mutex;
use tauri::State;

use crate::models::{categories::Category, general::AppState};

#[tauri::command]
pub fn get_categories(state: State<'_, Mutex<AppState>>) -> Result<Vec<Category>, String> {
    tracing::debug!("Executing command get_categories");

    let state = state.lock().unwrap();

    Ok(state.categories.clone())
}
