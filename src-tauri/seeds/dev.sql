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


INSERT INTO movements (
    id,
    type_id,
    account_id,
    to_account_id,
    category_id,
    currency_id,
    original_amount,
    account_amount,
    installments,
    timestamp,
    description
)
VALUES
-- Salary
(1, 1, 1, NULL, 78, 1, 3500.00, 3500.00, NULL, 1751328000, 'Monthly salary'),

-- Grocery shopping
(2, 2, 1, NULL, 13, 1, 85.42, 85.42, NULL, 1751414400, 'Supermarket'),

-- Netflix yearly subscription (12 installments)
(3, 2, 3, NULL, 60, 1, 120.00, 120.00, 12, 1751500800, 'Netflix annual plan'),

-- Transfer from checking to savings
(4, 3, 1, 2, 88, 1, 500.00, 500.00, NULL, 1751587200, 'Monthly savings'),

-- Electric bill
(5, 2, 1, NULL, 36, 1, 64.75, 64.75, NULL, 1751673600, 'Electricity bill'),

-- New laptop (6 installments)
(6, 2, 3, NULL, 27, 1, 1800.00, 1800.00, 6, 1751760000, 'Laptop purchase');

INSERT INTO movement_installments (
    movement_id,
    installment_number,
    total_installments,
    amount,
    due_timestamp,
    paid,
    paid_timestamp
)
VALUES

-- Netflix (movement 3)
(3, 1, 12, 10.00, 1751500800, 1, 1751500800),
(3, 2, 12, 10.00, 1754092800, 1, 1754092800),
(3, 3, 12, 10.00, 1756771200, 0, NULL),
(3, 4, 12, 10.00, 1759363200, 0, NULL),
(3, 5, 12, 10.00, 1762041600, 0, NULL),
(3, 6, 12, 10.00, 1764633600, 0, NULL),
(3, 7, 12, 10.00, 1767312000, 0, NULL),
(3, 8, 12, 10.00, 1769990400, 0, NULL),
(3, 9, 12, 10.00, 1772409600, 0, NULL),
(3,10, 12, 10.00, 1775088000, 0, NULL),
(3,11, 12, 10.00, 1777680000, 0, NULL),
(3,12, 12, 10.00, 1780358400, 0, NULL),

-- Laptop (movement 6)
(6, 1, 6, 300.00, 1751760000, 1, 1751760000),
(6, 2, 6, 300.00, 1754352000, 1, 1754352000),
(6, 3, 6, 300.00, 1757030400, 0, NULL),
(6, 4, 6, 300.00, 1759622400, 0, NULL),
(6, 5, 6, 300.00, 1762300800, 0, NULL),
(6, 6, 6, 300.00, 1764892800, 0, NULL);