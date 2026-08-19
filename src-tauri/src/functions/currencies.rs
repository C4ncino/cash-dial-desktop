use std::{collections::HashMap, sync::Mutex, time::Duration};

use chrono::Utc;
use diesel::{sql_query, Connection, RunQueryDsl, SqliteConnection};
use quick_xml::{events::Event, Reader};
use tauri::State;

use crate::models::{currencies::Currency, general::AppState};

#[tauri::command]
pub fn get_currencies(state: State<'_, Mutex<AppState>>) -> Result<Vec<Currency>, String> {
    tracing::debug!("Executing command get_accounts");

    let state = state.lock().unwrap();

    Ok(state.currencies.clone())
}

const ECB_RATES_URL: &str = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

pub(crate) fn parse_ecb_rates(xml: &str) -> Result<(String, HashMap<String, f64>), String> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut date = None;
    let mut rates = HashMap::new();

    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) | Ok(Event::Empty(event)) => {
                if event.name().as_ref() != b"Cube" {
                    continue;
                }

                let mut time = None;
                let mut code = None;
                let mut rate = None;
                for attribute in event.attributes().with_checks(false) {
                    let attribute = attribute.map_err(|error| error.to_string())?;
                    match attribute.key.as_ref() {
                        b"time" => time = Some(String::from_utf8_lossy(&attribute.value).to_string()),
                        b"currency" => code = Some(String::from_utf8_lossy(&attribute.value).to_string()),
                        b"rate" => {
                            rate = Some(
                                String::from_utf8_lossy(&attribute.value)
                                    .parse::<f64>()
                                    .map_err(|error| error.to_string())?,
                            )
                        }
                        _ => {}
                    }
                }

                if let Some(time) = time {
                    date = Some(time);
                }
                if let (Some(code), Some(rate)) = (code, rate) {
                    if !rate.is_finite() || rate <= 0.0 {
                        return Err(format!("Invalid ECB rate for {code}"));
                    }
                    rates.insert(code, rate);
                }
            }
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(error) => return Err(error.to_string()),
        }
    }

    let date = date.ok_or_else(|| "ECB response did not contain a rate date".to_string())?;
    if rates.is_empty() {
        return Err("ECB response did not contain currency rates".to_string());
    }
    rates.insert("EUR".to_string(), 1.0);
    Ok((date, rates))
}

fn rates_are_current(currencies: &[Currency], today: &str) -> bool {
    !currencies.is_empty()
        && currencies.iter().all(|currency| {
            currency.conversion_rate > 0.0
                && currency.conversion_rate_date.as_deref() == Some(today)
        })
}

/// Loads the cached rates and refreshes them from the ECB when they are stale.
/// This synchronous variant is used while the backend creates its initial state.
pub fn get_conversions_rate(
    connection: &mut SqliteConnection,
    currencies: &[Currency],
) -> Result<Vec<Currency>, String> {
    let today = Utc::now().date_naive().to_string();
    if rates_are_current(currencies, &today) {
        return Ok(currencies.to_vec());
    }

    let xml = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .and_then(|client| client.get(ECB_RATES_URL).send())
    {
        Ok(response) => response
            .error_for_status()
            .and_then(|response| response.text()),
        Err(error) => Err(error),
    };

    let xml = match xml {
        Ok(xml) => xml,
        Err(error) => {
            tracing::warn!("Unable to refresh ECB rates during backend startup: {}", error);
            return Ok(currencies.to_vec());
        }
    };

    let (date, rates) = parse_ecb_rates(&xml)?;
    persist_rates(connection, &date, &rates)?;

    Ok(currencies
        .iter()
        .map(|currency| {
            let mut currency = currency.clone();
            if let Some(rate) = rates.get(&currency.code) {
                currency.conversion_rate = *rate;
                currency.conversion_rate_date = Some(date.clone());
            }
            currency
        })
        .collect())
}

fn persist_rates(
    connection: &mut SqliteConnection,
    date: &str,
    rates: &HashMap<String, f64>,
) -> Result<(), String> {
    connection
        .transaction::<_, diesel::result::Error, _>(|connection| {
            for (code, rate) in rates {
                sql_query(
                    "UPDATE currencies SET conversion_rate = ?, conversion_rate_date = ? WHERE code = ?",
                )
                .bind::<diesel::sql_types::Double, _>(*rate)
                .bind::<diesel::sql_types::Text, _>(date)
                .bind::<diesel::sql_types::Text, _>(code)
                .execute(connection)?;
            }
            Ok(())
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn refresh_currency_rates(
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<Currency>, String> {
    let today = Utc::now().date_naive().to_string();
    let (database_url, currencies) = {
        let state = state.lock().unwrap();
        (state.config.database_url.clone(), state.currencies.clone())
    };

    if rates_are_current(&currencies, &today) {
        return Ok(currencies);
    }

    let xml = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| error.to_string())?
        .get(ECB_RATES_URL)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .text()
        .await
        .map_err(|error| error.to_string())?;

    let (date, rates) = parse_ecb_rates(&xml)?;
    let mut connection = crate::db::connect::establish_connection(&database_url);
    persist_rates(&mut connection, &date, &rates)?;

    let mut state = state.lock().unwrap();
    for currency in &mut state.currencies {
        if let Some(rate) = rates.get(&currency.code) {
            currency.conversion_rate = *rate;
            currency.conversion_rate_date = Some(date.clone());
        }
    }
    Ok(state.currencies.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ecb_date_and_rates_with_euro_base() {
        let xml = "<Cube><Cube time='2026-08-18'><Cube currency='USD' rate='1.1576'/><Cube currency='MXN' rate='19.7411'/></Cube></Cube>";
        let (date, rates) = parse_ecb_rates(xml).unwrap();
        assert_eq!(date, "2026-08-18");
        assert_eq!(rates["EUR"], 1.0);
        assert_eq!(rates["MXN"], 19.7411);
    }

    #[test]
    fn rejects_invalid_ecb_rate() {
        let xml = "<Cube><Cube time='2026-08-18'><Cube currency='USD' rate='0'/></Cube></Cube>";
        assert!(parse_ecb_rates(xml).is_err());
    }
}
