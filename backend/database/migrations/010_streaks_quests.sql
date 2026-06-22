-- 010_streaks_quests.sql (idempotent - safe to re-run)
-- Timezone-aware streaks, Premium streak freezes, and the daily quest.
-- The "day" boundary for streaks/quests is the date in the user's timezone,
-- NOT UTC. user_stats.streak remains the single source of truth for the streak.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- users: timezone (IANA) + last_activity_date (date in user TZ)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE users ADD COLUMN timezone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_activity_date'
  ) THEN
    ALTER TABLE users ADD COLUMN last_activity_date DATE;
  END IF;
END
$$;

-- ============================================================
-- Streak freezes (Premium) - "Mburoja e serisë"
-- 2 granted per calendar month, auto-spent by the nightly cron.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  granted_at TIMESTAMP NOT NULL DEFAULT now(),
  used_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_streak_freezes_user ON user_streak_freezes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streak_freezes_available
  ON user_streak_freezes(user_id) WHERE used_at IS NULL;

-- ============================================================
-- Daily quest templates (server-side rotating definitions).
-- All copy is authored in Albanian.
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_quests_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('complete_lessons', 'earn_xp', 'correct_streak')),
  title TEXT NOT NULL,
  target INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 20,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO daily_quests_template (code, type, title, target, xp_reward, order_index)
VALUES
  ('lessons_2', 'complete_lessons', 'Përfundo 2 mësime sot', 2, 20, 0),
  ('xp_50', 'earn_xp', 'Fito 50 XP sot', 50, 20, 1),
  ('correct_5', 'correct_streak', '5 përgjigje të sakta radhazi', 5, 20, 2),
  ('lessons_3', 'complete_lessons', 'Përfundo 3 mësime sot', 3, 30, 3),
  ('xp_100', 'earn_xp', 'Fito 100 XP sot', 100, 30, 4)
ON CONFLICT (code) DO UPDATE SET
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  target = EXCLUDED.target,
  xp_reward = EXCLUDED.xp_reward,
  order_index = EXCLUDED.order_index,
  active = true;

-- ============================================================
-- Per-user daily quest (one row per user per day).
-- ============================================================
CREATE TABLE IF NOT EXISTS user_daily_quests (
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  date DATE NOT NULL,
  template_id UUID NOT NULL REFERENCES daily_quests_template(id),
  target INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMP,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_quests_user_date ON user_daily_quests(user_id, date);
