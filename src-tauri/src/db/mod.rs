use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::db;

pub mod connect;
pub mod query;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn run_migrations(database_url: &String) -> Result<(), String> {
    let mut conn = db::connect::establish_connection(database_url);

    conn.run_pending_migrations(MIGRATIONS).map_err(|e| e.to_string())?;

    Ok(())
}