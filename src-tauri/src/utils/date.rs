#[cfg(test)]
use chrono::{Local, NaiveDate, TimeZone};

use crate::domain::date::DateError;

/// Calculates the next payment date for a credit card given a transaction timestamp,
/// the cutoff day of the month, and the number of days to pay after cutoff.
#[cfg(test)]
pub fn calculate_credit_payment_date(timestamp_ms: i64, cutoff_day: u32, days_to_pay: u32) -> i64 {
    calculate_credit_payment_date_for_installment(timestamp_ms, cutoff_day, days_to_pay, 1)
}

pub fn try_calculate_credit_payment_date(
    timestamp_ms: i64,
    cutoff_day: u32,
    days_to_pay: u32,
) -> Result<i64, DateError> {
    try_calculate_credit_payment_date_for_installment(timestamp_ms, cutoff_day, days_to_pay, 1)
}

/// Calculates the payment date for a specific installment of a credit card expense.
#[cfg(test)]
pub fn calculate_credit_payment_date_for_installment(
    timestamp_ms: i64,
    cutoff_day: u32,
    days_to_pay: u32,
    installment_number: i32,
) -> i64 {
    try_calculate_credit_payment_date_for_installment(
        timestamp_ms,
        cutoff_day,
        days_to_pay,
        installment_number,
    )
    .unwrap_or_else(|error| {
        tracing::error!("{}", error);
        i64::MIN
    })
}

pub fn try_calculate_credit_payment_date_for_installment(
    timestamp_ms: i64,
    cutoff_day: u32,
    days_to_pay: u32,
    installment_number: i32,
) -> Result<i64, DateError> {
    let purchase_date = crate::domain::date::ms_to_local_date(timestamp_ms)?;
    let payment_date = crate::domain::date::credit_payment_date(
        purchase_date,
        cutoff_day,
        days_to_pay,
        installment_number.max(1) as u32,
    )?;
    crate::domain::date::local_date_to_start_ms(payment_date)
}

#[cfg(test)]
pub fn last_day_of_month_or_clamp(year: i32, month: u32, day: u32) -> NaiveDate {
    try_last_day_of_month_or_clamp(year, month, day).unwrap_or_else(|error| {
        tracing::error!("{}", error);
        NaiveDate::MIN
    })
}

#[cfg(test)]
pub fn try_last_day_of_month_or_clamp(
    year: i32,
    month: u32,
    day: u32,
) -> Result<NaiveDate, DateError> {
    crate::domain::date::last_day_of_month_or_clamp(year, month, day)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_credit_payment_date_before_cutoff() {
        // Transaction: June 15, 2026. Cutoff: 20, Days to pay: 20.
        // Payment date should be July 10, 2026.
        let tx_time = Local.with_ymd_and_hms(2026, 6, 15, 12, 0, 0).unwrap().timestamp_millis();
        let pay_time = calculate_credit_payment_date(tx_time, 20, 20);
        let pay_date = Local.timestamp_millis_opt(pay_time).unwrap().date_naive();
        assert_eq!(pay_date, NaiveDate::from_ymd_opt(2026, 7, 10).unwrap());
    }

    #[test]
    fn test_calculate_credit_payment_date_after_cutoff() {
        // Transaction: June 25, 2026. Cutoff: 20, Days to pay: 20.
        // Payment date should be August 9, 2026.
        let tx_time = Local.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();
        let pay_time = calculate_credit_payment_date(tx_time, 20, 20);
        let pay_date = Local.timestamp_millis_opt(pay_time).unwrap().date_naive();
        assert_eq!(pay_date, NaiveDate::from_ymd_opt(2026, 8, 9).unwrap());
    }

    #[test]
    fn test_calculate_installment_dates() {
        let tx_time = Local.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let pay_time_1 = calculate_credit_payment_date_for_installment(tx_time, 20, 20, 1);
        let pay_date_1 = Local.timestamp_millis_opt(pay_time_1).unwrap().date_naive();
        assert_eq!(pay_date_1, NaiveDate::from_ymd_opt(2026, 8, 9).unwrap());

        let pay_time_2 = calculate_credit_payment_date_for_installment(tx_time, 20, 20, 2);
        let pay_date_2 = Local.timestamp_millis_opt(pay_time_2).unwrap().date_naive();
        assert_eq!(pay_date_2, NaiveDate::from_ymd_opt(2026, 9, 9).unwrap());

        let pay_time_3 = calculate_credit_payment_date_for_installment(tx_time, 20, 20, 3);
        let pay_date_3 = Local.timestamp_millis_opt(pay_time_3).unwrap().date_naive();
        assert_eq!(pay_date_3, NaiveDate::from_ymd_opt(2026, 10, 10).unwrap()); // September has 30 days, September 20 + 20 days is October 10.
    }

    #[test]
    fn test_cutoff_clamps_for_leap_and_non_leap_february() {
        assert_eq!(
            last_day_of_month_or_clamp(2028, 2, 31),
            NaiveDate::from_ymd_opt(2028, 2, 29).unwrap()
        );
        assert_eq!(
            last_day_of_month_or_clamp(2027, 2, 31),
            NaiveDate::from_ymd_opt(2027, 2, 28).unwrap()
        );
        assert_eq!(
            last_day_of_month_or_clamp(2026, 4, 31),
            NaiveDate::from_ymd_opt(2026, 4, 30).unwrap()
        );
    }

    #[test]
    fn test_installment_dates_cross_december_into_next_year() {
        let tx_time = Local.with_ymd_and_hms(2026, 12, 31, 23, 59, 0).unwrap().timestamp_millis();
        let payment = calculate_credit_payment_date_for_installment(tx_time, 31, 1, 2);
        assert_eq!(
            Local.timestamp_millis_opt(payment).unwrap().date_naive(),
            NaiveDate::from_ymd_opt(2027, 2, 1).unwrap()
        );
    }

    #[test]
    fn local_midnight_round_trip_is_stable_for_calendar_dates() {
        for date in [
            NaiveDate::from_ymd_opt(1969, 12, 31).unwrap(),
            NaiveDate::from_ymd_opt(2024, 2, 29).unwrap(),
            NaiveDate::from_ymd_opt(2026, 12, 31).unwrap(),
        ] {
            let timestamp = crate::utils::recurrence::local_naive_date_to_start_of_day_ms(date);
            assert_eq!(crate::utils::recurrence::timestamp_to_local_naive_date(timestamp), date);
        }
    }
}
