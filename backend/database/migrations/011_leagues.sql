-- 011_leagues.sql (idempotent - safe to re-run)
-- Weekly 3-tier league on top of the pseudonymous leaderboard.
-- Tiers (Albanian, used as the DB enum): bronxhi -> argjendi -> ari.
-- Rankings are pseudonymous and segmented (kids/adults) and honor
-- leaderboard_opt_out, per CLAUDE.md sections 7 and 14.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- league_tier enum
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'league_tier') THEN
    CREATE TYPE league_tier AS ENUM ('bronxhi', 'argjendi', 'ari');
  END IF;
END
$$;

-- ============================================================
-- leagues (static, 3 rows)
-- ============================================================
CREATE TABLE IF NOT EXISTS leagues (
  tier league_tier PRIMARY KEY,
  "order" INTEGER NOT NULL,
  color VARCHAR(40) NOT NULL
);

INSERT INTO leagues (tier, "order", color) VALUES
  ('bronxhi', 1, 'accent-coral'),
  ('argjendi', 2, 'ink-soft'),
  ('ari', 3, 'accent-yellow')
ON CONFLICT (tier) DO UPDATE SET
  "order" = EXCLUDED."order",
  color = EXCLUDED.color;

-- ============================================================
-- league_seasons - one global week-aligned season at a time.
-- started_at is week-aligned (Monday 00:00) and UNIQUE so the
-- current/next season can be upserted idempotently.
-- ============================================================
CREATE TABLE IF NOT EXISTS league_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP NOT NULL UNIQUE,
  ends_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_seasons_ends_at ON league_seasons(ends_at);

-- ============================================================
-- user_league_membership - one row per user per season.
-- result / result_viewed_at carry the end-of-season outcome for the
-- Monday "last week's result" toast and the free-cap upgrade prompt.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_league_membership (
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES league_seasons(id) ON DELETE CASCADE,
  tier league_tier NOT NULL DEFAULT 'bronxhi',
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  ended_at TIMESTAMP,
  result VARCHAR(20),
  result_viewed_at TIMESTAMP,
  PRIMARY KEY (user_id, season_id)
);

-- Ranking within a season + tier by weekly_xp.
CREATE INDEX IF NOT EXISTS idx_ulm_season_tier_xp
  ON user_league_membership(season_id, tier, weekly_xp DESC);

-- Lookup of a user's most recent ended season for the result toast.
CREATE INDEX IF NOT EXISTS idx_ulm_user_ended
  ON user_league_membership(user_id, ended_at DESC);
