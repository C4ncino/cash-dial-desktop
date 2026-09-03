use std::fmt;

use crate::domain::date::DateError;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BudgetUpdateStrategy {
    Correct,
    FromToday,
    NextPeriod,
}

impl TryFrom<&str> for BudgetUpdateStrategy {
    type Error = BudgetError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "correct" => Ok(Self::Correct),
            "today" => Ok(Self::FromToday),
            "next_period" => Ok(Self::NextPeriod),
            _ => Err(BudgetError::InvalidUpdateStrategy(value.to_string())),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BudgetPeriod {
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

impl TryFrom<&str> for BudgetPeriod {
    type Error = BudgetError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "daily" => Ok(Self::Daily),
            "weekly" => Ok(Self::Weekly),
            "monthly" => Ok(Self::Monthly),
            "yearly" => Ok(Self::Yearly),
            _ => Err(BudgetError::InvalidPeriod(value.to_string())),
        }
    }
}

#[derive(Debug)]
pub enum BudgetError {
    InvalidUpdateStrategy(String),
    InvalidPeriod(String),
    InvalidAmount,
    MissingHistory(i32),
    MissingPeriodType(i32),
    NotFound(i32),
    MissingAccountCurrency(i32),
    MissingCurrencyRate(i32),
    InvalidCurrencyRate,
    Date(DateError),
    Database(diesel::result::Error),
}

impl From<DateError> for BudgetError {
    fn from(value: DateError) -> Self {
        Self::Date(value)
    }
}

impl From<diesel::result::Error> for BudgetError {
    fn from(value: diesel::result::Error) -> Self {
        Self::Database(value)
    }
}

impl fmt::Display for BudgetError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidUpdateStrategy(value) => write!(
                formatter,
                "Invalid update type '{value}'. Allowed values: 'correct', 'today', 'next_period'."
            ),
            Self::InvalidPeriod(value) => write!(formatter, "Unknown budget period: {value}"),
            Self::InvalidAmount => {
                write!(formatter, "El límite de presupuesto debe ser mayor o igual a 0")
            }
            Self::MissingHistory(id) => write!(formatter, "No history found for budget {id}"),
            Self::MissingPeriodType(id) => write!(formatter, "Unknown period type id: {id}"),
            Self::NotFound(id) => write!(formatter, "Budget {id} not found"),
            Self::MissingAccountCurrency(id) => {
                write!(formatter, "Missing currency for account {id}")
            }
            Self::MissingCurrencyRate(id) => {
                write!(formatter, "Missing conversion rate for currency {id}")
            }
            Self::InvalidCurrencyRate => write!(formatter, "Invalid currency conversion rate"),
            Self::Date(error) => write!(formatter, "{error}"),
            Self::Database(error) => write!(formatter, "{error}"),
        }
    }
}

impl std::error::Error for BudgetError {}

#[allow(clippy::too_many_arguments)]
pub fn movement_amount_in_budget_currency(
    account_id: i32,
    account_currency_id: Option<i32>,
    movement_currency_id: i32,
    budget_currency_id: i32,
    original_amount: f64,
    account_amount: f64,
    movement_rate: Option<f64>,
    budget_rate: Option<f64>,
) -> Result<f64, BudgetError> {
    let account_currency_id =
        account_currency_id.ok_or(BudgetError::MissingAccountCurrency(account_id))?;
    if account_currency_id == budget_currency_id {
        return Ok(account_amount);
    }
    if movement_currency_id == budget_currency_id {
        return Ok(original_amount);
    }

    let movement_rate =
        movement_rate.ok_or(BudgetError::MissingCurrencyRate(movement_currency_id))?;
    let budget_rate = budget_rate.ok_or(BudgetError::MissingCurrencyRate(budget_currency_id))?;
    let movement_rate = crate::domain::money::ConversionRate::new(movement_rate)
        .map_err(|_| BudgetError::InvalidCurrencyRate)?;
    let budget_rate = crate::domain::money::ConversionRate::new(budget_rate)
        .map_err(|_| BudgetError::InvalidCurrencyRate)?;
    Ok(original_amount * budget_rate.value() / movement_rate.value())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conversion_uses_the_amount_with_matching_currency_semantics() {
        assert_eq!(
            movement_amount_in_budget_currency(1, Some(2), 1, 2, 10.0, 200.0, None, None).unwrap(),
            200.0
        );
        assert_eq!(
            movement_amount_in_budget_currency(1, Some(2), 1, 1, 10.0, 200.0, None, None).unwrap(),
            10.0
        );
        assert_eq!(
            movement_amount_in_budget_currency(
                1,
                Some(3),
                1,
                2,
                10.0,
                99.0,
                Some(2.0),
                Some(20.0),
            )
            .unwrap(),
            100.0
        );
    }
}
