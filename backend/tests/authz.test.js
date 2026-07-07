// SEC-PROBE — authorization test matrix.
//
// Proves the "you must be logged in AND it must be your data" property that is
// otherwise enforced only by convention. Three guarantees, all failing the
// build if broken:
//   1. Every route reachable in the app is CLASSIFIED here. A new, unclassified
//      route fails the suite with "unclassified route" — this is what keeps
//      future endpoints honest (they can't merge without a decision here).
//   2. Every protected route rejects an unauthenticated request (401), admin
//      routes reject a non-admin (403), cron/webhook reject the unauthorized.
//   3. Owner-scoped data does not leak cross-user (a second user's private
//      profile fields never appear; a private profile 404s to a stranger).
//
// If this suite ever goes RED on a real leak rather than a classification gap:
// STOP, report it, and fix the leak as its own PR (per the task).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// This suite hits every route in one process; bypass the rate limiters (server.js
// honours NODE_ENV=test) so the sweep isn't throttled to 429s.
process.env.NODE_ENV = 'test';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}
process.env.PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || 'sandbox';
process.env.PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || 'test-webhook-secret';

require('./db-guard'); // refuse to run against a non-local DB (see db-guard.js)
const pool = require('../src/utils/db');
const app = require('../server');

// ── Mount map: the single source of truth, mirroring server.js. adminCurriculum
// is nested under the admin router (router.use('/curriculum', ...)), listed here
// with its full prefix so it is walked directly. ──
const MOUNTS = [
  { prefix: '/api/public', file: 'public' },
  { prefix: '/api/words', file: 'words' },
  { prefix: '/api/suggestions', file: 'suggestions' },
  { prefix: '/api/auth', file: 'auth' },
  { prefix: '/api/admin', file: 'admin' },
  { prefix: '/api/admin/curriculum', file: 'adminCurriculum' },
  { prefix: '/api/profile', file: 'profile' },
  { prefix: '/api/avatars', file: 'avatars' },
  { prefix: '/api/progress', file: 'progress' },
  { prefix: '/api/lessons', file: 'lessons' },
  { prefix: '/api/quests', file: 'quests' },
  { prefix: '/api/leagues', file: 'leagues' },
  { prefix: '/api/cron', file: 'cron' },
  { prefix: '/api/leaderboard', file: 'leaderboard' },
  { prefix: '/api/friends', file: 'friends' },
  { prefix: '/api/chat', file: 'chat' },
  { prefix: '/api/notifications', file: 'notifications' },
  { prefix: '/api/billing', file: 'billing' },
];

// ── Access levels ──
//  public : reachable without a session (may still 400 on a bad body).
//  auth   : requires a valid session; unauthenticated -> 401.
//  admin  : auth + admin role; unauthenticated -> 401, non-admin -> 403.
//  cron   : shared-secret or admin; unauthorized -> 403.
//  webhook: Paddle signature; missing/invalid signature -> 401.
// `refresh` is public but 401s without a refresh cookie (by design), flagged below.
const ACCESS = {
  // public
  'GET /api/public/stats': 'public',
  'GET /api/public/origins': 'public',
  'GET /api/public/origins/:code': 'public',
  'GET /api/words/search': 'public',
  'GET /api/words/word-of-the-day': 'public',
  'GET /api/words/random': 'public',
  'GET /api/words/popular': 'public',
  'GET /api/words/:id': 'public',
  'POST /api/suggestions': 'public',
  'POST /api/auth/register': 'public',
  'POST /api/auth/consent-check': 'public',
  'POST /api/auth/login': 'public',
  'POST /api/auth/google': 'public',
  'POST /api/auth/guest-upgrade': 'public',
  'POST /api/auth/refresh': 'public',
  'POST /api/auth/logout': 'public',
  'GET /api/avatars': 'public',
  'GET /api/lessons/sample': 'public',
  'POST /api/lessons/sample/grade': 'public',
  'GET /api/leaderboard': 'public',
  'GET /api/profile/:uuid': 'public',

  // authenticated (owner-scoped via req.user — no user id is taken from the path)
  'POST /api/auth/complete-profile': 'auth',
  'GET /api/auth/me': 'auth',
  'POST /api/auth/heartbeat': 'auth',
  'DELETE /api/auth/account': 'auth',
  'PUT /api/profile': 'auth',
  'PUT /api/profile/avatar': 'auth',
  'POST /api/profile/achievements/unlock': 'auth',
  'POST /api/progress/quiz/start': 'auth',
  'POST /api/progress/quiz': 'auth',
  'GET /api/lessons': 'auth',
  'GET /api/lessons/first': 'auth',
  'GET /api/lessons/practice-mistakes/count': 'auth',
  'GET /api/lessons/practice-mistakes': 'auth',
  'GET /api/lessons/:lessonId': 'auth',
  'POST /api/lessons/:lessonId/submit': 'auth',
  'GET /api/quests/today': 'auth',
  'POST /api/quests/today/claim': 'auth',
  'GET /api/leagues/me': 'auth',
  'GET /api/leagues/last-result': 'auth',
  'GET /api/notifications': 'auth',
  'GET /api/billing/checkout-config': 'auth',
  'POST /api/friends/request': 'auth',
  'POST /api/friends/accept': 'auth',
  'POST /api/friends/decline': 'auth',
  'POST /api/friends/cancel': 'auth',
  'GET /api/friends/requests': 'auth',
  'GET /api/friends': 'auth',
  'POST /api/friends/remove': 'auth',
  'GET /api/chat/presets': 'auth',
  'GET /api/chat/with/:username': 'auth',
  'POST /api/chat/message': 'auth',
  'POST /api/chat/block': 'auth',
  'POST /api/chat/report': 'auth',

  // admin
  'GET /api/admin/words': 'admin',
  'POST /api/admin/words': 'admin',
  'PUT /api/admin/words/:id': 'admin',
  'DELETE /api/admin/words/:id': 'admin',
  'POST /api/admin/word-of-the-day': 'admin',
  'GET /api/admin/analytics/top-searches': 'admin',
  'GET /api/admin/metrics': 'admin',
  'GET /api/admin/users': 'admin',
  'GET /api/admin/users/:uuid': 'admin',
  'PATCH /api/admin/users/:uuid': 'admin',
  'DELETE /api/admin/users/:uuid': 'admin',
  'POST /api/admin/users/:uuid/grant-complimentary': 'admin',
  'GET /api/admin/moderation-events': 'admin',
  'POST /api/admin/moderation-events/:id/resolve': 'admin',
  'GET /api/suggestions': 'admin',
  'PUT /api/suggestions/:id/approve': 'admin',
  'PUT /api/suggestions/:id/reject': 'admin',
  'GET /api/admin/curriculum/units': 'admin',
  'GET /api/admin/curriculum/units/:id': 'admin',
  'POST /api/admin/curriculum/units': 'admin',
  'PUT /api/admin/curriculum/units/:id': 'admin',
  'DELETE /api/admin/curriculum/units/:id': 'admin',
  'GET /api/admin/curriculum/lessons': 'admin',
  'GET /api/admin/curriculum/lessons/:id': 'admin',
  'POST /api/admin/curriculum/lessons': 'admin',
  'PUT /api/admin/curriculum/lessons/:id': 'admin',
  'DELETE /api/admin/curriculum/lessons/:id': 'admin',
  'GET /api/admin/curriculum/exercises': 'admin',
  'GET /api/admin/curriculum/exercises/:id': 'admin',
  'POST /api/admin/curriculum/exercises': 'admin',
  'PUT /api/admin/curriculum/exercises/:id': 'admin',
  'DELETE /api/admin/curriculum/exercises/:id': 'admin',

  // special authorizers
  'POST /api/cron/daily': 'cron',
  'POST /api/billing/webhook': 'webhook',
};

// Public routes that legitimately answer 401 without a session (no auth gate, but
// their own logic needs a token/cookie). Excluded from the "public is reachable".
const PUBLIC_401_OK = new Set(['POST /api/auth/refresh']);

const VALID_UUID = '00000000-0000-4000-8000-000000000000';
function concretePath(p) {
  return p.replace(/:uuid\b/g, VALID_UUID).replace(/:[A-Za-z]+/g, '1');
}

function enumerateRoutes() {
  const routes = [];
  for (const { prefix, file } of MOUNTS) {
    const router = require(`../src/routes/${file}`);
    for (const layer of router.stack) {
      if (!layer.route) continue; // middleware / nested router — not a leaf route
      const rel = layer.route.path;
      const full = rel === '/' ? prefix : `${prefix}${rel}`;
      for (const method of Object.keys(layer.route.methods)) {
        if (method === '_all') continue;
        routes.push({ method: method.toUpperCase(), path: full, key: `${method.toUpperCase()} ${full}` });
      }
    }
  }
  return routes;
}

let server;
let baseUrl;
let userAToken;

async function api(method, pathname, { token, json = true } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    body = '{}';
  }
  const response = await fetch(`${baseUrl}${pathname}`, { method, headers, body });
  const data = json ? await response.json().catch(() => ({})) : null;
  return { status: response.status, data };
}

async function registerUser({ age = 25, country = 'US' } = {}) {
  const s = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a');
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `probe_${s}`, email: `probe_${s}@example.com`, password: 'testpass123', age, country_code: country }),
  });
  const data = await res.json().catch(() => ({}));
  assert.equal(res.status, 201, `registration failed: ${JSON.stringify(data)}`);
  return { token: data.token, uuid: data.profile.uuid, email: data.profile.email };
}

before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  userAToken = (await registerUser()).token;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// ── Guarantee 1: the classification table covers exactly the live routes ──
test('every live route is classified (no unclassified or stale routes)', () => {
  const routes = enumerateRoutes();

  const unclassified = routes.filter((r) => !ACCESS[r.key]).map((r) => r.key);
  assert.deepEqual(
    unclassified, [],
    `Unclassified route(s) — add them to ACCESS in authz.test.js:\n  ${unclassified.join('\n  ')}`,
  );

  const live = new Set(routes.map((r) => r.key));
  const stale = Object.keys(ACCESS).filter((k) => !live.has(k));
  assert.deepEqual(stale, [], `Stale ACCESS entries no longer served:\n  ${stale.join('\n  ')}`);
});

// Guard against a whole new route file being mounted without being classified.
test('every route file is represented in the mount map', () => {
  const files = fs.readdirSync(path.join(__dirname, '..', 'src', 'routes'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, ''));
  const mounted = new Set(MOUNTS.map((m) => m.file));
  const missing = files.filter((f) => !mounted.has(f));
  assert.deepEqual(missing, [], `Route file(s) not in MOUNTS (classify them):\n  ${missing.join('\n  ')}`);
});

// ── Guarantee 2: the auth gates hold for every classified route ──
test('unauthenticated requests are rejected on every protected route', async () => {
  for (const [key, level] of Object.entries(ACCESS)) {
    const [method, routePath] = key.split(' ');
    const { status } = await api(method, concretePath(routePath));

    if (level === 'auth' || level === 'admin' || level === 'webhook') {
      assert.equal(status, 401, `${key} must 401 when unauthenticated, got ${status}`);
    } else if (level === 'cron') {
      assert.equal(status, 403, `${key} must 403 without the cron secret, got ${status}`);
    } else if (level === 'public') {
      if (PUBLIC_401_OK.has(key)) {
        assert.equal(status, 401, `${key} expected 401, got ${status}`);
      } else {
        assert.ok(![401, 403].includes(status), `${key} is public but auth-blocked with ${status}`);
      }
    }
  }
});

test('admin routes reject an authenticated non-admin with 403', async () => {
  for (const [key, level] of Object.entries(ACCESS)) {
    if (level !== 'admin') continue;
    const [method, routePath] = key.split(' ');
    const { status } = await api(method, concretePath(routePath), { token: userAToken });
    assert.equal(status, 403, `${key} must 403 for a non-admin, got ${status}`);
  }
});

// ── Guarantee 3: owner-scoped data does not leak across users ──
test('a public profile never exposes another user\'s private fields', async () => {
  const other = await registerUser();
  const { status, data } = await api('GET', `/api/profile/${other.uuid}`, { token: userAToken });
  assert.equal(status, 200);
  for (const leaked of ['email', 'age', 'country_code', 'birth_year', 'password_hash', 'google_sub']) {
    assert.ok(!(leaked in (data.profile || {})), `public profile leaked "${leaked}"`);
  }
  assert.ok(!JSON.stringify(data).includes(other.email), 'public profile response contains the email');
});

test('a private profile 404s to a stranger (no cross-user read)', async () => {
  const other = await registerUser();
  await pool.query('UPDATE users SET profile_private = true WHERE uuid = $1::uuid', [other.uuid]);

  const asStranger = await api('GET', `/api/profile/${other.uuid}`, { token: userAToken });
  assert.equal(asStranger.status, 404, 'a stranger must not read a private profile');

  const anonymous = await api('GET', `/api/profile/${other.uuid}`);
  assert.equal(anonymous.status, 404, 'an anonymous viewer must not read a private profile');
});
