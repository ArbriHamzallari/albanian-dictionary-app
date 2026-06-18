const pool = require('../utils/db');
const { LEADERBOARD_SQL } = require('../utils/rankSql');

const DUMMY_USERS = {
  kids: [
    { username: 'FjaleShqip_1', avatar_filename: 'eagle.png', xp: 2800, level: 6, streak: 5 },
    { username: 'KuizYlli', avatar_filename: 'cat.png', xp: 2400, level: 5, streak: 4 },
    { username: 'AlbanianAce', avatar_filename: 'bear.png', xp: 2100, level: 5, streak: 3 },
    { username: 'FjalorHero', avatar_filename: 'panda.png', xp: 1800, level: 5, streak: 6 },
    { username: 'ShqipNinja', avatar_filename: 'robot.png', xp: 1500, level: 4, streak: 2 },
    { username: 'QuizEagle', avatar_filename: 'penguin.png', xp: 1200, level: 4, streak: 3 },
    { username: 'FjalaMagjike', avatar_filename: 'lion.png', xp: 900, level: 4, streak: 1 },
    { username: 'TungTung', avatar_filename: 'parrot.png', xp: 600, level: 3, streak: 2 },
    { username: 'Fjalekalters', avatar_filename: 'rocket.png', xp: 400, level: 3, streak: 1 },
    { username: 'LibriIm', avatar_filename: 'book.png', xp: 200, level: 2, streak: 1 },
  ],
  adults: [
    { username: 'DiasporaLearner', avatar_filename: 'eagle.png', xp: 2800, level: 6, streak: 5 },
    { username: 'ShqipDaily', avatar_filename: 'cat.png', xp: 2400, level: 5, streak: 4 },
    { username: 'WordKeeper', avatar_filename: 'bear.png', xp: 2100, level: 5, streak: 3 },
    { username: 'FjalaFinder', avatar_filename: 'panda.png', xp: 1800, level: 5, streak: 6 },
    { username: 'AlblishFixer', avatar_filename: 'robot.png', xp: 1500, level: 4, streak: 2 },
    { username: 'GjuhaJone', avatar_filename: 'penguin.png', xp: 1200, level: 4, streak: 3 },
    { username: 'RootWords', avatar_filename: 'lion.png', xp: 900, level: 4, streak: 1 },
    { username: 'FjalePerDite', avatar_filename: 'parrot.png', xp: 600, level: 3, streak: 2 },
    { username: 'QuizPilot', avatar_filename: 'rocket.png', xp: 400, level: 3, streak: 1 },
    { username: 'BookLearner', avatar_filename: 'book.png', xp: 200, level: 2, streak: 1 },
  ],
};

async function getRequestedSegment(req) {
  if (req.query.segment === 'kids' || req.query.segment === 'adults') {
    return req.query.segment;
  }

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
      isDummy: false,
    }));

    // Append pseudonymous sample rows after real users until we have 10.
    const leaderboard = [...realUsers];
    let dummyIdx = 0;
    while (leaderboard.length < 10 && dummyIdx < DUMMY_USERS[segment].length) {
      leaderboard.push({
        ...DUMMY_USERS[segment][dummyIdx],
        rank: leaderboard.length + 1,
        isCurrentUser: false,
        isDummy: true,
      });
      dummyIdx++;
    }

    return res.json({
      leaderboard,
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
