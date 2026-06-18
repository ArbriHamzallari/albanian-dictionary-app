-- 006_child_safety_social.sql (idempotent - safe to re-run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Child-safety profile controls
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'age'
  ) THEN
    ALTER TABLE users ADD COLUMN age INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE users ADD COLUMN country_code VARCHAR(2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_minor'
  ) THEN
    ALTER TABLE users ADD COLUMN is_minor BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'parental_consent_required'
  ) THEN
    ALTER TABLE users ADD COLUMN parental_consent_required BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'parental_consent_given'
  ) THEN
    ALTER TABLE users ADD COLUMN parental_consent_given BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'parental_consent_at'
  ) THEN
    ALTER TABLE users ADD COLUMN parental_consent_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_private'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_private BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'leaderboard_opt_out'
  ) THEN
    ALTER TABLE users ADD COLUMN leaderboard_opt_out BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'leaderboard_segment'
  ) THEN
    ALTER TABLE users ADD COLUMN leaderboard_segment VARCHAR(10) NOT NULL DEFAULT 'kids';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_age_child_safety'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_age_child_safety
      CHECK (age IS NULL OR (age >= 1 AND age <= 120));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_leaderboard_segment'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_leaderboard_segment
      CHECK (leaderboard_segment IN ('kids', 'adults'));
  END IF;
END
$$;

-- Existing accounts have not passed the new age gate. Keep them private and off leaderboards
-- until they explicitly provide age/consent through a profile-completion flow.
UPDATE users
SET
  is_minor = true,
  parental_consent_required = true,
  parental_consent_given = false,
  parental_consent_at = NULL,
  profile_private = true,
  leaderboard_opt_out = true,
  leaderboard_segment = 'kids'
WHERE age IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_leaderboard_segment
  ON users(leaderboard_segment)
  WHERE leaderboard_opt_out = false;

CREATE INDEX IF NOT EXISTS idx_users_is_minor ON users(is_minor);

-- ============================================================
-- Blocks, reports, and safe chat
-- ============================================================
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  surface VARCHAR(30) NOT NULL,
  target_id UUID,
  reason VARCHAR(50) NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id),
  CHECK (message_type IN ('preset', 'emoji', 'text'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON chat_messages(recipient_id, created_at DESC);
