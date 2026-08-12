use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::account_types)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AccountTypeRow {
    pub id: i32,
    pub icon: String,
    pub color: String,
}

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::account_types_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AccountTypeTranslationRow {
    pub account_type_id: i32,
    pub lang: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AccountType {
    pub id: i32,
    pub name: String,
    pub icon: String,
    pub color: String,
}

impl From<(AccountTypeRow, AccountTypeTranslationRow)> for AccountType {
    fn from((item, translation): (AccountTypeRow, AccountTypeTranslationRow)) -> Self {
        Self { id: item.id, name: translation.name, icon: item.icon, color: item.color }
    }
}

#[derive(Queryable, Selectable, Insertable)]
#[diesel(table_name = crate::schema::accounts_credit_info)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AccountCreditInfoRow {
    pub account_id: i32,
    pub credit_limit: f64,
    pub cutoff_day: i32,
    pub days_to_pay: i32,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::accounts)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AccountRow {
    pub id: i32,
    pub type_id: i32,
    pub currency_id: i32,
    pub name: String,
    pub balance: f64,
    pub is_active: bool,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::accounts)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AccountInsert<'a> {
    pub type_id: i32,
    pub currency_id: i32,
    pub name: &'a str,
    pub balance: f64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AccountCreditInfo {
    pub credit_limit: f64,
    pub cutoff_day: u8,
    pub days_to_pay: u8,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: i32,
    pub r#type: AccountType,
    pub currency_id: u8,
    pub name: String,
    pub balance: f64,
    pub credit_info: Option<AccountCreditInfo>,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreditCardPaymentMovement {
    pub movement_id: i32,
    pub installment_ids: Vec<i32>,
    pub amount: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreditCardNextPayment {
    pub account_id: i32,
    pub payment_date: i64,
    pub total_amount: f64,
    pub movements: Vec<CreditCardPaymentMovement>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreditCardPaymentRequest {
    pub from_account_id: i32,
    pub amount: f64,
}

