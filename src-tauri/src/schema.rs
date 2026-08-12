// @generated automatically by Diesel CLI.

diesel::table! {
    account_types (id) {
        id -> Integer,
        key -> Text,
        icon -> Text,
        color -> Text,
    }
}

diesel::table! {
    account_types_translations (account_type_id, lang) {
        account_type_id -> Integer,
        lang -> Text,
        name -> Text,
    }
}

diesel::table! {
    accounts (id) {
        id -> Integer,
        type_id -> Integer,
        currency_id -> Integer,
        name -> Text,
        balance -> Double,
        is_active -> Bool,
    }
}

diesel::table! {
    accounts_credit_info (account_id) {
        account_id -> Integer,
        credit_limit -> Double,
        cutoff_day -> Integer,
        days_to_pay -> Integer,
    }
}

diesel::table! {
    budget_history (id) {
        id -> Integer,
        budget_id -> Integer,
        amount_limit -> Double,
        start_date -> BigInt,
        end_date -> BigInt,
    }
}

diesel::table! {
    budget_period_types (id) {
        id -> Integer,
        key -> Text,
    }
}

diesel::table! {
    budget_period_types_translations (budget_period_type_id, lang) {
        budget_period_type_id -> Integer,
        lang -> Text,
        name -> Text,
    }
}

diesel::table! {
    budgets (id) {
        id -> Integer,
        budget_period_type_id -> Integer,
        category_id -> Integer,
        currency_id -> Integer,
        name -> Text,
    }
}

diesel::table! {
    categories (id) {
        id -> Integer,
        key -> Text,
        father_id -> Nullable<Integer>,
        icon -> Text,
        color -> Text,
    }
}

diesel::table! {
    categories_translations (category_id, lang) {
        category_id -> Integer,
        lang -> Text,
        name -> Text,
    }
}

diesel::table! {
    currencies (id) {
        id -> Integer,
        symbol -> Text,
        code -> Text,
        conversion_rate -> Double,
    }
}

diesel::table! {
    currencies_translations (currency_id, lang) {
        currency_id -> Integer,
        lang -> Text,
        name -> Text,
    }
}

diesel::table! {
    movement_installments (id) {
        id -> Nullable<Integer>,
        movement_id -> Integer,
        installment_number -> Integer,
        total_installments -> Integer,
        amount -> Double,
        due_timestamp -> BigInt,
        paid -> Bool,
        paid_timestamp -> Nullable<BigInt>,
    }
}

diesel::table! {
    movement_types (id) {
        id -> Integer,
        key -> Text,
    }
}

diesel::table! {
    movement_types_translations (movement_type_id, lang) {
        movement_type_id -> Integer,
        lang -> Text,
        name -> Text,
    }
}

diesel::table! {
    movements (id) {
        id -> Integer,
        type_id -> Integer,
        account_id -> Integer,
        to_account_id -> Nullable<Integer>,
        category_id -> Integer,
        currency_id -> Integer,
        original_amount -> Double,
        account_amount -> Double,
        installments -> Nullable<Integer>,
        timestamp -> BigInt,
        description -> Nullable<Text>,
    }
}

diesel::table! {
    planning_occurrences (id) {
        id -> Integer,
        planning_id -> Integer,
        movement_id -> Nullable<Integer>,
        status_id -> Integer,
        expected_date -> Integer,
    }
}

diesel::table! {
    planning_recurring_month_days (recurring_rule_id, day_of_month) {
        recurring_rule_id -> Integer,
        day_of_month -> Nullable<Integer>,
    }
}

diesel::table! {
    planning_recurring_rules (id) {
        id -> Integer,
        recurring_type_id -> Integer,
        interval_step -> Integer,
        max_occurrences_per_day -> Nullable<Integer>,
        start_date -> Integer,
        end_date -> Nullable<Integer>,
        is_active -> Bool,
    }
}

diesel::table! {
    planning_recurring_types (id) {
        id -> Integer,
        key -> Text,
    }
}

diesel::table! {
    planning_recurring_types_translations (planning_recurring_type_id, lang) {
        planning_recurring_type_id -> Integer,
        lang -> Text,
        name -> Text,
        singular -> Text,
        plural -> Text,
    }
}

diesel::table! {
    planning_recurring_week_days (recurring_rule_id, day_of_week) {
        recurring_rule_id -> Integer,
        day_of_week -> Nullable<Integer>,
    }
}

diesel::table! {
    planning_recurring_year_days (recurring_rule_id, month, day_of_month) {
        recurring_rule_id -> Integer,
        month -> Nullable<Integer>,
        day_of_month -> Nullable<Integer>,
    }
}

diesel::table! {
    planning_status (id) {
        id -> Integer,
        key -> Text,
        color -> Text,
    }
}

diesel::table! {
    planning_status_translations (planning_status_id, lang) {
        planning_status_id -> Integer,
        lang -> Text,
        name -> Text,
    }
}

diesel::table! {
    plannings (id) {
        id -> Integer,
        type_id -> Integer,
        account_id -> Integer,
        category_id -> Integer,
        currency_id -> Integer,
        name -> Text,
        amount -> Double,
        recurring_rule_id -> Integer,
    }
}

diesel::joinable!(account_types_translations -> account_types (account_type_id));
diesel::joinable!(accounts -> account_types (type_id));
diesel::joinable!(accounts -> currencies (currency_id));
diesel::joinable!(accounts_credit_info -> accounts (account_id));
diesel::joinable!(budget_history -> budgets (budget_id));
diesel::joinable!(budget_period_types_translations -> budget_period_types (budget_period_type_id));
diesel::joinable!(budgets -> budget_period_types (budget_period_type_id));
diesel::joinable!(budgets -> categories (category_id));
diesel::joinable!(budgets -> currencies (currency_id));
diesel::joinable!(categories_translations -> categories (category_id));
diesel::joinable!(currencies_translations -> currencies (currency_id));
diesel::joinable!(movement_installments -> movements (movement_id));
diesel::joinable!(movement_types_translations -> movement_types (movement_type_id));
diesel::joinable!(movements -> categories (category_id));
diesel::joinable!(movements -> currencies (currency_id));
diesel::joinable!(movements -> movement_types (type_id));
diesel::joinable!(planning_occurrences -> movements (movement_id));
diesel::joinable!(planning_occurrences -> planning_status (status_id));
diesel::joinable!(planning_occurrences -> plannings (planning_id));
diesel::joinable!(planning_recurring_rules -> planning_recurring_types (recurring_type_id));
diesel::joinable!(planning_recurring_types_translations -> planning_recurring_types (planning_recurring_type_id));
diesel::joinable!(planning_status_translations -> planning_status (planning_status_id));
diesel::joinable!(plannings -> accounts (account_id));
diesel::joinable!(plannings -> categories (category_id));
diesel::joinable!(plannings -> currencies (currency_id));
diesel::joinable!(plannings -> movement_types (type_id));
diesel::joinable!(plannings -> planning_recurring_rules (recurring_rule_id));

diesel::allow_tables_to_appear_in_same_query!(
    account_types,
    account_types_translations,
    accounts,
    accounts_credit_info,
    budget_history,
    budget_period_types,
    budget_period_types_translations,
    budgets,
    categories,
    categories_translations,
    currencies,
    currencies_translations,
    movement_installments,
    movement_types,
    movement_types_translations,
    movements,
    planning_occurrences,
    planning_recurring_month_days,
    planning_recurring_rules,
    planning_recurring_types,
    planning_recurring_types_translations,
    planning_recurring_week_days,
    planning_recurring_year_days,
    planning_status,
    planning_status_translations,
    plannings,
);
