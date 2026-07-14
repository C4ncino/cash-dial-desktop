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
}
