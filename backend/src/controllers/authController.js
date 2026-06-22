const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { loginSchema, registerSchema, guestUpgradeSchema, consentCheckSchema } = require('../utils/validation');
const { USER_RANK_SQL } = require('../utils/rankSql');
const { getEntitlement, entitlementIsPremium } = require('../middleware/entitlements');
const { touchLastSeen } = require('../utils/presence');
const { parseCookies } = require('../utils/cookies');
const {
  getLeaderboardSegmentForAge,
  isMinorAge,
  normalizeCountryCode,
  requiresParentalConsent,
  validateUserText,
} = require('../utils/childSafety');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

// ── Auth tokens & cookies ────────────────────────────────────
// JWT lives in an httpOnly cookie so an XSS cannot read it. A short-lived access
// token (2h) is refreshed via a long-lived refresh token (14d). A non-HttpOnly
// CSRF token cookie is echoed by the client in the x-fjalingo-csrf header.
const ACCESS_TTL = '2h';
const REFRESH_TTL = '14d';
const ACCESS_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const ACCESS_COOKIE = 'fjalingo_token';
const REFRESH_COOKIE = 'fjalingo_refresh';
const CSRF_COOKIE = 'fjalingo_csrf';
const BCRYPT_COST = 12;
const isProduction = process.env.NODE_ENV === 'production';

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      uuid: user.uuid,
      role: user.role,
      full_name: user.full_name,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ uuid: user.uuid, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: REFRESH_TTL });
}

// secure:true requires HTTPS, so it is enabled only in production. SameSite=Lax
// requires the frontend and API to share a registrable domain in production
// (e.g. fjalingo.al + api.fjalingo.al).
function cookieBase() {
  return { secure: isProduction, sameSite: 'lax', path: '/' };
}

// Issues access + refresh + csrf cookies and returns the access token (also sent
// in the JSON body so non-browser/Bearer clients keep working).
function setSessionCookies(res, user) {
  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);
  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie(ACCESS_COOKIE, access, { ...cookieBase(), httpOnly: true, maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, refresh, { ...cookieBase(), httpOnly: true, maxAge: REFRESH_MAX_AGE_MS });
  res.cookie(CSRF_COOKIE, csrf, { ...cookieBase(), httpOnly: false, maxAge: REFRESH_MAX_AGE_MS });
  return access;
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...cookieBase(), httpOnly: true });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase(), httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...cookieBase(), httpOnly: false });
}

function isUniqueViolation(err) {
  return err.code === '23505'; // Postgres unique_violation
}

// Validate a client-supplied IANA timezone; fall back to UTC if missing/invalid
// so `now() AT TIME ZONE timezone` can never throw downstream.
function resolveTimezone(tz) {
  if (tz && typeof tz === 'string') {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return tz;
    } catch {
      // fall through to UTC
    }
  }
  return 'UTC';
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
    age: u.age,
    country_code: u.country_code,
    is_minor: u.is_minor,
    parental_consent_required: u.parental_consent_required,
    parental_consent_given: u.parental_consent_given,
    profile_private: u.profile_private,
    leaderboard_opt_out: u.leaderboard_opt_out,
    leaderboard_segment: u.leaderboard_segment,
    created_at: u.created_at,
  };
}

function buildChildSafetyFields(value) {
  const countryCode = normalizeCountryCode(value.country_code);
  const consentRequired = requiresParentalConsent(value.age, countryCode);

  if (consentRequired && !value.parental_consent_given) {
    return {
      error: {
        status: 403,
        body: {
          message: 'Kërkohet pëlqimi i prindit/kujdestarit për këtë moshë.',
          code: 'PARENTAL_CONSENT_REQUIRED',
        },
      },
    };
  }

  const isMinor = isMinorAge(value.age);
  return {
    fields: {
      age: value.age,
      countryCode,
      isMinor,
      parentalConsentRequired: consentRequired,
      parentalConsentGiven: Boolean(value.parental_consent_given),
      profilePrivate: isMinor,
      leaderboardOptOut: false,
      leaderboardSegment: getLeaderboardSegmentForAge(value.age),
    },
  };
}

// ── POST /register ───────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e regjistrimit janë të pavlefshme.' });
    }

    const usernameSafety = validateUserText(value.username);
    if (!usernameSafety.ok) {
      return res.status(400).json({ message: 'Emri publik përmban tekst të palejuar ose të dhëna personale.' });
    }

    const safety = buildChildSafetyFields(value);
    if (safety.error) {
      return res.status(safety.error.status).json(safety.error.body);
    }

    const timezone = resolveTimezone(value.timezone);
    const passwordHash = await bcrypt.hash(value.password, BCRYPT_COST);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (
           email,
           password_hash,
           full_name,
           role,
           username,
           username_normalized,
           avatar_filename,
           age,
           country_code,
           is_minor,
           parental_consent_required,
           parental_consent_given,
           parental_consent_at,
           profile_private,
           leaderboard_opt_out,
           leaderboard_segment,
           timezone
         )
         VALUES ($1, $2, $3, 'user', $4, $5, 'default.png', $6, $7, $8, $9, $10, CASE WHEN $10 THEN NOW() ELSE NULL END, $11, $12, $13, $14)
         RETURNING *`,
        [
          value.email,
          passwordHash,
          value.username,
          value.username,
          value.username.toLowerCase(),
          safety.fields.age,
          safety.fields.countryCode,
          safety.fields.isMinor,
          safety.fields.parentalConsentRequired,
          safety.fields.parentalConsentGiven,
          safety.fields.profilePrivate,
          safety.fields.leaderboardOptOut,
          safety.fields.leaderboardSegment,
          timezone,
        ]
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO user_stats (user_id) VALUES ($1)`,
        [user.uuid]
      );

      await client.query(
        `INSERT INTO entitlements (user_id, tier, status)
         VALUES ($1, 'free', 'free')
         ON CONFLICT (user_id) DO NOTHING`,
        [user.uuid]
      );

      await client.query('COMMIT');

      const statsResult = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);

      const token = setSessionCookies(res, user);
      return res.status(201).json({
        token,
        profile: profileFromRow(user),
        stats: statsResult.rows[0],
        entitlement: { tier: 'free', status: 'free', current_period_end: null },
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

    // Update last_login and presence
    await pool.query(
      'UPDATE users SET last_login = NOW(), last_seen = NOW() WHERE id = $1',
      [user.id]
    );

    const token = setSessionCookies(res, user);

    // For admin users return token + role + profile (so frontend can detect admin immediately)
    if (user.role === 'admin') {
      return res.json({ token, role: 'admin', profile: profileFromRow(user) });
    }

    // For regular users return profile + stats
    const statsResult = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);
    const entitlement = await getEntitlement(user.uuid);
    return res.json({
      token,
      profile: profileFromRow(user),
      stats: statsResult.rows[0] || null,
      entitlement: {
        tier: entitlementIsPremium(entitlement) ? 'premium' : 'free',
        status: entitlement?.status || 'free',
        current_period_end: entitlement?.current_period_end || null,
      },
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /me ──────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    // Cookie-authenticated sessions need a CSRF token available to JS; issue one
    // if it is missing (e.g. a session that predates this change).
    if (!parseCookies(req)[CSRF_COOKIE]) {
      res.cookie(CSRF_COOKIE, crypto.randomBytes(24).toString('hex'), {
        ...cookieBase(),
        httpOnly: false,
        maxAge: REFRESH_MAX_AGE_MS,
      });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE uuid = $1::uuid', [userUuid]);
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const user = userResult.rows[0];

    const statsResult = await pool.query('SELECT * FROM user_stats WHERE user_id = $1::uuid', [userUuid]);
    const entitlement = await getEntitlement(userUuid);

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
      entitlement: {
        tier: entitlementIsPremium(entitlement) ? 'premium' : 'free',
        status: entitlement?.status || 'free',
        current_period_end: entitlement?.current_period_end || null,
      },
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

    const usernameSafety = validateUserText(value.username);
    if (!usernameSafety.ok) {
      return res.status(400).json({ message: 'Emri publik përmban tekst të palejuar ose të dhëna personale.' });
    }

    const safety = buildChildSafetyFields(value);
    if (safety.error) {
      return res.status(safety.error.status).json(safety.error.body);
    }

    const gp = value.guestProgress;
    // Extra clamp: correct_answers cannot exceed total_quizzes * 10
    gp.correct_answers = Math.min(gp.correct_answers, gp.total_quizzes * 10);

    const timezone = resolveTimezone(value.timezone);
    const passwordHash = await bcrypt.hash(value.password, BCRYPT_COST);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (
           email,
           password_hash,
           full_name,
           role,
           username,
           username_normalized,
           avatar_filename,
           age,
           country_code,
           is_minor,
           parental_consent_required,
           parental_consent_given,
           parental_consent_at,
           profile_private,
           leaderboard_opt_out,
           leaderboard_segment,
           timezone
         )
         VALUES ($1, $2, $3, 'user', $4, $5, 'default.png', $6, $7, $8, $9, $10, CASE WHEN $10 THEN NOW() ELSE NULL END, $11, $12, $13, $14)
         RETURNING *`,
        [
          value.email,
          passwordHash,
          value.username,
          value.username,
          value.username.toLowerCase(),
          safety.fields.age,
          safety.fields.countryCode,
          safety.fields.isMinor,
          safety.fields.parentalConsentRequired,
          safety.fields.parentalConsentGiven,
          safety.fields.profilePrivate,
          safety.fields.leaderboardOptOut,
          safety.fields.leaderboardSegment,
          timezone,
        ]
      );
      const user = userResult.rows[0];

      // Create stats with merged guest progress
      // Level = floor(sqrt(xp/100)) + 1, computed from the xp parameter ($2)
      await client.query(
        `INSERT INTO user_stats (user_id, xp, level, streak, total_quizzes, correct_answers)
         VALUES ($1, $2, floor(sqrt(($2::numeric)/100))::int + 1, $3, $4, $5)`,
        [user.uuid, gp.xp, gp.streak, gp.total_quizzes, gp.correct_answers]
      );

      await client.query(
        `INSERT INTO entitlements (user_id, tier, status)
         VALUES ($1, 'free', 'free')
         ON CONFLICT (user_id) DO NOTHING`,
        [user.uuid]
      );

      await client.query('COMMIT');

      const statsResult = await client.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);

      const token = setSessionCookies(res, user);
      return res.status(201).json({
        token,
        profile: profileFromRow(user),
        stats: statsResult.rows[0],
        entitlement: { tier: 'free', status: 'free', current_period_end: null },
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

// ── POST /consent-check ──────────────────────────────────────
// Public. Given age + country, returns the child-safety fields the register
// endpoint will compute, so onboarding can decide whether to show the parental
// consent screen. Reuses the same childSafety helpers (no re-implementation).
const consentCheck = (req, res) => {
  const { error, value } = consentCheckSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: 'Mosha ose shteti janë të pavlefshme.' });
  }

  const countryCode = normalizeCountryCode(value.country_code);
  return res.json({
    is_minor: isMinorAge(value.age),
    leaderboard_segment: getLeaderboardSegmentForAge(value.age),
    parental_consent_required: requiresParentalConsent(value.age, countryCode),
  });
};

// ── POST /heartbeat ──────────────────────────────────────────
const heartbeat = async (req, res, next) => {
  try {
    await touchLastSeen(req.user.uuid);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// ── POST /refresh ────────────────────────────────────────────
// Verifies the refresh cookie and rotates the access + refresh cookies. Note:
// rotation is stateless (no server-side denylist), so the previous refresh token
// stays valid until it expires — a token store is a future hardening step.
const refresh = async (req, res) => {
  const refreshToken = parseCookies(req)[REFRESH_COOKIE];
  if (!refreshToken) {
    return res.status(401).json({ message: 'Sesioni ka skaduar.', code: 'NO_REFRESH' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (err) {
    clearSessionCookies(res);
    return res.status(401).json({ message: 'Sesioni ka skaduar.', code: 'REFRESH_INVALID' });
  }

  if (payload.type !== 'refresh' || !payload.uuid) {
    clearSessionCookies(res);
    return res.status(401).json({ message: 'Sesioni ka skaduar.', code: 'REFRESH_INVALID' });
  }

  const userResult = await pool.query('SELECT * FROM users WHERE uuid = $1::uuid', [payload.uuid]);
  if (!userResult.rows.length) {
    clearSessionCookies(res);
    return res.status(401).json({ message: 'Sesioni ka skaduar.', code: 'REFRESH_INVALID' });
  }

  setSessionCookies(res, userResult.rows[0]);
  return res.json({ ok: true });
};

// ── POST /logout ─────────────────────────────────────────────
const logout = (req, res) => {
  clearSessionCookies(res);
  return res.json({ ok: true });
};

module.exports = { register, login, me, guestUpgrade, heartbeat, consentCheck, refresh, logout };
