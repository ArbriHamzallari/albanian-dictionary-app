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
      accuracyRes,
      avgQuizzesRes,
      topStreakRes,
      totalQuizzesRes,
      activeSubscribersRes,
      premiumTotalRes,
      onlineNowRes,
    ] = await Promise.all([
      // 1) Total registered users (role='user')
      pool.query(
        `SELECT COUNT(*)::int AS total FROM users WHERE role = 'user'`
      ),

      // 2) New users today (UTC)
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM users
         WHERE role = 'user'
           AND created_at >= (NOW() AT TIME ZONE 'utc')::date`
      ),

      // 3) Active users today (played a quiz today, UTC)
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS total
         FROM quiz_attempts
         WHERE created_at >= (NOW() AT TIME ZONE 'utc')::date`
      ),

      // 4) Active users last 7 days
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS total
         FROM quiz_attempts
         WHERE created_at >= (NOW() AT TIME ZONE 'utc')::date - INTERVAL '7 days'`
      ),

      // 5) Active users last 30 days
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS total
         FROM quiz_attempts
         WHERE created_at >= (NOW() AT TIME ZONE 'utc')::date - INTERVAL '30 days'`
      ),

      // 6) Average accuracy across all users with quizzes
      pool.query(
        `SELECT
           CASE WHEN SUM(total_quizzes) > 0
             THEN ROUND(SUM(correct_answers)::numeric / (SUM(total_quizzes) * 10) * 100, 1)
             ELSE 0
           END AS avg_accuracy
         FROM user_stats
         WHERE total_quizzes > 0`
      ),

      // 7) Average quizzes per user
      pool.query(
        `SELECT
           CASE WHEN COUNT(*) > 0
             THEN ROUND(AVG(total_quizzes)::numeric, 1)
             ELSE 0
           END AS avg_quizzes
         FROM user_stats`
      ),

      // 8) Top streak
      pool.query(
        `SELECT COALESCE(MAX(streak), 0)::int AS top_streak FROM user_stats`
      ),

      // 9) Total quizzes played
      pool.query(
        `SELECT COALESCE(SUM(total_quizzes), 0)::int AS total FROM user_stats`
      ),

      // 10) Active premium subscribers (valid entitlement)
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM entitlements e
         JOIN users u ON u.uuid = e.user_id
         WHERE u.role = 'user'
           AND ${ACTIVE_PREMIUM_ENTITLEMENT_SQL}`
      ),

      // 11) All premium-tier entitlements (includes lapsed/canceled)
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM entitlements e
         JOIN users u ON u.uuid = e.user_id
         WHERE u.role = 'user'
           AND e.tier = 'premium'`
      ),

      // 12) Users online now (recent heartbeat)
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

    // Retention = 7-day active / total users * 100, safe divide
    const retentionRate = totalUsers > 0
      ? Math.round((active7d / totalUsers) * 1000) / 10
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
