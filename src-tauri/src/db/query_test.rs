use super::*;

pub mod integration {
    use super::*;

    use crate::tests::setup_test_db;

    #[test]
    fn returns_account_types_in_spanish() {
        let conn = &mut setup_test_db();

        let result = get_account_types(conn, "es".to_string()).unwrap();

        assert_eq!(result.len(), 3);

        assert_eq!(result[0].name, "Efectivo");
        assert_eq!(result[1].name, "Débito");
        assert_eq!(result[2].name, "Crédito");
    }

    #[test]
    fn returns_account_types_in_english() {
        let conn = &mut setup_test_db();

        let result = get_account_types(conn, "en".to_string()).unwrap();

        assert_eq!(result.len(), 3);

        assert_eq!(result[0].name, "Cash");
        assert_eq!(result[1].name, "Debit");
        assert_eq!(result[2].name, "Credit");
    }

    #[test]
    fn returns_empty_when_language_does_not_exist() {
        let conn = &mut setup_test_db();

        let result = get_account_types(conn, "fr".to_string()).unwrap();

        assert!(result.is_empty());
    }

    #[test]
    fn returns_currencies_in_spanish() {
        let conn = &mut setup_test_db();

        let result = get_currencies(conn, "es".to_string()).unwrap();

        assert_eq!(result.len(), 2);

        assert_eq!(result[0].name, "Peso Mexicano");
        assert_eq!(result[0].code, "MXN");

        assert_eq!(result[1].name, "Dólar Americano");
        assert_eq!(result[1].code, "USD");
    }

    #[test]
    fn returns_currencies_in_english() {
        let conn = &mut setup_test_db();

        let result = get_currencies(conn, "en".to_string()).unwrap();

        assert_eq!(result.len(), 2);

        assert_eq!(result[0].name, "Mexican Peso");
        assert_eq!(result[1].name, "US Dollar");
    }

    #[test]
    fn returns_empty_currency_list_when_language_not_found() {
        let conn = &mut setup_test_db();

        let result = get_currencies(conn, "fr".to_string()).unwrap();

        assert!(result.is_empty());
    }

    #[test]
    fn returns_categories_in_spanish() {
        let conn = &mut setup_test_db();

        let result = get_categories(conn, "es".to_string()).unwrap();

        // There are a total of 88 categories inserted by migration
        assert_eq!(result.len(), 88);

        // Category with id 1 is 'food' and translated to 'Comida y Bebida'
        let food_cat = result.iter().find(|c| c.id == 1).unwrap();
        assert_eq!(food_cat.name, "Comida y Bebida");
        assert_eq!(food_cat.icon, "apple");
        assert_eq!(food_cat.color, "#00a63e");
    }

    #[test]
    fn returns_categories_in_english() {
        let conn = &mut setup_test_db();

        let result = get_categories(conn, "en".to_string()).unwrap();

        assert_eq!(result.len(), 88);

        let food_cat = result.iter().find(|c| c.id == 1).unwrap();
        assert_eq!(food_cat.name, "Food & Drink");
    }

    #[test]
    fn returns_empty_categories_list_when_language_not_found() {
        let conn = &mut setup_test_db();

        let result = get_categories(conn, "fr".to_string()).unwrap();

        assert!(result.is_empty());
    }

    #[test]
    fn returns_movement_types_in_spanish() {
        let conn = &mut setup_test_db();

        let result = get_movement_types(conn, "es".to_string()).unwrap();

        assert_eq!(result.len(), 3);

        assert_eq!(result[0].key, "in");
        assert_eq!(result[0].name, "Ingreso");
        assert_eq!(result[1].name, "Gasto");
        assert_eq!(result[2].name, "Transferencia");
    }

    #[test]
    fn returns_movement_types_in_english() {
        let conn = &mut setup_test_db();

        let result = get_movement_types(conn, "en".to_string()).unwrap();

        assert_eq!(result.len(), 3);

        assert_eq!(result[0].name, "Income");
        assert_eq!(result[1].name, "Expense");
        assert_eq!(result[2].name, "Transfer");
    }

    #[test]
    fn returns_empty_movement_types_list_when_language_not_found() {
        let conn = &mut setup_test_db();

        let result = get_movement_types(conn, "fr".to_string()).unwrap();

        assert!(result.is_empty());
    }

    #[test]
    fn returns_budget_period_types_in_spanish() {
        let conn = &mut setup_test_db();

        let result = get_budget_period_types(conn, "es".to_string()).unwrap();

        assert_eq!(result.len(), 3);
        assert_eq!(result[0].key, "weekly");
        assert_eq!(result[0].name, "Semanal");
        assert_eq!(result[1].key, "monthly");
        assert_eq!(result[1].name, "Mensual");
        assert_eq!(result[2].key, "yearly");
        assert_eq!(result[2].name, "Anual");
    }

    #[test]
    fn returns_budget_period_types_in_english() {
        let conn = &mut setup_test_db();

        let result = get_budget_period_types(conn, "en".to_string()).unwrap();

        assert_eq!(result.len(), 3);
        assert_eq!(result[0].key, "weekly");
        assert_eq!(result[0].name, "Weekly");
        assert_eq!(result[1].key, "monthly");
        assert_eq!(result[1].name, "Monthly");
        assert_eq!(result[2].key, "yearly");
        assert_eq!(result[2].name, "Yearly");
    }

    #[test]
    fn returns_empty_budget_period_types_list_when_language_not_found() {
        let conn = &mut setup_test_db();

        let result = get_budget_period_types(conn, "fr".to_string()).unwrap();

        assert!(result.is_empty());
    }
}

