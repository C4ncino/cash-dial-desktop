CREATE TABLE currencies (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    symbol CHAR(1) NOT NULL
        CHECK(length(symbol) = 1),
    code CHAR(3) NOT NULL
        CHECK(code GLOB '[A-Z][A-Z][A-Z]'),
    conversion_rate NUMERIC(12,4) NOT NULL DEFAULT 0,
    conversion_rate_date TEXT
);

CREATE TABLE currencies_translations (
    currency_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name TEXT NOT NULL,
    PRIMARY KEY(currency_id, lang),
    FOREIGN KEY(currency_id)
        REFERENCES currencies(id)
        ON DELETE CASCADE
);

INSERT INTO currencies (symbol, code, conversion_rate, conversion_rate_date)
VALUES
    ('$', 'MXN', 19.7411, '2026-08-18'),
    ('$', 'USD', 1.1576, '2026-08-18'),
    ('€', 'EUR', 1.0, '2026-08-18'),
    ('¥', 'JPY', 184.87, '2026-08-18'),
    ('£', 'GBP', 0.85585, '2026-08-18'),
    ('A', 'AUD', 1.6278, '2026-08-18'),
    ('R', 'BRL', 6.0281, '2026-08-18'),
    ('C', 'CAD', 1.6060, '2026-08-18'),
    ('¥', 'CNY', 7.8049, '2026-08-18'),
    ('N', 'NZD', 1.9672, '2026-08-18');

INSERT INTO currencies_translations (currency_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Peso Mexicano'),

    -- English
    (1, 'en', 'Mexican Peso'),

    -- Spanish
    (2, 'es', 'Dólar Americano'),
    (3, 'es', 'Euro'),
    (4, 'es', 'Yen Japonés'),
    (5, 'es', 'Libra Esterlina'),
    (6, 'es', 'Dólar Australiano'),
    (7, 'es', 'Real Brasileño'),
    (8, 'es', 'Dólar Canadiense'),
    (9, 'es', 'Yuan Chino'),
    (10, 'es', 'Dólar Neozelandés'),

    -- English
    (2, 'en', 'US Dollar'),
    (3, 'en', 'Euro'),
    (4, 'en', 'Japanese Yen'),
    (5, 'en', 'Pound Sterling'),
    (6, 'en', 'Australian Dollar'),
    (7, 'en', 'Brazilian Real'),
    (8, 'en', 'Canadian Dollar'),
    (9, 'en', 'Chinese Yuan'),
    (10, 'en', 'New Zealand Dollar');
