const pool = require('../utils/db');
const { LEADERBOARD_SQL } = require('../utils/rankSql');

const DUMMY_USERS = [
  { username: 'Ardit Kola', avatar_filename: 'eagle.png', xp: 2800, level: 6, streak: 5 },
  { username: 'Elira Hoxha', avatar_filename: 'cat.png', xp: 2400, level: 5, streak: 4 },
  { username: 'Besnik Krasniqi', avatar_filename: 'bear.png', xp: 2100, level: 5, streak: 3 },
  { username: 'Jona Dervishi', avatar_filename: 'panda.png', xp: 1800, level: 5, streak: 6 },
  { username: 'Ermal Gashi', avatar_filename: 'robot.png', xp: 1500, level: 4, streak: 2 },
  { username: 'Klea Meta', avatar_filename: 'penguin.png', xp: 1200, level: 4, streak: 3 },
  { username: 'Lorik Shala', avatar_filename: 'lion.png', xp: 900, level: 4, streak: 1 },
  { username: 'Rina Pasha', avatar_filename: 'parrot.png', xp: 600, level: 3, streak: 2 },
  { username: 'Dion Leka', avatar_filename: 'rocket.png', xp: 400, level: 3, streak: 1 },
  { username: 'Mira Gjoni', avatar_filename: 'book.png', xp: 200, level: 2, streak: 1 },
];

const getLeaderboard = async (req, res, next) => {
  try {
    const result = await pool.query(LEADERBOARD_SQL, [10]);
    const realUsers = result.rows.map((row) => ({
      uuid: row.uuid,
      username: row.username,
      avatar_filename: row.avatar_filename,
      xp: row.xp,
      level: row.level,
      streak: row.streak,
      rank: parseInt(row.rank, 10),
      isDummy: false,
    }));

    // Append dummies after real users until we have 10
    const leaderboard = [...realUsers];
    let dummyIdx = 0;
    while (leaderboard.length < 10 && dummyIdx < DUMMY_USERS.length) {
      leaderboard.push({
        ...DUMMY_USERS[dummyIdx],
        uuid: null,
        rank: leaderboard.length + 1,
        isDummy: true,
      });
      dummyIdx++;
    }

    return res.json({ leaderboard });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getLeaderboard };
