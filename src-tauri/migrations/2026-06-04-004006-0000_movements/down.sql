-- This file should undo anything in `up.sql`
DROP TABLE IF EXISTS "movement_installments";
DROP INDEX IF EXISTS idx_movements_currency_timestamp;
DROP TABLE IF EXISTS "movements";

DROP TABLE IF EXISTS "movement_types_translations";
DROP TABLE IF EXISTS "movement_types";
