-- ============================================================
-- 016) Google OAuth support on users (idempotent)
-- ============================================================
-- Adds passwordless Google sign-in. google_sub is Google's stable user id
-- (the JWT `sub`), auth_provider records how the account was created, and
-- email_verified reflects Google's verification. password_hash becomes nullable
-- because Google accounts have no password.
--
-- New Google users are created with age/country still NULL, so the existing
-- fail-closed child-safety defaults (is_minor=true, parental_consent_required=
-- true, profile_private=true, leaderboard_opt_out=true, leaderboard_segment=
-- 'kids') keep them age-gated until they complete their profile.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'google_sub'
  ) THEN
    ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'password';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Google accounts have no password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
