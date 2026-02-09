const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { loginSchema, registerSchema, guestUpgradeSchema } = require('../utils/validation');
const { USER_RANK_SQL } = require('../utils/rankSql');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;
const JWT_EXPIRY = '7d';

// ── helpers ──────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      uuid: user.uuid,
      role: user.role,
      full_name: user.full_name,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function isUniqueViolation(err) {
  return err.code === '23505'; // Postgres unique_violation
}

function profileFromRow(u) {
  return {
    uuid: u.uuid,
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    avatar_filename: u.avatar_filename,
    bio: u.bio,
    favorite_word: u.favorite_word,
    created_at: u.created_at,
  };
}

// ── POST /register ───────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e regjistrimit janë të pavlefshme.' });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, username, username_normalized, avatar_filename)
         VALUES ($1, $2, $3, 'user', $4, $5, 'default.png')
         RETURNING *`,
        [value.email, passwordHash, value.username, value.username, value.username.toLowerCase()]
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO user_stats (user_id) VALUES ($1)`,
        [user.uuid]
      );

      await client.query('COMMIT');

      const statsResult = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);

      const token = signToken(user);
      return res.status(201).json({
        token,
        profile: profileFromRow(user),
        stats: statsResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(err)) {
        let msg = 'Email ose emri i përdoruesit është i zënë.';
        if (err.constraint && err.constraint.includes('email')) {
          msg = 'Ky email është i regjistruar tashmë.';
        } else if (err.constraint && err.constraint.includes('username')) {
          msg = 'Ky emër përdoruesi është i zënë.';
        }
        return res.status(409).json({ message: msg });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
};

// ── POST /login ──────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e hyrjes janë të pavlefshme.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [value.email]);
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(value.password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'Serveri nuk është konfiguruar. Kontaktoni administratorin.' });
    }

    // Update last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user);

    // For admin users return token + role + profile (so frontend can detect admin immediately)
    if (user.role === 'admin') {
      return res.json({ token, role: 'admin', profile: profileFromRow(user) });
    }

    // For regular users return profile + stats
    const statsResult = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);
    return res.json({
      token,
      profile: profileFromRow(user),
      stats: statsResult.rows[0] || null,
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /me ──────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    const userResult = await pool.query('SELECT * FROM users WHERE uuid = $1::uuid', [userUuid]);
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const user = userResult.rows[0];

    const statsResult = await pool.query('SELECT * FROM user_stats WHERE user_id = $1::uuid', [userUuid]);

    // Rank
    const rankResult = await pool.query(USER_RANK_SQL, [userUuid]);
    const rank = rankResult.rows.length ? parseInt(rankResult.rows[0].rank, 10) : null;

    // Achievements
    const achievementsResult = await pool.query(
      `SELECT a.key, a.name, a.description, a.xp_reward, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON (a.id::text = ua.achievement_id::text OR a.key = ua.achievement_id::text)
       WHERE ua.user_id = $1::uuid`,
      [userUuid]
    );

    return res.json({
      profile: profileFromRow(user),
      stats: statsResult.rows[0] || null,
      rank,
      achievements: achievementsResult.rows,
    });
  } catch (err) {
    return next(err);
  }
};

// ── POST /guest-upgrade ──────────────────────────────────────
const guestUpgrade = async (req, res, next) => {
  try {
    const { error, value } = guestUpgradeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat janë të pavlefshme.' });
    }

    const gp = value.guestProgress;
    // Extra clamp: correct_answers cannot exceed total_quizzes * 10
    gp.correct_answers = Math.min(gp.correct_answers, gp.total_quizzes * 10);

    const passwordHash = await bcrypt.hash(value.password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, username, username_normalized, avatar_filename)
         VALUES ($1, $2, $3, 'user', $4, $5, 'default.png')
         RETURNING *`,
        [value.email, passwordHash, value.username, value.username, value.username.toLowerCase()]
      );
      const user = userResult.rows[0];

      // Create stats with merged guest progress
      // Level = floor(sqrt(xp/100)) + 1, computed from the xp parameter ($2)
      await client.query(
        `INSERT INTO user_stats (user_id, xp, level, streak, total_quizzes, correct_answers)
         VALUES ($1, $2, floor(sqrt(($2::numeric)/100))::int + 1, $3, $4, $5)`,
        [user.uuid, gp.xp, gp.streak, gp.total_quizzes, gp.correct_answers]
      );

      await client.query('COMMIT');

      const statsResult = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);

      const token = signToken(user);
      return res.status(201).json({
        token,
        profile: profileFromRow(user),
        stats: statsResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(err)) {
        let msg = 'Email ose emri i përdoruesit është i zënë.';
        if (err.constraint && err.constraint.includes('email')) {
          msg = 'Ky email është i regjistruar tashmë.';
        } else if (err.constraint && err.constraint.includes('username')) {
          msg = 'Ky emër përdoruesi është i zënë.';
        }
        return res.status(409).json({ message: msg });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, me, guestUpgrade };
