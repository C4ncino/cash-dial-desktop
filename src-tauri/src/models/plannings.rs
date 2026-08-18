use diesel::prelude::*;
use serde::{Deserialize, Serialize};

// Status constants
pub const PLANNING_STATUS_PENDING: i32 = 1;
pub const PLANNING_STATUS_CANCELED: i32 = 2;
pub const PLANNING_STATUS_COMPLETED: i32 = 3;

// Recurring type constants
pub const RECURRING_TYPE_DAILY: i32 = 1;
pub const RECURRING_TYPE_WEEKLY: i32 = 2;
pub const RECURRING_TYPE_MONTHLY: i32 = 3;
pub const RECURRING_TYPE_YEARLY: i32 = 4;

// ---------------------------------------------------------
// Recurring Types
// ---------------------------------------------------------

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_types)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringTypeRow {
    pub id: i32,
    pub key: String,
}

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_types_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringTypeTranslationRow {
    pub planning_recurring_type_id: i32,
    pub lang: String,
    pub name: String,
    pub singular: String,
    pub plural: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlanningRecurringType {
    pub id: i32,
    pub key: String,
    pub name: String,
    pub singular: String,
    pub plural: String,
}

impl From<(PlanningRecurringTypeRow, PlanningRecurringTypeTranslationRow)> for PlanningRecurringType {
    fn from((item, translation): (PlanningRecurringTypeRow, PlanningRecurringTypeTranslationRow)) -> Self {
        Self {
            id: item.id,
            key: item.key,
            name: translation.name,
            singular: translation.singular,
            plural: translation.plural,
        }
    }
}

// ---------------------------------------------------------
// Planning Statuses
// ---------------------------------------------------------

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_status)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningStatusRow {
    pub id: i32,
    pub key: String,
    pub color: String,
}

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_status_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningStatusTranslationRow {
    pub planning_status_id: i32,
    pub lang: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlanningStatus {
    pub id: i32,
    pub key: String,
    pub color: String,
    pub name: String,
}

impl From<(PlanningStatusRow, PlanningStatusTranslationRow)> for PlanningStatus {
    fn from((item, translation): (PlanningStatusRow, PlanningStatusTranslationRow)) -> Self {
        Self {
            id: item.id,
            key: item.key,
            color: item.color,
            name: translation.name,
        }
    }
}

// ---------------------------------------------------------
// Recurring Rules & Specialized Days
// ---------------------------------------------------------

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_rules)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringRuleRow {
    pub id: i32,
    pub recurring_type_id: i32,
    pub interval_step: i32,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub is_active: bool,
}

#[derive(Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_rules)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringRuleInsert {
    pub recurring_type_id: i32,
    pub interval_step: i32,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub is_active: bool,
}

#[derive(Queryable, Selectable, Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_week_days)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringWeekDayRow {
    pub recurring_rule_id: i32,
    pub day_of_week: i32,
}

#[derive(Queryable, Selectable, Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_month_days)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringMonthDayRow {
    pub recurring_rule_id: i32,
    pub day_of_month: i32,
}

#[derive(Queryable, Selectable, Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_recurring_year_days)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRecurringYearDayRow {
    pub recurring_rule_id: i32,
    pub month: i32,
    pub day_of_month: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlanningYearDay {
    pub month: i32,
    pub day_of_month: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlanningRecurringRuleDetail {
    pub id: i32,
    pub recurring_type_id: i32,
    pub interval_step: i32,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub is_active: bool,
    pub week_days: Vec<i32>,
    pub month_days: Vec<i32>,
    pub year_days: Vec<PlanningYearDay>,
}

// ---------------------------------------------------------
// Plannings
// ---------------------------------------------------------

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::plannings)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningRow {
    pub id: i32,
    pub type_id: i32,
    pub account_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: String,
    pub amount: f64,
    pub recurring_rule_id: i32,
}

#[derive(Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::plannings)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningInsert<'a> {
    pub type_id: i32,
    pub account_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: &'a str,
    pub amount: f64,
    pub recurring_rule_id: i32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Planning {
    pub id: i32,
    pub type_id: i32,
    pub account_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: String,
    pub amount: f64,
    pub recurring_rule: PlanningRecurringRuleDetail,
    pub current_occurrence: Option<PlanningOccurrence>,
}

// ---------------------------------------------------------
// Planning Occurrences
// ---------------------------------------------------------

#[derive(Queryable, Selectable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_occurrences)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningOccurrenceRow {
    pub id: i32,
    pub planning_id: i32,
    pub movement_id: Option<i32>,
    pub status_id: i32,
    pub expected_date: i64,
}

#[derive(Insertable, Clone, Debug, PartialEq)]
#[diesel(table_name = crate::schema::planning_occurrences)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct PlanningOccurrenceInsert {
    pub planning_id: i32,
    pub movement_id: Option<i32>,
    pub status_id: i32,
    pub expected_date: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlanningOccurrence {
    pub id: i32,
    pub planning_id: i32,
    pub movement_id: Option<i32>,
    pub status_id: i32,
    pub expected_date: i64,
    pub is_overdue: bool,
}

impl PlanningOccurrence {
    pub fn from_row(row: PlanningOccurrenceRow, today_start_ms: i64) -> Self {
        let is_overdue = row.status_id == PLANNING_STATUS_PENDING && row.expected_date < today_start_ms;
        Self {
            id: row.id,
            planning_id: row.planning_id,
            movement_id: row.movement_id,
            status_id: row.status_id,
            expected_date: row.expected_date,
            is_overdue,
        }
    }
}

// ---------------------------------------------------------
// Requests / DTOs
// ---------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlanningRequest {
    pub type_id: i32,
    pub account_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: String,
    pub amount: f64,
    pub recurring_type_id: i32,
    pub interval_step: i32,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub week_days: Option<Vec<i32>>,
    pub month_days: Option<Vec<i32>>,
    pub year_days: Option<Vec<PlanningYearDay>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePlanningRequest {
    pub type_id: i32,
    pub account_id: i32,
    pub category_id: i32,
    pub currency_id: i32,
    pub name: String,
    pub amount: f64,
    pub recurring_type_id: i32,
    pub interval_step: i32,
    pub start_date: i64,
    pub end_date: Option<i64>,
    pub week_days: Option<Vec<i32>>,
    pub month_days: Option<Vec<i32>>,
    pub year_days: Option<Vec<PlanningYearDay>>,
}
