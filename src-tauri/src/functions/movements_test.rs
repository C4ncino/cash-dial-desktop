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
            30.0,
            None,
            1_788_000_000,
            Some("Transfer"),
        )
        .unwrap();

        assert_eq!(get_balance(connection, from_account_id), 70.0);
        assert_eq!(get_balance(connection, to_account_id), 80.0);
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
        assert_eq!(result.err().unwrap(), "El tipo de movimiento no se puede cambiar");
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
        )
        .unwrap();

        remove_movement_internal(connection, movement.id).unwrap();

        assert_eq!(get_balance(connection, account_id), 100.0);
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
            account_id, None, 1, 1, 500.0, 500.0, None, tx_time, None,
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
}
