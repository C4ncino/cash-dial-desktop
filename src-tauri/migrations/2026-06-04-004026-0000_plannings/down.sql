-- This file should undo anything in `up.sql`
DROP TABLE IF EXISTS "planning_occurrences";
DROP TABLE IF EXISTS "plannings";

DROP TABLE IF EXISTS "planning_recurring_week_days";
DROP TABLE IF EXISTS "planning_recurring_month_days";
DROP TABLE IF EXISTS "planning_recurring_year_days";
DROP TABLE IF EXISTS "planning_recurring_rules";

DROP TABLE IF EXISTS "planning_status_translations";
DROP TABLE IF EXISTS "planning_status";

DROP TABLE IF EXISTS "planning_recurring_types_translations";
DROP TABLE IF EXISTS "planning_recurring_types";