// LEADERBOARD-2: the 'kids' leaderboard segment is deliberately disabled while minors
// are listed by their real username and FRIENDS-1 makes those usernames friend-
// requestable ("no path from leaderboard to private contact", root CLAUDE.md).
//
// These tests pin BOTH halves: the kids segment answers deliberately (not an error, not
// a silently empty board), and the adults segment is completely unaffected. If someone
// re-enables kids without shipping a non-friend-requestable display alias first, the
// first test fails and explains why.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}
process.env.PADDLE_CHECKOUT_SECRET = process.env.PADDLE_CHECKOUT_SECRET || 'test-checkout-secret';

require('./db-guard'); // refuse to run against a non-local DB (see db-guard.js)
const pool = require('../src/utils/db');
const app = require('../server');

let server;
let baseUrl;

async function api(pathname, { token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${pathname}`, { headers });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function suffix() {
  return Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a');
}

// age 15 -> is_minor -> leaderboard_segment 'kids'; age 25 -> 'adults'.
// Ranking needs a real premium entitlements row, not complimentary_until: the middleware
// honors complimentary access, but RANKED_USERS_CTE joins entitlements and requires
// tier='premium' + an active status + a future current_period_end. Set both so the
// viewer is premium to the middleware AND rankable, and the adults board is genuinely
// exercised rather than trivially empty.
async function registerUser(age) {
  const s = suffix();
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `lb_${s}`,
      email: `lb_${s}@example.com`,
      password: 'testpass123',
      age,
      country_code: 'US',
    }),
  });
  const data = await res.json();
  assert.equal(res.status, 201, `register failed: ${JSON.stringify(data)}`);
  await pool.query(
    `UPDATE users SET complimentary_until = now() + interval '1 day' WHERE uuid = $1::uuid`,
    [data.profile.uuid]
  );
  await pool.query(
    `UPDATE entitlements
     SET tier = 'premium', status = 'active', current_period_end = now() + interval '30 days'
     WHERE user_id = $1::uuid`,
    [data.profile.uuid]
  );
  // Ranking also joins user_stats; give this account non-zero xp so it sorts onto the board.
  await pool.query(
    `UPDATE user_stats SET xp = 500, level = 3, streak = 2 WHERE user_id = $1::uuid`,
    [data.profile.uuid]
  );
  return { token: data.token, uuid: data.profile.uuid, username: `lb_${s}` };
}

before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('kids segment answers deliberately: 200 + unavailable flag, never an error', async () => {
  const kid = await registerUser(15);

  const seg = await pool.query('SELECT leaderboard_segment FROM users WHERE uuid = $1::uuid', [kid.uuid]);
  assert.equal(seg.rows[0].leaderboard_segment, 'kids', 'fixture must resolve to the kids segment');

  const res = await api('/api/leaderboard', { token: kid.token });

  assert.equal(res.status, 200, 'must not be an error status — the client swallows errors');
  assert.equal(res.data.unavailable, true, 'must be explicitly flagged, not silently empty');
  assert.equal(res.data.code, 'SEGMENT_TEMPORARILY_UNAVAILABLE');
  assert.equal(res.data.segment, 'kids', 'must report the real segment, not fall back to adults');
  assert.deepEqual(res.data.leaderboard, []);
  assert.ok(res.data.viewer, 'viewer block must survive so the page still renders');
});

test('a minor is never listed by username to anyone, including other minors', async () => {
  const [kidA, kidB] = [await registerUser(15), await registerUser(15)];

  for (const viewer of [kidA, kidB]) {
    const res = await api('/api/leaderboard', { token: viewer.token });
    const names = (res.data.leaderboard || []).map((r) => r.username);
    assert.deepEqual(names, [], 'no usernames may be returned on the kids board');
    assert.ok(!names.includes(kidA.username) && !names.includes(kidB.username));
  }
});

test('adults segment is completely unaffected', async () => {
  const grownUp = await registerUser(25);

  const seg = await pool.query('SELECT leaderboard_segment FROM users WHERE uuid = $1::uuid', [grownUp.uuid]);
  assert.equal(seg.rows[0].leaderboard_segment, 'adults');

  const res = await api('/api/leaderboard', { token: grownUp.token });

  assert.equal(res.status, 200);
  assert.equal(res.data.segment, 'adults');
  assert.equal(res.data.unavailable, undefined, 'adults must not carry the unavailable flag');
  assert.equal(res.data.code, undefined);
  assert.ok(Array.isArray(res.data.leaderboard));
  // The querying path must actually run for adults: this viewer is premium and has a
  // stats row, so they rank themselves.
  assert.ok(
    res.data.leaderboard.some((r) => r.username === grownUp.username),
    'a premium adult must still appear on the adults board'
  );
});

test('anonymous viewers still get the adults board', async () => {
  const res = await api('/api/leaderboard');
  assert.equal(res.status, 200);
  assert.equal(res.data.segment, 'adults');
  assert.equal(res.data.unavailable, undefined);
});
