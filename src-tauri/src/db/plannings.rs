use diesel::prelude::*;

use crate::models::plannings::{
    PlanningOccurrenceInsert, PlanningOccurrenceRow, PlanningRecurringRuleRow, PlanningRow,
};

pub fn find(connection: &mut SqliteConnection, planning_id: i32) -> QueryResult<PlanningRow> {
    use crate::schema::plannings;
    plannings::table.find(planning_id).select(PlanningRow::as_select()).first(connection)
}

pub fn find_rule(
    connection: &mut SqliteConnection,
    rule_id: i32,
) -> QueryResult<PlanningRecurringRuleRow> {
    use crate::schema::planning_recurring_rules;
    planning_recurring_rules::table
        .find(rule_id)
        .select(PlanningRecurringRuleRow::as_select())
        .first(connection)
}

pub fn find_occurrence(
    connection: &mut SqliteConnection,
    occurrence_id: i32,
) -> QueryResult<PlanningOccurrenceRow> {
    use crate::schema::planning_occurrences;
    planning_occurrences::table
        .find(occurrence_id)
        .select(PlanningOccurrenceRow::as_select())
        .first(connection)
}

pub fn list_occurrences(
    connection: &mut SqliteConnection,
    planning_id: i32,
) -> QueryResult<Vec<PlanningOccurrenceRow>> {
    use crate::schema::planning_occurrences;
    planning_occurrences::table
        .filter(planning_occurrences::planning_id.eq(planning_id))
        .order(planning_occurrences::expected_date.asc())
        .select(PlanningOccurrenceRow::as_select())
        .load(connection)
}

pub fn list_pending_occurrences(
    connection: &mut SqliteConnection,
    planning_id: i32,
    pending_status_id: i32,
) -> QueryResult<Vec<PlanningOccurrenceRow>> {
    use crate::schema::planning_occurrences;
    planning_occurrences::table
        .filter(planning_occurrences::planning_id.eq(planning_id))
        .filter(planning_occurrences::status_id.eq(pending_status_id))
        .order(planning_occurrences::expected_date.asc())
        .select(PlanningOccurrenceRow::as_select())
        .load(connection)
}

pub fn set_occurrence_status(
    connection: &mut SqliteConnection,
    occurrence_id: i32,
    status_id: i32,
) -> QueryResult<PlanningOccurrenceRow> {
    use crate::schema::planning_occurrences;
    diesel::update(planning_occurrences::table.find(occurrence_id))
        .set(planning_occurrences::status_id.eq(status_id))
        .returning(PlanningOccurrenceRow::as_returning())
        .get_result(connection)
}

pub fn complete_occurrence(
    connection: &mut SqliteConnection,
    occurrence_id: i32,
    completed_status_id: i32,
    movement_id: i32,
) -> QueryResult<PlanningOccurrenceRow> {
    use crate::schema::planning_occurrences;
    diesel::update(planning_occurrences::table.find(occurrence_id))
        .set((
            planning_occurrences::status_id.eq(completed_status_id),
            planning_occurrences::movement_id.eq(Some(movement_id)),
        ))
        .returning(PlanningOccurrenceRow::as_returning())
        .get_result(connection)
}

pub fn insert_occurrence(
    connection: &mut SqliteConnection,
    insert: &PlanningOccurrenceInsert,
) -> QueryResult<PlanningOccurrenceRow> {
    use crate::schema::planning_occurrences;
    diesel::insert_into(planning_occurrences::table)
        .values(insert)
        .returning(PlanningOccurrenceRow::as_returning())
        .get_result(connection)
}

pub fn delete_pending_occurrences(
    connection: &mut SqliteConnection,
    planning_id: i32,
    pending_status_id: i32,
) -> QueryResult<usize> {
    use crate::schema::planning_occurrences;
    diesel::delete(
        planning_occurrences::table
            .filter(planning_occurrences::planning_id.eq(planning_id))
            .filter(planning_occurrences::status_id.eq(pending_status_id)),
    )
    .execute(connection)
}
