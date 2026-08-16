use diesel::connection::SimpleConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::db;
use crate::models::general::Environment;

pub mod connect;
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

    tracing::info!("Seeding completed");
    Ok(())
}
