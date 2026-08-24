use diesel::connection::SimpleConnection;
use diesel::prelude::*;

pub fn establish_connection(database_url: &String) -> SqliteConnection {
    tracing::info!("Opening database connection to {}", database_url);

    let mut connection = SqliteConnection::establish(database_url).unwrap_or_else(|e| {
        tracing::error!("Error connecting to {}: {}", database_url, e);
        panic!("Error connecting to {}", database_url)
    });

    // Commands use short-lived connections and may briefly overlap (for example,
    // a background refresh and a form mutation). Wait for the writer instead of
    // failing immediately with SQLITE_BUSY.
    connection
        .batch_execute("PRAGMA busy_timeout = 5000")
        .unwrap_or_else(|e| panic!("Failed to configure SQLite busy timeout: {e}"));

    connection
}
