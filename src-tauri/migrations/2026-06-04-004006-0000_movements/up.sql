-- Your SQL goes here
CREATE TABLE movement_types (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key CHAR(8) NOT NULL UNIQUE
);

CREATE TABLE movement_types_translations (
    movement_type_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name TEXT NOT NULL,
    PRIMARY KEY(movement_type_id, lang),
    FOREIGN KEY(movement_type_id)
        REFERENCES movement_types(id)
        ON DELETE CASCADE
);

CREATE TABLE movements (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    to_account_id INTEGER,
    category_id INTEGER NOT NULL,
    currency_id INTEGER NOT NULL,
    original_amount NUMERIC(17,2) NOT NULL CHECK(original_amount >= 0),
    account_amount NUMERIC(17,2) NOT NULL CHECK(account_amount >= 0),
    installments INTEGER CHECK(installments >= 0),
    timestamp BIGINT NOT NULL,
    description TEXT,
    FOREIGN KEY(account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE,
    FOREIGN KEY(type_id)
        REFERENCES movement_types(id)
        ON DELETE SET NULL,
    FOREIGN KEY(to_account_id)
        REFERENCES accounts(id)
        ON DELETE SET NULL,
    FOREIGN KEY(category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,
    FOREIGN KEY(currency_id)
        REFERENCES currencies(id)
        ON DELETE SET NULL
);

CREATE TABLE movement_installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movement_id INTEGER NOT NULL,
    installment_number INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    amount NUMERIC(17,2) NOT NULL CHECK(amount >= 0),
    due_timestamp BIGINT NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT 0,
    paid_timestamp BIGINT,
    FOREIGN KEY(movement_id)
        REFERENCES movements(id)
        ON DELETE CASCADE,
    UNIQUE(movement_id, installment_number)
);

INSERT INTO movement_types (key)
VALUES
    ('in'),
    ('out'),
    ('transfer');

INSERT INTO movement_types_translations (movement_type_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Ingreso'),
    (2, 'es', 'Gasto'),
    (3, 'es', 'Transferencia'),

    -- English
    (1, 'en', 'Income'),
    (2, 'en', 'Expense'),
    (3, 'en', 'Transfer');