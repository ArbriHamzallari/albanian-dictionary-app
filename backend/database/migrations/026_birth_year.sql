-- 026_birth_year.sql (SAFE-2) — idempotent, safe to re-run.
--
-- This is the single SAFE-2 schema migration. It starts with birth_year (SAFE-2a);
-- the parent-email consent flow (SAFE-2c) adds parent_email and
-- parental_consent_method columns to this same file.
--
-- birth_year is the durable age anchor. users.age is a STATIC snapshot taken at
-- signup that never ticks over as the user gets older; birth_year lets later work
-- (SAFE-2b) compute a live age. This migration does NOT drop age — existing code
-- still reads it, and both columns coexist until SAFE-2b deprecates age.
--
-- CHECK-constraint note: the upper bound uses extract(year from now()). Postgres does
-- NOT require CHECK expressions to be immutable (unlike index expressions), so this is
-- accepted; the constraint is evaluated on every insert/update, which is exactly the
-- "birth year can't be in the future" semantics we want. +1 tolerates end-of-year
-- timezone skew. Rows already stored are not re-validated as the year rolls over.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'birth_year'
  ) THEN
    ALTER TABLE users ADD COLUMN birth_year INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_birth_year'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_birth_year
      CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= EXTRACT(YEAR FROM now())::int + 1));
  END IF;
END
$$;

-- Backfill birth_year from the static age snapshot for existing accounts. Approximate
-- (uses the current year), but good enough to seed the column for rows created before
-- it existed. Guarded by `birth_year IS NULL` so re-running never overwrites a value.
UPDATE users
SET birth_year = EXTRACT(YEAR FROM now())::int - age
WHERE age IS NOT NULL AND birth_year IS NULL;
