use std::collections::HashMap;
use std::fmt;

use crate::domain::money::{AccountAmount, Money, MoneyError};

pub const CASH_ACCOUNT_ID: i32 = 1;
pub const DEBIT_ACCOUNT_ID: i32 = 2;
pub const CREDIT_ACCOUNT_ID: i32 = 3;

#[derive(Clone, Copy, Debug)]
pub struct CreditDetails {
    pub credit_limit: AccountAmount,
    pub cutoff_day: u8,
    pub days_to_pay: u8,
}

#[derive(Clone, Copy, Debug)]
pub enum AccountDetails {
    Regular,
    Credit(CreditDetails),
}

impl AccountDetails {
    pub fn new(
        type_id: i32,
        balance: f64,
        credit: Option<(f64, u8, u8)>,
    ) -> Result<Self, AccountError> {
        let balance = Money::from_delta(balance)?;
        match (type_id, credit) {
            (CASH_ACCOUNT_ID | DEBIT_ACCOUNT_ID, None) => Ok(Self::Regular),
            (CASH_ACCOUNT_ID | DEBIT_ACCOUNT_ID, Some(_)) => {
                Err(AccountError::UnexpectedCreditDetails)
            }
            (CREDIT_ACCOUNT_ID, None) => Err(AccountError::CreditDetailsRequired),
            (CREDIT_ACCOUNT_ID, Some((limit, cutoff_day, days_to_pay))) => {
                if balance.value() < 0.0 {
                    return Err(AccountError::NegativeCreditBalance);
                }
                if !(1..=31).contains(&cutoff_day) {
                    return Err(AccountError::InvalidCutoffDay);
                }
                if !(1..=30).contains(&days_to_pay) {
                    return Err(AccountError::InvalidDaysToPay);
                }
                Ok(Self::Credit(CreditDetails {
                    credit_limit: AccountAmount::new(limit)?,
                    cutoff_day,
                    days_to_pay,
                }))
            }
            (_, _) => Err(AccountError::UnknownType(type_id)),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PaymentInstallment {
    pub id: i32,
    pub movement_id: i32,
    pub amount: f64,
    pub due_timestamp: i64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PaymentMovement {
    pub movement_id: i32,
    pub installment_ids: Vec<i32>,
    pub amount: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct NextPaymentBreakdown {
    pub payment_date: i64,
    pub total_amount: f64,
    pub movements: Vec<PaymentMovement>,
}

pub fn calculate_next_payment(installments: &[PaymentInstallment]) -> Option<NextPaymentBreakdown> {
    let payment_date = installments.iter().map(|item| item.due_timestamp).min()?;
    let mut grouped = HashMap::<i32, (Vec<i32>, f64)>::new();
    for installment in installments.iter().filter(|item| item.due_timestamp == payment_date) {
        let entry = grouped.entry(installment.movement_id).or_default();
        entry.0.push(installment.id);
        entry.1 += installment.amount;
    }

    let mut movements = grouped
        .into_iter()
        .map(|(movement_id, (mut installment_ids, amount))| {
            installment_ids.sort_unstable();
            PaymentMovement { movement_id, installment_ids, amount }
        })
        .collect::<Vec<_>>();
    movements.sort_by_key(|movement| movement.movement_id);
    let total_amount = movements.iter().map(|movement| movement.amount).sum();

    Some(NextPaymentBreakdown { payment_date, total_amount, movements })
}

#[derive(Debug)]
pub enum AccountError {
    Database(diesel::result::Error),
    Money(MoneyError),
    UnknownType(i32),
    NotFound(i32),
    NotCreditCard(i32),
    MissingInstallmentId,
    NoPendingInstallments,
    Date(crate::domain::date::DateError),
    CreditDetailsRequired,
    UnexpectedCreditDetails,
    NegativeCreditBalance,
    InvalidCutoffDay,
    InvalidDaysToPay,
}

impl From<diesel::result::Error> for AccountError {
    fn from(value: diesel::result::Error) -> Self {
        Self::Database(value)
    }
}

impl From<MoneyError> for AccountError {
    fn from(value: MoneyError) -> Self {
        Self::Money(value)
    }
}

impl From<crate::domain::date::DateError> for AccountError {
    fn from(value: crate::domain::date::DateError) -> Self {
        Self::Date(value)
    }
}

impl fmt::Display for AccountError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "{error}"),
            Self::Money(error) => write!(formatter, "{error}"),
            Self::UnknownType(id) => write!(formatter, "El tipo de cuenta {id} no existe"),
            Self::NotFound(id) => write!(formatter, "La cuenta {id} no existe"),
            Self::NotCreditCard(id) => {
                write!(formatter, "La cuenta {id} no es una tarjeta de crédito")
            }
            Self::MissingInstallmentId => write!(formatter, "La mensualidad no tiene un ID válido"),
            Self::NoPendingInstallments => {
                write!(formatter, "No se encontraron mensualidades pendientes")
            }
            Self::Date(error) => write!(formatter, "{error}"),
            Self::CreditDetailsRequired => {
                write!(formatter, "Las tarjetas de crédito requieren información de crédito")
            }
            Self::UnexpectedCreditDetails => {
                write!(formatter, "La información de crédito solo aplica a tarjetas de crédito")
            }
            Self::NegativeCreditBalance => {
                write!(formatter, "El saldo usado debe ser mayor o igual a 0")
            }
            Self::InvalidCutoffDay => {
                write!(formatter, "El día de corte debe ser un número entre 1 y 31")
            }
            Self::InvalidDaysToPay => {
                write!(formatter, "El día de pago debe ser un número entre 1 y 30")
            }
        }
    }
}

impl std::error::Error for AccountError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_details_make_credit_state_explicit() {
        assert!(matches!(
            AccountDetails::new(CASH_ACCOUNT_ID, 0.0, None),
            Ok(AccountDetails::Regular)
        ));
        assert!(matches!(
            AccountDetails::new(CREDIT_ACCOUNT_ID, 0.0, Some((10_000.0, 15, 20))),
            Ok(AccountDetails::Credit(_))
        ));
        assert!(matches!(
            AccountDetails::new(CASH_ACCOUNT_ID, 0.0, Some((10_000.0, 15, 20))),
            Err(AccountError::UnexpectedCreditDetails)
        ));
    }

    #[test]
    fn next_payment_groups_only_the_earliest_due_cycle() {
        let result = calculate_next_payment(&[
            PaymentInstallment { id: 3, movement_id: 8, amount: 20.0, due_timestamp: 200 },
            PaymentInstallment { id: 2, movement_id: 7, amount: 15.0, due_timestamp: 100 },
            PaymentInstallment { id: 1, movement_id: 7, amount: 10.0, due_timestamp: 100 },
        ])
        .unwrap();
        assert_eq!(result.payment_date, 100);
        assert_eq!(result.total_amount, 25.0);
        assert_eq!(result.movements[0].installment_ids, vec![1, 2]);
    }
}
