use chrono::{Datelike, Duration, Local, LocalResult, NaiveDate, TimeZone};
use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DateError {
    InvalidTimestamp(i64),
    InvalidDate { year: i32, month: u32, day: u32 },
    InvalidLocalTime(NaiveDate),
}

impl fmt::Display for DateError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidTimestamp(value) => write!(formatter, "Marca de tiempo inválida: {value}"),
            Self::InvalidDate { year, month, day } => {
                write!(formatter, "Fecha inválida: {year:04}-{month:02}-{day:02}")
            }
            Self::InvalidLocalTime(date) => {
                write!(formatter, "La fecha local {date} no tiene una hora válida")
            }
        }
    }
}

impl std::error::Error for DateError {}

pub fn ms_to_local_date(timestamp_ms: i64) -> Result<NaiveDate, DateError> {
    Local
        .timestamp_millis_opt(timestamp_ms)
        .single()
        .map(|datetime| datetime.date_naive())
        .ok_or(DateError::InvalidTimestamp(timestamp_ms))
}

pub fn local_date_to_start_ms(date: NaiveDate) -> Result<i64, DateError> {
    let naive = date.and_hms_opt(0, 0, 0).ok_or(DateError::InvalidLocalTime(date))?;
    match Local.from_local_datetime(&naive) {
        LocalResult::Single(datetime) => Ok(datetime.timestamp_millis()),
        LocalResult::Ambiguous(earliest, _) => Ok(earliest.timestamp_millis()),
        LocalResult::None => {
            let one_am = date.and_hms_opt(1, 0, 0).ok_or(DateError::InvalidLocalTime(date))?;
            Local
                .from_local_datetime(&one_am)
                .earliest()
                .map(|datetime| datetime.timestamp_millis())
                .ok_or(DateError::InvalidLocalTime(date))
        }
    }
}

pub fn date(year: i32, month: u32, day: u32) -> Result<NaiveDate, DateError> {
    NaiveDate::from_ymd_opt(year, month, day).ok_or(DateError::InvalidDate { year, month, day })
}

pub fn last_day_of_month_or_clamp(year: i32, month: u32, day: u32) -> Result<NaiveDate, DateError> {
    let (next_year, next_month) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    let first_of_next_month = date(next_year, next_month, 1)?;
    let last_day =
        first_of_next_month.pred_opt().ok_or(DateError::InvalidDate { year, month, day })?.day();
    date(year, month, day.min(last_day))
}

pub fn credit_payment_date(
    purchase_date: NaiveDate,
    cutoff_day: u32,
    days_to_pay: u32,
    installment_number: u32,
) -> Result<NaiveDate, DateError> {
    let (mut statement_year, mut statement_month) = if purchase_date.day() <= cutoff_day {
        (purchase_date.year(), purchase_date.month())
    } else if purchase_date.month() == 12 {
        (purchase_date.year() + 1, 1)
    } else {
        (purchase_date.year(), purchase_date.month() + 1)
    };

    let months_to_add = installment_number.saturating_sub(1);
    statement_month += months_to_add;
    while statement_month > 12 {
        statement_year += 1;
        statement_month -= 12;
    }

    Ok(last_day_of_month_or_clamp(statement_year, statement_month, cutoff_day)?
        + Duration::days(i64::from(days_to_pay)))
}
