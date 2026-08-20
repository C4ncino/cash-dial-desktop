use super::*;
use crate::models::plannings::{
    PLANNING_STATUS_CANCELED, PLANNING_STATUS_COMPLETED, PLANNING_STATUS_PENDING,
    RECURRING_TYPE_DAILY, RECURRING_TYPE_MONTHLY, RECURRING_TYPE_WEEKLY,
};
use crate::tests::setup;
use crate::utils::recurrence::local_naive_date_to_start_of_day_ms;
use chrono::NaiveDate;

#[test]
fn test_validation_rejects_non_finite_amounts() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);
    let start_date =
        local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 6, 10).unwrap());

    for amount in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        let req = CreatePlanningRequest {
            type_id: MOVEMENT_EXPENSE_ID,
            account_id: 1,
            category_id: 1,
            currency_id: 1,
            name: "Invalid amount".to_string(),
            amount,
            recurring_type_id: RECURRING_TYPE_DAILY,
            interval_step: 1,
            start_date,
            end_date: None,
            week_days: None,
            month_days: None,
            year_days: None,
        };

        assert!(validate_planning_request(&state, &mut conn, &req).is_err());
    }
}

#[test]
fn test_create_daily_planning_generates_initial_occurrence() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 6, 10).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Daily Coffee".to_string(),
        amount: 3.50,
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: None,
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).expect("Failed to create planning");
    assert_eq!(planning.name, "Daily Coffee");
    assert!(planning.current_occurrence.is_some());

    let occ = planning.current_occurrence.unwrap();
    assert_eq!(occ.expected_date, start_date_ms);
    assert_eq!(occ.status_id, PLANNING_STATUS_PENDING);
}

#[test]
fn test_create_monthly_planning_generates_initial_occurrence() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
    let expected_15th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Rent".to_string(),
        amount: 800.0,
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: Some(vec![15]),
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).expect("Failed to create monthly planning");
    let occ = planning.current_occurrence.expect("Should have initial occurrence");
    assert_eq!(occ.expected_date, expected_15th_ms);
    assert_eq!(occ.status_id, PLANNING_STATUS_PENDING);
}

#[test]
fn test_cancel_occurrence_advances_to_next_occurrence() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
    let expected_15th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap());
    let expected_28th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 28).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Subscriptions".to_string(),
        amount: 25.0,
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: Some(vec![15, 28]),
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).unwrap();
    let initial_occ = planning.current_occurrence.unwrap();
    assert_eq!(initial_occ.expected_date, expected_15th_ms);

    // Cancel occurrence
    let canceled = cancel_planning_occurrence_internal(&mut conn, initial_occ.id).unwrap();
    assert_eq!(canceled.status_id, PLANNING_STATUS_CANCELED);

    // Check updated planning has advanced occurrence to August 28
    let updated_planning = get_planning_internal(&mut conn, planning.id).unwrap();
    let next_occ = updated_planning.current_occurrence.expect("Should have next occurrence");
    assert_eq!(next_occ.expected_date, expected_28th_ms);
    assert_eq!(next_occ.status_id, PLANNING_STATUS_PENDING);
}

#[test]
fn test_deactivate_and_reactivate_planning() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 6, 1).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Weekly Gym".to_string(),
        amount: 20.0,
        recurring_type_id: RECURRING_TYPE_WEEKLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: Some(vec![0]), // Monday
        month_days: None,
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).unwrap();
    assert!(planning.current_occurrence.is_some());

    // Deactivate
    let deactivated = deactivate_planning_internal(&mut conn, planning.id).unwrap();
    assert!(!deactivated.recurring_rule.is_active);
    assert!(deactivated.current_occurrence.is_none());

    // Reactivate
    let reactivated = activate_planning_internal(&mut conn, planning.id).unwrap();
    assert!(reactivated.recurring_rule.is_active);
    assert!(reactivated.current_occurrence.is_some());
}

#[test]
fn test_validation_rejects_credit_card_income() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    // Account 3 is a credit card
    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 6, 1).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_INCOME_ID, // Income not allowed on credit card
        account_id: 3,
        category_id: 1,
        currency_id: 1,
        name: "Invalid CC Income".to_string(),
        amount: 100.0,
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: None,
        year_days: None,
    };

    let result = create_planning_internal(&mut conn, &state, req);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("tarjetas de crédito solo permiten planificaciones de tipo gasto"));
}

#[test]
fn test_update_planning_recalculates_pending_occurrence() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 7, 1).unwrap());
    let expected_15th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 7, 15).unwrap());
    let expected_20th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 7, 20).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Utility".to_string(),
        amount: 50.0,
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: Some(vec![15]),
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).unwrap();
    assert_eq!(planning.current_occurrence.as_ref().unwrap().expected_date, expected_15th_ms);

    // Update rule to 20th of the month
    let update_req = UpdatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Utility Updated".to_string(),
        amount: 55.0,
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: Some(vec![20]),
        year_days: None,
    };

    let updated = update_planning_internal(&mut conn, &state, planning.id, update_req).unwrap();
    assert_eq!(updated.current_occurrence.as_ref().unwrap().expected_date, expected_20th_ms);
}

#[test]
fn test_complete_occurrence_directly_and_advances() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
    let expected_15th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap());
    let expected_28th_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 28).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Two-step Planning".to_string(),
        amount: 30.0,
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: Some(vec![15, 28]),
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).unwrap();
    let initial_occ = planning.current_occurrence.unwrap();
    assert_eq!(initial_occ.expected_date, expected_15th_ms);

    // Create a standalone compatible movement
    use crate::functions::movements::add_movement_internal;
    let movement = add_movement_internal(
        &mut conn,
        MOVEMENT_EXPENSE_ID,
        1,
        None,
        1,
        1,
        30.0,
        30.0,
        None,
        expected_15th_ms,
        Some("Direct bill payment"),
        None,
    )
    .unwrap();

    // Complete the occurrence
    let completed = complete_planning_occurrence_internal(&mut conn, &state, initial_occ.id, movement.id).unwrap();
    assert_eq!(completed.status_id, PLANNING_STATUS_COMPLETED);
    assert_eq!(completed.movement_id, Some(movement.id));

    assert!(complete_planning_occurrence_internal(
        &mut conn,
        &state,
        initial_occ.id,
        movement.id,
    )
    .is_err());
    assert!(cancel_planning_occurrence_internal(&mut conn, initial_occ.id).is_err());
    assert!(cancel_planning_occurrence_internal(&mut conn, 999_999).is_err());

    // Next actionable occurrence should now be August 28
    let updated_planning = get_planning_internal(&mut conn, planning.id).unwrap();
    let next_occ = updated_planning.current_occurrence.unwrap();
    assert_eq!(next_occ.expected_date, expected_28th_ms);
    assert!(complete_planning_occurrence_internal(&mut conn, &state, next_occ.id, 999_999)
        .is_err());
    let after_failure = get_planning_internal(&mut conn, planning.id).unwrap();
    assert_eq!(after_failure.current_occurrence.unwrap().id, next_occ.id);
}

#[test]
fn test_multiple_pending_occurrences_returns_oldest_pending() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
    let aug_15_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap());
    let sep_15_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 9, 15).unwrap());

    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Monthly Bill".to_string(),
        amount: 75.0,
        recurring_type_id: RECURRING_TYPE_MONTHLY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: Some(vec![15]),
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).unwrap();

    // Insert August 15 and September 15 directly as pending occurrences
    use crate::schema::planning_occurrences;
    diesel::insert_into(planning_occurrences::table)
        .values(&PlanningOccurrenceInsert {
            planning_id: planning.id,
            movement_id: None,
            status_id: PLANNING_STATUS_PENDING,
            expected_date: sep_15_ms,
        })
        .execute(&mut conn)
        .unwrap();

    let history = get_planning_occurrences_internal(&mut conn, planning.id).unwrap();
    assert_eq!(history.first().unwrap().expected_date, sep_15_ms);
    assert_eq!(history.last().unwrap().expected_date, aug_15_ms);

    // Verify get_planning returns August 15 because it is the oldest pending
    let loaded = get_planning_internal(&mut conn, planning.id).unwrap();
    let current_occ = loaded.current_occurrence.expect("Should have actionable occurrence");
    assert_eq!(current_occ.expected_date, aug_15_ms);

    // Cancel August 15 -> September 15 should become the next actionable occurrence without duplicate generation
    cancel_planning_occurrence_internal(&mut conn, current_occ.id).unwrap();

    let loaded_after = get_planning_internal(&mut conn, planning.id).unwrap();
    let next_occ = loaded_after.current_occurrence.expect("Should have September 15 occurrence");
    assert_eq!(next_occ.expected_date, sep_15_ms);
}

#[test]
fn test_delete_planning_removes_occurrences_preserves_movements() {
    let state = setup();
    let mut conn = establish_connection(&state.config.database_url);

    let start_date_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
    let req = CreatePlanningRequest {
        type_id: MOVEMENT_EXPENSE_ID,
        account_id: 1,
        category_id: 1,
        currency_id: 1,
        name: "Planning to delete".to_string(),
        amount: 40.0,
        recurring_type_id: RECURRING_TYPE_DAILY,
        interval_step: 1,
        start_date: start_date_ms,
        end_date: None,
        week_days: None,
        month_days: None,
        year_days: None,
    };

    let planning = create_planning_internal(&mut conn, &state, req).unwrap();

    // Add movement linked to planning
    use crate::functions::movements::{add_movement_internal, get_movement_internal};
    let mov = add_movement_internal(
        &mut conn,
        MOVEMENT_EXPENSE_ID,
        1,
        None,
        1,
        1,
        40.0,
        40.0,
        None,
        start_date_ms,
        Some("Deleting test movement"),
        Some(planning.id),
    )
    .unwrap();

    // Delete planning
    delete_planning_internal(&mut conn, planning.id).unwrap();

    // Verify planning is deleted
    assert!(get_planning_internal(&mut conn, planning.id).is_err());

    // Verify movement is still intact
    let found_mov = get_movement_internal(&mut conn, mov.id);
    assert!(found_mov.is_ok());
}
