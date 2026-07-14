use std::sync::atomic::{AtomicUsize, Ordering};

use crate::models::{
    accounts::AccountType,
    categories::Category,
    currencies::Currency,
    general::{AppState, Config, Environment},
    movements::MovementType,
};

const TEST_DB_PATH: &str = "test-integration.sqlite";
const TEST_LOG_DIR: &str = "test-logs";
static TEST_DB_COUNTER: AtomicUsize = AtomicUsize::new(0);

fn prepare_test_environment() {
    std::env::set_var("LOG_DIR", TEST_LOG_DIR);
    crate::logging::init_logging().ok();
}

fn next_test_db_path() -> String {
    let id = TEST_DB_COUNTER.fetch_add(1, Ordering::SeqCst);
    let path =
        std::env::temp_dir().join(format!("cash-dial-test-{}-{id}.sqlite", std::process::id()));

    path.to_string_lossy().to_string()
}

pub fn mock_state() -> AppState {
    prepare_test_environment();
    tracing::info!("Initializing mock_state for tests");

    AppState {
        account_types: vec![
            AccountType {
                id: 1,
                name: "Cash".to_string(),
                icon: "cash".to_string(),
                color: "#000000".to_string(),
            },
            AccountType {
                id: 2,
                name: "Debit Card".to_string(),
                icon: "card".to_string(),
                color: "#111111".to_string(),
            },
            AccountType {
                id: 3,
                name: "Credit Card".to_string(),
                icon: "credit".to_string(),
                color: "#222222".to_string(),
            },
        ],

        currencies: vec![Currency {
            id: 1,
            name: "Peso Mexicano".to_string(),
            symbol: "$".to_string(),
            code: "MXN".to_string(),
        }],

        categories: vec![
            Category {
                id: 1,
                father_id: None,
                name: "Food & Drink".to_string(),
                icon: "apple".to_string(),
                color: "#00a63e".to_string(),
            },
            Category {
                id: 88,
                father_id: None,
                name: "Transfer".to_string(),
                icon: "data-transfer-up".to_string(),
                color: "#84cc16".to_string(),
            },
        ],

        movement_types: vec![
            MovementType { id: 1, key: "in".to_string(), name: "Income".to_string() },
            MovementType { id: 2, key: "out".to_string(), name: "Expense".to_string() },
            MovementType { id: 3, key: "transfer".to_string(), name: "Transfer".to_string() },
        ],

        config: Config { environment: Environment::Test, database_url: TEST_DB_PATH.to_string() },

        ..Default::default()
    }
}

use diesel::prelude::*;

pub fn setup_test_db() -> diesel::SqliteConnection {
    let database_url = TEST_DB_PATH.to_string();
    prepare_test_environment();
    tracing::info!("Setting up test database: {}", database_url);

    crate::db::run_migrations(&database_url, &Environment::Test)
        .expect("Test migrations + seeding failed");

    diesel::SqliteConnection::establish(&database_url)
        .expect("Failed to connect to test database")
}

pub fn setup() -> AppState {
    let database_url = next_test_db_path();
    prepare_test_environment();

    let mut state = mock_state();
    state.config.database_url = database_url;

    crate::db::run_migrations(&state.config.database_url, &state.config.environment)
        .expect("Test migrations + seeding failed");
    

    state
}
