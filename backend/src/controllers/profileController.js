const pool = require('../utils/db');
const { profileUpdateSchema } = require('../utils/validation');
const { isValidAvatar } = require('../utils/avatars');
const { USER_RANK_SQL } = require('../utils/rankSql');

// ── PUT /profile ─────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat janë të pavlefshme.' });
    }

    const userUuid = req.user.uuid;

    const sets = [];
    const params = [];
    let idx = 1;

    if (value.username !== undefined) {
      sets.push(`username = $${idx}, username_normalized = $${idx + 1}`);
      params.push(value.username, value.username.toLowerCase());
      idx += 2;
    }
    if (value.bio !== undefined) {
      sets.push(`bio = $${idx}`);
      params.push(value.bio || null);
      idx += 1;
    }
    if (value.favorite_word !== undefined) {
      sets.push(`favorite_word = $${idx}`);
      params.push(value.favorite_word || null);
      idx += 1;
    }

    if (!sets.length) {
      return res.status(400).json({ message: 'Asnjë fushë për përditësim.' });
    }

    sets.push(`updated_at = NOW()`);
    params.push(userUuid);

    const query = `UPDATE users SET ${sets.join(', ')} WHERE uuid = $${idx} RETURNING uuid, username, username_normalized, email, full_name, avatar_filename, bio, favorite_word, role, created_at`;

    try {
      const result = await pool.query(query, params);
      if (!result.rows.length) {
        return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
      }
      return res.json({ profile: result.rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Ky emër përdoruesi është i zënë.' });
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
};

// ── PUT /profile/avatar ──────────────────────────────────────
const updateAvatar = async (req, res, next) => {
  try {
    const { filename } = req.body;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ message: 'Emri i skedarit mungon.' });
    }

    if (!isValidAvatar(filename)) {
      return res.status(400).json({ message: 'Avatar i pavlefshëm.' });
    }

    const result = await pool.query(
      `UPDATE users SET avatar_filename = $1, updated_at = NOW() WHERE uuid = $2
       RETURNING uuid, username, avatar_filename`,
      [filename, req.user.uuid]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    return res.json({ profile: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

// ── GET /profile/:uuid ──────────────────────────────────────
const getPublicProfile = async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const userResult = await pool.query(
      `SELECT
         u.uuid,
         u.username,
         u.avatar_filename,
         u.bio,
         u.favorite_word,
         u.created_at,
         s.xp,
         s.level,
         s.streak,
         s.total_quizzes,
         s.correct_answers
       FROM users u
       LEFT JOIN user_stats s ON s.user_id = u.uuid
       WHERE u.uuid = $1::uuid AND u.role = 'user'`,
      [uuid]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const user = userResult.rows[0];
    const stats = user.xp !== null ? {
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      total_quizzes: user.total_quizzes,
      correct_answers: user.correct_answers,
    } : null;

    const rankResult = await pool.query(USER_RANK_SQL, [user.uuid]);
    const rank = rankResult.rows.length ? parseInt(rankResult.rows[0].rank, 10) : null;

    const achievementsResult = await pool.query(
      `SELECT a.key, a.name, a.description, a.xp_reward, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON (a.id::text = ua.achievement_id::text OR a.key = ua.achievement_id::text)
       WHERE ua.user_id = $1::uuid`,
      [user.uuid]
    );

    return res.json({
      profile: {
        uuid: user.uuid,
        username: user.username,
        avatar_filename: user.avatar_filename,
        bio: user.bio,
        favorite_word: user.favorite_word,
        created_at: user.created_at,
      },
      stats,
      rank,
      achievements: achievementsResult.rows,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { updateProfile, updateAvatar, getPublicProfile };
