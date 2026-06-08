use diesel::prelude::*;

use crate::models::{
    accounts::{AccountType, AccountTypeRow, AccountTypeTranslationRow},
    currencies::{Currency, CurrencyRow, CurrencyTranslationRow},
};

#[cfg(test)]
#[path = "./query_test.rs"]
mod query_test;

pub fn get_account_types(
    connection: &mut SqliteConnection,
    lang: String,
) -> Result<Vec<AccountType>, String> {
    use crate::schema::{
        account_types::dsl::account_types,
        account_types_translations::dsl::account_types_translations,
        account_types_translations::lang as table_lang,
    };

    let accounts_types_results: Vec<AccountType> = account_types
        .inner_join(account_types_translations)
        .filter(table_lang.eq(lang))
        .select((AccountTypeRow::as_select(), AccountTypeTranslationRow::as_select()))
        .load::<(AccountTypeRow, AccountTypeTranslationRow)>(connection)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|(item, translation)| AccountType::from((item, translation)))
        .collect();

    Ok(accounts_types_results)
}

pub fn get_currencies(
    connection: &mut SqliteConnection,
    lang: String,
) -> Result<Vec<Currency>, String> {
    use crate::schema::{
        currencies::dsl::currencies, currencies_translations::dsl::currencies_translations,
        currencies_translations::lang as table_lang,
    };

    let currencies_results: Vec<Currency> = currencies
        .inner_join(currencies_translations)
        .filter(table_lang.eq(lang))
        .select((CurrencyRow::as_select(), CurrencyTranslationRow::as_select()))
        .load::<(CurrencyRow, CurrencyTranslationRow)>(connection)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|(item, translation)| Currency::from((item, translation)))
        .collect();

    Ok(currencies_results)
}
