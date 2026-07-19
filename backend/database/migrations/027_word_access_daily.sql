-- 027_word_access_daily.sql (idempotent — safe to re-run)
-- FEAT-1: a lightweight, privacy-clean per-word/day access counter so the daily cron
-- can pick Word of the Day by yesterday's popularity (with a deterministic fallback).
-- COUNTS ONLY — no user ids, no ip, no PII. One row per (word_id, day); the app upserts
-- it on a word-detail fetch. The PK gives the upsert its ON CONFLICT target and makes
-- the "yesterday's rows" read a cheap index scan.
CREATE TABLE IF NOT EXISTS word_access_daily (
    word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    day     DATE    NOT NULL,
    views   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (word_id, day)
);

-- The cron reads "yesterday, ordered by views" — index the day for that scan.
CREATE INDEX IF NOT EXISTS idx_word_access_daily_day ON word_access_daily(day);
