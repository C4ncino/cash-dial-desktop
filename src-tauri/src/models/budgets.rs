use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::budget_period_types)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct BudgetPeriodTypeRow {
    pub id: i32,
    pub key: String,
}

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::budget_period_types_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct BudgetPeriodTypeTranslationRow {
    pub budget_period_type_id: i32,
    pub lang: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetPeriodType {
    pub id: i32,
    pub key: String,
    pub name: String,
}

impl From<(BudgetPeriodTypeRow, BudgetPeriodTypeTranslationRow)> for BudgetPeriodType {
    fn from((item, translation): (BudgetPeriodTypeRow, BudgetPeriodTypeTranslationRow)) -> Self {
        Self { id: item.id, key: item.key, name: translation.name }
    }
}

#[derive(Serialize, Deserialize, Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::budgets)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
#[serde(rename_all = "camelCase")]
pub struct BudgetRow {
    pub id: i32,
    pub budget_period_type_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: String,
}

#[derive(Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::budgets)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct BudgetInsert<'a> {
    pub budget_period_type_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: &'a str,
}

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::budget_history)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct BudgetHistoryRow {
    pub id: i32,
    pub budget_id: i32,
    pub amount_limit: f64,
    pub start_date: i64,
    pub end_date: i64,
}

#[derive(Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::budget_history)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct BudgetHistoryInsert {
    pub budget_id: i32,
    pub amount_limit: f64,
    pub start_date: i64,
    pub end_date: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Budget {
    pub id: i32,
    pub budget_period_type_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: String,
    pub start_date: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetHistory {
    pub id: i32,
    pub budget_id: i32,
    pub amount_limit: f64,
    pub start_date: i64,
    pub end_date: i64,
}

impl From<BudgetHistoryRow> for BudgetHistory {
    fn from(row: BudgetHistoryRow) -> Self {
        Self {
            id: row.id,
            budget_id: row.budget_id,
            amount_limit: row.amount_limit,
            start_date: row.start_date,
            end_date: row.end_date,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetPeriodDetails {
    pub start_date: i64,
    pub end_date: i64,
    pub amount_limit: f64,
    pub amount_spend: f64,
    pub movement_ids: Vec<i32>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BudgetDetails {
    pub budget: BudgetRow,
    pub periods: Vec<BudgetPeriodDetails>,
}
