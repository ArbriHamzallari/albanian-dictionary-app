/**
 * Shared SQL for ranking users.
 * Used by both GET /api/auth/me (single-user rank) and GET /api/leaderboard (top N).
 *
 * The CTE `ranked_users` ranks premium real users (role='user') by xp DESC, streak DESC.
 * Public leaderboards are segmented and exclude opted-out profiles.
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
    JOIN entitlements e ON e.user_id = u.uuid
    WHERE u.role = 'user'
      AND e.tier = 'premium'
      AND e.status IN ('active', 'trialing')
      AND e.current_period_end > now()
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
