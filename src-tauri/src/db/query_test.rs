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
}
