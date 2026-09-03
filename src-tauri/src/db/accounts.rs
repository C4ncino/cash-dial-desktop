use diesel::prelude::*;

pub fn ensure_exists(connection: &mut SqliteConnection, account_id: i32) -> QueryResult<()> {
    use crate::schema::accounts::dsl::accounts;

    accounts.find(account_id).select(crate::schema::accounts::id).first::<i32>(connection)?;
    Ok(())
}

pub fn adjust_balance(
    connection: &mut SqliteConnection,
    account_id: i32,
    delta: f64,
) -> QueryResult<()> {
    use crate::schema::accounts::dsl::{accounts, balance};

    let updated = diesel::update(accounts.find(account_id))
        .set(balance.eq(balance + delta))
        .execute(connection)?;
    if updated == 1 {
        Ok(())
    } else {
        Err(diesel::result::Error::NotFound)
    }
}
