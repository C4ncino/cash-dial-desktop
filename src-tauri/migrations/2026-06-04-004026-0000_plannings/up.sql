-- Your SQL goes here
CREATE TABLE planning_recurring_types (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE planning_recurring_types_translations (
    planning_recurring_type_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name VARCHAR(30) NOT NULL,
    singular VARCHAR(30) NOT NULL,
    plural VARCHAR(45) NOT NULL,

    PRIMARY KEY(planning_recurring_type_id, lang),
    FOREIGN KEY(planning_recurring_type_id)
        REFERENCES planning_recurring_types(id)
        ON DELETE CASCADE
);

CREATE TABLE planning_recurring_rules (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    recurring_type_id INTEGER NOT NULL,
    interval_step INTEGER NOT NULL DEFAULT 1 
        CHECK(interval_step > 0),
    start_date BIGINT NOT NULL,
    end_date BIGINT
        CHECK(end_date IS NULL OR end_date >= start_date), -- NULL = infinite
    is_active BOOLEAN NOT NULL DEFAULT 1,

    FOREIGN KEY(recurring_type_id)
        REFERENCES planning_recurring_types(id)
        ON DELETE RESTRICT
);

CREATE TABLE planning_recurring_week_days (
    recurring_rule_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),

    PRIMARY KEY(recurring_rule_id, day_of_week),
    FOREIGN KEY(recurring_rule_id)
        REFERENCES planning_recurring_rules(id)
        ON DELETE CASCADE
);

CREATE TABLE planning_recurring_month_days (
    recurring_rule_id INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 28),

    PRIMARY KEY(recurring_rule_id, day_of_month),
    FOREIGN KEY(recurring_rule_id)
        REFERENCES planning_recurring_rules(id)
        ON DELETE CASCADE
);

CREATE TABLE planning_recurring_year_days (
    recurring_rule_id INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
    day_of_month INTEGER NOT NULL CHECK(day_of_month BETWEEN 1 AND 28),

    PRIMARY KEY(recurring_rule_id, month, day_of_month),
    FOREIGN KEY(recurring_rule_id)
        REFERENCES planning_recurring_rules(id)
        ON DELETE CASCADE
);

CREATE TABLE plannings (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    currency_id INTEGER NOT NULL,

    name VARCHAR(30) NOT NULL,
    amount NUMERIC(17,2) NOT NULL CHECK(amount >= 0),
    
    recurring_rule_id INTEGER NOT NULL,

    FOREIGN KEY(account_id)
        REFERENCES accounts(id)
        ON DELETE CASCADE,
    FOREIGN KEY(type_id)
        REFERENCES movement_types(id)
        ON DELETE RESTRICT,
    FOREIGN KEY(category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT,
    FOREIGN KEY(currency_id)
        REFERENCES currencies(id)
        ON DELETE RESTRICT,
    FOREIGN KEY(recurring_rule_id)
        REFERENCES planning_recurring_rules(id)
        ON DELETE RESTRICT
);

CREATE TABLE planning_status (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(3) NOT NULL UNIQUE,
    color CHAR(7) NOT NULL
        CHECK(color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);

CREATE TABLE planning_status_translations (
    planning_status_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name VARCHAR(30) NOT NULL,

    PRIMARY KEY(planning_status_id, lang),
    FOREIGN KEY(planning_status_id)
        REFERENCES planning_status(id)
        ON DELETE CASCADE
);

CREATE TABLE planning_occurrences (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    planning_id INTEGER NOT NULL,
    movement_id INTEGER,
    status_id INTEGER NOT NULL,
    expected_date BIGINT NOT NULL,

    UNIQUE(planning_id, expected_date),
    FOREIGN KEY(planning_id)
        REFERENCES plannings(id)
        ON DELETE CASCADE,
    FOREIGN KEY(movement_id)
        REFERENCES movements(id)
        ON DELETE RESTRICT,
    FOREIGN KEY(status_id)
        REFERENCES planning_status(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_plannings_account_id ON plannings(account_id);
CREATE INDEX IF NOT EXISTS idx_plannings_category_id ON plannings(category_id);
CREATE INDEX IF NOT EXISTS idx_plannings_currency_id ON plannings(currency_id);
CREATE INDEX IF NOT EXISTS idx_plannings_recurring_rule_id ON plannings(recurring_rule_id);

CREATE INDEX IF NOT EXISTS idx_planning_occurrences_planning_id ON planning_occurrences(planning_id);
CREATE INDEX IF NOT EXISTS idx_planning_occurrences_expected_date ON planning_occurrences(expected_date);
CREATE INDEX IF NOT EXISTS idx_planning_occurrences_status_id ON planning_occurrences(status_id);
CREATE INDEX IF NOT EXISTS idx_planning_occurrences_movement_id ON planning_occurrences(movement_id);

CREATE INDEX IF NOT EXISTS idx_planning_recurring_rules_recurring_type_id ON planning_recurring_rules(recurring_type_id);

INSERT INTO planning_recurring_types (key)
VALUES
    ('daily'),
    ('weekly'),
    ('monthly'),
    ('yearly');

INSERT INTO planning_recurring_types_translations (planning_recurring_type_id, lang, name, singular, plural)
VALUES
    -- Spanish
    (1, 'es', 'Diario', 'día', 'días'),
    (2, 'es', 'Semanal', 'semana', 'semanas'),
    (3, 'es', 'Mensual', 'mes', 'meses'),
    (4, 'es', 'Anual', 'año', 'años'),

    -- English
    (1, 'en', 'Daily', 'day', 'days'),
    (2, 'en', 'Weekly', 'week', 'weeks'),
    (3, 'en', 'Monthly', 'month', 'months'),
    (4, 'en', 'Yearly', 'year', 'years');

INSERT INTO planning_status (key, color)
VALUES
    ('pending', '#155dfc'),
    ('canceled', '#e7000b'),
    ('completed', '#00a63e');

INSERT INTO planning_status_translations (planning_status_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Pendiente'),
    (2, 'es', 'Cancelado'),
    (3, 'es', 'Completado'),

    -- English
    (1, 'en', 'Pending'),
    (2, 'en', 'Canceled'),
    (3, 'en', 'Completed');