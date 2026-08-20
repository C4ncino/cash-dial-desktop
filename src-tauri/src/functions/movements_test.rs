use super::*;
use chrono::{TimeZone, Utc};

pub mod unit {
    use super::*;

    use crate::tests::mock_state;

    #[test]
    fn validate_movement_accepts_income() {
        let state = mock_state();

        let result = validate_movement(&state, 1, 1, None, 1, 1, 100.0, None);

        assert!(result.is_ok());
    }

    #[test]
    fn validate_movement_requires_known_type() {
        let state = mock_state();

        let result = validate_movement(&state, 999, 1, None, 1, 1, 100.0, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(&"El tipo de movimiento no existe".to_string()));
    }

    #[test]
    fn validate_movement_requires_transfer_destination() {
        let state = mock_state();

        let result = validate_movement(&state, 3, 1, None, 88, 1, 100.0, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(&"La cuenta destino es requerida".to_string()));
    }

    #[test]
    fn validate_movement_rejects_same_transfer_account() {
        let state = mock_state();

        let result = validate_movement(&state, 3, 1, Some(1), 88, 1, 100.0, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(&"La cuenta destino debe ser diferente".to_string()));
    }

    #[test]
    fn validate_movement_rejects_destination_for_non_transfer() {
        let state = mock_state();

        let result = validate_movement(&state, 1, 1, Some(2), 1, 1, 100.0, None);

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains(&"La cuenta destino solo aplica para transferencias".to_string()));
    }

    #[test]
    fn validate_movement_rejects_invalid_category() {
        let state = mock_state();

        let result = validate_movement(&state, 1, 1, None, 999, 1, 100.0, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(&"La categoría seleccionada no existe".to_string()));
    }

    #[test]
    fn validate_movement_rejects_invalid_currency() {
        let state = mock_state();

        let result = validate_movement(&state, 1, 1, None, 1, 999, 100.0, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(&"La moneda seleccionada no existe".to_string()));
    }

    #[test]
    fn validate_movement_rejects_zero_amount() {
        let state = mock_state();

        let result = validate_movement(&state, 1, 1, None, 1, 1, 0.0, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains(&"El monto debe ser mayor a 0".to_string()));
    }

    #[test]
    fn validate_movement_rejects_non_finite_amounts_and_installment_boundaries() {
        let state = mock_state();

        for amount in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            assert!(validate_movement(&state, 2, 1, None, 1, 1, amount, Some(1)).is_err());
        }
        for installments in [0, 49, i32::MAX] {
            assert!(validate_movement(
                &state,
                2,
                1,
                None,
                1,
                1,
                100.0,
                Some(installments),
            )
            .is_err());
        }
        assert!(validate_movement(&state, 2, 1, None, 1, 1, 100.0, Some(1)).is_ok());
        assert!(validate_movement(&state, 2, 1, None, 1, 1, 100.0, Some(48)).is_ok());
    }
}

pub mod integration {
    use super::*;

    use crate::models::accounts::{AccountInsert, AccountRow};
    use crate::tests::setup;

    fn insert_account(connection: &mut SqliteConnection, account_name: &str, value: f64) -> i32 {
        use crate::schema::accounts::dsl::accounts;

        diesel::insert_into(accounts)
            .values(&AccountInsert {
                type_id: 1,
                currency_id: 1,
                name: account_name,
                balance: value,
            })
            .returning(AccountRow::as_returning())
            .get_result::<AccountRow>(connection)
            .unwrap()
            .id
    }

    fn insert_account_with_currency(
        connection: &mut SqliteConnection,
        account_name: &str,
        value: f64,
        currency_id: i32,
    ) -> i32 {
        use crate::schema::accounts::dsl::accounts;

        diesel::insert_into(accounts)
            .values(&AccountInsert {
                type_id: 1,
                currency_id,
                name: account_name,
                balance: value,
            })
            .returning(AccountRow::as_returning())
            .get_result::<AccountRow>(connection)
            .unwrap()
            .id
    }

    fn get_balance(connection: &mut SqliteConnection, account_id: i32) -> f64 {
        use crate::schema::accounts::dsl::{accounts, balance};

        accounts.find(account_id).select(balance).first::<f64>(connection).unwrap()
    }

    #[test]
    fn add_income_updates_account_balance() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Income account", 100.0);

        add_movement_internal(
            connection,
            1,
            account_id,
            None,
            1,
            1,
            25.0,
            25.0,
            None,
            1_788_000_000,
            Some("Salary"),
            None,
        )
        .unwrap();

        assert_eq!(get_balance(connection, account_id), 125.0);
    }

    #[test]
    fn add_expense_updates_account_balance() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Expense account", 100.0);

        add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            25.0,
            25.0,
            None,
            1_788_000_000,
            Some("Groceries"),
            None,
        )
        .unwrap();

        assert_eq!(get_balance(connection, account_id), 75.0);
    }

    #[test]
    fn add_transfer_updates_both_account_balances() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let from_account_id = insert_account(connection, "Transfer from", 100.0);
        let to_account_id = insert_account(connection, "Transfer to", 50.0);

        add_movement_internal(
            connection,
            3,
            from_account_id,
            Some(to_account_id),
            88,
            1,
            30.0,
            25.0,
            None,
            1_788_000_000,
            Some("Transfer"),
            None,
        )
        .unwrap();

        assert_eq!(get_balance(connection, from_account_id), 70.0);
        assert_eq!(get_balance(connection, to_account_id), 75.0);
    }

    #[test]
    fn cross_currency_transfer_persists_both_amounts_and_uses_account_amount_for_destination() {
        use crate::schema::movements::dsl::movements;

        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let from_account_id = insert_account_with_currency(connection, "USD source", 500.0, 1);
        let to_account_id = insert_account_with_currency(connection, "MXN destination", 2000.0, 2);

        let movement = add_movement_internal(
            connection,
            3,
            from_account_id,
            Some(to_account_id),
            88,
            1,
            100.0,
            1800.0,
            None,
            1_788_000_000,
            Some("Cross-currency transfer"),
            None,
        )
        .unwrap();

        assert_eq!(get_balance(connection, from_account_id), 400.0);
        assert_eq!(get_balance(connection, to_account_id), 3800.0);

        let persisted = movements.find(movement.id).first::<MovementRow>(connection).unwrap();
        assert_eq!(persisted.original_amount, 100.0);
        assert_eq!(persisted.account_amount, 1800.0);
        assert_eq!(persisted.conversion_rate, 18.0);
    }

    #[test]
    fn cross_currency_income_and_expense_use_account_amount_for_balance_effects() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let income_account = insert_account_with_currency(connection, "USD income", 1000.0, 2);
        let expense_account = insert_account_with_currency(connection, "USD expense", 1000.0, 2);

        add_movement_internal(
            connection, 1, income_account, None, 1, 1, 100.0, 1800.0, None,
            1_788_000_000, Some("USD income"), None,
        )
        .unwrap();
        add_movement_internal(
            connection, 2, expense_account, None, 1, 1, 20.0, 360.0, None,
            1_788_000_001, Some("USD expense"), None,
        )
        .unwrap();

        assert_eq!(get_balance(connection, income_account), 2800.0);
        assert_eq!(get_balance(connection, expense_account), 640.0);
    }

    #[test]
    fn cross_currency_update_and_delete_restore_and_reapply_account_amount_effects() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account_with_currency(connection, "USD update", 1000.0, 2);

        let movement = add_movement_internal(
            connection, 2, account_id, None, 1, 1, 10.0, 180.0, None,
            1_788_000_000, Some("Initial expense"), None,
        )
        .unwrap();
        assert_eq!(get_balance(connection, account_id), 820.0);

        update_movement_internal(
            connection, movement.id, 2, account_id, None, 1, 1, 20.0, 360.0, None,
            1_788_000_001, Some("Updated expense"),
        )
        .unwrap();
        assert_eq!(get_balance(connection, account_id), 640.0);

        remove_movement_internal(connection, movement.id).unwrap();
        assert_eq!(get_balance(connection, account_id), 1000.0);
    }

    #[test]
    fn update_movement_reverses_previous_balance_effect_for_same_type() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Update movement account", 100.0);

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            25.0,
            25.0,
            None,
            1_788_000_000,
            Some("Expense"),
            None,
        )
        .unwrap();

        update_movement_internal(
            connection,
            movement.id,
            2,
            account_id,
            None,
            1,
            1,
            40.0,
            40.0,
            None,
            1_788_000_001,
            Some("Updated expense"),
        )
        .unwrap();

        assert_eq!(get_balance(connection, account_id), 60.0);
    }

    #[test]
    fn update_movement_rejects_type_change() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Immutable type account", 100.0);

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            25.0,
            25.0,
            None,
            1_788_000_000,
            Some("Expense"),
            None,
        )
        .unwrap();

        let result = update_movement_internal(
            connection,
            movement.id,
            1,
            account_id,
            None,
            1,
            1,
            40.0,
            40.0,
            None,
            1_788_000_001,
            Some("Income"),
        );

        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "El tipo de movimiento no se puede cambiar o los datos son incompatibles con la planificación vinculada");
        assert_eq!(get_balance(connection, account_id), 75.0);
    }

    #[test]
    fn remove_movement_reverses_balance_effect() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Remove movement account", 100.0);

        let movement = add_movement_internal(
            connection,
            1,
            account_id,
            None,
            1,
            1,
            30.0,
            30.0,
            None,
            1_788_000_000,
            Some("Income"),
            None,
        )
        .unwrap();

        remove_movement_internal(connection, movement.id).unwrap();

        assert_eq!(get_balance(connection, account_id), 100.0);
    }

    #[test]
    fn create_rolls_back_row_balance_and_installments_after_late_failure() {
        use crate::schema::movements::dsl::movements;

        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Create rollback card", 1000.0);
        insert_credit_info(connection, account_id, 5000.0, 15, 20);
        diesel::sql_query(
            "CREATE TRIGGER fail_installment_insert BEFORE INSERT ON movement_installments \
             BEGIN SELECT RAISE(ABORT, 'forced installment failure'); END",
        )
        .execute(connection)
        .unwrap();

        let before_count = movements.count().get_result::<i64>(connection).unwrap();
        let result = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            120.0,
            120.0,
            Some(3),
            1_788_000_000,
            Some("Must roll back"),
            None,
        );

        assert!(result.is_err());
        assert_eq!(movements.count().get_result::<i64>(connection).unwrap(), before_count);
        assert_eq!(get_balance(connection, account_id), 1000.0);
    }

    #[test]
    fn update_rolls_back_reversal_row_and_installments_after_late_failure() {
        use crate::schema::movements::dsl::movements;

        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Update rollback card", 1000.0);
        insert_credit_info(connection, account_id, 5000.0, 15, 20);
        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            120.0,
            120.0,
            Some(3),
            1_788_000_000,
            Some("Original"),
            None,
        )
        .unwrap();
        let original_installments = get_installments(connection, movement.id);
        diesel::sql_query(
            "CREATE TRIGGER fail_movement_update BEFORE UPDATE ON movements \
             BEGIN SELECT RAISE(ABORT, 'forced movement update failure'); END",
        )
        .execute(connection)
        .unwrap();

        let result = update_movement_internal(
            connection,
            movement.id,
            2,
            account_id,
            None,
            1,
            1,
            60.0,
            60.0,
            Some(2),
            1_788_000_001,
            Some("Changed"),
        );

        assert!(result.is_err());
        let persisted = movements.find(movement.id).first::<MovementRow>(connection).unwrap();
        assert_eq!(persisted.account_amount, 120.0);
        assert_eq!(persisted.description.as_deref(), Some("Original"));
        assert_eq!(get_balance(connection, account_id), 880.0);
        assert_eq!(get_installments(connection, movement.id).len(), original_installments.len());
    }

    #[test]
    fn delete_rolls_back_balance_and_installments_after_late_failure() {
        use crate::schema::movements::dsl::movements;

        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Delete rollback card", 1000.0);
        insert_credit_info(connection, account_id, 5000.0, 15, 20);
        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            120.0,
            120.0,
            Some(3),
            1_788_000_000,
            Some("Original"),
            None,
        )
        .unwrap();
        diesel::sql_query(
            "CREATE TRIGGER fail_movement_delete BEFORE DELETE ON movements \
             BEGIN SELECT RAISE(ABORT, 'forced movement delete failure'); END",
        )
        .execute(connection)
        .unwrap();

        assert!(remove_movement_internal(connection, movement.id).is_err());
        assert_eq!(movements.find(movement.id).count().get_result::<i64>(connection).unwrap(), 1);
        assert_eq!(get_balance(connection, account_id), 880.0);
        assert_eq!(get_installments(connection, movement.id).len(), 3);
    }

    #[test]
    fn nonexistent_transfer_destination_does_not_change_source_balance() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let source_id = insert_account(connection, "Protected source", 100.0);

        let result = add_movement_internal(
            connection,
            3,
            source_id,
            Some(999_999),
            88,
            1,
            50.0,
            50.0,
            None,
            1_788_000_000,
            None,
            None,
        );

        assert!(result.is_err());
        assert_eq!(get_balance(connection, source_id), 100.0);
    }

    #[derive(Queryable, Selectable, Debug)]
    #[diesel(table_name = crate::schema::movement_installments)]
    struct MovementInstallmentRow {
        id: Option<i32>,
        movement_id: i32,
        installment_number: i32,
        total_installments: i32,
        amount: f64,
        due_timestamp: i64,
        paid: bool,
        paid_timestamp: Option<i64>,
    }

    fn get_installments(
        connection: &mut SqliteConnection,
        movement_id_val: i32,
    ) -> Vec<MovementInstallmentRow> {
        use crate::schema::movement_installments::dsl::{movement_id, movement_installments};
        movement_installments
            .filter(movement_id.eq(movement_id_val))
            .select(MovementInstallmentRow::as_select())
            .load::<MovementInstallmentRow>(connection)
            .unwrap()
    }

    fn insert_credit_info(
        connection: &mut SqliteConnection,
        account_id: i32,
        credit_limit: f64,
        cutoff_day: i32,
        days_to_pay: i32,
    ) {
        use crate::models::accounts::AccountCreditInfoRow;
        use crate::schema::accounts_credit_info::dsl::accounts_credit_info;

        diesel::insert_into(accounts_credit_info)
            .values(&AccountCreditInfoRow { account_id, credit_limit, cutoff_day, days_to_pay })
            .execute(connection)
            .unwrap();
    }

    #[test]
    fn add_expense_generates_installments_for_credit_card() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Credit Card Account", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);

        // Transaction date: June 25, 2026.
        // Due dates for 3 installments: Aug 9, Sep 9, Oct 10.
        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2, // Expense
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            Some("New computer"),
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        assert_eq!(installments.len(), 3);

        assert_eq!(installments[0].installment_number, 1);
        assert_eq!(installments[0].amount, 100.0);

        let due_date_1 =
            Utc.timestamp_millis_opt(installments[0].due_timestamp).unwrap().date_naive();
        assert_eq!(due_date_1, chrono::NaiveDate::from_ymd_opt(2026, 8, 9).unwrap());

        let due_date_3 =
            Utc.timestamp_millis_opt(installments[2].due_timestamp).unwrap().date_naive();
        assert_eq!(due_date_3, chrono::NaiveDate::from_ymd_opt(2026, 10, 10).unwrap());
    }

    #[test]
    fn credit_installments_use_account_amount_and_preserve_cent_total() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Converted Credit Card", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);
        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            2,
            10.0,
            180.01,
            Some(3),
            tx_time,
            Some("Converted purchase"),
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        let amounts = installments.iter().map(|item| item.amount).collect::<Vec<_>>();
        assert_eq!(amounts, vec![60.0, 60.0, 60.01]);
        assert!((amounts.iter().sum::<f64>() - 180.01).abs() < f64::EPSILON);

        let payment = crate::functions::accounts::get_credit_card_next_payment_internal(
            connection,
            account_id,
        )
        .unwrap();
        assert_eq!(payment.total_amount, 60.0);
        assert_eq!(payment.movements[0].amount, 60.0);
    }

    #[test]
    fn update_expense_regenerates_installments_for_credit_card() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Credit Card Account", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);

        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            Some("Computer"),
            None,
        )
        .unwrap();

        // Update to 2 installments of 200 total amount
        update_movement_internal(
            connection,
            movement.id,
            2,
            account_id,
            None,
            1,
            1,
            200.0,
            200.0,
            Some(2),
            tx_time,
            Some("Cheaper computer"),
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        assert_eq!(installments.len(), 2);
        assert_eq!(installments[0].amount, 100.0);
        assert_eq!(installments[0].total_installments, 2);
    }

    #[test]
    fn remove_movement_deletes_associated_installments() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Credit Card Account", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);
        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            None,
            None,
        )
        .unwrap();

        remove_movement_internal(connection, movement.id).unwrap();

        let installments = get_installments(connection, movement.id);
        assert_eq!(installments.len(), 0);
    }

    #[test]
    fn add_expense_without_credit_card_does_not_generate_installments() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Normal Checking Account", 1000.0);
        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2, // Expense
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        assert_eq!(installments.len(), 0);
    }

    #[test]
    fn get_installments_returns_installments_for_credit_card_expense() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Credit Card", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);
        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            Some("Laptop"),
            None,
        )
        .unwrap();

        let result = get_movement_installments_internal(connection, movement.id);
        assert!(result.is_ok());

        let installments = result.unwrap();
        assert_eq!(installments.len(), 3);

        assert_eq!(installments[0].installment_number, 1);
        assert_eq!(installments[0].total_installments, 3);
        assert_eq!(installments[0].amount, 100.0);
        assert_eq!(installments[0].movement_id, movement.id);
        assert!(!installments[0].paid);
        assert!(installments[0].paid_timestamp.is_none());

        assert_eq!(installments[1].installment_number, 2);
        assert_eq!(installments[2].installment_number, 3);
    }

    #[test]
    fn get_installments_returns_empty_for_movement_without_installments() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "Normal Account", 1000.0);
        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection, 1, // Income — no installments
            account_id, None, 1, 1, 500.0, 500.0, None, tx_time, None, None,
        )
        .unwrap();

        let result = get_movement_installments_internal(connection, movement.id);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn get_installments_returns_empty_for_nonexistent_movement() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let result = get_movement_installments_internal(connection, 99999);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn get_movement_internal_returns_created_movement() {
        let _state = setup();
        let connection = &mut establish_connection(&_state.config.database_url);
        let account_id = insert_account(connection, "Movement account", 100.0);

        let movement = add_movement_internal(
            connection,
            1,
            account_id,
            None,
            1,
            1,
            150.0,
            150.0,
            None,
            1_788_000_000,
            Some("Test movement"),
            None,
        )
        .unwrap();

        let result = get_movement_internal(connection, movement.id);

        assert!(result.is_ok());
        let found = result.unwrap();
        assert_eq!(found.id, movement.id);
        assert_eq!(found.type_id, movement.type_id);
        assert_eq!(found.account_id, movement.account_id);
    }

    #[test]
    fn get_movement_internal_returns_error_for_missing_movement() {
        let _state = setup();
        let connection = &mut establish_connection(&_state.config.database_url);

        let result = get_movement_internal(connection, 999_999);

        assert!(result.is_err());
    }

    #[test]
    fn get_installments_returns_correct_order() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "CC Order Test", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 15, 15);
        let tx_time = Utc.with_ymd_and_hms(2026, 3, 10, 12, 0, 0).unwrap().timestamp_millis();

        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            600.0,
            600.0,
            Some(6),
            tx_time,
            Some("Furniture"),
            None,
        )
        .unwrap();

        let installments = get_movement_installments_internal(connection, movement.id).unwrap();
        assert_eq!(installments.len(), 6);

        for (i, inst) in installments.iter().enumerate() {
            assert_eq!(inst.installment_number, (i + 1) as i32);
            assert_eq!(inst.amount, 100.0);
            assert_eq!(inst.total_installments, 6);
        }

        // Verify due dates are in ascending order
        for window in installments.windows(2) {
            assert!(window[0].due_timestamp < window[1].due_timestamp);
        }
    }

    #[test]
    fn mark_installments_paid_single() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "CC Mark Paid", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);

        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();
        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        let inst_id = installments[0].id.unwrap();

        // Initially unpaid
        assert!(!installments[0].paid);
        assert!(installments[0].paid_timestamp.is_none());

        let movement_ids = mark_installments_as_paid_internal(connection, vec![inst_id]).unwrap();
        assert_eq!(movement_ids, vec![movement.id]);

        let updated = get_installments(connection, movement.id);
        assert!(updated[0].paid);
        assert!(updated[0].paid_timestamp.is_some());
    }

    #[test]
    fn mark_installments_paid_multiple() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "CC Mark Paid Mult", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);

        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();
        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        let ids = vec![installments[0].id.unwrap(), installments[1].id.unwrap()];

        let movement_ids = mark_installments_as_paid_internal(connection, ids.clone()).unwrap();
        assert_eq!(movement_ids, vec![movement.id]);

        let updated = get_installments(connection, movement.id);
        assert!(updated[0].paid);
        assert!(updated[1].paid);
        assert!(!updated[2].paid);
    }

    #[test]
    fn mark_installments_paid_nonexistent_causes_rollback() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "CC Mark Paid Fail", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);

        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();
        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        let valid_id = installments[0].id.unwrap();
        let invalid_id = 99999;

        // Try marking both a valid and invalid ID
        let res = mark_installments_as_paid_internal(connection, vec![valid_id, invalid_id]);
        assert!(res.is_err());
        assert_eq!(res.err().unwrap(), "Uno o más IDs de mensualidades no existen");

        // Verify rollback: the valid installment should STILL be unpaid
        let current = get_installments(connection, movement.id);
        assert!(!current[0].paid);
    }

    #[test]
    fn mark_installments_paid_already_paid() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let account_id = insert_account(connection, "CC Mark Paid Prev", 1000.0);
        insert_credit_info(connection, account_id, 10000.0, 20, 20);

        let tx_time = Utc.with_ymd_and_hms(2026, 6, 25, 12, 0, 0).unwrap().timestamp_millis();
        let movement = add_movement_internal(
            connection,
            2,
            account_id,
            None,
            1,
            1,
            300.0,
            300.0,
            Some(3),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let installments = get_installments(connection, movement.id);
        let inst_id = installments[0].id.unwrap();

        // Mark it paid first
        let first_result = mark_installments_as_paid_internal(connection, vec![inst_id]).unwrap();
        assert_eq!(first_result, vec![movement.id]);

        // Mark it paid again
        let res = mark_installments_as_paid_internal(connection, vec![inst_id]);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), vec![movement.id]);
    }

    #[test]
    fn test_add_movement_linked_to_planning_completes_occurrence_and_advances() {
        use crate::functions::plannings::{create_planning_internal, get_planning_internal};
        use crate::models::plannings::{CreatePlanningRequest, PLANNING_STATUS_COMPLETED, PLANNING_STATUS_PENDING, RECURRING_TYPE_MONTHLY};
        use crate::utils::recurrence::local_naive_date_to_start_of_day_ms;
        use chrono::NaiveDate;

        let state = setup();
        let mut conn = establish_connection(&state.config.database_url);
        let account_id = insert_account(&mut conn, "Checking Acc", 1000.0);

        let start_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
        let aug_15_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap());
        let sep_15_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 9, 15).unwrap());

        let req = CreatePlanningRequest {
            type_id: 2, // Expense
            account_id,
            category_id: 1,
            currency_id: 1,
            name: "Internet Bill".to_string(),
            amount: 60.0,
            recurring_type_id: RECURRING_TYPE_MONTHLY,
            interval_step: 1,
            start_date: start_ms,
            end_date: None,
            week_days: None,
            month_days: Some(vec![15]),
            year_days: None,
        };

        let planning = create_planning_internal(&mut conn, &state, req).unwrap();
        assert_eq!(planning.current_occurrence.as_ref().unwrap().expected_date, aug_15_ms);

        // Add movement linked to planning
        let movement = add_movement_internal(
            &mut conn,
            2,
            account_id,
            None,
            1,
            1,
            60.0,
            60.0,
            None,
            aug_15_ms,
            Some("Internet Payment August"),
            Some(planning.id),
        )
        .unwrap();

        // Check planning now has September 15 as current pending occurrence
        let updated_planning = get_planning_internal(&mut conn, planning.id).unwrap();
        let next_occ = updated_planning.current_occurrence.expect("Should advance to September 15");
        assert_eq!(next_occ.expected_date, sep_15_ms);
        assert_eq!(next_occ.status_id, PLANNING_STATUS_PENDING);

        // Check August 15 occurrence is completed with movement.id
        use crate::schema::planning_occurrences;
        use crate::models::plannings::PlanningOccurrenceRow;
        let aug_occ = planning_occurrences::table
            .filter(planning_occurrences::planning_id.eq(planning.id))
            .filter(planning_occurrences::expected_date.eq(aug_15_ms))
            .select(PlanningOccurrenceRow::as_select())
            .first::<PlanningOccurrenceRow>(&mut conn)
            .unwrap();

        assert_eq!(aug_occ.status_id, PLANNING_STATUS_COMPLETED);
        assert_eq!(aug_occ.movement_id, Some(movement.id));
    }

    #[test]
    fn test_movement_deletion_recovery_restores_occurrence_to_pending() {
        use crate::functions::plannings::{create_planning_internal, get_planning_internal};
        use crate::models::plannings::{CreatePlanningRequest, PLANNING_STATUS_PENDING, RECURRING_TYPE_MONTHLY};
        use crate::utils::recurrence::local_naive_date_to_start_of_day_ms;
        use chrono::NaiveDate;

        let state = setup();
        let mut conn = establish_connection(&state.config.database_url);
        let account_id = insert_account(&mut conn, "Checking Acc 2", 1000.0);

        let start_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 10).unwrap());
        let aug_15_ms = local_naive_date_to_start_of_day_ms(NaiveDate::from_ymd_opt(2026, 8, 15).unwrap());

        let req = CreatePlanningRequest {
            type_id: 2,
            account_id,
            category_id: 1,
            currency_id: 1,
            name: "Cloud Hosting".to_string(),
            amount: 100.0,
            recurring_type_id: RECURRING_TYPE_MONTHLY,
            interval_step: 1,
            start_date: start_ms,
            end_date: None,
            week_days: None,
            month_days: Some(vec![15]),
            year_days: None,
        };

        let planning = create_planning_internal(&mut conn, &state, req).unwrap();

        // Create movement linking to August 15
        let movement = add_movement_internal(
            &mut conn,
            2,
            account_id,
            None,
            1,
            1,
            100.0,
            100.0,
            None,
            aug_15_ms,
            Some("Hosting Aug"),
            Some(planning.id),
        )
        .unwrap();

        // Now delete the movement
        remove_movement_internal(&mut conn, movement.id).unwrap();

        // The August 15 occurrence must be restored to pending with its original expected_date
        let planning_after_del = get_planning_internal(&mut conn, planning.id).unwrap();
        let restored_occ = planning_after_del.current_occurrence.expect("Should have restored occurrence");
        assert_eq!(restored_occ.expected_date, aug_15_ms);
        assert_eq!(restored_occ.status_id, PLANNING_STATUS_PENDING);
        assert_eq!(restored_occ.movement_id, None);
    }
}
