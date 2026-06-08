CREATE TABLE currencies (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    symbol CHAR(1) NOT NULL
        CHECK(length(symbol) = 1),
    code CHAR(3) NOT NULL
        CHECK(code GLOB '[A-Z][A-Z][A-Z]'),
    conversion_rate NUMERIC(12,4) NOT NULL DEFAULT 0
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

INSERT INTO currencies (symbol, code)
VALUES
    ('$', 'MXN');

INSERT INTO currencies_translations (currency_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Peso Mexicano'),

    -- English
    (1, 'en', 'Mexican Peso');