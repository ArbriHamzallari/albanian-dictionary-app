const pool = require('../utils/db');
const { hasUnlimitedAccess } = require('../utils/access');

const FREE_DAILY_QUIZ_LIMIT = 1;
const FREE_DAILY_SEARCH_LIMIT = 5;

async function getEntitlement(userUuid) {
  if (!userUuid) {
    return null;
  }

  // Driven from users (not entitlements) so an admin-granted complimentary user,
  // who may have no Paddle entitlement row, still resolves. A user without an
  // entitlements row reads as free, matching the prior behavior.
  const result = await pool.query(
    `SELECT COALESCE(e.tier, 'free') AS tier,
            COALESCE(e.status, 'free') AS status,
            e.current_period_end,
            u.complimentary_until
     FROM users u
     LEFT JOIN entitlements e ON e.user_id = u.uuid
     WHERE u.uuid = $1::uuid`,
    [userUuid]
  );

  return result.rows[0] || null;
}

function entitlementIsPremium(entitlement) {
  if (!entitlement) {
    return false;
  }

  // Admin-granted complimentary access counts as premium until it expires.
  if (
    entitlement.complimentary_until &&
    new Date(entitlement.complimentary_until).getTime() > Date.now()
  ) {
    return true;
  }

  if (entitlement.tier !== 'premium') {
    return false;
  }

  // Access decision by Paddle subscription status (PAY-2; see Paddle's "provision
  // access and handle subscription state" guidance):
  //   past_due         -> GRANT. Dunning grace: Paddle keeps retrying payment and
  //                       will send subscription.canceled if recovery fails. No
  //                       period-end check — the failed period has already ended.
  //   active, trialing -> GRANT while the paid period has not ended. A scheduled
  //                       cancellation/pause keeps the status 'active' until it
  //                       takes effect, so "premium until period end, then free"
  //                       falls out of this rule without special-casing 'canceled'.
  //   paused, canceled -> REVOKE (canceled revokes immediately, which protects
  //                       against refunds leaving Premium active).
  if (entitlement.status === 'past_due') {
    return true;
  }

  if (entitlement.status !== 'active' && entitlement.status !== 'trialing') {
    return false;
  }

  if (!entitlement.current_period_end) {
    return false;
  }

  return new Date(entitlement.current_period_end).getTime() > Date.now();
}

async function isPremium(req, res, next) {
  try {
    const entitlement = await getEntitlement(req.user?.uuid);
    req.entitlement = {
      tier: entitlementIsPremium(entitlement) ? 'premium' : 'free',
      isPremium: entitlementIsPremium(entitlement),
      status: entitlement?.status || 'free',
      currentPeriodEnd: entitlement?.current_period_end || null,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

function requirePremium(req, res, next) {
  if (hasUnlimitedAccess(req.user, req.entitlement?.isPremium)) {
    return next();
  }

  return res.status(402).json({
    message: 'Ky funksion kërkon Premium.',
    code: 'PREMIUM_REQUIRED',
  });
}

async function enforceDailyQuizLimit(req, res, next) {
  try {
    if (hasUnlimitedAccess(req.user, req.entitlement?.isPremium)) {
      return next();
    }

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM quiz_sessions
       WHERE user_id = $1::uuid
         AND created_at >= (now() AT TIME ZONE 'utc')::date`,
      [req.user.uuid]
    );

    if (result.rows[0].count >= FREE_DAILY_QUIZ_LIMIT) {
      return res.status(402).json({
        message: 'Plani falas përfshin 1 kuiz në ditë. Për kuize pa kufi, kaloni në Premium.',
        code: 'DAILY_QUIZ_LIMIT_REACHED',
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

async function enforceDailySearchLimit(req, res, next) {
  try {
    if (hasUnlimitedAccess(req.user, req.entitlement?.isPremium)) {
      return next();
    }

    const userUuid = req.user?.uuid || null;
    const clientIp = req.ip;
    const result = userUuid
      ? await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM search_logs
         WHERE user_id = $1::uuid
           AND created_at >= (now() AT TIME ZONE 'utc')::date`,
        [userUuid]
      )
      : await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM search_logs
         WHERE user_id IS NULL
           AND ip_address = $1
           AND created_at >= (now() AT TIME ZONE 'utc')::date`,
        [clientIp]
      );

    if (result.rows[0].count >= FREE_DAILY_SEARCH_LIMIT) {
      return res.status(402).json({
        message: 'Plani falas përfshin 5 kërkime në ditë. Për kërkime pa kufi, kaloni në Premium.',
        code: 'DAILY_SEARCH_LIMIT_REACHED',
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  FREE_DAILY_QUIZ_LIMIT,
  FREE_DAILY_SEARCH_LIMIT,
  getEntitlement,
  entitlementIsPremium,
  isPremium,
  requirePremium,
  enforceDailyQuizLimit,
  enforceDailySearchLimit,
};
