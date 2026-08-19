use diesel::prelude::*;
use serde::Serialize;

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::currencies)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct CurrencyRow {
    pub id: i32,
    pub symbol: String,
    pub code: String,
    pub conversion_rate: f64,
    pub conversion_rate_date: Option<String>,
}

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::currencies_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct CurrencyTranslationRow {
    pub currency_id: i32,
    pub lang: String,
    pub name: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Currency {
    pub id: i32,
    pub name: String,
    pub symbol: String,
    pub code: String,
    pub conversion_rate: f64,
    pub conversion_rate_date: Option<String>,
}

impl From<(CurrencyRow, CurrencyTranslationRow)> for Currency {
    fn from((item, translation): (CurrencyRow, CurrencyTranslationRow)) -> Self {
        Self {
            id: item.id,
            name: translation.name,
            symbol: item.symbol,
            code: item.code,
            conversion_rate: item.conversion_rate,
            conversion_rate_date: item.conversion_rate_date,
        }
    }
}
