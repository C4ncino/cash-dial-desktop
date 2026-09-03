use diesel::prelude::*;

use crate::domain::money::ConversionRate;
use crate::domain::movements::MovementInput;
use crate::models::movements::{MovementInsert, MovementInstallmentRow, MovementRow};

pub fn find(connection: &mut SqliteConnection, movement_id: i32) -> QueryResult<MovementRow> {
    use crate::schema::movements::dsl::movements;
    movements.find(movement_id).select(MovementRow::as_select()).first(connection)
}

pub fn list(connection: &mut SqliteConnection) -> QueryResult<Vec<MovementRow>> {
    use crate::schema::movements::dsl::{id, movements, timestamp};
    movements.order((timestamp.desc(), id.desc())).select(MovementRow::as_select()).load(connection)
}

pub fn insert(
    connection: &mut SqliteConnection,
    input: &MovementInput,
) -> QueryResult<MovementRow> {
    use crate::schema::movements::dsl::movements;

    let insert = MovementInsert {
        type_id: input.kind().into(),
        account_id: input.account_id(),
        to_account_id: input.to_account_id(),
        category_id: input.category_id,
        currency_id: input.currency_id,
        original_amount: input.original_amount.value(),
        account_amount: input.account_amount.value(),
        installments: input.installments,
        timestamp: input.timestamp,
        description: input.description.as_deref(),
    };
    let row = diesel::insert_into(movements)
        .values(&insert)
        .returning(MovementRow::as_returning())
        .get_result::<MovementRow>(connection)?;
    diesel::update(movements.find(row.id))
        .set(
            crate::schema::movements::conversion_rate.eq(ConversionRate::between(
                input.original_amount,
                input.account_amount,
            )
            .value()),
        )
        .execute(connection)?;
    find(connection, row.id)
}

pub fn update(
    connection: &mut SqliteConnection,
    movement_id: i32,
    input: &MovementInput,
) -> QueryResult<MovementRow> {
    use crate::schema::movements;

    diesel::update(movements::table.find(movement_id))
        .set((
            movements::account_id.eq(input.account_id()),
            movements::to_account_id.eq(input.to_account_id()),
            movements::category_id.eq(input.category_id),
            movements::currency_id.eq(input.currency_id),
            movements::original_amount.eq(input.original_amount.value()),
            movements::account_amount.eq(input.account_amount.value()),
            movements::conversion_rate.eq(ConversionRate::between(
                input.original_amount,
                input.account_amount,
            )
            .value()),
            movements::installments.eq(input.installments),
            movements::timestamp.eq(input.timestamp),
            movements::description.eq(input.description.as_deref()),
        ))
        .returning(MovementRow::as_returning())
        .get_result(connection)
}

pub fn delete(connection: &mut SqliteConnection, movement_id: i32) -> QueryResult<usize> {
    use crate::schema::movements::dsl::movements;
    diesel::delete(movements.find(movement_id)).execute(connection)
}

pub fn delete_installments(
    connection: &mut SqliteConnection,
    movement_id_value: i32,
) -> QueryResult<usize> {
    use crate::schema::movement_installments::dsl::{movement_id, movement_installments};
    diesel::delete(movement_installments.filter(movement_id.eq(movement_id_value)))
        .execute(connection)
}

pub fn installments(
    connection: &mut SqliteConnection,
    movement_id_value: i32,
) -> QueryResult<Vec<MovementInstallmentRow>> {
    use crate::schema::movement_installments::dsl::{
        installment_number, movement_id, movement_installments,
    };
    movement_installments
        .filter(movement_id.eq(movement_id_value))
        .order(installment_number.asc())
        .select(MovementInstallmentRow::as_select())
        .load(connection)
}
