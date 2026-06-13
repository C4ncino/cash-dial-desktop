use diesel::prelude::*;

pub fn establish_connection(database_url: &String) -> SqliteConnection {
    tracing::info!("Opening database connection to {}", database_url);

    SqliteConnection::establish(database_url).unwrap_or_else(|e| {
        tracing::error!("Error connecting to {}: {}", database_url, e);
        panic!("Error connecting to {}", database_url)
    })
}
