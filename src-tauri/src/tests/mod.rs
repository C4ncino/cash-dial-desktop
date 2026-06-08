use crate::models::{
    currencies::Currency,
    accounts::AccountType,
    general::{AppState, Config, Environment},
};

const TEST_DB_PATH: &str = "test_db.sqlite";

pub fn mock_state() -> AppState {
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

        config: Config{
            environment: Environment::Test,
            database_url: TEST_DB_PATH.to_string(),
        },

        ..Default::default()
    }
}

use diesel::sqlite::SqliteConnection;
use diesel::{connection::SimpleConnection, prelude::*};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn setup_test_db() -> SqliteConnection {

    let mut conn = SqliteConnection::establish(TEST_DB_PATH).unwrap();

    let migrations_ran = conn.run_pending_migrations(MIGRATIONS).unwrap();

    if migrations_ran.len() > 0 {
        let seed_sql = std::fs::read_to_string("seeds/test.sql").expect("Cannot read test.sql");
        conn.batch_execute(&seed_sql).expect("Failed to execute seed file");
    }

    conn
}

pub fn setup() -> AppState {
    let _ = setup_test_db();

    mock_state()
}
