use std::fmt;

#[derive(Debug)]
pub enum PlanningError {
    Database(diesel::result::Error),
    Validation(Vec<String>),
    OccurrenceCannotCancel,
    OccurrenceCannotComplete,
    PlanningInactive,
    MovementIncompatible,
}

impl From<diesel::result::Error> for PlanningError {
    fn from(value: diesel::result::Error) -> Self {
        Self::Database(value)
    }
}

impl fmt::Display for PlanningError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "{error}"),
            Self::Validation(errors) => write!(formatter, "{}", errors.join(", ")),
            Self::OccurrenceCannotCancel => {
                write!(formatter, "Solo se pueden cancelar ocurrencias pendientes")
            }
            Self::OccurrenceCannotComplete
            | Self::PlanningInactive
            | Self::MovementIncompatible => write!(
                formatter,
                "El movimiento no es compatible con la planificación o la ocurrencia no está pendiente"
            ),
        }
    }
}

impl std::error::Error for PlanningError {}
