use super::*;

pub mod unit {
    use super::*;

    use crate::models::accounts::AccountCreditInfo;

    use crate::tests::mock_state;

    #[test]
    fn get_account_type_returns_correct_type() {
        let account_types = mock_state().account_types;

        let result = get_account_type(&account_types, 3);

        assert_eq!(result.id, 3);
        assert_eq!(result.name, "Credit Card");
    }

    #[test]
    fn validate_account_accepts_valid_cash_account() {
        let state = mock_state();

        let result = validate_account(&state, "Wallet", 150.0, 1, 1, &None);

        assert!(result.is_ok());
    }

    #[test]
    fn validate_account_requires_name() {
        let state = mock_state();

        let result = validate_account(&state, "", 150.0, 1, 1, &None);

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El nombre es requerido".to_string()));
    }

    #[test]
    fn validate_account_rejects_long_name() {
        let state = mock_state();

        let result = validate_account(&state, "12345678901234567890123456", 150.0, 1, 1, &None);

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El nombre debe tener máximo 25 caracteres".to_string()));
    }

    #[test]
    fn validate_account_rejects_unknown_account_type() {
        let state = mock_state();

        let result = validate_account(&state, "Wallet", 150.0, 999, 1, &None);

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El tipo de cuenta no existe".to_string()));
    }

    #[test]
    fn validate_account_rejects_unknown_currency() {
        let state = mock_state();

        let result = validate_account(&state, "Wallet", 150.0, 1, 99, &None);

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"La moneda seleccionada no existe".to_string()));
    }

    #[test]
    fn validate_credit_card_requires_credit_info() {
        let state = mock_state();

        let result =
            validate_account(&state, "Visa", 0.0, AccountTypeEnum::CreditCard as i32, 1, &None);

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors
            .contains(&"Las tarjetas de crédito requieren información de crédito".to_string()));
    }

    #[test]
    fn validate_credit_card_rejects_zero_limit() {
        let state = mock_state();

        let credit_info =
            Some(AccountCreditInfo { credit_limit: 0.0, cutoff_day: 15, days_to_pay: 20 });

        let result = validate_account(
            &state,
            "Visa",
            0.0,
            AccountTypeEnum::CreditCard as i32,
            1,
            &credit_info,
        );

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El límite de crédito debe ser mayor a 0".to_string()));
    }

    #[test]
    fn validate_credit_card_rejects_negative_balance() {
        let state = mock_state();

        let credit_info =
            Some(AccountCreditInfo { credit_limit: 1000.0, cutoff_day: 15, days_to_pay: 20 });

        let result = validate_account(
            &state,
            "Visa",
            -1.0,
            AccountTypeEnum::CreditCard as i32,
            1,
            &credit_info,
        );

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El saldo usado debe ser mayor o igual a 0".to_string()));
    }

    #[test]
    fn validate_credit_card_rejects_invalid_cutoff_day() {
        let state = mock_state();

        let credit_info =
            Some(AccountCreditInfo { credit_limit: 1000.0, cutoff_day: 32, days_to_pay: 20 });

        let result = validate_account(
            &state,
            "Visa",
            0.0,
            AccountTypeEnum::CreditCard as i32,
            1,
            &credit_info,
        );

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El día de corte debe ser un número entre 1 y 31".to_string()));
    }

    #[test]
    fn validate_credit_card_rejects_invalid_days_to_pay() {
        let state = mock_state();

        let credit_info =
            Some(AccountCreditInfo { credit_limit: 1000.0, cutoff_day: 15, days_to_pay: 31 });

        let result = validate_account(
            &state,
            "Visa",
            0.0,
            AccountTypeEnum::CreditCard as i32,
            1,
            &credit_info,
        );

        assert!(result.is_err());

        let errors = result.unwrap_err();

        assert!(errors.contains(&"El día de pago debe ser un número entre 1 y 30".to_string()));
    }

    #[test]
    fn validate_credit_card_accepts_valid_data() {
        let state = mock_state();

        let credit_info =
            Some(AccountCreditInfo { credit_limit: 10000.0, cutoff_day: 15, days_to_pay: 20 });

        let result = validate_account(
            &state,
            "Visa",
            500.0,
            AccountTypeEnum::CreditCard as i32,
            1,
            &credit_info,
        );

        assert!(result.is_ok());
    }
}

pub mod integration {
    use super::*;

    use crate::models::accounts::CreditCardPaymentRequest;
    use crate::tests::setup;

    #[test]
    fn returns_cash_account() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let accounts = get_accounts_internal(connection, &state.account_types).unwrap();

        assert!(accounts.len() > 1);
    }

    #[test]
    fn add_cash_account() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let account =
            add_account_internal(connection, &state.account_types, "Wallet", 1000.0, 1, 1, None)
                .unwrap();

        use crate::schema::accounts::dsl::*;

        let saved = accounts
            .find(account.id)
            .select(AccountRow::as_select())
            .first::<AccountRow>(connection)
            .unwrap();

        assert_eq!(saved.name, "Wallet");
        assert_eq!(saved.balance, 1000.0);
        assert_eq!(saved.type_id, 1);
    }

    #[test]
    fn add_credit_card_account() {
        let state = setup();

        let connection = &mut establish_connection(&state.config.database_url);

        let credit_info =
            AccountCreditInfo { credit_limit: 10000.0, cutoff_day: 15, days_to_pay: 20 };

        let account = add_account_internal(
            connection,
            &state.account_types,
            "Visa",
            0.0,
            3,
            1,
            Some(credit_info),
        )
        .unwrap();

        use crate::schema::accounts::dsl::*;
        use crate::schema::accounts_credit_info::dsl::*;

        let account_row = accounts
            .find(account.id)
            .select(AccountRow::as_select())
            .first::<AccountRow>(connection)
            .unwrap();

        let credit_row = accounts_credit_info
            .find(account.id)
            .select(AccountCreditInfoRow::as_select())
            .first::<AccountCreditInfoRow>(connection)
            .unwrap();

        assert_eq!(account_row.type_id, 3);
        assert_eq!(credit_row.credit_limit, 10000.0);
        assert_eq!(credit_row.cutoff_day, 15);
        assert_eq!(credit_row.days_to_pay, 20);
    }

    #[test]
    fn update_name() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        // from test.sql seed
        let account_id = 1;

        update_account_internal(
            connection,
            &state.account_types,
            account_id,
            "Updated Wallet",
            5000.0,
            1,
            1,
            None,
        )
        .unwrap();

        use crate::schema::accounts::dsl::*;

        let row = accounts
            .find(account_id)
            .select(AccountRow::as_select())
            .first::<AccountRow>(connection)
            .unwrap();

        assert_eq!(row.name, "Updated Wallet");
        assert_eq!(row.balance, 5000.0);
    }

    #[test]
    fn update_credit_card_info() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        // from test.sql seed
        let account_id = 2;

        update_account_internal(
            connection,
            &state.account_types,
            account_id,
            "Visa",
            0.0,
            3,
            1,
            Some(AccountCreditInfo { credit_limit: 20000.0, cutoff_day: 20, days_to_pay: 25 }),
        )
        .unwrap();

        use crate::schema::accounts_credit_info::dsl::accounts_credit_info;

        let row = accounts_credit_info
            .find(account_id)
            .select(AccountCreditInfoRow::as_select())
            .first::<AccountCreditInfoRow>(connection)
            .unwrap();

        assert_eq!(row.credit_limit, 20000.0);
        assert_eq!(row.cutoff_day, 20);
        assert_eq!(row.days_to_pay, 25);
    }

    #[test]
    fn remove_credit_card_info() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        // from test.sql seed
        let account_id = 3;

        update_account_internal(
            connection,
            &state.account_types,
            account_id,
            "Wallet",
            0.0,
            1,
            1,
            None,
        )
        .unwrap();

        use crate::schema::accounts_credit_info::dsl::accounts_credit_info;

        let row = accounts_credit_info
            .find(account_id)
            .select(AccountCreditInfoRow::as_select())
            .first::<AccountCreditInfoRow>(connection)
            .optional()
            .unwrap();

        assert!(row.is_none());
    }

    #[test]
    fn remove_existing_account() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        // from test.sql seed
        let account_id = 4;

        remove_account_internal(connection, account_id).unwrap();

        use crate::schema::accounts::dsl::*;

        let row = accounts
            .find(account_id)
            .select(AccountRow::as_select())
            .first::<AccountRow>(connection)
            .optional()
            .unwrap();

        assert!(row.is_none());
    }

    #[test]
    fn test_get_account_balance() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        // from test.sql seed
        let account_id = 1;
        let balance = get_account_balance_internal(connection, account_id).unwrap();
        assert!(balance >= 0.0);
    }

    #[test]
    fn test_next_payment_no_installments() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let credit_info =
            AccountCreditInfo { credit_limit: 5000.0, cutoff_day: 15, days_to_pay: 20 };
        let cc = add_account_internal(
            connection,
            &state.account_types,
            "Visa",
            0.0,
            3,
            1,
            Some(credit_info),
        )
        .unwrap();

        let next_payment = get_credit_card_next_payment_internal(connection, cc.id).unwrap();
        assert_eq!(next_payment.account_id, cc.id);
        assert_eq!(next_payment.total_amount, 0.0);
        assert!(next_payment.movements.is_empty());
        assert!(next_payment.payment_date > 0);
    }

    #[test]
    fn test_next_payment_multiple_movements_and_installments() {
        use chrono::{Local, TimeZone};
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);
        let credit_info =
            AccountCreditInfo { credit_limit: 10000.0, cutoff_day: 15, days_to_pay: 20 };
        let cc = add_account_internal(
            connection,
            &state.account_types,
            "Visa",
            0.0,
            3,
            1,
            Some(credit_info),
        )
        .unwrap();

        let tx_time = Local.with_ymd_and_hms(2026, 6, 10, 12, 0, 0).unwrap().timestamp_millis();
        let mov_a = crate::functions::movements::add_movement_internal(
            connection,
            2,
            cc.id,
            None,
            1,
            1,
            200.0,
            200.0,
            Some(2),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let mov_b = crate::functions::movements::add_movement_internal(
            connection,
            2,
            cc.id,
            None,
            1,
            1,
            150.0,
            150.0,
            Some(1),
            tx_time,
            None,
            None,
        )
        .unwrap();

        let next_payment = get_credit_card_next_payment_internal(connection, cc.id).unwrap();
        assert_eq!(next_payment.total_amount, 250.0);
        assert_eq!(next_payment.movements.len(), 2);

        let m_a = next_payment.movements.iter().find(|m| m.movement_id == mov_a.id).unwrap();
        assert_eq!(m_a.amount, 100.0);
        assert_eq!(m_a.installment_ids.len(), 1);

        let m_b = next_payment.movements.iter().find(|m| m.movement_id == mov_b.id).unwrap();
        assert_eq!(m_b.amount, 150.0);
        assert_eq!(m_b.installment_ids.len(), 1);

        let july_inst_ids = vec![m_a.installment_ids[0], m_b.installment_ids[0]];
        crate::functions::movements::mark_installments_as_paid_internal(connection, july_inst_ids)
            .unwrap();

        let next_payment_2 = get_credit_card_next_payment_internal(connection, cc.id).unwrap();
        assert_eq!(next_payment_2.total_amount, 100.0);
        assert_eq!(next_payment_2.movements.len(), 1);
        assert_eq!(next_payment_2.movements[0].movement_id, mov_a.id);
        assert_eq!(next_payment_2.movements[0].amount, 100.0);
    }

    #[test]
    fn test_pay_credit_card_success() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let debit_account =
            add_account_internal(connection, &state.account_types, "My Debit", 500.0, 2, 1, None)
                .unwrap();
        let credit_info =
            AccountCreditInfo { credit_limit: 2000.0, cutoff_day: 15, days_to_pay: 20 };
        let cc = add_account_internal(
            connection,
            &state.account_types,
            "My Visa",
            1000.0,
            3,
            1,
            Some(credit_info),
        )
        .unwrap();

        let reqs =
            vec![CreditCardPaymentRequest { from_account_id: debit_account.id, amount: 200.0 }];
        let transfer_ids = pay_credit_card_internal(connection, cc.id, reqs).unwrap();
        assert_eq!(transfer_ids.len(), 1);
        assert!(transfer_ids[0] > 0);

        let debit_bal = get_account_balance_internal(connection, debit_account.id).unwrap();
        let cc_bal = get_account_balance_internal(connection, cc.id).unwrap();

        assert_eq!(debit_bal, 300.0);
        assert_eq!(cc_bal, 1200.0);

        // Verify that the transfer movement was created in the database
        use crate::models::movements::MovementRow;
        use crate::schema::movements::dsl::{account_id, movements, to_account_id};

        let payment_movements = movements
            .filter(account_id.eq(debit_account.id))
            .filter(to_account_id.eq(cc.id))
            .select(MovementRow::as_select())
            .load::<MovementRow>(connection)
            .unwrap();

        assert_eq!(payment_movements.len(), 1);
        assert_eq!(payment_movements[0].id, transfer_ids[0]);
        assert_eq!(payment_movements[0].original_amount, 200.0);
        assert_eq!(payment_movements[0].type_id, 3); // TRANSFER
        assert_eq!(
            payment_movements[0].description,
            Some("Pago de tarjeta de crédito".to_string())
        );
    }

    #[test]
    fn test_pay_credit_card_invalid_cases() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let debit_account =
            add_account_internal(connection, &state.account_types, "My Debit", 500.0, 2, 1, None)
                .unwrap();
        let credit_info =
            AccountCreditInfo { credit_limit: 2000.0, cutoff_day: 15, days_to_pay: 20 };
        let cc = add_account_internal(
            connection,
            &state.account_types,
            "My Visa",
            1000.0,
            3,
            1,
            Some(credit_info),
        )
        .unwrap();

        // 1. Invalid credit card account
        let res1 = pay_credit_card_internal(
            connection,
            9999,
            vec![CreditCardPaymentRequest { from_account_id: debit_account.id, amount: 100.0 }],
        );
        assert!(res1.is_err());
        assert!(res1.unwrap_err().contains("no existe"));

        // 2. Non-credit card destination account
        let res2 = pay_credit_card_internal(
            connection,
            debit_account.id,
            vec![CreditCardPaymentRequest { from_account_id: debit_account.id, amount: 100.0 }],
        );
        assert!(res2.is_err());
        assert!(res2.unwrap_err().contains("no es una tarjeta de crédito"));

        // 3. Zero or negative payment amount
        let res3 = pay_credit_card_internal(
            connection,
            cc.id,
            vec![CreditCardPaymentRequest { from_account_id: debit_account.id, amount: 0.0 }],
        );
        assert!(res3.is_err());
        assert!(res3.unwrap_err().contains("mayor a 0"));

        let res4 = pay_credit_card_internal(
            connection,
            cc.id,
            vec![CreditCardPaymentRequest { from_account_id: debit_account.id, amount: -50.0 }],
        );
        assert!(res4.is_err());
        assert!(res4.unwrap_err().contains("mayor a 0"));

        // 4. Nonexistent source account
        let res5 = pay_credit_card_internal(
            connection,
            cc.id,
            vec![CreditCardPaymentRequest { from_account_id: 9999, amount: 100.0 }],
        );
        assert!(res5.is_err());
        assert!(res5.unwrap_err().contains("cuenta de origen con ID 9999 no existe"));
    }

    #[test]
    fn test_pay_credit_card_rollback_on_failure() {
        let state = setup();
        let connection = &mut establish_connection(&state.config.database_url);

        let debit_account =
            add_account_internal(connection, &state.account_types, "My Debit", 500.0, 2, 1, None)
                .unwrap();
        let credit_info =
            AccountCreditInfo { credit_limit: 2000.0, cutoff_day: 15, days_to_pay: 20 };
        let cc = add_account_internal(
            connection,
            &state.account_types,
            "My Visa",
            1000.0,
            3,
            1,
            Some(credit_info),
        )
        .unwrap();

        let reqs = vec![
            CreditCardPaymentRequest { from_account_id: debit_account.id, amount: 200.0 },
            CreditCardPaymentRequest { from_account_id: 9999, amount: 100.0 },
        ];

        let res = pay_credit_card_internal(connection, cc.id, reqs);
        assert!(res.is_err());

        let debit_bal = get_account_balance_internal(connection, debit_account.id).unwrap();
        let cc_bal = get_account_balance_internal(connection, cc.id).unwrap();

        assert_eq!(debit_bal, 500.0);
        assert_eq!(cc_bal, 1000.0);
    }
}
