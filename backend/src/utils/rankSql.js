/**
 * Shared SQL for ranking users.
 * Used by both GET /api/auth/me (single-user rank) and GET /api/leaderboard (top N).
 *
 * The CTE `ranked_users` ranks real users (role='user') by xp DESC, streak DESC.
 * Public leaderboards are segmented and exclude opted-out profiles.
 *
 * LEADERBOARD-3 — ranking is NOT a premium perk. The entitlements join and its
 * tier/status/current_period_end conditions were removed here: anyone signed up who
 * plays is ranked. The three filters that remain are unrelated to monetization and
 * must stay: role='user' excludes admins from the public board, leaderboard_opt_out
 * honors the user's own choice, and the segment filter keeps kids and adults on
 * separate boards (both child-safety invariants in root CLAUDE.md).
 *
 * The JOIN on user_stats is not an exclusion in practice: every signup path inserts a
 * stats row in the same transaction as the user row (authController register, the
 * guest-merge register, and the Google OAuth first-login branch), and migration 013
 * backfilled the pre-existing accounts. A user with no stats row has nothing to rank.
 */

const RANKED_USERS_CTE = `
  ranked_users(
    uuid,
    username,
    username_normalized,
    avatar_filename,
    xp,
    level,
    streak,
    total_quizzes,
    correct_answers,
    leaderboard_segment,
    rank
  ) AS (
    SELECT
      u.uuid,
      u.username,
      u.username_normalized,
      u.avatar_filename,
      s.xp,
      s.level,
      s.streak,
      s.total_quizzes,
      s.correct_answers,
      u.leaderboard_segment,
      RANK() OVER (PARTITION BY u.leaderboard_segment ORDER BY s.xp DESC, s.streak DESC)
    FROM users u
    JOIN user_stats s ON s.user_id = u.uuid
    WHERE u.role = 'user'
      AND u.leaderboard_opt_out = false
      AND u.leaderboard_segment IN ('kids', 'adults')
  )
`;

/**
 * Get the rank of a specific user.
 * Params: $1 = user uuid
 */
const USER_RANK_SQL = `
  WITH ${RANKED_USERS_CTE}
  SELECT rank FROM ranked_users WHERE uuid = $1::uuid
`;

/**
 * Get leaderboard (top N).
 * Params: $1 = segment ('kids' or 'adults'), $2 = limit (e.g. 10)
 */
const LEADERBOARD_SQL = `
  WITH ${RANKED_USERS_CTE}
  SELECT * FROM ranked_users
  WHERE leaderboard_segment = $1
  ORDER BY rank ASC
  LIMIT $2
`;

module.exports = { RANKED_USERS_CTE, USER_RANK_SQL, LEADERBOARD_SQL };
