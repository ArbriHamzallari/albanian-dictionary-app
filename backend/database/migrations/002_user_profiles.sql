-- 002_user_profiles.sql  (idempotent – safe to re-run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1) Extend users table with uuid + profile fields
-- ============================================================
DO $$
BEGIN
  -- uuid column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'uuid'
  ) THEN
    ALTER TABLE users ADD COLUMN uuid UUID UNIQUE DEFAULT gen_random_uuid();
    UPDATE users SET uuid = gen_random_uuid() WHERE uuid IS NULL;
  END IF;

  -- username (display casing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username VARCHAR(255);
  END IF;

  -- username_normalized (lowercase, unique)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username_normalized'
  ) THEN
    ALTER TABLE users ADD COLUMN username_normalized VARCHAR(255);
    UPDATE users SET username_normalized = lower(username) WHERE username IS NOT NULL AND username_normalized IS NULL;
  END IF;

  -- avatar_filename
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_filename'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_filename VARCHAR(255) DEFAULT 'default.png';
  END IF;

  -- bio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;

  -- favorite_word
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'favorite_word'
  ) THEN
    ALTER TABLE users ADD COLUMN favorite_word VARCHAR(255);
  END IF;

  -- last_login
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
  END IF;
END
$$;

-- Unique index on username_normalized (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_normalized
  ON users (username_normalized)
  WHERE username_normalized IS NOT NULL;

-- ============================================================
-- 2) user_stats (1:1 with users via uuid)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id      UUID PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
  xp           INTEGER NOT NULL DEFAULT 0,
  level        INTEGER NOT NULL DEFAULT 1,
  streak       INTEGER NOT NULL DEFAULT 0,
  last_quiz_date DATE,
  total_quizzes  INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 3) quiz_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  score           INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

-- ============================================================
-- 4) achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  xp_reward   INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 5) user_achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ============================================================
-- 6) Ensure user_achievements.achievement_id is UUID (fix varchar mismatch)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_achievements'
      AND column_name = 'achievement_id'
      AND data_type <> 'uuid'
  ) THEN
    -- Convert key-based values (e.g. 'first_quiz') to actual achievement UUIDs
    UPDATE user_achievements ua
    SET achievement_id = a.id::text
    FROM achievements a
    WHERE a.key = ua.achievement_id
      AND ua.achievement_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Remove orphaned rows that are neither valid UUIDs nor matched any key
    DELETE FROM user_achievements
    WHERE achievement_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Now safely alter the column type
    ALTER TABLE user_achievements
      ALTER COLUMN achievement_id TYPE UUID USING achievement_id::uuid;
  END IF;
END
$$;

-- ============================================================
-- 7) Seed the 7-day streak achievement
-- ============================================================
INSERT INTO achievements (key, name, description, xp_reward)
VALUES ('7_day_streak', 'Seria 7-Ditore', 'Luaj kuizin 7 ditë rresht', 500)
ON CONFLICT (key) DO NOTHING;
