use crate::domain::money::{AccountAmount, BalanceDelta, MoneyError, OriginalAmount};
use crate::models::movements::MovementRow;
use std::fmt;

pub const INCOME_ID: i32 = 1;
pub const EXPENSE_ID: i32 = 2;
pub const TRANSFER_ID: i32 = 3;
pub const TRANSFER_CATEGORY_ID: i32 = 88;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MovementKind {
    Income,
    Expense,
    Transfer,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MovementAccounts {
    Income { account_id: i32 },
    Expense { account_id: i32 },
    Transfer { from_account_id: i32, to_account_id: i32 },
}

impl MovementAccounts {
    pub fn kind(self) -> MovementKind {
        match self {
            Self::Income { .. } => MovementKind::Income,
            Self::Expense { .. } => MovementKind::Expense,
            Self::Transfer { .. } => MovementKind::Transfer,
        }
    }

    pub fn account_id(self) -> i32 {
        match self {
            Self::Income { account_id } | Self::Expense { account_id } => account_id,
            Self::Transfer { from_account_id, .. } => from_account_id,
        }
    }

    pub fn to_account_id(self) -> Option<i32> {
        match self {
            Self::Income { .. } | Self::Expense { .. } => None,
            Self::Transfer { to_account_id, .. } => Some(to_account_id),
        }
    }
}

impl TryFrom<i32> for MovementKind {
    type Error = MovementError;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            INCOME_ID => Ok(Self::Income),
            EXPENSE_ID => Ok(Self::Expense),
            TRANSFER_ID => Ok(Self::Transfer),
            _ => Err(MovementError::UnknownType(value)),
        }
    }
}

impl From<MovementKind> for i32 {
    fn from(value: MovementKind) -> Self {
        match value {
            MovementKind::Income => INCOME_ID,
            MovementKind::Expense => EXPENSE_ID,
            MovementKind::Transfer => TRANSFER_ID,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum BalanceEffect {
    Single {
        account_id: i32,
        delta: BalanceDelta,
    },
    Transfer {
        from_account_id: i32,
        from_delta: BalanceDelta,
        to_account_id: i32,
        to_delta: BalanceDelta,
    },
}

impl BalanceEffect {
    pub fn reverse(&self) -> Self {
        match self {
            Self::Single { account_id, delta } => {
                Self::Single { account_id: *account_id, delta: delta.reverse() }
            }
            Self::Transfer { from_account_id, from_delta, to_account_id, to_delta } => {
                Self::Transfer {
                    from_account_id: *from_account_id,
                    from_delta: from_delta.reverse(),
                    to_account_id: *to_account_id,
                    to_delta: to_delta.reverse(),
                }
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct MovementInput {
    pub accounts: MovementAccounts,
    pub category_id: i32,
    pub currency_id: i32,
    pub original_amount: OriginalAmount,
    pub account_amount: AccountAmount,
    pub installments: Option<i32>,
    pub timestamp: i64,
    pub description: Option<String>,
    pub planning_id: Option<i32>,
}

impl MovementInput {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        type_id: i32,
        account_id: i32,
        to_account_id: Option<i32>,
        category_id: i32,
        currency_id: i32,
        original_amount: f64,
        account_amount: f64,
        installments: Option<i32>,
        timestamp: i64,
        description: Option<String>,
        planning_id: Option<i32>,
    ) -> Result<Self, MovementError> {
        let kind = MovementKind::try_from(type_id)?;
        if account_id <= 0 {
            return Err(MovementError::InvalidAccount(account_id));
        }
        let accounts = match (kind, to_account_id) {
            (MovementKind::Income, None) => MovementAccounts::Income { account_id },
            (MovementKind::Expense, None) => MovementAccounts::Expense { account_id },
            (MovementKind::Transfer, Some(destination)) if destination != account_id => {
                MovementAccounts::Transfer {
                    from_account_id: account_id,
                    to_account_id: destination,
                }
            }
            (MovementKind::Transfer, None) => {
                return Err(MovementError::TransferDestinationRequired)
            }
            (MovementKind::Transfer, Some(_)) => return Err(MovementError::SameTransferAccount),
            (MovementKind::Income | MovementKind::Expense, Some(_)) => {
                return Err(MovementError::UnexpectedTransferDestination)
            }
        };
        if installments.is_some_and(|count| !(1..=48).contains(&count)) {
            return Err(MovementError::InvalidInstallments);
        }
        Ok(Self {
            accounts,
            category_id: if kind == MovementKind::Transfer {
                TRANSFER_CATEGORY_ID
            } else {
                category_id
            },
            currency_id,
            original_amount: OriginalAmount::new(original_amount)?,
            account_amount: AccountAmount::new(account_amount)?,
            installments,
            timestamp,
            description,
            planning_id,
        })
    }

    pub fn balance_effect(&self) -> Result<BalanceEffect, MovementError> {
        balance_effect(
            self.kind(),
            self.account_id(),
            self.to_account_id(),
            self.original_amount,
            self.account_amount,
        )
    }

    pub fn kind(&self) -> MovementKind {
        self.accounts.kind()
    }

    pub fn account_id(&self) -> i32 {
        self.accounts.account_id()
    }

    pub fn to_account_id(&self) -> Option<i32> {
        self.accounts.to_account_id()
    }
}

#[derive(Clone, Debug)]
pub struct UpdateMovementInput {
    pub id: i32,
    pub movement: MovementInput,
}

pub fn balance_effect_for_row(row: &MovementRow) -> Result<BalanceEffect, MovementError> {
    balance_effect(
        MovementKind::try_from(row.type_id)?,
        row.account_id,
        row.to_account_id,
        OriginalAmount::new(row.original_amount)?,
        AccountAmount::new(row.account_amount)?,
    )
}

fn balance_effect(
    kind: MovementKind,
    account_id: i32,
    to_account_id: Option<i32>,
    original: OriginalAmount,
    account: AccountAmount,
) -> Result<BalanceEffect, MovementError> {
    match kind {
        MovementKind::Income => {
            Ok(BalanceEffect::Single { account_id, delta: BalanceDelta::new(account.value())? })
        }
        MovementKind::Expense => {
            Ok(BalanceEffect::Single { account_id, delta: BalanceDelta::new(-account.value())? })
        }
        MovementKind::Transfer => Ok(BalanceEffect::Transfer {
            from_account_id: account_id,
            from_delta: BalanceDelta::new(-original.value())?,
            to_account_id: to_account_id.ok_or(MovementError::TransferDestinationRequired)?,
            to_delta: BalanceDelta::new(account.value())?,
        }),
    }
}

#[derive(Debug)]
pub enum MovementError {
    Database(diesel::result::Error),
    UnknownType(i32),
    InvalidAccount(i32),
    AccountNotFound(i32),
    TransferDestinationRequired,
    SameTransferAccount,
    UnexpectedTransferDestination,
    InvalidCategory(i32),
    InvalidCurrency(i32),
    InvalidInstallments,
    InvalidMoney(MoneyError),
    PlanningInactive,
    PlanningIncompatible,
    PendingOccurrenceNotFound,
    MovementTypeChange,
    Date(String),
}

impl From<diesel::result::Error> for MovementError {
    fn from(value: diesel::result::Error) -> Self {
        Self::Database(value)
    }
}

impl From<MoneyError> for MovementError {
    fn from(value: MoneyError) -> Self {
        Self::InvalidMoney(value)
    }
}

impl fmt::Display for MovementError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "{error}"),
            Self::UnknownType(_) => write!(formatter, "El tipo de movimiento no existe"),
            Self::InvalidAccount(_) => write!(formatter, "La cuenta es requerida"),
            Self::AccountNotFound(_) => write!(formatter, "La cuenta seleccionada no existe"),
            Self::TransferDestinationRequired => write!(formatter, "La cuenta destino es requerida"),
            Self::SameTransferAccount => write!(formatter, "La cuenta destino debe ser diferente"),
            Self::UnexpectedTransferDestination => {
                write!(formatter, "La cuenta destino solo aplica para transferencias")
            }
            Self::InvalidCategory(_) => write!(formatter, "La categoría seleccionada no existe"),
            Self::InvalidCurrency(_) => write!(formatter, "La moneda seleccionada no existe"),
            Self::InvalidInstallments => write!(formatter, "Las mensualidades deben ser entre 1 y 48"),
            Self::InvalidMoney(error) => write!(formatter, "{error}"),
            Self::PlanningInactive => write!(formatter, "La planificación vinculada está inactiva"),
            Self::PlanningIncompatible => write!(formatter, "El movimiento no es compatible con la planificación vinculada"),
            Self::PendingOccurrenceNotFound => write!(formatter, "La planificación no tiene una ocurrencia pendiente"),
            Self::MovementTypeChange => write!(
                formatter,
                "El tipo de movimiento no se puede cambiar o los datos son incompatibles con la planificación vinculada"
            ),
            Self::Date(message) => write!(formatter, "{message}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applying_then_reversing_preserves_effect_shape_and_values() {
        let input =
            MovementInput::new(TRANSFER_ID, 1, Some(2), 99, 1, 10.0, 180.0, None, 0, None, None)
                .unwrap();
        assert_eq!(
            input.balance_effect().unwrap().reverse().reverse(),
            input.balance_effect().unwrap()
        );
    }

    #[test]
    fn invalid_movement_shapes_cannot_be_constructed() {
        assert!(matches!(
            MovementInput::new(TRANSFER_ID, 1, None, 99, 1, 10.0, 10.0, None, 0, None, None),
            Err(MovementError::TransferDestinationRequired)
        ));
    }
}
