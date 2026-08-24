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
    let (seed_name, seed_sql) = match environment {
        Environment::Development => ("seeds/dev.sql", include_str!("../../seeds/dev.sql")),
        Environment::Test => ("seeds/test.sql", include_str!("../../seeds/test.sql")),
        Environment::Production => return Ok(()),
    };

    tracing::info!("Seeding database with embedded {}", seed_name);

    conn.batch_execute(seed_sql)
        .map_err(|e| format!("Failed to execute seed file {seed_name}: {e}"))?;

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

#[cfg(test)]
mod tests {
    use std::fs;

    use diesel::{Connection, QueryDsl, RunQueryDsl, SqliteConnection};

    use super::run_migrations;
    use crate::models::general::Environment;

    #[test]
    fn fresh_development_database_does_not_depend_on_working_directory_seed_files() {
        let database_path = std::env::temp_dir()
            .join(format!("cash-dial-fresh-development-{}.sqlite", std::process::id()));
        let database_url = database_path.to_string_lossy().into_owned();

        let _ = fs::remove_file(&database_path);
        run_migrations(&database_url, &Environment::Development)
            .expect("fresh development database should migrate and seed");

        let mut connection =
            SqliteConnection::establish(&database_url).expect("fresh database should open");
        let seeded_accounts =
            crate::schema::accounts::table.count().get_result::<i64>(&mut connection).unwrap();

        assert!(seeded_accounts > 0);
        drop(connection);
        fs::remove_file(database_path).expect("fresh database should be removable");
    }

    #[test]
    fn fresh_production_database_has_reference_data_without_demo_accounts() {
        let database_path = std::env::temp_dir()
            .join(format!("cash-dial-fresh-production-{}.sqlite", std::process::id()));
        let database_url = database_path.to_string_lossy().into_owned();

        let _ = fs::remove_file(&database_path);
        run_migrations(&database_url, &Environment::Production)
            .expect("fresh production database should migrate");

        let mut connection =
            SqliteConnection::establish(&database_url).expect("fresh database should open");
        let demo_accounts =
            crate::schema::accounts::table.count().get_result::<i64>(&mut connection).unwrap();
        let currencies =
            crate::schema::currencies::table.count().get_result::<i64>(&mut connection).unwrap();

        assert_eq!(demo_accounts, 0);
        assert!(currencies > 0);
        drop(connection);
        fs::remove_file(database_path).expect("fresh database should be removable");
    }
}
