use chrono::{Datelike, Duration, Local, NaiveDate, TimeZone};

/// Calculates the next payment date for a credit card given a transaction timestamp,
/// the cutoff day of the month, and the number of days to pay after cutoff.
pub fn calculate_credit_payment_date(timestamp_ms: i64, cutoff_day: u32, days_to_pay: u32) -> i64 {
    calculate_credit_payment_date_for_installment(timestamp_ms, cutoff_day, days_to_pay, 1)
}

/// Calculates the payment date for a specific installment of a credit card expense.
pub fn calculate_credit_payment_date_for_installment(
    timestamp_ms: i64,
    cutoff_day: u32,
    days_to_pay: u32,
    installment_number: i32,
) -> i64 {
    // Convert ms timestamp to Utc date
    let datetime = Local.timestamp_millis_opt(timestamp_ms).unwrap();
    let naive_date = datetime.date_naive();

    let year = naive_date.year();
    let month = naive_date.month();
    let day = naive_date.day();

    // Determine the initial statement cycle
    let (mut statement_year, mut statement_month) = if day <= cutoff_day {
        (year, month)
    } else {
        if month == 12 {
            (year + 1, 1)
        } else {
            (year, month + 1)
        }
    };

    // Shift statement month by (installment_number - 1) months
    if installment_number > 1 {
        let months_to_add = (installment_number - 1) as u32;
        statement_month += months_to_add;
        while statement_month > 12 {
            statement_year += 1;
            statement_month -= 12;
        }
    }

    // Clamp the cutoff day to the last day of the statement month if necessary
    let cutoff_date = last_day_of_month_or_clamp(statement_year, statement_month, cutoff_day);

    // Payment due date is cutoff_date + days_to_pay
    let payment_date = cutoff_date + Duration::days(days_to_pay as i64);

    // Convert back to start of day timestamp in milliseconds (in UTC)
    let payment_datetime = payment_date.and_hms_opt(0, 0, 0).unwrap();

    Local.from_local_datetime(&payment_datetime).single().unwrap().timestamp_millis()
}

pub fn last_day_of_month_or_clamp(year: i32, month: u32, day: u32) -> NaiveDate {
    let next_month_year = if month == 12 { year + 1 } else { year };
    let next_month = if month == 12 { 1 } else { month + 1 };

    let first_of_next_month = NaiveDate::from_ymd_opt(next_month_year, next_month, 1).unwrap();
    let last_day = first_of_next_month.pred_opt().unwrap().day();

    let clamped_day = if day > last_day { last_day } else { day };
    NaiveDate::from_ymd_opt(year, month, clamped_day).unwrap()
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
}
