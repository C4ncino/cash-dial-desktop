use diesel::connection::SimpleConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::db;
use crate::models::general::Environment;

pub mod accounts;
pub mod connect;
pub mod movements;
pub mod plannings;
pub mod query;
pub mod statistics_query;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn run_migrations(database_url: &String, environment: &Environment) -> Result<(), String> {
    tracing::info!("Running migrations on {} (env={:?})", database_url, environment);

    let mut conn = db::connect::establish_connection(database_url);

    match conn.run_pending_migrations(MIGRATIONS) {
        Ok(migrations_ran) => {
            tracing::info!("Migrations completed (ran {})", migrations_ran.len());

            if !migrations_ran.is_empty() {
                run_seed(&mut conn, environment)?;
            }

            Ok(())
        }
        Err(e) => {
            tracing::error!("Migration failed: {}", e);
            Err(e.to_string())
        }
    }
}

fn run_seed(conn: &mut diesel::SqliteConnection, environment: &Environment) -> Result<(), String> {
    let seed_file = match environment {
        Environment::Development => "seeds/dev.sql",
        Environment::Test => "seeds/test.sql",
        Environment::Production => return Ok(()),
    };

    tracing::info!("Seeding database with {}", seed_file);

    let seed_sql =
        std::fs::read_to_string(seed_file).map_err(|e| format!("Cannot read {seed_file}: {e}"))?;

    conn.batch_execute(&seed_sql)
        .map_err(|e| format!("Failed to execute seed file {seed_file}: {e}"))?;

    if matches!(environment, Environment::Test) {
        if let Ok(overlay_file) = std::env::var("E2E_SEED_FILE") {
            let overlay_path = std::path::Path::new(&overlay_file)
                .canonicalize()
                .map_err(|e| format!("Cannot resolve E2E seed overlay {overlay_file}: {e}"))?;
            if !overlay_path.is_file()
                || overlay_path.extension().and_then(|value| value.to_str()) != Some("sql")
            {
                return Err("E2E seed overlay must be an existing .sql file".to_string());
            }
            let overlay_sql = std::fs::read_to_string(&overlay_path)
                .map_err(|e| format!("Cannot read E2E seed overlay: {e}"))?;
            conn.batch_execute(&overlay_sql)
                .map_err(|e| format!("Failed to execute E2E seed overlay: {e}"))?;
            tracing::info!("Applied test seed overlay {}", overlay_path.display());
        }
    }

    tracing::info!("Seeding completed");
    Ok(())
}
