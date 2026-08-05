// LEADERBOARD-2: the 'kids' leaderboard segment is deliberately disabled while minors
// are listed by their real username and FRIENDS-1 makes those usernames friend-
// requestable ("no path from leaderboard to private contact", root CLAUDE.md).
//
// These tests pin BOTH halves: the kids segment answers deliberately (not an error, not
// a silently empty board), and the adults segment is completely unaffected. If someone
// re-enables kids without shipping a non-friend-requestable display alias first, the
// first test fails and explains why.
//
// LEADERBOARD-3 added the open-ranking tests at the bottom. The two rules are unrelated
// and must not be collapsed: kids-off is a child-safety gate, open ranking is a
// monetization decision. They share a file only because they share these fixtures.
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
const { USER_RANK_SQL } = require('../src/utils/rankSql');
const app = require('../server');

let server;
let baseUrl;
// Fixtures are torn down after the run. They used to be left behind, which was tolerable
// while every fixture sat at the same xp; the free-ranking test below deliberately puts
// one account above the whole board, so leaking them would raise the top-10 cut-off a
// little on every run until the other tests' xp=500 accounts fell off the board.
const createdUuids = [];

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
//
// LEADERBOARD-3: ranking no longer depends on entitlements at all, so these fixtures
// stay free by default — the only thing a user needs to be rankable is a stats row with
// xp. `premium: true` still exists so the premium path keeps being exercised alongside
// the free one; it must produce the same ranking behaviour, not a better one.
async function registerUser(age, { premium = false } = {}) {
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
  if (premium) {
    await pool.query(
      `UPDATE entitlements
       SET tier = 'premium', status = 'active', current_period_end = now() + interval '30 days'
       WHERE user_id = $1::uuid`,
      [data.profile.uuid]
    );
  }
  // Ranking joins user_stats; give this account non-zero xp so it sorts onto the board.
  await pool.query(
    `UPDATE user_stats SET xp = 500, level = 3, streak = 2 WHERE user_id = $1::uuid`,
    [data.profile.uuid]
  );
  createdUuids.push(data.profile.uuid);
  return { token: data.token, uuid: data.profile.uuid, username: `lb_${s}` };
}

before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  // user_stats and entitlements are ON DELETE CASCADE from users(uuid).
  if (createdUuids.length) {
    await pool.query(`DELETE FROM users WHERE uuid = ANY($1::uuid[])`, [createdUuids]);
  }
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
  const grownUp = await registerUser(25, { premium: true });

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

// LEADERBOARD-3 — ranking is not a Premium perk. If someone puts the entitlements join
// back into RANKED_USERS_CTE, this fails.
test('a logged-in FREE adult with xp is ranked on the adults board', async () => {
  const freeAdult = await registerUser(25);
  // Put this account strictly above every existing row rather than at a magic constant:
  // fixtures from earlier runs persist in the local DB, and a tie at the same xp could
  // push it out of the LIMIT 10 window. The claim under test is "a free user ranks at
  // all", which must not hinge on how crowded the top 10 happens to be.
  await pool.query(
    `UPDATE user_stats SET xp = (SELECT MAX(xp) + 1000 FROM user_stats) WHERE user_id = $1::uuid`,
    [freeAdult.uuid]
  );

  const ent = await pool.query(
    `SELECT tier, status FROM entitlements WHERE user_id = $1::uuid`,
    [freeAdult.uuid]
  );
  assert.equal(ent.rows[0].tier, 'free', 'fixture must genuinely be on the free tier');

  // Rankability itself, straight from the shared CTE — independent of the top-10 view.
  const ranked = await pool.query(USER_RANK_SQL, [freeAdult.uuid]);
  assert.equal(ranked.rowCount, 1, 'a free user must be present in ranked_users');
  assert.ok(Number(ranked.rows[0].rank) >= 1);

  const res = await api('/api/leaderboard', { token: freeAdult.token });

  assert.equal(res.status, 200);
  assert.equal(res.data.viewer.tier, 'free');
  assert.equal(res.data.viewer.canParticipate, true, 'any logged-in user can be ranked');

  const me = res.data.leaderboard.find((r) => r.username === freeAdult.username);
  assert.ok(me, 'a free adult with xp must appear on the adults board');
  assert.equal(me.rank, 1, 'and with the top xp on the board, at rank 1');
  assert.equal(me.isCurrentUser, true);
});

// The other half of the same rule: viewing stays open to everyone, but an anonymous
// visitor is not on the board and the page must prompt them to register, not to pay.
test('canParticipate tracks having an account, not having Premium', async () => {
  const anon = await api('/api/leaderboard');
  assert.equal(anon.data.viewer.canParticipate, false, 'anonymous viewers must register first');

  const premiumAdult = await registerUser(25, { premium: true });
  const asPremium = await api('/api/leaderboard', { token: premiumAdult.token });
  assert.equal(asPremium.data.viewer.canParticipate, true);
  assert.equal(asPremium.data.viewer.tier, 'premium', 'tier still reports the real plan');
});
