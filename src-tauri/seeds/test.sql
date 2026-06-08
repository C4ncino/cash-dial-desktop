INSERT INTO currencies (symbol, code)
VALUES
    ('$', 'USD');

INSERT INTO accounts (type_id, currency_id, name, balance)
VALUES
    (1, 1, 'Efectivo', 200.0),
    (2, 1, 'Débito', 500.0),
    (3, 1, 'Crédito', 1000.0),
    (1, 1, 'Delete this', 1000.0);

INSERT INTO accounts_credit_info (account_id, credit_limit, cutoff_day, days_to_pay)
VALUES (3, 2000.0, 15, 30);

INSERT INTO currencies_translations (currency_id, lang, name)
VALUES
    (2, 'es', 'Dólar Americano'),
    (2, 'en', 'US Dollar');
    