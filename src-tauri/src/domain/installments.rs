use chrono::NaiveDate;
use std::fmt;

use crate::domain::date::{credit_payment_date, DateError};
use crate::domain::money::AccountAmount;

#[derive(Clone, Debug, PartialEq)]
pub struct InstallmentDraft {
    pub number: i32,
    pub total: i32,
    pub amount: f64,
    pub due_date: NaiveDate,
}

#[derive(Debug)]
pub enum InstallmentError {
    InvalidCount(i32),
    Date(DateError),
}

impl From<DateError> for InstallmentError {
    fn from(value: DateError) -> Self {
        Self::Date(value)
    }
}

impl fmt::Display for InstallmentError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCount(count) => {
                write!(formatter, "Las mensualidades deben ser entre 1 y 48 (recibido: {count})")
            }
            Self::Date(error) => write!(formatter, "{error}"),
        }
    }
}

impl std::error::Error for InstallmentError {}

pub fn calculate_installments(
    amount: AccountAmount,
    count: i32,
    purchase_date: NaiveDate,
    cutoff_day: u32,
    days_to_pay: u32,
) -> Result<Vec<InstallmentDraft>, InstallmentError> {
    if !(1..=48).contains(&count) {
        return Err(InstallmentError::InvalidCount(count));
    }

    let total_cents = amount.rounded_minor_units();
    let base_cents = total_cents / i64::from(count);
    let final_cents = total_cents - base_cents * i64::from(count - 1);

    (1..=count)
        .map(|number| {
            let cents = if number == count { final_cents } else { base_cents };
            Ok(InstallmentDraft {
                number,
                total: count,
                amount: cents as f64 / 100.0,
                due_date: credit_payment_date(
                    purchase_date,
                    cutoff_day,
                    days_to_pay,
                    number as u32,
                )?,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_preserves_rounded_total_and_advances_due_dates() {
        let purchase = NaiveDate::from_ymd_opt(2026, 6, 25).unwrap();
        let drafts =
            calculate_installments(AccountAmount::new(100.0).unwrap(), 3, purchase, 20, 20)
                .unwrap();

        assert_eq!(drafts.iter().map(|draft| draft.amount).sum::<f64>(), 100.0);
        assert_eq!(drafts[0].amount, 33.33);
        assert_eq!(drafts[2].amount, 33.34);
        assert_eq!(drafts[0].due_date, NaiveDate::from_ymd_opt(2026, 8, 9).unwrap());
        assert_eq!(drafts[2].due_date, NaiveDate::from_ymd_opt(2026, 10, 10).unwrap());
    }

    #[test]
    fn invalid_count_is_rejected_before_calculation() {
        let purchase = NaiveDate::from_ymd_opt(2026, 6, 25).unwrap();
        assert!(matches!(
            calculate_installments(AccountAmount::new(10.0).unwrap(), 0, purchase, 20, 20),
            Err(InstallmentError::InvalidCount(0))
        ));
    }
}
