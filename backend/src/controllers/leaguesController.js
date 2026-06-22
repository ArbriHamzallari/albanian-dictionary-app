const pool = require('../utils/db');
const {
  getOrCreateCurrentSeason,
  getOrCreateMembership,
  tierAfterResult,
} = require('../utils/leagues');

// Ranked CTE for a (season, tier, segment) group. Pseudonymous and excludes
// opted-out users. $1 season_id, $2 tier, $3 segment.
const RANKED_CTE = `
  ranked AS (
    SELECT m.user_id,
           u.username,
           u.avatar_filename,
           m.weekly_xp,
           RANK() OVER (ORDER BY m.weekly_xp DESC, m.started_at ASC) AS rank
    FROM user_league_membership m
    JOIN users u ON u.uuid = m.user_id
    WHERE m.season_id = $1
      AND m.tier = $2::league_tier
      AND u.role = 'user'
      AND u.leaderboard_opt_out = false
      AND u.leaderboard_segment = $3
  )
`;

// ── GET /api/leagues/me ──────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    const userRow = await pool.query(
      `SELECT leaderboard_segment, leaderboard_opt_out FROM users WHERE uuid = $1::uuid`,
      [userUuid]
    );
    const segment = userRow.rows[0]?.leaderboard_segment === 'kids' ? 'kids' : 'adults';
    const optedOut = Boolean(userRow.rows[0]?.leaderboard_opt_out);

    const season = await getOrCreateCurrentSeason(pool);
    const membership = await getOrCreateMembership(pool, userUuid, season.id);

    const league = await pool.query(
      `SELECT tier, "order", color FROM leagues WHERE tier = $1::league_tier`,
      [membership.tier]
    );

    const top = await pool.query(
      `WITH ${RANKED_CTE}
       SELECT user_id, username, avatar_filename, weekly_xp, rank
       FROM ranked ORDER BY rank ASC LIMIT 10`,
      [season.id, membership.tier, segment]
    );

    // Viewer's own rank — null if they opted out (not part of the public ranking).
    let myRank = null;
    if (!optedOut) {
      const rk = await pool.query(
        `WITH ${RANKED_CTE}
         SELECT rank FROM ranked WHERE user_id = $4::uuid`,
        [season.id, membership.tier, segment, userUuid]
      );
      myRank = rk.rows[0] ? parseInt(rk.rows[0].rank, 10) : null;
    }

    return res.json({
      season: { id: season.id, started_at: season.started_at, ends_at: season.ends_at },
      tier: membership.tier,
      league: league.rows[0] || null,
      weekly_xp: membership.weekly_xp,
      rank: myRank,
      opted_out: optedOut,
      segment,
      is_premium: Boolean(req.entitlement?.isPremium),
      // Pseudonymous: username + avatar + weekly_xp only. No uuid/name/email/age.
      top: top.rows.map((r) => ({
        username: r.username,
        avatar_filename: r.avatar_filename,
        weekly_xp: r.weekly_xp,
        rank: parseInt(r.rank, 10),
        isCurrentUser: r.user_id === userUuid,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/leagues/last-result ─────────────────────────────
// Returns the most recent unseen end-of-season outcome (then marks it seen) so
// the Monday "last week's result" toast shows exactly once.
const getLastResult = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;
    const result = await pool.query(
      `SELECT season_id, tier, result, result_viewed_at
       FROM user_league_membership
       WHERE user_id = $1::uuid AND ended_at IS NOT NULL AND result IS NOT NULL
       ORDER BY ended_at DESC
       LIMIT 1`,
      [userUuid]
    );

    if (!result.rows.length || result.rows[0].result_viewed_at) {
      return res.json({ result: null });
    }

    const row = result.rows[0];
    await pool.query(
      `UPDATE user_league_membership SET result_viewed_at = now()
       WHERE user_id = $1::uuid AND season_id = $2`,
      [userUuid, row.season_id]
    );

    return res.json({
      result: row.result,
      previousTier: row.tier,
      tier: tierAfterResult(row.tier, row.result),
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getMe, getLastResult };
