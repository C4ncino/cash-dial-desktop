pub mod date;
pub mod recurrence;

pub fn lock_app_state(
    state: &std::sync::Mutex<crate::models::general::AppState>,
) -> Result<std::sync::MutexGuard<'_, crate::models::general::AppState>, String> {
    state.lock().map_err(|_| "El estado de la aplicación no está disponible".to_string())
}

pub const SUPPORTED_LANGUAGES: &[&str] = &["es", "en"];

pub fn preferred_lang() -> String {
    let lang = tauri_plugin_os::locale()
        .and_then(|l| l.get(0..2).map(str::to_lowercase))
        .unwrap_or_else(|| "es".to_string());

    if SUPPORTED_LANGUAGES.contains(&lang.as_str()) {
        return lang;
    }

    SUPPORTED_LANGUAGES[0].to_string()
}
