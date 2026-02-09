/**
 * Shared SQL for ranking users.
 * Used by both GET /api/auth/me (single-user rank) and GET /api/leaderboard (top N).
 *
 * The CTE `ranked_users` ranks all real users (role='user') by xp DESC, streak DESC.
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
      RANK() OVER (ORDER BY s.xp DESC, s.streak DESC)
    FROM users u
    JOIN user_stats s ON s.user_id = u.uuid
    WHERE u.role = 'user'
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
 * Params: $1 = limit (e.g. 10)
 */
const LEADERBOARD_SQL = `
  WITH ${RANKED_USERS_CTE}
  SELECT * FROM ranked_users
  ORDER BY rank ASC
  LIMIT $1
`;

module.exports = { RANKED_USERS_CTE, USER_RANK_SQL, LEADERBOARD_SQL };
