const pool = require('../utils/db');
const { LEADERBOARD_SQL } = require('../utils/rankSql');

async function getRequestedSegment(req) {
  if (!req.user?.uuid) {
    return 'adults';
  }

  const result = await pool.query(
    `SELECT leaderboard_segment
     FROM users
     WHERE uuid = $1::uuid AND leaderboard_segment IN ('kids', 'adults')`,
    [req.user.uuid]
  );

  return result.rows[0]?.leaderboard_segment || 'adults';
}

// LEADERBOARD-2 — the 'kids' segment is deliberately OFF. Do not "fix" this by
// re-enabling it.
//
// Root CLAUDE.md: "No path from leaderboard to private contact." RANKED_USERS_CTE has
// no profile_private filter, so minors (profile_private = true by default) are listed
// on the kids board by their real `username`. That was inert while private profiles
// could not receive friend requests — FRIENDS-1 makes minor↔minor requests work by
// exact username, which turns every listed kid username into a cold-contact path.
//
// Filtering profile_private inside the CTE is NOT the fix: with no display name
// separate from `username` in the schema (only username/username_normalized exist), it
// would empty the kids board rather than close the contact path. The real fix is a
// display alias that is not usable for friend lookup; until that ships, the segment is
// blocked here. This is narrow and reversible — RANKED_USERS_CTE and the adults segment
// are untouched.
const KIDS_SEGMENT_DISABLED_CODE = 'SEGMENT_TEMPORARILY_UNAVAILABLE';

const getLeaderboard = async (req, res, next) => {
  try {
    const segment = await getRequestedSegment(req);

    // 200, not 4xx: the client swallows errors, so an error status would render as a
    // generic empty board — indistinguishable from a bug. Answer honestly instead, with
    // an explicit flag the UI can branch on, and never run the query for this segment.
    if (segment === 'kids') {
      return res.json({
        leaderboard: [],
        segment,
        unavailable: true,
        code: KIDS_SEGMENT_DISABLED_CODE,
        viewer: {
          tier: req.entitlement?.tier || 'free',
          canParticipate: Boolean(req.entitlement?.isPremium),
        },
      });
    }

    const result = await pool.query(LEADERBOARD_SQL, [segment, 10]);
    const realUsers = result.rows.map((row) => ({
      username: row.username,
      avatar_filename: row.avatar_filename,
      xp: row.xp,
      level: row.level,
      streak: row.streak,
      rank: parseInt(row.rank, 10),
      isCurrentUser: Boolean(req.user?.uuid && row.uuid === req.user.uuid),
    }));

    return res.json({
      leaderboard: realUsers,
      segment,
      viewer: {
        tier: req.entitlement?.tier || 'free',
        canParticipate: Boolean(req.entitlement?.isPremium),
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getLeaderboard };
