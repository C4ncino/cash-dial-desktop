-- Your SQL goes here
CREATE TABLE budget_period_types (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(25) NOT NULL UNIQUE
);

CREATE TABLE budget_period_types_translations (
    budget_period_type_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name TEXT NOT NULL,
    PRIMARY KEY(budget_period_type_id, lang),
    FOREIGN KEY(budget_period_type_id)
        REFERENCES budget_period_types(id)
        ON DELETE CASCADE
);

CREATE TABLE budgets (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    budget_period_type_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    currency_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY(budget_period_type_id)
        REFERENCES budget_period_types(id)
        ON DELETE CASCADE,
    FOREIGN KEY(category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT,
    FOREIGN KEY(currency_id)
        REFERENCES currencies(id)
        ON DELETE RESTRICT
);

CREATE TABLE budget_history (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    amount_limit NUMERIC(17,2) NOT NULL CHECK(amount_limit >= 0),
    start_date BIGINT NOT NULL,
    end_date BIGINT NOT NULL,
    FOREIGN KEY(budget_id)
        REFERENCES budgets(id)
        ON DELETE CASCADE
);

INSERT INTO budget_period_types (key) 
VALUES
    ('weekly'),
    ('monthly'),
    ('yearly');

INSERT INTO budget_period_types_translations (budget_period_type_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Semanal'),
    (2, 'es', 'Mensual'),
    (3, 'es', 'Anual'),

    -- English
    (1, 'en', 'Weekly'),
    (2, 'en', 'Monthly'),
    (3, 'en', 'Yearly');
