#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Granularity {
    Day,
    Week,
    Month,
    Year,
}

impl Granularity {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Day => "day",
            Self::Week => "week",
            Self::Month => "month",
            Self::Year => "year",
        }
    }
}

impl TryFrom<&str> for Granularity {
    type Error = StatisticsError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "day" => Ok(Self::Day),
            "week" => Ok(Self::Week),
            "month" => Ok(Self::Month),
            "year" => Ok(Self::Year),
            _ => Err(StatisticsError::InvalidGranularity(value.to_string())),
        }
    }
}

#[derive(Debug)]
pub enum StatisticsError {
    Database(diesel::result::Error),
    Date(DateError),
    Category(crate::domain::categories::CategoryError),
    InvalidGranularity(String),
}

impl From<diesel::result::Error> for StatisticsError {
    fn from(value: diesel::result::Error) -> Self {
        Self::Database(value)
    }
}

impl From<DateError> for StatisticsError {
    fn from(value: DateError) -> Self {
        Self::Date(value)
    }
}

impl From<crate::domain::categories::CategoryError> for StatisticsError {
    fn from(value: crate::domain::categories::CategoryError) -> Self {
        Self::Category(value)
    }
}

impl fmt::Display for StatisticsError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "{error}"),
            Self::Date(error) => write!(formatter, "{error}"),
            Self::Category(error) => write!(formatter, "{error}"),
            Self::InvalidGranularity(value) => {
                write!(
                    formatter,
                    "Invalid granularity '{value}': allowed values are day, week, month, year"
                )
            }
        }
    }
}

impl std::error::Error for StatisticsError {}

pub fn savings_rate(income: f64, expenses: f64) -> Option<f64> {
    if income.is_finite() && expenses.is_finite() && income > 0.0 {
        Some(((income - expenses) / income) * 100.0)
    } else {
        None
    }
}

pub fn net_cash_flow(income: f64, expenses: f64) -> f64 {
    income - expenses
}

pub fn percentage(amount: f64, total: f64) -> f64 {
    if amount.is_finite() && total.is_finite() && total > 0.0 {
        amount / total * 100.0
    } else {
        0.0
    }
}

pub fn cumulative_balances(opening: f64, points: &[(i64, f64)]) -> Vec<(i64, f64)> {
    let mut balance = opening;
    points
        .iter()
        .map(|(timestamp, net)| {
            balance += net;
            (*timestamp, balance)
        })
        .collect()
}

pub fn obligation_totals(now_ms: i64, obligations: &[(i64, f64)]) -> (f64, f64, f64) {
    let sum_before = |days: i64| {
        let end = now_ms + days * 86_400_000;
        obligations.iter().filter(|(due, _)| *due < end).map(|(_, amount)| amount).sum()
    };
    (sum_before(7), sum_before(30), sum_before(90))
}

pub fn average_daily_spending(total: f64, start_ms: i64, end_ms: i64) -> f64 {
    let days = ((end_ms - start_ms) + 86_400_000 - 1) / 86_400_000;
    if days > 0 {
        total / days as f64
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculations_handle_zero_totals_and_accumulate_in_order() {
        assert_eq!(percentage(10.0, 0.0), 0.0);
        assert_eq!(percentage(25.0, 100.0), 25.0);
        assert_eq!(cumulative_balances(50.0, &[(1, 10.0), (2, -5.0)]), vec![(1, 60.0), (2, 55.0)]);
    }

    #[test]
    fn obligation_windows_are_calculated_without_persistence() {
        let day = 86_400_000;
        assert_eq!(
            obligation_totals(0, &[(day, 10.0), (10 * day, 20.0), (60 * day, 30.0)]),
            (10.0, 30.0, 60.0)
        );
    }
}
use std::fmt;

use crate::domain::date::DateError;
