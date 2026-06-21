-- 009_curriculum.sql (idempotent - safe to re-run)
-- Introduces the three-level curriculum: units -> lessons -> exercises,
-- plus per-user lesson progress and the spaced-repetition mistake queue.
-- The existing flat words / quiz_questions tables are untouched and stay live.

-- ============================================================
-- exercises.prompt / exercises.answer JSONB shapes (per type)
-- ------------------------------------------------------------
-- The client renders from prompt and submits its choice. The server grades
-- against answer. answer is NEVER sent to a non-admin client (stripped by the
-- lesson player in Phase 4). Canonical Joi validators live in
-- backend/src/utils/exerciseSchemas.js and MUST match the shapes below.
--
-- type = spot_alblish  (hero - "Gjej fjalen e huazuar")
--   prompt = {
--     "sentence": "Kemi nje meeting te rendesishem neser."   // contains the loanword
--   }
--   answer = {
--     "loanword": "meeting",                                 // the word the user must tap
--     "corrected_sentence": "Kemi nje takim te rendesishem neser.",
--     "correct_albanian": "takim"
--   }
--   why_it_matters (column) is required for this type - it is the brand line.
--
-- type = translation  ("Zgjidh fjalen e sakte")
--   prompt = {
--     "loanword": "manager",
--     "sentence": "Fola me manager-in.",   // OPTIONAL short context sentence
--     "options": ["drejtues", "takim", "afat", "ekip"]   // exactly 4, shown to user
--   }
--   answer = {
--     "correct": "drejtues"               // must be one of prompt.options
--   }
--
-- type = fill_blank  ("Ploteso vendin bosh")
--   prompt = {
--     "sentence": "Doli nje {{blank}} i ri sot.",   // must contain the {{blank}} marker
--     "options": ["perditesim", "program", "skedar", "ekran"]   // exactly 4
--   }
--   answer = {
--     "correct": "perditesim"             // must be one of prompt.options
--   }
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- units - themed loanword domains
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  icon VARCHAR(60),
  color VARCHAR(20),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_premium_unit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_order ON units(order_index);

-- ============================================================
-- lessons - ordered bundles of exercises inside a unit
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(120) NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (unit_id, order_index),
  UNIQUE (unit_id, slug)
);

-- The UNIQUE (unit_id, order_index) constraint above already creates a btree
-- index on exactly those columns (and serves unit_id-only lookups via the
-- leading column), so no separate idx_lessons_unit_order is needed.

-- ============================================================
-- exercises - one of the three lesson types
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('spot_alblish', 'translation', 'fill_blank')),
  prompt JSONB NOT NULL,
  answer JSONB NOT NULL,
  why_it_matters TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, order_index)
);

-- The UNIQUE (lesson_id, order_index) constraint already indexes those columns
-- (and serves lesson_id-only lookups via the leading column).

-- ============================================================
-- user_lesson_progress - one row per user per lesson
-- ============================================================
CREATE TABLE IF NOT EXISTS user_lesson_progress (
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP,
  best_score INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, lesson_id)
);

-- ============================================================
-- user_exercise_mistakes - spaced-repetition review queue
-- ============================================================
CREATE TABLE IF NOT EXISTS user_exercise_mistakes (
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  last_wrong_at TIMESTAMP,
  due_at TIMESTAMP,
  interval_days INTEGER,
  correct_streak INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, exercise_id)
);

-- "Perserit gabimet" pulls overdue items per user, ordered by due_at.
CREATE INDEX IF NOT EXISTS idx_user_exercise_mistakes_due
  ON user_exercise_mistakes(user_id, due_at);
