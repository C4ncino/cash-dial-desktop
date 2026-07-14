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

diesel::joinable!(account_types_translations -> account_types (account_type_id));
diesel::joinable!(accounts -> account_types (type_id));
diesel::joinable!(accounts -> currencies (currency_id));
diesel::joinable!(accounts_credit_info -> accounts (account_id));
diesel::joinable!(categories_translations -> categories (category_id));
diesel::joinable!(currencies_translations -> currencies (currency_id));
diesel::joinable!(movement_installments -> movements (movement_id));
diesel::joinable!(movement_types_translations -> movement_types (movement_type_id));
diesel::joinable!(movements -> categories (category_id));
diesel::joinable!(movements -> currencies (currency_id));
diesel::joinable!(movements -> movement_types (type_id));

diesel::allow_tables_to_appear_in_same_query!(
    account_types,
    account_types_translations,
    accounts,
    accounts_credit_info,
    categories,
    categories_translations,
    currencies,
    currencies_translations,
    movement_installments,
    movement_types,
    movement_types_translations,
    movements,
);
