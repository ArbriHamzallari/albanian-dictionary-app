const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { OAuth2Client } = require('google-auth-library');
const { loginSchema, registerSchema, guestUpgradeSchema, consentCheckSchema, googleAuthSchema, completeProfileSchema, consentTokenSchema, deleteAccountSchema } = require('../utils/validation');
const { validateParentEmail, sendParentalConsentEmail, verifyConsentToken, maskEmail } = require('../utils/parentalConsent');
const { deleteUserData, hashUserIdentifier } = require('../utils/deleteUser');
const { USER_RANK_SQL } = require('../utils/rankSql');
const { getEntitlement, entitlementIsPremium } = require('../middleware/entitlements');
const { touchLastSeen } = require('../utils/presence');
const { recordLoginEvent } = require('../utils/loginEvents');
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

// Google sign-in. The client is created only when configured; the route returns
// 503 otherwise so the frontend can hide the button instead of silently failing.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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

// The API (api.fjalingo.com) and frontend (fjalingo.com) share one registrable
// domain, so session cookies are first-party and SameSite=Lax is sufficient — and
// safer than None, which Safari/iOS blocks as a third-party cookie. Secure stays on
// in production (HTTPS); dev is same-site localhost. CSRF is still covered by the
// double-submit token + the CORS allowlist.
function cookieBase() {
  return {
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
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
  // Also expose the CSRF token to the response body. The SPA runs on fjalingo.com
  // but the cookie is set by api.fjalingo.com, so JS can't read it via
  // document.cookie; it gets the token here and echoes it in the x-fjalingo-csrf
  // header on writes. The backend compares that header to the cookie, which the
  // browser sends on these same-site requests (SameSite=Lax).
  res.locals.csrfToken = csrf;
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
    auth_provider: u.auth_provider || 'password',
    avatar_filename: u.avatar_filename,
    bio: u.bio,
    favorite_word: u.favorite_word,
    age: u.age,
    country_code: u.country_code,
    is_minor: u.is_minor,
    parental_consent_required: u.parental_consent_required,
    parental_consent_given: u.parental_consent_given,
    // Masked only — the full parent email is never returned to a client. Lets the
    // pending-consent screen show "a***@gmail.com" after a reload (from /me).
    parent_email_hint: u.parent_email ? maskEmail(u.parent_email) : null,
    profile_private: u.profile_private,
    leaderboard_opt_out: u.leaderboard_opt_out,
    leaderboard_segment: u.leaderboard_segment,
    created_at: u.created_at,
  };
}

// SAFE-2c: consent is server-authoritative. This no longer 403s on a missing
// client-sent flag (that flag is gone). It computes the child-safety fields for a
// freshly created account: consent is never "given" here — only the parent clicking
// the emailed link (POST /parental-consent) flips it true — and a consent-pending
// account is held private + off the leaderboard until then. The `{ fields }` shape is
// kept so existing callers keep working; the parent-email flow is layered on top by
// the caller (register/completeProfile/guestUpgrade).
function buildChildSafetyFields(value) {
  const countryCode = normalizeCountryCode(value.country_code);
  const consentRequired = requiresParentalConsent(value.age, countryCode);
  const isMinor = isMinorAge(value.age);
  return {
    fields: {
      age: value.age,
      countryCode,
      isMinor,
      parentalConsentRequired: consentRequired,
      parentalConsentGiven: false,
      profilePrivate: isMinor,
      leaderboardOptOut: consentRequired,
      leaderboardSegment: getLeaderboardSegmentForAge(value.age),
    },
  };
}

// ── POST /register ───────────────────────────────────────────
// SEC-1: role is hardcoded to 'user' in the INSERT below and is never read from
// the request. Admin promotion is a manual DB action (or the admin-only PATCH
// /api/admin/users/:uuid) — there is intentionally no self-service path to admin.
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
    const consentRequired = safety.fields.parentalConsentRequired;

    // parent_email is required iff consent is required, and must differ from the child's
    // own email. The requirement itself depends on the per-country threshold, so the rule
    // lives in the shared consent helper rather than in the Joi schema.
    const parentCheck = validateParentEmail(consentRequired, value.parent_email, value.email);
    if (parentCheck.error) {
      return res.status(400).json({ message: 'Email-i i prindit/kujdestarit është i pavlefshëm ose mungon.', code: parentCheck.error });
    }
    const parentEmail = consentRequired ? value.parent_email : null;

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
           timezone,
           parent_email
         )
         VALUES ($1, $2, $3, 'user', $4, $5, 'default.png', $6, $7, $8, $9, $10, CASE WHEN $10 THEN NOW() ELSE NULL END, $11, $12, $13, $14, $15)
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
          parentEmail,
        ]
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
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

      // Consent-pending: the account exists but is restricted (private, off the
      // leaderboard). Email the parent the approval link and tell the client to show the
      // "check your parent's email" screen instead of entering the app. The email may
      // fail (logged, not thrown) — the account stands and /resend-consent can retry.
      if (consentRequired) {
        const { parentEmailHint } = await sendParentalConsentEmail(user.uuid, parentEmail);
        return res.status(201).json({
          token,
          profile: profileFromRow(user),
          stats: statsResult.rows[0],
          entitlement: { tier: 'free', status: 'free', current_period_end: null },
          csrfToken: res.locals.csrfToken,
          pendingParentalConsent: true,
          parentEmailHint,
        });
      }

      return res.status(201).json({
        token,
        profile: profileFromRow(user),
        stats: statsResult.rows[0],
        entitlement: { tier: 'free', status: 'free', current_period_end: null },
        csrfToken: res.locals.csrfToken,
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

    if (user.is_suspended) {
      return res.status(403).json({ message: 'Llogaria juaj është pezulluar.', code: 'ACCOUNT_SUSPENDED' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ message: 'Serveri nuk është konfiguruar. Kontaktoni administratorin.' });
    }

    // Update last_login and presence
    await pool.query(
      'UPDATE users SET last_login = NOW(), last_seen = NOW() WHERE id = $1',
      [user.id]
    );
    await recordLoginEvent(user.uuid, req);

    const token = setSessionCookies(res, user);

    // For admin users return token + role + profile (so frontend can detect admin immediately)
    if (user.role === 'admin') {
      return res.json({ token, role: 'admin', profile: profileFromRow(user), csrfToken: res.locals.csrfToken });
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
        complimentary_until: entitlement?.complimentary_until || null,
      },
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /me ──────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    // Cookie-authenticated sessions need a CSRF token to echo in the
    // x-fjalingo-csrf header on writes. Reuse the existing cookie value, or issue
    // one if missing (e.g. a session that predates this). It is returned in the
    // body so a cross-domain SPA (which can't read the API's cookie) has it after
    // a page reload.
    let csrfToken = parseCookies(req)[CSRF_COOKIE];
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(24).toString('hex');
      res.cookie(CSRF_COOKIE, csrfToken, {
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
       JOIN achievements a ON a.id = ua.achievement_id
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
        complimentary_until: entitlement?.complimentary_until || null,
      },
      csrfToken,
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
      // total_questions seeds the accuracy denominator (BUG-5). Guests track quizzes,
      // not per-quiz question counts, so use the same total_quizzes * 10 convention
      // as the correct_answers clamp above — keeping merged accuracy <= 100%.
      await client.query(
        `INSERT INTO user_stats (user_id, xp, level, streak, total_quizzes, correct_answers, total_questions)
         VALUES ($1, $2, floor(sqrt(($2::numeric)/100))::int + 1, $3, $4, $5, $4 * 10)
         ON CONFLICT (user_id) DO NOTHING`,
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
        csrfToken: res.locals.csrfToken,
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

  if (userResult.rows[0].is_suspended) {
    clearSessionCookies(res);
    return res.status(403).json({ message: 'Llogaria juaj është pezulluar.', code: 'ACCOUNT_SUSPENDED' });
  }

  setSessionCookies(res, userResult.rows[0]);
  return res.json({ ok: true, csrfToken: res.locals.csrfToken });
};

// ── POST /logout ─────────────────────────────────────────────
const logout = (req, res) => {
  clearSessionCookies(res);
  return res.json({ ok: true });
};

// Re-verify identity before an irreversible account deletion. Fails closed:
// password accounts must re-enter their password; Google-only accounts must
// present a fresh Google credential for the SAME google_sub. A linked account
// (has both) is verified by password. Never reveals which factor was expected.
async function verifyIdentityForDeletion(user, body) {
  if (user.password_hash) {
    if (!body || typeof body.password !== 'string' || !body.password) return false;
    return bcrypt.compare(body.password, user.password_hash);
  }
  if (user.google_sub) {
    if (!googleClient || !body || typeof body.credential !== 'string' || !body.credential) return false;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: body.credential, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      return Boolean(payload && payload.sub === user.google_sub);
    } catch {
      return false;
    }
  }
  return false;
}

// ── DELETE /account ──────────────────────────────────────────
// Self-service GDPR erasure (the privacy policy promises it). Authenticated +
// CSRF (global) + re-verified identity. One transaction: write a PII-free
// tombstone to the audit trail (a legal record), then cascade-erase the user via
// the shared deleteUserData. Deletion does NOT auto-cancel a Paddle subscription
// — the frontend warns and links the cancel flow first; a webhook that arrives
// for the now-deleted user is acknowledged and ignored (see billingController).
const deleteAccount = async (req, res, next) => {
  try {
    const { error, value } = deleteAccountSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ message: 'Të dhënat janë të pavlefshme.' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE uuid = $1::uuid', [req.user.uuid]);
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const user = userResult.rows[0];

    const identityOk = await verifyIdentityForDeletion(user, value);
    if (!identityOk) {
      return res.status(401).json({ message: 'Verifikimi dështoi. Provoni përsëri.', code: 'DELETE_IDENTITY_FAILED' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO admin_audit_log
           (admin_user_id, action, target_type, target_id, metadata, ip, user_agent)
         VALUES (NULL, 'account.self_delete', 'user', $1, $2::jsonb, $3, $4)`,
        [
          hashUserIdentifier(user.uuid),
          JSON.stringify({ auth_provider: user.auth_provider || 'password', was_minor: user.is_minor === true }),
          req.ip || null,
          req.get ? (req.get('user-agent') || null) : null,
        ]
      );

      const deleted = await deleteUserData(client, user.uuid);
      if (!deleted) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    clearSessionCookies(res);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// Pseudonymous auto-username for Google sign-ups (no real name, per child-safety
// rules). The user can change it later from their profile.
async function generateUniqueUsername(client) {
  for (let i = 0; i < 10; i += 1) {
    const candidate = `lojtar_${crypto.randomBytes(4).toString('hex')}`;
    const exists = await client.query(
      'SELECT 1 FROM users WHERE username_normalized = $1',
      [candidate.toLowerCase()]
    );
    if (!exists.rows.length) return candidate;
  }
  throw new Error('Could not generate a unique username for Google sign-up');
}

// ── POST /google ─────────────────────────────────────────────
// Verifies a Google ID token, then auto-links to an existing account by verified
// email or creates a new (fail-closed, age-gated) account. Never trusts the
// client: the ID token signature/audience/expiry are re-verified server-side.
const googleAuth = async (req, res, next) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ message: 'Hyrja me Google nuk është e konfiguruar.', code: 'GOOGLE_NOT_CONFIGURED' });
    }

    const { error, value } = googleAuthSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat janë të pavlefshme.' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: value.credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Verifikimi me Google dështoi.', code: 'GOOGLE_VERIFY_FAILED' });
    }

    const email = payload?.email;
    const googleSub = payload?.sub;
    if (!email || !googleSub) {
      return res.status(401).json({ message: 'Verifikimi me Google dështoi.', code: 'GOOGLE_VERIFY_FAILED' });
    }
    // Only auto-link/create when Google has verified the email (linking policy).
    if (payload.email_verified !== true) {
      return res.status(403).json({ message: 'Email-i i Google nuk është i verifikuar. Hyni me fjalëkalim.', code: 'GOOGLE_EMAIL_UNVERIFIED' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let lookup = await client.query('SELECT * FROM users WHERE google_sub = $1', [googleSub]);
      if (!lookup.rows.length) {
        lookup = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      }

      let user;
      if (lookup.rows.length) {
        // Existing account: link the Google sub if not yet linked, then sign in.
        const existing = lookup.rows[0];
        const updated = await client.query(
          `UPDATE users
             SET google_sub = COALESCE(google_sub, $1),
                 email_verified = true,
                 last_login = NOW(),
                 last_seen = NOW()
           WHERE id = $2
           RETURNING *`,
          [googleSub, existing.id]
        );
        user = updated.rows[0];
      } else {
        // Brand-new Google user: age/country stay NULL so the fail-closed
        // child-safety defaults (minor, private, off leaderboards, consent
        // required) apply until they complete their profile.
        const username = await generateUniqueUsername(client);
        const created = await client.query(
          `INSERT INTO users (email, full_name, role, username, username_normalized, avatar_filename, google_sub, auth_provider, email_verified, last_login, last_seen)
           VALUES ($1, $2, 'user', $3, $4, 'default.png', $5, 'google', true, NOW(), NOW())
           RETURNING *`,
          [email, username, username, username.toLowerCase(), googleSub]
        );
        user = created.rows[0];
        await client.query(`INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.uuid]);
        await client.query(`INSERT INTO entitlements (user_id, tier, status) VALUES ($1, 'free', 'free') ON CONFLICT (user_id) DO NOTHING`, [user.uuid]);
      }

      await client.query('COMMIT');

      if (user.is_suspended) {
        return res.status(403).json({ message: 'Llogaria juaj është pezulluar.', code: 'ACCOUNT_SUSPENDED' });
      }

      const statsResult = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [user.uuid]);
      const entitlement = await getEntitlement(user.uuid);
      const token = setSessionCookies(res, user);
      await recordLoginEvent(user.uuid, req);
      return res.json({
        token,
        role: user.role,
        profile: profileFromRow(user),
        stats: statsResult.rows[0] || null,
        entitlement: {
          tier: entitlementIsPremium(entitlement) ? 'premium' : 'free',
          status: entitlement?.status || 'free',
          current_period_end: entitlement?.current_period_end || null,
          complimentary_until: entitlement?.complimentary_until || null,
        },
        // age IS NULL means the user hasn't passed the age gate yet.
        needsProfileCompletion: user.age == null,
        csrfToken: res.locals.csrfToken,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
};

// ── POST /complete-profile ───────────────────────────────────
// Age-gates accounts that were created without age/country (Google sign-ups, and
// legacy pre-gate accounts). Reuses the same child-safety logic as registration.
const completeProfile = async (req, res, next) => {
  try {
    const { error, value } = completeProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Mosha ose shteti janë të pavlefshme.' });
    }

    const safety = buildChildSafetyFields(value);
    if (safety.error) {
      return res.status(safety.error.status).json(safety.error.body);
    }

    const timezone = resolveTimezone(value.timezone);
    const result = await pool.query(
      `UPDATE users SET
         age = $2,
         country_code = $3,
         is_minor = $4,
         parental_consent_required = $5,
         parental_consent_given = $6,
         parental_consent_at = CASE WHEN $6 THEN NOW() ELSE NULL END,
         profile_private = $7,
         leaderboard_opt_out = $8,
         leaderboard_segment = $9,
         timezone = COALESCE($10, timezone)
       WHERE uuid = $1::uuid
       RETURNING *`,
      [
        req.user.uuid,
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

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    return res.json({ profile: profileFromRow(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
};

// ── POST /parental-consent ───────────────────────────────────
// PUBLIC. The parent lands here from the emailed link and approves. Verifies the
// consent token (signature, type, expiry), then flips the account to consented and
// lifts the leaderboard restriction. Idempotent: approving an already-approved account
// is a success, not an error.
const parentalConsent = async (req, res, next) => {
  try {
    const { error, value } = consentTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Kërkesa është e pavlefshme.' });
    }

    let payload;
    try {
      payload = verifyConsentToken(value.token);
    } catch {
      return res.status(400).json({ message: 'Lidhja e pëlqimit është e pavlefshme ose ka skaduar.', code: 'CONSENT_TOKEN_INVALID' });
    }

    const userResult = await pool.query(
      'SELECT uuid, parental_consent_given FROM users WHERE uuid = $1::uuid',
      [payload.user_uuid]
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Llogaria nuk u gjet.', code: 'CONSENT_USER_NOT_FOUND' });
    }
    if (userResult.rows[0].parental_consent_given) {
      return res.json({ success: true, alreadyGranted: true });
    }

    await pool.query(
      `UPDATE users
         SET parental_consent_given = true,
             parental_consent_at = NOW(),
             parental_consent_method = 'email_token',
             leaderboard_opt_out = false
       WHERE uuid = $1::uuid`,
      [payload.user_uuid]
    );
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
};

// ── POST /withdraw-consent ───────────────────────────────────
// PUBLIC (GDPR: consent is withdrawable). Uses the SAME emailed consent token as the
// approval link — the ConsentLanding page offers "Withdraw" alongside "Approve". Re-
// restricts the account (consent cleared, back off the leaderboard). After the token's
// 7-day expiry a parent must request a fresh link (via the child's /resend-consent).
const withdrawConsent = async (req, res, next) => {
  try {
    const { error, value } = consentTokenSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Kërkesa është e pavlefshme.' });
    }

    let payload;
    try {
      payload = verifyConsentToken(value.token);
    } catch {
      return res.status(400).json({ message: 'Lidhja e pëlqimit është e pavlefshme ose ka skaduar.', code: 'CONSENT_TOKEN_INVALID' });
    }

    const userResult = await pool.query('SELECT uuid FROM users WHERE uuid = $1::uuid', [payload.user_uuid]);
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Llogaria nuk u gjet.', code: 'CONSENT_USER_NOT_FOUND' });
    }

    await pool.query(
      `UPDATE users
         SET parental_consent_given = false,
             parental_consent_at = NULL,
             parental_consent_method = NULL,
             leaderboard_opt_out = true
       WHERE uuid = $1::uuid`,
      [payload.user_uuid]
    );
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
};

// ── POST /resend-consent ─────────────────────────────────────
// AUTHENTICATED (the pending user themselves) + rate-limited at the route. Regenerates
// the consent token and re-emails the parent using the stored parent_email.
const resendConsent = async (req, res, next) => {
  try {
    const userResult = await pool.query(
      'SELECT uuid, parent_email, parental_consent_required, parental_consent_given FROM users WHERE uuid = $1::uuid',
      [req.user.uuid]
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const u = userResult.rows[0];
    if (!u.parental_consent_required || u.parental_consent_given) {
      return res.status(400).json({ message: 'Nuk ka pëlqim në pritje për këtë llogari.', code: 'NO_PENDING_CONSENT' });
    }
    if (!u.parent_email) {
      return res.status(400).json({ message: 'Email-i i prindit mungon.', code: 'PARENT_EMAIL_MISSING' });
    }

    const { parentEmailHint } = await sendParentalConsentEmail(u.uuid, u.parent_email);
    return res.json({ sent: true, parentEmailHint });
  } catch (err) {
    return next(err);
  }
};

module.exports = { register, login, me, guestUpgrade, heartbeat, consentCheck, refresh, logout, googleAuth, completeProfile, deleteAccount, parentalConsent, withdrawConsent, resendConsent };
