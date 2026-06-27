const pool = require('../utils/db');
const { ONLINE_WINDOW_MINUTES } = require('../utils/presence');

const PREMIUM_ANNUAL_PRICE_EUR = Number(process.env.PREMIUM_ANNUAL_PRICE_EUR) || 25;

// Matches entitlements.js / rankSql.js premium checks
const ACTIVE_PREMIUM_ENTITLEMENT_SQL = `
  e.tier = 'premium'
  AND e.status IN ('active', 'trialing')
  AND e.current_period_end > now()
`;

// ── GET /api/admin/metrics ──────────────────────────────────
const getMetrics = async (req, res, next) => {
  try {
    // Run all metric queries in parallel for speed
    const [
      usersRes,
      newTodayRes,
      activeTodayRes,
      active7dRes,
      active30dRes,
      retentionRes,
      accuracyRes,
      avgQuizzesRes,
      topStreakRes,
      totalQuizzesRes,
      activeSubscribersRes,
      premiumTotalRes,
      onlineNowRes,
    ] = await Promise.all([
      // 1) Total users: every registered account with role='user' (excludes admins).
      pool.query(
        `SELECT COUNT(*)::int AS total FROM users WHERE role = 'user'`
      ),

      // 2) New users today: accounts created since UTC midnight today.
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM users
         WHERE role = 'user'
           AND created_at >= (NOW() AT TIME ZONE 'utc')::date`
      ),

      // 3) Active today: distinct users who completed ≥1 quiz since UTC midnight today.
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS total
         FROM quiz_attempts
         WHERE created_at >= (NOW() AT TIME ZONE 'utc')::date`
      ),

      // 4) Active 7d: distinct users with ≥1 quiz in the trailing 7×24h window.
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS total
         FROM quiz_attempts
         WHERE created_at >= NOW() - INTERVAL '7 days'`
      ),

      // 5) Active 30d: distinct users with ≥1 quiz in the trailing 30×24h window.
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS total
         FROM quiz_attempts
         WHERE created_at >= NOW() - INTERVAL '30 days'`
      ),

      // 6) Retention: of users registered ≥7 days ago (eligible), the share who did
      //    ≥1 quiz in the last 7 days (retained). Excluding brand-new accounts from
      //    the denominator keeps the rate meaningful and ≤100%.
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE u.created_at <= NOW() - INTERVAL '7 days')::int AS eligible,
           COUNT(*) FILTER (
             WHERE u.created_at <= NOW() - INTERVAL '7 days' AND a.user_id IS NOT NULL
           )::int AS retained
         FROM users u
         LEFT JOIN (
           SELECT DISTINCT user_id
           FROM quiz_attempts
           WHERE created_at >= NOW() - INTERVAL '7 days'
         ) a ON a.user_id = u.uuid
         WHERE u.role = 'user'`
      ),

      // 7) Average accuracy: total correct answers ÷ total questions answered, across
      //    all graded attempts. Uses quiz_attempts.total_questions (the real per-attempt
      //    count) so it never assumes a fixed quiz length.
      pool.query(
        `SELECT ROUND(
           SUM(correct_answers)::numeric / NULLIF(SUM(total_questions), 0) * 100, 1
         ) AS avg_accuracy
         FROM quiz_attempts`
      ),

      // 8) Average quizzes per user: mean of total_quizzes across all registered users
      //    (includes users with zero quizzes — it's an engagement-per-signup figure).
      pool.query(
        `SELECT
           CASE WHEN COUNT(*) > 0
             THEN ROUND(AVG(total_quizzes)::numeric, 1)
             ELSE 0
           END AS avg_quizzes
         FROM user_stats`
      ),

      // 9) Top streak: the single highest current streak across all users.
      pool.query(
        `SELECT COALESCE(MAX(streak), 0)::int AS top_streak FROM user_stats`
      ),

      // 10) Total quizzes played: sum of every user's completed-quiz count.
      pool.query(
        `SELECT COALESCE(SUM(total_quizzes), 0)::int AS total FROM user_stats`
      ),

      // 11) Active subscribers: users with a currently-valid premium entitlement.
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM entitlements e
         JOIN users u ON u.uuid = e.user_id
         WHERE u.role = 'user'
           AND ${ACTIVE_PREMIUM_ENTITLEMENT_SQL}`
      ),

      // 12) Premium total: every premium-tier entitlement ever, incl. lapsed/canceled.
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM entitlements e
         JOIN users u ON u.uuid = e.user_id
         WHERE u.role = 'user'
           AND e.tier = 'premium'`
      ),

      // 13) Online now: users whose last heartbeat is within the presence window.
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM users
         WHERE role = 'user'
           AND last_seen >= NOW() - ($1 || ' minutes')::interval`,
        [String(ONLINE_WINDOW_MINUTES)]
      ),
    ]);

    const totalUsers = usersRes.rows[0].total;
    const active7d = active7dRes.rows[0].total;
    const activeSubscribers = activeSubscribersRes.rows[0].total;

    // Retention rate from the eligible/retained counts, safe divide.
    const { eligible, retained } = retentionRes.rows[0];
    const retentionRate = eligible > 0
      ? Math.round((retained / eligible) * 1000) / 10
      : 0;

    const estimatedAnnualRevenue = activeSubscribers * PREMIUM_ANNUAL_PRICE_EUR;

    return res.json({
      totalUsers,
      newUsersToday: newTodayRes.rows[0].total,
      activeUsersToday: activeTodayRes.rows[0].total,
      activeUsers7d: active7d,
      activeUsers30d: active30dRes.rows[0].total,
      retentionRate,
      avgAccuracy: parseFloat(accuracyRes.rows[0].avg_accuracy) || 0,
      avgQuizzesPerUser: parseFloat(avgQuizzesRes.rows[0].avg_quizzes) || 0,
      topStreak: topStreakRes.rows[0].top_streak,
      totalQuizzesPlayed: totalQuizzesRes.rows[0].total,
      activeSubscribers,
      premiumTotal: premiumTotalRes.rows[0].total,
      estimatedAnnualRevenue,
      revenueCurrency: 'EUR',
      usersOnlineNow: onlineNowRes.rows[0].total,
      onlineWindowMinutes: ONLINE_WINDOW_MINUTES,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getMetrics };
