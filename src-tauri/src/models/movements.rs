use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::movement_types)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct MovementTypeRow {
    pub id: i32,
    pub key: String,
}

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::movement_types_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct MovementTypeTranslationRow {
    pub movement_type_id: i32,
    pub lang: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MovementType {
    pub id: i32,
    pub key: String,
    pub name: String,
}

impl From<(MovementTypeRow, MovementTypeTranslationRow)> for MovementType {
    fn from((item, translation): (MovementTypeRow, MovementTypeTranslationRow)) -> Self {
        Self { id: item.id, key: item.key, name: translation.name }
    }
}

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::movements)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct MovementRow {
    pub id: i32,
    pub type_id: i32,
    pub account_id: i32,
    pub to_account_id: Option<i32>,
    pub category_id: i32,
    pub currency_id: i32,
    pub original_amount: f64,
    pub account_amount: f64,
    pub conversion_rate: f64,
    pub installments: Option<i32>,
    pub timestamp: i64,
    pub description: Option<String>,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::movements)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct MovementInsert<'a> {
    pub type_id: i32,
    pub account_id: i32,
    pub to_account_id: Option<i32>,
    pub category_id: i32,
    pub currency_id: i32,
    pub original_amount: f64,
    pub account_amount: f64,
    pub installments: Option<i32>,
    pub timestamp: i64,
    pub description: Option<&'a str>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Movement {
    pub id: i32,
    pub type_id: i32,
    pub account_id: i32,
    pub to_account_id: Option<i32>,
    pub category_id: i32,
    pub currency_id: i32,
    pub original_amount: f64,
    pub account_amount: f64,
    pub conversion_rate: f64,
    pub installments: Option<i32>,
    pub timestamp: i64,
    pub description: Option<String>,
}

impl From<MovementRow> for Movement {
    fn from(row: MovementRow) -> Self {
        Self {
            id: row.id,
            type_id: row.type_id,
            account_id: row.account_id,
            to_account_id: row.to_account_id,
            category_id: row.category_id,
            currency_id: row.currency_id,
            original_amount: row.original_amount,
            account_amount: row.account_amount,
            conversion_rate: row.conversion_rate,
            installments: row.installments,
            timestamp: row.timestamp,
            description: row.description,
        }
    }
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::movement_installments)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct MovementInstallmentInsert {
    pub movement_id: i32,
    pub installment_number: i32,
    pub total_installments: i32,
    pub amount: f64,
    pub due_timestamp: i64,
    pub paid: bool,
    pub paid_timestamp: Option<i64>,
}

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::movement_installments)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct MovementInstallmentRow {
    pub id: Option<i32>,
    pub movement_id: i32,
    pub installment_number: i32,
    pub total_installments: i32,
    pub amount: f64,
    pub due_timestamp: i64,
    pub paid: bool,
    pub paid_timestamp: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MovementInstallment {
    pub id: Option<i32>,
    pub movement_id: i32,
    pub installment_number: i32,
    pub total_installments: i32,
    pub amount: f64,
    pub due_timestamp: i64,
    pub paid: bool,
    pub paid_timestamp: Option<i64>,
}

impl From<MovementInstallmentRow> for MovementInstallment {
    fn from(row: MovementInstallmentRow) -> Self {
        Self {
            id: row.id,
            movement_id: row.movement_id,
            installment_number: row.installment_number,
            total_installments: row.total_installments,
            amount: row.amount,
            due_timestamp: row.due_timestamp,
            paid: row.paid,
            paid_timestamp: row.paid_timestamp,
        }
    }
}
