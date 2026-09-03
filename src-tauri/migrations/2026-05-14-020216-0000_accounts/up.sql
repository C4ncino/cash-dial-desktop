-- Your SQL goes here
CREATE TABLE account_types (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(25) NOT NULL UNIQUE,
    icon VARCHAR(25) NOT NULL,
    color CHAR(7) NOT NULL
        CHECK(color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);

CREATE TABLE account_types_translations (
    account_type_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name TEXT NOT NULL,
    PRIMARY KEY(account_type_id, lang),
    FOREIGN KEY(account_type_id)
        REFERENCES account_types(id)
        ON DELETE CASCADE
);

CREATE TABLE accounts (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER NOT NULL,
    currency_id INTEGER NOT NULL,
    name VARCHAR(30) NOT NULL,
    balance NUMERIC(17,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY(type_id)
        REFERENCES account_types(id),
    FOREIGN KEY(currency_id)
        REFERENCES currencies(id)
);

CREATE TABLE accounts_credit_info (
    account_id INTEGER NOT NULL PRIMARY KEY,
    credit_limit NUMERIC(17,2) NOT NULL
        CHECK(credit_limit >= 0),
    cutoff_day INTEGER NOT NULL
        CHECK(cutoff_day BETWEEN 1 AND 31),
    days_to_pay INTEGER NOT NULL
        CHECK(days_to_pay BETWEEN 1 AND 31),
    FOREIGN KEY(account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE
);

INSERT INTO account_types (key, icon, color)
VALUES
    ('cash', 'cash', '#00a63e'),
    ('debit', 'credit-card', '#155dfc'),
    ('credit', 'mastercard-card', '#e7000b');

INSERT INTO account_types_translations (account_type_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Efectivo'),
    (2, 'es', 'Débito'),
    (3, 'es', 'Crédito'),

    -- English
    (1, 'en', 'Cash'),
    (2, 'en', 'Debit'),
    (3, 'en', 'Credit');