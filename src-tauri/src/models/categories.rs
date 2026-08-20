use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::categories)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct CategoryRow {
    pub id: i32,
    #[allow(dead_code)]
    pub key: String,
    pub father_id: Option<i32>,
    pub icon: String,
    pub color: String,
}

#[derive(Queryable, Selectable, Clone)]
#[diesel(table_name = crate::schema::categories_translations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct CategoryTranslationRow {
    #[allow(dead_code)]
    pub category_id: i32,
    #[allow(dead_code)]
    pub lang: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: i32,
    pub father_id: Option<i32>,
    pub name: String,
    pub icon: String,
    pub color: String,
}

impl From<(CategoryRow, CategoryTranslationRow)> for Category {
    fn from((item, translation): (CategoryRow, CategoryTranslationRow)) -> Self {
        Self {
            id: item.id,
            father_id: item.father_id,
            icon: item.icon,
            color: item.color,
            name: translation.name,
        }
    }
}
