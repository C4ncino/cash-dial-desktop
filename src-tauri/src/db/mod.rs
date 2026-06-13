use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::db;

pub mod connect;
pub mod query;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn run_migrations(database_url: &String) -> Result<(), String> {
    tracing::info!("Running migrations on {}", database_url);

    let mut conn = db::connect::establish_connection(database_url);

    match conn.run_pending_migrations(MIGRATIONS) {
        Ok(_) => {
            tracing::info!("Migrations completed");
            Ok(())
        }
        Err(e) => {
            tracing::error!("Migration failed: {}", e);
            Err(e.to_string())
        }
    }
}
