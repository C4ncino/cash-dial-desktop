use std::{env, str::FromStr};

use dotenvy::dotenv;
use serde::Serialize;

use crate::models::accounts::AccountType;
use crate::models::budgets::BudgetPeriodType;
use crate::models::categories::Category;
use crate::models::currencies::Currency;
use crate::models::movements::MovementType;
use crate::models::plannings::{PlanningRecurringType, PlanningStatus};

#[derive(Serialize, Default)]
pub struct AppState {
    pub initialized: bool,
    pub config: Config,
    pub currencies: Vec<Currency>,
    pub account_types: Vec<AccountType>,
    pub categories: Vec<Category>,
    pub movement_types: Vec<MovementType>,
    pub budget_period_types: Vec<BudgetPeriodType>,
    pub planning_recurring_types: Vec<PlanningRecurringType>,
    pub planning_statuses: Vec<PlanningStatus>,
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
            environment: if cfg!(debug_assertions) {
                Environment::Development
            } else {
                Environment::Production
            },
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
    pub fn from_env(default_database_url: String) -> Result<Self, Box<dyn std::error::Error>> {
        dotenv().ok();

        let default = Self::default();

        Ok(Self {
            database_url: env::var("DATABASE_URL").unwrap_or(default_database_url),
            environment: env::var("APP_ENV")
                .ok()
                .map(|v| v.parse())
                .transpose()?
                .unwrap_or(default.environment),
        })
    }
}
