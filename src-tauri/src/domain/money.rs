use std::fmt;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Money(f64);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MoneyError {
    NotFinite,
    NotPositive,
    Negative,
}

impl fmt::Display for MoneyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFinite => write!(formatter, "el monto debe ser un número válido"),
            Self::NotPositive => write!(formatter, "el monto debe ser mayor a 0"),
            Self::Negative => write!(formatter, "el monto debe ser mayor o igual a 0"),
        }
    }
}

impl std::error::Error for MoneyError {}

impl Money {
    pub fn positive(value: f64) -> Result<Self, MoneyError> {
        if !value.is_finite() {
            Err(MoneyError::NotFinite)
        } else if value <= 0.0 {
            Err(MoneyError::NotPositive)
        } else {
            Ok(Self(value))
        }
    }

    pub fn non_negative(value: f64) -> Result<Self, MoneyError> {
        if !value.is_finite() {
            Err(MoneyError::NotFinite)
        } else if value < 0.0 {
            Err(MoneyError::Negative)
        } else {
            Ok(Self(value))
        }
    }

    pub fn from_delta(value: f64) -> Result<Self, MoneyError> {
        if value.is_finite() {
            Ok(Self(value))
        } else {
            Err(MoneyError::NotFinite)
        }
    }

    pub fn value(self) -> f64 {
        self.0
    }

    pub fn rounded_minor_units(self) -> i64 {
        (self.0 * 100.0).round() as i64
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct OriginalAmount(Money);

impl OriginalAmount {
    pub fn new(value: f64) -> Result<Self, MoneyError> {
        Money::positive(value).map(Self)
    }

    pub fn value(self) -> f64 {
        self.0.value()
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AccountAmount(Money);

impl AccountAmount {
    pub fn new(value: f64) -> Result<Self, MoneyError> {
        Money::positive(value).map(Self)
    }

    pub fn value(self) -> f64 {
        self.0.value()
    }

    pub fn rounded_minor_units(self) -> i64 {
        self.0.rounded_minor_units()
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BalanceDelta(Money);

impl BalanceDelta {
    pub fn new(value: f64) -> Result<Self, MoneyError> {
        Money::from_delta(value).map(Self)
    }

    pub fn value(self) -> f64 {
        self.0.value()
    }

    pub fn reverse(self) -> Self {
        Self(Money(-self.0.value()))
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ConversionRate(f64);

impl ConversionRate {
    pub fn between(original: OriginalAmount, account: AccountAmount) -> Self {
        Self(account.value() / original.value())
    }

    pub fn new(value: f64) -> Result<Self, MoneyError> {
        Money::positive(value).map(|money| Self(money.value()))
    }

    pub fn value(self) -> f64 {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn semantic_amounts_reject_non_finite_and_non_positive_values() {
        assert_eq!(OriginalAmount::new(f64::NAN), Err(MoneyError::NotFinite));
        assert_eq!(AccountAmount::new(f64::INFINITY), Err(MoneyError::NotFinite));
        assert_eq!(OriginalAmount::new(0.0), Err(MoneyError::NotPositive));
    }

    #[test]
    fn balance_delta_reverses_exactly() {
        let delta = BalanceDelta::new(125.25).unwrap();
        assert_eq!(delta.reverse().value(), -125.25);
        assert_eq!(delta.reverse().reverse(), delta);
    }
}
