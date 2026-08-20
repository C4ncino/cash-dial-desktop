use super::*;
use crate::models::budgets::BudgetHistory;
use crate::tests::{mock_state, setup};

pub mod unit {
    use super::*;

    #[test]
    fn validate_budget_accepts_valid() {
        let state = mock_state();
        let result = validate_budget(&state, "Food Budget", 500.0, 2, 1, 1);
        assert!(result.is_ok());
    }

    #[test]
    fn validate_budget_requires_name() {
        let state = mock_state();
        let result = validate_budget(&state, "", 500.0, 2, 1, 1);
        assert!(result.is_err());
        let errs = result.unwrap_err();
        assert!(errs.contains(&"El nombre es requerido".to_string()));
    }

    #[test]
    fn validate_budget_rejects_negative_amount() {
        let state = mock_state();
        let result = validate_budget(&state, "Food Budget", -1.0, 2, 1, 1);
        assert!(result.is_err());
        let errs = result.unwrap_err();
        assert!(errs.contains(&"El límite de presupuesto debe ser mayor o igual a 0".to_string()));
    }

    #[test]
    fn validate_budget_rejects_non_finite_amounts() {
        let state = mock_state();

        for amount in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            assert!(validate_budget(&state, "Food Budget", amount, 2, 1, 1).is_err());
        }
    }

    #[test]
    fn validate_budget_covers_zero_name_and_reference_boundaries() {
        let state = mock_state();
        assert!(validate_budget(&state, &"a".repeat(50), 0.0, 2, 1, 1).is_ok());
        assert!(validate_budget(&state, &"a".repeat(51), 0.0, 2, 1, 1).is_err());
        assert!(validate_budget(&state, "Budget", 0.0, 999, 1, 1).is_err());
        assert!(validate_budget(&state, "Budget", 0.0, 2, 999, 1).is_err());
        assert!(validate_budget(&state, "Budget", 0.0, 2, 1, 999).is_err());
    }

    #[test]
    fn test_unit_exact_category_match_and_ancestors() {
        let categories = vec![
            (1, None),    // Food (Root)
            (2, Some(1)), // Restaurants
            (3, Some(2)), // Fast Food (Deep child)
            (4, Some(2)), // Fine Dining
            (5, Some(1)), // Groceries
        ];

        // Root category (Food)
        assert_eq!(get_ancestor_category_ids(1, &categories), vec![1]);

        // Category with parent (Restaurants)
        assert_eq!(get_ancestor_category_ids(2, &categories), vec![2, 1]);

        // Deep child category (Fast Food)
        assert_eq!(get_ancestor_category_ids(3, &categories), vec![3, 2, 1]);

        // Sibling category (Groceries)
        assert_eq!(get_ancestor_category_ids(5, &categories), vec![5, 1]);
    }

    #[test]
    fn test_unit_category_with_no_parent() {
        let categories = vec![(10, None)];
        assert_eq!(get_ancestor_category_ids(10, &categories), vec![10]);
    }

    #[test]
    fn test_unit_nonexistent_category() {
        let categories = vec![(1, None)];
        assert_eq!(get_ancestor_category_ids(999, &categories), Vec::<i32>::new());
    }

    #[test]
    fn test_unit_cycle_prevention() {
        // Cycle: 1 -> 2 -> 3 -> 1
        let categories = vec![(1, Some(2)), (2, Some(3)), (3, Some(1))];
        let ancestors = get_ancestor_category_ids(1, &categories);
        assert_eq!(ancestors, vec![1, 2, 3]);
    }
}

pub mod integration {
    use super::*;

    fn get_budget_history(
        connection: &mut SqliteConnection,
        budget_id_val: i32,
    ) -> Vec<BudgetHistory> {
        use crate::schema::budget_history::dsl::{
            budget_history, budget_id as bh_budget_id, start_date,
        };
        budget_history
            .filter(bh_budget_id.eq(budget_id_val))
            .order(start_date.asc())
            .select(crate::models::budgets::BudgetHistoryRow::as_select())
            .load::<crate::models::budgets::BudgetHistoryRow>(connection)
            .unwrap()
            .into_iter()
            .map(BudgetHistory::from)
            .collect()
    }

    #[test]
    fn test_budget_creation_and_initial_history() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(
            connection,
            2, // monthly
            1, // category
            1, // currency
            "Monthly Food",
            500.0,
            start_date_val,
        )
        .unwrap();

        assert_eq!(budget.name, "Monthly Food");

        // Verify initial history record
        let history = get_budget_history(connection, budget.id);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].amount_limit, 500.0);
        assert_eq!(history[0].start_date, start_date_val);
        assert_eq!(history[0].end_date, i64::MAX);
    }

    #[test]
    fn test_correct_budget() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(
            connection,
            2,
            1,
            1,
            "Monthly Food",
            50.0, // incorrect amount
            start_date_val,
        )
        .unwrap();

        // Correct the budget to 500.0
        correct_budget_internal(connection, budget.id, 500.0).unwrap();

        // Verify budget history is updated in-place (no new records)
        let history = get_budget_history(connection, budget.id);
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].amount_limit, 500.0);
        assert_eq!(history[0].start_date, start_date_val);
        assert_eq!(history[0].end_date, i64::MAX);
    }

    #[test]
    fn test_change_budget_from_today() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget =
            create_budget_internal(connection, 2, 1, 1, "Monthly Food", 500.0, start_date_val)
                .unwrap();

        // Change the budget effective today (2026-07-14)
        let today_val = Local.with_ymd_and_hms(2026, 7, 14, 0, 0, 0).unwrap().timestamp_millis();

        change_budget_from_today_internal(connection, budget.id, 600.0, today_val).unwrap();

        // Verify history records
        let history = get_budget_history(connection, budget.id);
        assert_eq!(history.len(), 2);

        // First record closed at today_val - 1
        assert_eq!(history[0].amount_limit, 500.0);
        assert_eq!(history[0].start_date, start_date_val);
        assert_eq!(history[0].end_date, today_val - 1);

        // Second record starting today, active (end_date = i64::MAX)
        assert_eq!(history[1].amount_limit, 600.0);
        assert_eq!(history[1].start_date, today_val);
        assert_eq!(history[1].end_date, i64::MAX);
    }

    #[test]
    fn test_change_budget_next_period() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(
            connection,
            2, // monthly
            1,
            1,
            "Monthly Food",
            500.0,
            start_date_val,
        )
        .unwrap();

        // On 2026-07-14, schedule a budget change for the next period.
        // The monthly period started on 2026-06-04.
        // The next monthly period starts on 2026-08-04.
        let today_val = Local.with_ymd_and_hms(2026, 7, 14, 0, 0, 0).unwrap().timestamp_millis();

        change_budget_next_period_internal(connection, budget.id, 600.0, today_val).unwrap();

        // Verify history records
        let next_period_start =
            Local.with_ymd_and_hms(2026, 8, 4, 0, 0, 0).unwrap().timestamp_millis();
        let history = get_budget_history(connection, budget.id);
        assert_eq!(history.len(), 2);

        // First record closed at next_period_start - 1
        assert_eq!(history[0].amount_limit, 500.0);
        assert_eq!(history[0].start_date, start_date_val);
        assert_eq!(history[0].end_date, next_period_start - 1);

        // Second record scheduled for next_period_start, active (end_date = i64::MAX)
        assert_eq!(history[1].amount_limit, 600.0);
        assert_eq!(history[1].start_date, next_period_start);
        assert_eq!(history[1].end_date, i64::MAX);

        // Now, if we query the budget on 2026-08-04 (or later), it should return 600.0
        let later_today_val =
            Local.with_ymd_and_hms(2026, 8, 4, 12, 0, 0).unwrap().timestamp_millis();
        let queried = get_budget_internal(connection, budget.id, later_today_val).unwrap();

        let last = queried.periods.last().expect("Expected at least one budget period");

        assert_eq!(last.amount_limit, 600.0);
    }

    #[test]
    fn test_change_budget_name() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(
            connection,
            2,
            1,
            1,
            "Monthly Food",
            50.0, // incorrect amount
            start_date_val,
        )
        .unwrap();

        // Correct the budget to 500.0
        change_budget_name(connection, budget.id, "New Monthly Food".to_string()).unwrap();

        // Verify budget history is updated in-place (no new records)

        let budget_detail = get_budget_internal(
            connection,
            budget.id,
            get_ms_from_naive(Local::now().date_naive()),
        )
        .unwrap();

        assert_eq!(budget_detail.budget.name, "New Monthly Food");
    }

    #[test]
    fn test_delete_budget_and_cascade() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget =
            create_budget_internal(connection, 2, 1, 1, "Monthly Food", 500.0, start_date_val)
                .unwrap();

        // Verify history exists
        let history_before = get_budget_history(connection, budget.id);
        assert_eq!(history_before.len(), 1);

        // Delete budget
        let deleted = delete_budget_internal(connection, budget.id).unwrap();
        assert_eq!(deleted, 1);

        // Verify history records are deleted
        let history_after = get_budget_history(connection, budget.id);
        assert!(history_after.is_empty());
    }

    #[test]
    fn test_budget_details_recursively_calculates_movements() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        // Seeded categories from migration:
        //   Category 1 = "Food & Drink" (parent)
        //   Category 13 = "Supermarkets" (child of 1)
        // No need to insert new categories.

        // 1. Insert account to use for movements
        use crate::models::accounts::{AccountInsert, AccountRow};
        let account_id = diesel::insert_into(crate::schema::accounts::table)
            .values(&AccountInsert {
                type_id: 1,
                currency_id: 1,
                name: "Test Account",
                balance: 10000.0,
            })
            .returning(AccountRow::as_returning())
            .get_result::<AccountRow>(connection)
            .unwrap()
            .id;

        // 2. Create a monthly budget for Category 1 (Food & Drink) starting on 2026-06-04
        let start_date_val =
            Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(
            connection,
            2, // monthly
            1, // category 1 (Food & Drink)
            1, // currency 1
            "Monthly Food",
            500.0,
            start_date_val,
        )
        .unwrap();

        // The first monthly period is 2026-06-04 to 2026-07-03.
        // The second monthly period is 2026-07-04 to 2026-08-03.

        // 3. Insert movements and capture their IDs
        use crate::models::movements::{MovementInsert, MovementRow};

        // Movement A: inside Period 1, parent category (1)
        let mov_a = diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 1, // parent: Food & Drink
                currency_id: 1,
                original_amount: 50.0,
                account_amount: 50.0,
                installments: None,
                timestamp: Local
                    .with_ymd_and_hms(2026, 6, 10, 12, 0, 0)
                    .unwrap()
                    .timestamp_millis(),
                description: None,
            })
            .returning(MovementRow::as_returning())
            .get_result::<MovementRow>(connection)
            .unwrap();

        // Movement B: inside Period 1, child category (13 = Supermarkets)
        let mov_b = diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 13, // child: Supermarkets
                currency_id: 1,
                original_amount: 100.0,
                account_amount: 100.0,
                installments: None,
                timestamp: Local
                    .with_ymd_and_hms(2026, 6, 20, 12, 0, 0)
                    .unwrap()
                    .timestamp_millis(),
                description: None,
            })
            .returning(MovementRow::as_returning())
            .get_result::<MovementRow>(connection)
            .unwrap();

        // Movement C: before start_date, child category (13) — should be excluded
        let _mov_c = diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 13,
                currency_id: 1,
                original_amount: 200.0,
                account_amount: 200.0,
                installments: None,
                timestamp: Local
                    .with_ymd_and_hms(2026, 5, 20, 12, 0, 0)
                    .unwrap()
                    .timestamp_millis(),
                description: None,
            })
            .returning(MovementRow::as_returning())
            .get_result::<MovementRow>(connection)
            .unwrap();

        // Movement D: inside Period 2, child category (13)
        let mov_d = diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 13,
                currency_id: 1,
                original_amount: 150.0,
                account_amount: 150.0,
                installments: None,
                timestamp: Local
                    .with_ymd_and_hms(2026, 7, 10, 12, 0, 0)
                    .unwrap()
                    .timestamp_millis(),
                description: None,
            })
            .returning(MovementRow::as_returning())
            .get_result::<MovementRow>(connection)
            .unwrap();

        // Movement E: movement currency differs from the account/budget currency.
        // The budget must use account_amount, which is the amount actually charged
        // to the account after the user confirms or edits the conversion.
        let mov_e = diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 13,
                currency_id: 2,
                original_amount: 10.0,
                account_amount: 200.0,
                installments: None,
                timestamp: Local
                    .with_ymd_and_hms(2026, 7, 20, 12, 0, 0)
                    .unwrap()
                    .timestamp_millis(),
                description: Some("Converted expense"),
            })
            .returning(MovementRow::as_returning())
            .get_result::<MovementRow>(connection)
            .unwrap();

        // 4. Query budget details
        let today_val = Local.with_ymd_and_hms(2026, 7, 14, 0, 0, 0).unwrap().timestamp_millis();
        let details = get_budget_internal(connection, budget.id, today_val).unwrap();

        // Validate budget details
        assert_eq!(details.budget.id, budget.id);
        assert_eq!(details.budget.name, "Monthly Food");
        assert_eq!(details.periods.len(), 2);

        // Period 1: 2026-06-04 to 2026-07-03
        let p1 = &details.periods[0];
        assert_eq!(p1.amount_limit, 500.0);
        // Spend should include Movement A (50.0) + Movement B (100.0) = 150.0
        // Movement C (before start) should not be included.
        assert_eq!(p1.amount_spend, 150.0);
        assert_eq!(p1.movement_ids.len(), 2);
        assert!(p1.movement_ids.contains(&mov_a.id));
        assert!(p1.movement_ids.contains(&mov_b.id));

        // Period 2: 2026-07-04 to 2026-08-03
        let p2 = &details.periods[1];
        assert_eq!(p2.amount_limit, 500.0);
        // Spend should include Movement D (150.0) plus Movement E's
        // account_amount (200.0), not its original_amount (10.0).
        assert_eq!(p2.amount_spend, 350.0);
        assert_eq!(p2.movement_ids.len(), 2);
        assert!(p2.movement_ids.contains(&mov_d.id));
        assert!(p2.movement_ids.contains(&mov_e.id));
    }

    #[test]
    fn budget_converts_movement_currency_into_budget_currency() {
        use crate::models::accounts::{AccountInsert, AccountRow};
        use crate::models::movements::{MovementInsert, MovementRow};

        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = diesel::insert_into(crate::schema::accounts::table)
            .values(&AccountInsert {
                type_id: 1,
                currency_id: 1,
                name: "MXN account for USD budget",
                balance: 10000.0,
            })
            .returning(AccountRow::as_returning())
            .get_result::<AccountRow>(connection)
            .unwrap()
            .id;

        let start_date = Local.with_ymd_and_hms(2026, 6, 4, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(
            connection, 2, 1, 2, "USD Food", 100.0, start_date,
        )
        .unwrap();

        diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 1,
                currency_id: 1,
                original_amount: 100.0,
                account_amount: 100.0,
                installments: None,
                timestamp: Local.with_ymd_and_hms(2026, 6, 10, 12, 0, 0).unwrap().timestamp_millis(),
                description: Some("MXN expense in USD budget"),
            })
            .returning(MovementRow::as_returning())
            .get_result::<MovementRow>(connection)
            .unwrap();

        let details = get_budget_internal(
            connection,
            budget.id,
            Local.with_ymd_and_hms(2026, 6, 14, 0, 0, 0).unwrap().timestamp_millis(),
        )
        .unwrap();

        let expected = 100.0 * 1.1576 / 19.7411;
        assert!((details.periods[0].amount_spend - expected).abs() < 0.000001);
    }

    #[test]
    fn budget_rejects_invalid_conversion_rates_instead_of_returning_misleading_totals() {
        use crate::models::accounts::{AccountInsert, AccountRow};
        use crate::models::movements::MovementInsert;
        use crate::schema::currencies::dsl::{conversion_rate, currencies};

        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = diesel::insert_into(crate::schema::accounts::table)
            .values(&AccountInsert {
                type_id: 1,
                currency_id: 1,
                name: "Invalid rate source",
                balance: 100.0,
            })
            .returning(AccountRow::as_returning())
            .get_result::<AccountRow>(connection)
            .unwrap()
            .id;
        let start = Local.with_ymd_and_hms(2026, 6, 1, 0, 0, 0).unwrap().timestamp_millis();
        let budget = create_budget_internal(connection, 2, 1, 2, "USD budget", 50.0, start)
            .unwrap();
        diesel::insert_into(crate::schema::movements::table)
            .values(&MovementInsert {
                type_id: 2,
                account_id,
                to_account_id: None,
                category_id: 1,
                currency_id: 1,
                original_amount: 10.0,
                account_amount: 10.0,
                installments: None,
                timestamp: start + 1,
                description: None,
            })
            .execute(connection)
            .unwrap();
        diesel::update(currencies.find(2))
            .set(conversion_rate.eq(0.0))
            .execute(connection)
            .unwrap();

        let error = get_budget_internal(connection, budget.id, start + 2).unwrap_err();
        assert!(error.contains("Invalid currency conversion rate"));
    }

    fn setup_test_categories_and_budgets(connection: &mut SqliteConnection) -> QueryResult<()> {
        use crate::schema::budgets::dsl::budgets;
        use crate::schema::categories::dsl::categories;
        use crate::schema::movement_installments::dsl::movement_installments;
        use crate::schema::movements::dsl::movements;
        use crate::schema::planning_occurrences::dsl::planning_occurrences;
        use crate::schema::plannings::dsl::plannings;

        // Clear dependent tables first to avoid foreign key / NotNull violations
        diesel::delete(movement_installments).execute(connection)?;
        diesel::delete(planning_occurrences).execute(connection)?;
        diesel::delete(plannings).execute(connection)?;
        diesel::delete(movements).execute(connection)?;
        diesel::delete(budgets).execute(connection)?;
        diesel::delete(categories).execute(connection)?;

        // Insert categories:
        // 100 (Food)
        // 101 (Restaurants, parent: 100)
        // 102 (Fast Food, parent: 101)
        // 103 (Groceries, parent: 100)
        // 104 (Sub-Groceries, parent: 103)
        // 105 (Isolated Category, no parent)
        // 106 (Category with no budgets)
        use crate::schema::categories::dsl::{color, father_id, icon, id as cat_id, key};
        diesel::insert_into(categories)
            .values(vec![
                (
                    cat_id.eq(100),
                    key.eq("food"),
                    father_id.eq(None::<i32>),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
                (
                    cat_id.eq(101),
                    key.eq("rest"),
                    father_id.eq(Some(100)),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
                (
                    cat_id.eq(102),
                    key.eq("fast"),
                    father_id.eq(Some(101)),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
                (
                    cat_id.eq(103),
                    key.eq("groc"),
                    father_id.eq(Some(100)),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
                (
                    cat_id.eq(104),
                    key.eq("subgroc"),
                    father_id.eq(Some(103)),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
                (
                    cat_id.eq(105),
                    key.eq("isol"),
                    father_id.eq(None::<i32>),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
                (
                    cat_id.eq(106),
                    key.eq("nobudg"),
                    father_id.eq(None::<i32>),
                    icon.eq(""),
                    color.eq("#000000"),
                ),
            ])
            .execute(connection)?;

        // Insert budgets:
        // Budget 1: Category 100 (Food Budget)
        // Budget 2: Category 101 (Restaurants Budget)
        // Budget 3: Category 102 (Fast Food Budget)
        // Budget 4: Category 103 (Groceries Budget)
        // Budget 5: Category 105 (Isolated Budget)
        use crate::schema::budgets::dsl::{
            budget_period_type_id, category_id as b_cat_id, currency_id, id as b_id, name,
        };
        diesel::insert_into(budgets)
            .values(vec![
                (
                    b_id.eq(1),
                    budget_period_type_id.eq(2),
                    b_cat_id.eq(100),
                    currency_id.eq(1),
                    name.eq("Food Budget"),
                ),
                (
                    b_id.eq(2),
                    budget_period_type_id.eq(2),
                    b_cat_id.eq(101),
                    currency_id.eq(1),
                    name.eq("Restaurants Budget"),
                ),
                (
                    b_id.eq(3),
                    budget_period_type_id.eq(2),
                    b_cat_id.eq(102),
                    currency_id.eq(1),
                    name.eq("Fast Food Budget"),
                ),
                (
                    b_id.eq(4),
                    budget_period_type_id.eq(2),
                    b_cat_id.eq(103),
                    currency_id.eq(1),
                    name.eq("Groceries Budget"),
                ),
                (
                    b_id.eq(5),
                    budget_period_type_id.eq(2),
                    b_cat_id.eq(105),
                    currency_id.eq(1),
                    name.eq("Isolated Budget"),
                ),
            ])
            .execute(connection)?;

        Ok(())
    }

    #[test]
    fn test_integration_affected_budgets() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        setup_test_categories_and_budgets(connection).unwrap();

        let hierarchy = vec![
            (100, None),
            (101, Some(100)),
            (102, Some(101)),
            (103, Some(100)),
            (104, Some(103)),
            (105, None),
            (106, None),
        ];

        // 1. Exact match and child category refreshes all ancestors (Deep hierarchy traversal)
        // Fast Food (102) -> Restaurants (101) -> Food (100)
        // Affected budgets should be Budgets 1, 2, 3
        let mut res = get_affected_budget_ids_internal(connection, 102, None, &hierarchy).unwrap();
        res.sort();
        assert_eq!(res, vec![1, 2, 3]);

        // 2. Sibling category is not included
        // Restaurants (101) -> Food (100). Sibling Groceries (103) and child Fast Food (102) are not ancestors.
        // Affected budgets should be Budgets 1, 2
        let mut res = get_affected_budget_ids_internal(connection, 101, None, &hierarchy).unwrap();
        res.sort();
        assert_eq!(res, vec![1, 2]);

        // 3. Category with no parent / Root category
        // Food (100) -> Root.
        // Affected budget should be Budget 1
        let res = get_affected_budget_ids_internal(connection, 100, None, &hierarchy).unwrap();
        assert_eq!(res, vec![1]);

        // 4. Update without category change
        let mut res =
            get_affected_budget_ids_internal(connection, 102, Some(102), &hierarchy).unwrap();
        res.sort();
        assert_eq!(res, vec![1, 2, 3]);

        // 5. Update with category change (Union of old and new category branches)
        // Old category: Groceries (103) -> Food (100) [Budgets 1, 4]
        // New category: Fast Food (102) -> Restaurants (101) -> Food (100) [Budgets 1, 2, 3]
        // Union: Budgets 1, 2, 3, 4 (deduplicated)
        let mut res =
            get_affected_budget_ids_internal(connection, 102, Some(103), &hierarchy).unwrap();
        res.sort();
        assert_eq!(res, vec![1, 2, 3, 4]);

        // 6. No affected budgets (Category 106 has no budgets, parent is none)
        let res = get_affected_budget_ids_internal(connection, 106, None, &hierarchy).unwrap();
        assert_eq!(res, Vec::<i32>::new());

        // 7. Invalid/nonexistent category handling
        let res = get_affected_budget_ids_internal(connection, 999, None, &hierarchy).unwrap();
        assert_eq!(res, Vec::<i32>::new());
    }
}
