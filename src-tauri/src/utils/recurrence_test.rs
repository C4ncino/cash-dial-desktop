use chrono::NaiveDate;
use super::*;
use crate::models::plannings::{
    RECURRING_TYPE_DAILY, RECURRING_TYPE_MONTHLY, RECURRING_TYPE_WEEKLY, RECURRING_TYPE_YEARLY,
};

#[test]
fn test_daily_recurrence_interval_1() {
    let start = NaiveDate::from_ymd_opt(2026, 6, 10).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start,
        end_date: None,
        week_days: vec![],
        month_days: vec![],
        year_days: vec![],
    };

    // Inclusive from start_date
    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(NaiveDate::from_ymd_opt(2026, 6, 10).unwrap()));

    // Exclusive from start_date
    let next2 = calculate_next_occurrence(&rule, start, false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2026, 6, 11).unwrap()));

    // Query from before start_date
    let before = NaiveDate::from_ymd_opt(2026, 6, 1).unwrap();
    let next3 = calculate_next_occurrence(&rule, before, true);
    assert_eq!(next3, Some(NaiveDate::from_ymd_opt(2026, 6, 10).unwrap()));
}

#[test]
fn test_daily_recurrence_interval_3_with_end_date() {
    let start = NaiveDate::from_ymd_opt(2026, 6, 10).unwrap();
    let end = NaiveDate::from_ymd_opt(2026, 6, 16).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 3,
        start_date: start,
        end_date: Some(end),
        week_days: vec![],
        month_days: vec![],
        year_days: vec![],
    };

    // Sequence should be June 10, June 13, June 16, None
    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(NaiveDate::from_ymd_opt(2026, 6, 10).unwrap()));

    let next2 = calculate_next_occurrence(&rule, next1.unwrap(), false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2026, 6, 13).unwrap()));

    let next3 = calculate_next_occurrence(&rule, next2.unwrap(), false);
    assert_eq!(next3, Some(NaiveDate::from_ymd_opt(2026, 6, 16).unwrap()));

    let next4 = calculate_next_occurrence(&rule, next3.unwrap(), false);
    assert_eq!(next4, None);
}

#[test]
fn test_weekly_recurrence_single_weekday() {
    // 2026-06-02 is a Tuesday
    let start = NaiveDate::from_ymd_opt(2026, 6, 2).unwrap();
    // Monday is weekday 0
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_WEEKLY,
        interval_step: 1,
        start_date: start,
        end_date: None,
        week_days: vec![0], // Monday
        month_days: vec![],
        year_days: vec![],
    };

    // First occurrence cannot be June 1 (Monday before start_date).
    // Must be Monday June 8.
    let next = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next, Some(NaiveDate::from_ymd_opt(2026, 6, 8).unwrap()));

    let next2 = calculate_next_occurrence(&rule, next.unwrap(), false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2026, 6, 15).unwrap()));
}

#[test]
fn test_weekly_recurrence_multiple_weekdays_interval_2() {
    // 2026-06-01 is a Monday
    let start = NaiveDate::from_ymd_opt(2026, 6, 1).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_WEEKLY,
        interval_step: 2, // Every 2 weeks
        start_date: start,
        end_date: None,
        week_days: vec![0, 2], // Monday (0) and Wednesday (2)
        month_days: vec![],
        year_days: vec![],
    };

    // Week 1 (start week): June 1 (Mon), June 3 (Wed)
    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(NaiveDate::from_ymd_opt(2026, 6, 1).unwrap()));

    let next2 = calculate_next_occurrence(&rule, next1.unwrap(), false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2026, 6, 3).unwrap()));

    // Week 2 is skipped because interval_step = 2. Next week is Week 3 (starts June 15):
    let next3 = calculate_next_occurrence(&rule, next2.unwrap(), false);
    assert_eq!(next3, Some(NaiveDate::from_ymd_opt(2026, 6, 15).unwrap()));

    let next4 = calculate_next_occurrence(&rule, next3.unwrap(), false);
    assert_eq!(next4, Some(NaiveDate::from_ymd_opt(2026, 6, 17).unwrap()));
}

#[test]
fn test_monthly_recurrence_multiple_days() {
    let start = NaiveDate::from_ymd_opt(2026, 8, 10).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start,
        end_date: None,
        week_days: vec![],
        month_days: vec![1, 15, 28],
        year_days: vec![],
    };

    // Since start is Aug 10, first valid day is Aug 15 (Aug 1 is before start)
    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap()));

    let next2 = calculate_next_occurrence(&rule, next1.unwrap(), false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2026, 8, 28).unwrap()));

    let next3 = calculate_next_occurrence(&rule, next2.unwrap(), false);
    assert_eq!(next3, Some(NaiveDate::from_ymd_opt(2026, 9, 1).unwrap()));
}

#[test]
fn test_monthly_recurrence_interval_2() {
    let start = NaiveDate::from_ymd_opt(2026, 1, 15).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 2, // Every 2 months (Jan, Mar, May, ...)
        start_date: start,
        end_date: None,
        week_days: vec![],
        month_days: vec![15],
        year_days: vec![],
    };

    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(NaiveDate::from_ymd_opt(2026, 1, 15).unwrap()));

    let next2 = calculate_next_occurrence(&rule, next1.unwrap(), false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2026, 3, 15).unwrap()));

    let next3 = calculate_next_occurrence(&rule, next2.unwrap(), false);
    assert_eq!(next3, Some(NaiveDate::from_ymd_opt(2026, 5, 15).unwrap()));
}

#[test]
fn test_yearly_recurrence_multiple_dates() {
    let start = NaiveDate::from_ymd_opt(2026, 4, 1).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_YEARLY,
        interval_step: 1,
        start_date: start,
        end_date: None,
        week_days: vec![],
        month_days: vec![],
        year_days: vec![(3, 15), (12, 25)], // March 15, December 25
    };

    // Starting from April 1, 2026 -> next is Dec 25, 2026 (March 15, 2026 is before start)
    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(NaiveDate::from_ymd_opt(2026, 12, 25).unwrap()));

    let next2 = calculate_next_occurrence(&rule, next1.unwrap(), false);
    assert_eq!(next2, Some(NaiveDate::from_ymd_opt(2027, 3, 15).unwrap()));
}

#[test]
fn test_start_equals_end_date() {
    let start = NaiveDate::from_ymd_opt(2026, 7, 1).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start,
        end_date: Some(start),
        week_days: vec![],
        month_days: vec![],
        year_days: vec![],
    };

    let next1 = calculate_next_occurrence(&rule, start, true);
    assert_eq!(next1, Some(start));

    let next2 = calculate_next_occurrence(&rule, start, false);
    assert_eq!(next2, None);
}

#[test]
fn test_expired_recurrence() {
    let start = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
    let end = NaiveDate::from_ymd_opt(2026, 1, 31).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start,
        end_date: Some(end),
        week_days: vec![],
        month_days: vec![],
        year_days: vec![],
    };

    let search = NaiveDate::from_ymd_opt(2026, 2, 1).unwrap();
    let next = calculate_next_occurrence(&rule, search, true);
    assert_eq!(next, None);
}

#[test]
fn invalid_recurrence_definitions_return_none_without_looping() {
    let start = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
    let base = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start,
        end_date: None,
        week_days: vec![],
        month_days: vec![],
        year_days: vec![],
    };

    for interval_step in [0, -1, i32::MIN] {
        let mut rule = base.clone();
        rule.interval_step = interval_step;
        assert_eq!(calculate_next_occurrence(&rule, start, true), None);
    }
    let mut unknown = base.clone();
    unknown.recurring_type_id = 999;
    assert_eq!(calculate_next_occurrence(&unknown, start, true), None);

    let mut reversed = base;
    reversed.end_date = Some(NaiveDate::from_ymd_opt(2025, 12, 31).unwrap());
    assert_eq!(calculate_next_occurrence(&reversed, start, true), None);
}

#[test]
fn empty_and_out_of_range_selection_lists_return_none() {
    let start = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();
    for rule in [
        RecurrenceRuleDefinition {
            recurring_type_id: RECURRING_TYPE_WEEKLY,
            interval_step: 1,
            start_date: start,
            end_date: None,
            week_days: vec![-1, 7],
            month_days: vec![],
            year_days: vec![],
        },
        RecurrenceRuleDefinition {
            recurring_type_id: RECURRING_TYPE_MONTHLY,
            interval_step: 1,
            start_date: start,
            end_date: None,
            week_days: vec![],
            month_days: vec![0, 29],
            year_days: vec![],
        },
        RecurrenceRuleDefinition {
            recurring_type_id: RECURRING_TYPE_YEARLY,
            interval_step: 1,
            start_date: start,
            end_date: None,
            week_days: vec![],
            month_days: vec![],
            year_days: vec![(0, 1), (13, 1), (2, 29)],
        },
    ] {
        assert_eq!(calculate_next_occurrence(&rule, start, true), None);
    }
}

#[test]
fn duplicate_unsorted_selections_are_normalized() {
    let start = NaiveDate::from_ymd_opt(2026, 6, 1).unwrap();
    let rule = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_WEEKLY,
        interval_step: 1,
        start_date: start,
        end_date: None,
        week_days: vec![4, 0, 4, 2, 0],
        month_days: vec![],
        year_days: vec![],
    };

    assert_eq!(calculate_next_occurrence(&rule, start, true), Some(start));
    assert_eq!(
        calculate_next_occurrence(&rule, start, false),
        Some(NaiveDate::from_ymd_opt(2026, 6, 3).unwrap())
    );
}

#[test]
fn far_future_search_fast_forwards_across_leap_and_year_boundaries() {
    let start = NaiveDate::from_ymd_opt(2000, 2, 28).unwrap();
    let daily = RecurrenceRuleDefinition {
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 3,
        start_date: start,
        end_date: None,
        week_days: vec![],
        month_days: vec![],
        year_days: vec![],
    };
    let search = NaiveDate::from_ymd_opt(2099, 12, 31).unwrap();
    let result = calculate_next_occurrence(&daily, search, true).unwrap();
    assert!(result >= search);
    assert_eq!((result - start).num_days() % 3, 0);
}
