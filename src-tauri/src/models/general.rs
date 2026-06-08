use std::{env, str::FromStr};

use serde::{Serialize};
use dotenvy::dotenv;

use crate::models::accounts::AccountType;
use crate::models::currencies::Currency;

#[derive(Serialize, Default)]
pub struct AppState {
    pub initialized: bool,
    pub config: Config,
    pub currencies: Vec<Currency>,
    pub account_types: Vec<AccountType>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Config {
    pub database_url: String,
    pub environment: Environment,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_url: "./db.sqlite".to_string(),
            environment: Environment::Development,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum Environment {
    Development,
    Test,
    Production,
}

impl FromStr for Environment {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.to_lowercase().as_str() {
            "dev" | "development" => Ok(Environment::Development),
            "test" => Ok(Environment::Test),
            "prod" | "production" => Ok(Environment::Production),
            _ => Err(format!("Invalid environment: {value}")),
        }
    }
}

impl Config {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        dotenv().ok();

        let default = Self::default();

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or(default.database_url),
            environment: env::var("APP_ENV")
                .ok()
                .map(|v| v.parse())
                .transpose()?
                .unwrap_or(default.environment),
        })
    }
}