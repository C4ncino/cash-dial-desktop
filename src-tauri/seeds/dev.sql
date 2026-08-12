INSERT INTO currencies (symbol, code)
VALUES
    ('$', 'USD');

INSERT INTO accounts (type_id, currency_id, name, balance)
VALUES
    (1, 1, 'Efectivo', 200.0),
    (2, 1, 'Débito', 500.0),
    (3, 1, 'Crédito', 1000.0),
    (1, 1, 'Delete this', 1000.0),
    (3, 1, 'Visa Gold', 1500.0);

INSERT INTO accounts_credit_info (account_id, credit_limit, cutoff_day, days_to_pay)
VALUES 
    (3, 2000.0, 15, 30),
    (5, 3000.0, 25, 20);

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
(1, 1, 1, NULL, 1, 1, 3500.00, 3500.00, NULL, 1751328000000, 'Monthly salary'),

-- Grocery shopping
(2, 2, 1, NULL, 2, 1, 85.42, 85.42, NULL, 1751414400000, 'Supermarket'),

-- Netflix yearly subscription (12 installments)
(3, 2, 3, NULL, 3, 1, 120.00, 120.00, 12, 1751500800000, 'Netflix annual plan'),

-- Transfer from checking to savings
(4, 3, 1, 2, 4, 1, 500.00, 500.00, NULL, 1751587200000, 'Monthly savings'),

-- Electric bill
(5, 2, 1, NULL, 5, 1, 64.75, 64.75, NULL, 1751673600000, 'Electricity bill'),

-- New laptop (6 installments)
(6, 2, 3, NULL, 3, 1, 1800.00, 1800.00, 6, 1751760000000, 'Laptop purchase'),

-- Smart TV (3 installments on Account 5)
(7, 2, 5, NULL, 3, 1, 600.00, 600.00, 3, 1751846400000, 'Smart TV'),

-- Xbox (1 installments on Account 5)
(8, 2, 5, NULL, 3, 1, 500.00, 500.00, 1, 1751846800000, 'Xbox');

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
(3, 1, 12, 10.00, 1751500800000, 1, 1751500800000),
(3, 2, 12, 10.00, 1754092800000, 1, 1754092800000),
(3, 3, 12, 10.00, 1756771200000, 0, NULL),
(3, 4, 12, 10.00, 1759363200000, 0, NULL),
(3, 5, 12, 10.00, 1762041600000, 0, NULL),
(3, 6, 12, 10.00, 1764633600000, 0, NULL),
(3, 7, 12, 10.00, 1767312000000, 0, NULL),
(3, 8, 12, 10.00, 1769990400000, 0, NULL),
(3, 9, 12, 10.00, 1772409600000, 0, NULL),
(3,10, 12, 10.00, 1775088000000, 0, NULL),
(3,11, 12, 10.00, 1777680000000, 0, NULL),
(3,12, 12, 10.00, 1780358400000, 0, NULL),

-- Laptop (movement 6)
(6, 1, 6, 300.00, 1751760000000, 1, 1751760000000),
(6, 2, 6, 300.00, 1754352000000, 1, 1754352000000),
(6, 3, 6, 300.00, 1757030400000, 0, NULL),
(6, 4, 6, 300.00, 1759622400000, 0, NULL),
(6, 5, 6, 300.00, 1762300800000, 0, NULL),
(6, 6, 6, 300.00, 1764892800000, 0, NULL),

-- Smart TV (movement 7)
(7, 1, 3, 200.00, 1752537600000, 1, 1752537600000),
(7, 2, 3, 200.00, 1755129600000, 0, NULL),
(7, 3, 3, 200.00, 1789365600000, 0, NULL),

(8, 1, 1, 500.00, 1755129600000, 0, NULL);

-- Budgets seed data
INSERT INTO budgets (budget_period_type_id, category_id, currency_id, name)
VALUES
    (2, 1, 1, 'Monthly Food'),
    (2, 13, 1, 'Groceries');

INSERT INTO budget_history (budget_id, amount_limit, start_date, end_date)
VALUES
    ((SELECT id FROM budgets WHERE name = 'Monthly Food'), 500.00, 1780531200000, 9223372036854775807),
    ((SELECT id FROM budgets WHERE name = 'Groceries'), 300.00, 1782864000000, 9223372036854775807);