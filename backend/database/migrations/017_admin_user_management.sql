-- 017_admin_user_management.sql (idempotent - safe to re-run)
-- Backs AUTH-5 (admin user-management surface):
--   - is_suspended: admin can lock an account out. Checked at login/refresh and
--     on every authenticated request, so an existing JWT stops working too.
--   - complimentary_until: admin-granted free premium. Honored by the single
--     premium check in entitlements.js (no Paddle write).
--   - login_events: per-login IP + user-agent trail, written on password and
--     Google sign-in, read by the admin user-detail view.
--   - Two users(id) foreign keys (words.added_by, word_suggestions.reviewed_by)
--     defaulted to ON DELETE NO ACTION (RESTRICT) and would block a hard user
--     delete. The content must outlive its author -> SET NULL (both columns are
--     nullable). All users(uuid) references already CASCADE/SET NULL.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE users ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'complimentary_until'
  ) THEN
    ALTER TABLE users ADD COLUMN complimentary_until TIMESTAMPTZ;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  ip VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_created ON login_events(user_id, created_at DESC);

-- Author/reviewer columns must not block deleting the user -> SET NULL.
ALTER TABLE words DROP CONSTRAINT IF EXISTS words_added_by_fkey;
ALTER TABLE words
  ADD CONSTRAINT words_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE word_suggestions DROP CONSTRAINT IF EXISTS word_suggestions_reviewed_by_fkey;
ALTER TABLE word_suggestions
  ADD CONSTRAINT word_suggestions_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
