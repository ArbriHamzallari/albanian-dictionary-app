-- 029_srs_due_at_timestamptz.sql (idempotent — safe to re-run)
-- FIX-7: make the spaced-repetition timestamps absolute instants.
--
-- user_exercise_mistakes.due_at / .last_wrong_at were TIMESTAMP (no time zone), written
-- as `now() + make_interval(days => N)`. Assigning a timestamptz to a naive column
-- converts it to the session's wall clock and DROPS the zone, so the stored value only
-- means anything if you already know which zone wrote it.
--
-- Inside SQL that is self-consistent: `due_at <= now()` casts back using the same session
-- zone, so review scheduling has always selected the right rows. The defect is at the
-- boundary. practiceMistakes SELECTs due_at and returns it to the client
-- (lessonController.js ~198), where node-pg parses a naive timestamp as the NODE
-- process's local time. Whenever the API server's zone differs from the database
-- session's zone, every due_at the client receives is wrong by that offset — silently,
-- with no error. It is latent in production today only because Fly and Supabase both run
-- UTC; nothing enforces that, and a single zone change would skew every review date.
--
-- Converting to TIMESTAMPTZ stores the instant itself. `due_at <= now()` keeps working
-- unchanged (both sides timestamptz, no cast), the writes need no change, and the value
-- read from JS is finally correct regardless of either process's zone.
--
-- Existing rows: the naive values were written by now() under the app's session zone, so
-- they are reinterpreted in that same zone. current_setting('TimeZone') is used rather
-- than a hardcoded 'UTC' so this stays correct if the deployment's zone was ever
-- something else — it is exactly the zone those values were written in.
--
-- Scope note: naive TIMESTAMP is the older convention across migrations 001-012/019 and
-- is NOT converted here. Those columns are only ever compared inside SQL, which is
-- self-consistent; due_at is the one that crosses into JS and reaches a client.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_exercise_mistakes'
      AND column_name = 'due_at'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE user_exercise_mistakes
      ALTER COLUMN due_at TYPE TIMESTAMPTZ
        USING due_at AT TIME ZONE current_setting('TimeZone'),
      ALTER COLUMN last_wrong_at TYPE TIMESTAMPTZ
        USING last_wrong_at AT TIME ZONE current_setting('TimeZone');
  END IF;
END $$;
