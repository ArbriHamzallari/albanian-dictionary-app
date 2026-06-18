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

const getLeaderboard = async (req, res, next) => {
  try {
    const segment = await getRequestedSegment(req);
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
