// ─────────────────────────────────────────────────────────────
// Weekly league helpers. Seasons are global and week-aligned (Monday 00:00 to
// Sunday 23:59:59, server clock). Rankings are pseudonymous, segmented
// (kids/adults), and exclude opted-out users (CLAUDE.md sections 7 and 14).
// ─────────────────────────────────────────────────────────────

const TIER_ORDER = { bronxhi: 1, argjendi: 2, ari: 3 };
const ORDER_TIER = { 1: 'bronxhi', 2: 'argjendi', 3: 'ari' };
const PROMOTE_DEMOTE_COUNT = 5;

// Upsert and return the current week's season.
async function getOrCreateCurrentSeason(db) {
  const result = await db.query(
    `INSERT INTO league_seasons (started_at, ends_at)
     VALUES (
       date_trunc('week', now()),
       date_trunc('week', now()) + interval '7 days' - interval '1 second'
     )
     ON CONFLICT (started_at) DO UPDATE SET ends_at = league_seasons.ends_at
     RETURNING *`
  );
  return result.rows[0];
}

// The season immediately following the given one (next week).
async function getOrCreateNextSeason(db, season) {
  const result = await db.query(
    `INSERT INTO league_seasons (started_at, ends_at)
     VALUES ($1::timestamp + interval '7 days', $2::timestamp + interval '7 days')
     ON CONFLICT (started_at) DO UPDATE SET ends_at = league_seasons.ends_at
     RETURNING *`,
    [season.started_at, season.ends_at]
  );
  return result.rows[0];
}

// Ensure the user has a membership row for the season (defaults to bronxhi).
async function getOrCreateMembership(db, userUuid, seasonId) {
  await db.query(
    `INSERT INTO user_league_membership (user_id, season_id, tier, weekly_xp)
     VALUES ($1::uuid, $2, 'bronxhi', 0)
     ON CONFLICT (user_id, season_id) DO NOTHING`,
    [userUuid, seasonId]
  );
  const result = await db.query(
    `SELECT * FROM user_league_membership WHERE user_id = $1::uuid AND season_id = $2`,
    [userUuid, seasonId]
  );
  return result.rows[0];
}

// Add XP to the user's current-season weekly total (creating the season and the
// membership as needed). Tier is preserved across increments.
async function addWeeklyXp(db, userUuid, xp) {
  const season = await getOrCreateCurrentSeason(db);
  await db.query(
    `INSERT INTO user_league_membership (user_id, season_id, tier, weekly_xp)
     VALUES ($1::uuid, $2, 'bronxhi', $3)
     ON CONFLICT (user_id, season_id)
     DO UPDATE SET weekly_xp = user_league_membership.weekly_xp + EXCLUDED.weekly_xp`,
    [userUuid, season.id, Math.max(0, xp || 0)]
  );
  return season;
}

// Decide a user's next tier from their rank within their (tier, segment) group.
// Promotion is checked before demotion so a small tier never demotes a promoted
// user. Free users who earn promotion to ari are capped at argjendi.
function decideNextTier(tier, rankAsc, count, isPremium) {
  if (tier === 'bronxhi') {
    if (rankAsc <= PROMOTE_DEMOTE_COUNT) return { tier: 'argjendi', result: 'promoted' };
    return { tier: 'bronxhi', result: 'same' };
  }
  if (tier === 'argjendi') {
    if (rankAsc <= PROMOTE_DEMOTE_COUNT) {
      return isPremium
        ? { tier: 'ari', result: 'promoted' }
        : { tier: 'argjendi', result: 'promotion_blocked' };
    }
    if (rankAsc > count - PROMOTE_DEMOTE_COUNT) return { tier: 'bronxhi', result: 'demoted' };
    return { tier: 'argjendi', result: 'same' };
  }
  // ari
  if (rankAsc > count - PROMOTE_DEMOTE_COUNT) return { tier: 'argjendi', result: 'demoted' };
  return { tier: 'ari', result: 'same' };
}

// New tier from an old tier + recorded result (for the result toast).
function tierAfterResult(oldTier, result) {
  if (result === 'promoted') return ORDER_TIER[Math.min(3, TIER_ORDER[oldTier] + 1)];
  if (result === 'demoted') return ORDER_TIER[Math.max(1, TIER_ORDER[oldTier] - 1)];
  return oldTier; // same, promotion_blocked
}

// End-of-season processing for every ended, not-yet-processed season.
// Ranks each (tier, segment) group by weekly_xp, applies promotion/demotion,
// seeds the next season's memberships, and records each user's result.
async function processSeasonEnd(db) {
  const ended = await db.query(
    `SELECT * FROM league_seasons s
     WHERE s.ends_at < now()
       AND EXISTS (
         SELECT 1 FROM user_league_membership m
         WHERE m.season_id = s.id AND m.ended_at IS NULL
       )
     ORDER BY s.ends_at ASC`
  );

  const summary = { processed_seasons: 0, promoted: 0, demoted: 0, promotion_blocked: 0 };

  for (const season of ended.rows) {
    const next = await getOrCreateNextSeason(db, season);

    const members = await db.query(
      `SELECT m.user_id, m.tier, m.weekly_xp,
              u.leaderboard_segment AS segment,
              u.leaderboard_opt_out AS opted_out,
              COALESCE(
                e.tier = 'premium' AND e.status IN ('active', 'trialing') AND e.current_period_end > now(),
                false
              ) AS is_premium
       FROM user_league_membership m
       JOIN users u ON u.uuid = m.user_id
       LEFT JOIN entitlements e ON e.user_id = m.user_id
       WHERE m.season_id = $1`,
      [season.id]
    );

    // Rank non-opted-out users within each (tier, segment) group.
    const groups = new Map();
    for (const m of members.rows) {
      if (m.opted_out) continue;
      const key = `${m.tier}|${m.segment}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(m);
    }
    for (const arr of groups.values()) {
      arr.sort((a, b) => b.weekly_xp - a.weekly_xp);
      arr.forEach((m, i) => { m.rankAsc = i + 1; m.count = arr.length; });
    }

    for (const m of members.rows) {
      let nextTier = m.tier;
      let result = null;
      if (!m.opted_out) {
        const d = decideNextTier(m.tier, m.rankAsc, m.count, m.is_premium);
        nextTier = d.tier;
        result = d.result;
        if (result === 'promoted') summary.promoted += 1;
        else if (result === 'demoted') summary.demoted += 1;
        else if (result === 'promotion_blocked') summary.promotion_blocked += 1;
      }

      await db.query(
        `UPDATE user_league_membership SET ended_at = now(), result = $3
         WHERE user_id = $1::uuid AND season_id = $2`,
        [m.user_id, season.id, result]
      );
      await db.query(
        `INSERT INTO user_league_membership (user_id, season_id, tier, weekly_xp)
         VALUES ($1::uuid, $2, $3::league_tier, 0)
         ON CONFLICT (user_id, season_id) DO UPDATE SET tier = EXCLUDED.tier`,
        [m.user_id, next.id, nextTier]
      );
    }

    summary.processed_seasons += 1;
  }

  return summary;
}

module.exports = {
  TIER_ORDER,
  ORDER_TIER,
  getOrCreateCurrentSeason,
  getOrCreateNextSeason,
  getOrCreateMembership,
  addWeeklyXp,
  decideNextTier,
  tierAfterResult,
  processSeasonEnd,
};
