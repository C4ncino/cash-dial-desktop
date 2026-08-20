use chrono::{Datelike, Duration, Local, NaiveDate};

use crate::models::plannings::{
    RECURRING_TYPE_DAILY, RECURRING_TYPE_MONTHLY, RECURRING_TYPE_WEEKLY, RECURRING_TYPE_YEARLY,
};

#[cfg(test)]
#[path = "./recurrence_test.rs"]
mod recurrence_test;

#[derive(Clone, Debug, PartialEq)]
pub struct RecurrenceRuleDefinition {
    pub recurring_type_id: i32,
    pub interval_step: i32,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub week_days: Vec<i32>,
    pub month_days: Vec<i32>,
    pub year_days: Vec<(i32, i32)>, // (month, day_of_month)
}

/// Converts a millisecond timestamp to a NaiveDate in the Local timezone.
#[cfg(test)]
pub fn timestamp_to_local_naive_date(timestamp_ms: i64) -> NaiveDate {
    try_timestamp_to_local_naive_date(timestamp_ms).unwrap_or_else(|error| {
        tracing::error!("{}", error);
        Local::now().date_naive()
    })
}

pub fn try_timestamp_to_local_naive_date(
    timestamp_ms: i64,
) -> Result<NaiveDate, crate::domain::date::DateError> {
    crate::domain::date::ms_to_local_date(timestamp_ms)
}

/// Converts a NaiveDate at 00:00:00 local time to millisecond timestamp.
pub fn local_naive_date_to_start_of_day_ms(date: NaiveDate) -> i64 {
    try_local_naive_date_to_start_of_day_ms(date).unwrap_or_else(|error| {
        tracing::error!("{}", error);
        i64::MIN
    })
}

pub fn try_local_naive_date_to_start_of_day_ms(
    date: NaiveDate,
) -> Result<i64, crate::domain::date::DateError> {
    crate::domain::date::local_date_to_start_ms(date)
}

/// Returns today's start-of-day timestamp in milliseconds in the Local timezone.
pub fn local_today_start_of_day_ms() -> i64 {
    let today = Local::now().date_naive();
    local_naive_date_to_start_of_day_ms(today)
}

/// Pure recurrence calculation engine.
/// Returns the earliest valid occurrence date on or after `from_date` (if `inclusive_from` is true)
/// or strictly after `from_date` (if `inclusive_from` is false).
///
/// Guaranteed to satisfy:
/// 1. `result >= rule.start_date`
/// 2. If `rule.end_date` is Some: `result <= end_date`
/// 3. If `inclusive_from`: `result >= from_date`, else `result > from_date`.
pub fn calculate_next_occurrence(
    rule: &RecurrenceRuleDefinition,
    from_date: NaiveDate,
    inclusive_from: bool,
) -> Option<NaiveDate> {
    if rule.interval_step <= 0 {
        return None;
    }

    if let Some(end_date) = rule.end_date {
        if end_date < rule.start_date {
            return None;
        }
    }

    // Minimum starting search date is rule.start_date
    let search_start = if from_date < rule.start_date { rule.start_date } else { from_date };

    let is_valid = |candidate: NaiveDate| -> bool {
        if candidate < rule.start_date {
            return false;
        }
        if let Some(end_date) = rule.end_date {
            if candidate > end_date {
                return false;
            }
        }
        if inclusive_from {
            candidate >= from_date
        } else {
            candidate > from_date
        }
    };

    match rule.recurring_type_id {
        RECURRING_TYPE_DAILY => calculate_next_daily(rule, search_start, is_valid),
        RECURRING_TYPE_WEEKLY => calculate_next_weekly(rule, search_start, is_valid),
        RECURRING_TYPE_MONTHLY => calculate_next_monthly(rule, search_start, is_valid),
        RECURRING_TYPE_YEARLY => calculate_next_yearly(rule, search_start, is_valid),
        _ => None,
    }
}

fn calculate_next_daily<F>(
    rule: &RecurrenceRuleDefinition,
    _search_start: NaiveDate,
    is_valid: F,
) -> Option<NaiveDate>
where
    F: Fn(NaiveDate) -> bool,
{
    let step = rule.interval_step as i64;
    let mut current = rule.start_date;

    // Fast-forward to search boundary if far in the future
    if _search_start > rule.start_date {
        let diff_days = (_search_start - rule.start_date).num_days();
        let intervals = diff_days / step;
        current = rule.start_date + Duration::days(intervals * step);
    }

    // Advance up to valid candidate
    for _ in 0..10_000 {
        if is_valid(current) {
            return Some(current);
        }
        if let Some(end_date) = rule.end_date {
            if current > end_date {
                return None;
            }
        }
        current += Duration::days(step);
    }

    None
}

fn calculate_next_weekly<F>(
    rule: &RecurrenceRuleDefinition,
    _search_start: NaiveDate,
    is_valid: F,
) -> Option<NaiveDate>
where
    F: Fn(NaiveDate) -> bool,
{
    if rule.week_days.is_empty() {
        return None;
    }

    let mut sorted_week_days = rule.week_days.clone();
    sorted_week_days.sort_unstable();
    sorted_week_days.dedup();

    let step = rule.interval_step as i64;

    // Anchor week to the Monday of start_date's week
    // chrono weekday: 0 = Mon, ..., 6 = Sun using num_days_from_monday()
    let start_weekday = rule.start_date.weekday().num_days_from_monday() as i64;
    let anchor_monday = rule.start_date - Duration::days(start_weekday);

    let mut week_index: i64 = 0;

    // Fast-forward week_index if _search_start is in a future week
    if _search_start > anchor_monday {
        let diff_days = (_search_start - anchor_monday).num_days();
        let total_weeks = diff_days / 7;
        let cycles = total_weeks / step;
        week_index = cycles * step;
    }

    for _ in 0..5_000 {
        let current_monday = anchor_monday + Duration::days(week_index * 7);

        for &day_of_week in &sorted_week_days {
            if !(0..=6).contains(&day_of_week) {
                continue;
            }
            let candidate = current_monday + Duration::days(day_of_week as i64);

            if let Some(end_date) = rule.end_date {
                if candidate > end_date {
                    return None;
                }
            }

            if is_valid(candidate) {
                return Some(candidate);
            }
        }

        week_index += step;
    }

    None
}

fn calculate_next_monthly<F>(
    rule: &RecurrenceRuleDefinition,
    search_start: NaiveDate,
    is_valid: F,
) -> Option<NaiveDate>
where
    F: Fn(NaiveDate) -> bool,
{
    if rule.month_days.is_empty() {
        return None;
    }

    let mut sorted_days = rule.month_days.clone();
    sorted_days.sort_unstable();
    sorted_days.dedup();

    let step = rule.interval_step as u32;

    let anchor_year = rule.start_date.year();
    let anchor_month = rule.start_date.month();

    let mut month_offset: u32 = 0;

    // Fast-forward month_offset
    if search_start > rule.start_date {
        let total_months = ((search_start.year() - anchor_year) * 12
            + (search_start.month() as i32 - anchor_month as i32))
            .max(0) as u32;
        month_offset = (total_months / step) * step;
    }

    for _ in 0..1_200 {
        let total_target_months = (anchor_month - 1) + month_offset;
        let current_year = anchor_year + (total_target_months / 12) as i32;
        let current_month = (total_target_months % 12) + 1;

        for &day in &sorted_days {
            if !(1..=28).contains(&day) {
                continue;
            }

            if let Some(candidate) =
                NaiveDate::from_ymd_opt(current_year, current_month, day as u32)
            {
                if let Some(end_date) = rule.end_date {
                    if candidate > end_date {
                        return None;
                    }
                }

                if is_valid(candidate) {
                    return Some(candidate);
                }
            }
        }

        month_offset += step;
    }

    None
}

fn calculate_next_yearly<F>(
    rule: &RecurrenceRuleDefinition,
    search_start: NaiveDate,
    is_valid: F,
) -> Option<NaiveDate>
where
    F: Fn(NaiveDate) -> bool,
{
    if rule.year_days.is_empty() {
        return None;
    }

    let mut sorted_dates = rule.year_days.clone();
    sorted_dates.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.cmp(&b.1)));
    sorted_dates.dedup();

    let step = rule.interval_step as i32;
    let anchor_year = rule.start_date.year();

    let mut year_offset: i32 = 0;

    // Fast-forward year_offset
    if search_start.year() > anchor_year {
        let diff_years = search_start.year() - anchor_year;
        year_offset = (diff_years / step) * step;
    }

    for _ in 0..200 {
        let current_year = anchor_year + year_offset;

        for &(month, day) in &sorted_dates {
            if !(1..=12).contains(&month) || !(1..=28).contains(&day) {
                continue;
            }

            if let Some(candidate) = NaiveDate::from_ymd_opt(current_year, month as u32, day as u32)
            {
                if let Some(end_date) = rule.end_date {
                    if candidate > end_date {
                        return None;
                    }
                }

                if is_valid(candidate) {
                    return Some(candidate);
                }
            }
        }

        year_offset += step;
    }

    None
}
