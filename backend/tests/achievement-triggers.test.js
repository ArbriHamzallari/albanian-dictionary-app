// FIX-3 — server-side achievement triggers.
//
// Proves each newly-wired trigger actually persists through unlockAchievementByKey,
// server-authoritative, and that the quiz points thresholds do NOT cascade (a
// points_500 unlock's own +XP must not push the same submit past points_1000).
//
// Needs a live LOCAL Postgres (see db-guard.js) with migrations + seed applied —
// exactly what CI provisions. Each test registers a throwaway user, sets up the
// precondition with direct SQL, exercises the real API path, then asserts against
// user_achievements.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}
process.env.NODE_ENV = 'test';

require('./db-guard'); // refuse to run against a non-local DB (see db-guard.js)
const pool = require('../src/utils/db');
const app = require('../server');

let server;
let baseUrl;

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

// Register a fresh throwaway user; returns { token, uuid }.
async function registerUser(tag) {
  const suffix = `${tag}_${Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a')}`;
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `ach_${suffix}`,
      email: `ach_${suffix}@example.com`,
      password: 'testpass123',
      age: 18,
      country_code: 'US',
    },
  });
  assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.data)}`);
  const { rows } = await pool.query('SELECT uuid FROM users WHERE email = $1', [
    `ach_${suffix}@example.com`,
  ]);
  return { token: res.data.token, uuid: rows[0].uuid };
}

async function unlockedKeys(uuid) {
  const { rows } = await pool.query(
    `SELECT a.key
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = $1`,
    [uuid]
  );
  return rows.map((r) => r.key);
}

// Play one quiz and return the submit response (all answers deliberately wrong, so
// grading itself awards 0 XP — the only XP moves come from achievement unlocks).
async function playQuizAllWrong(token) {
  const started = await api('/api/progress/quiz/start', {
    method: 'POST',
    token,
    body: { types: ['translate'] },
  });
  assert.equal(started.status, 200, `start failed: ${JSON.stringify(started.data)}`);
  return api('/api/progress/quiz', {
    method: 'POST',
    token,
    body: {
      sessionId: started.data.sessionId,
      answers: started.data.questions.map((q) => ({ idx: q.idx, answer: `wrong-${q.idx}` })),
    },
  });
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

test('quiz: points_500/1000/5000 all unlock once xp clears each threshold', async () => {
  const { token, uuid } = await registerUser('pts');
  await pool.query('UPDATE user_stats SET xp = 5000 WHERE user_id = $1', [uuid]);

  const submit = await playQuizAllWrong(token);
  assert.equal(submit.status, 200);

  const unlocked = submit.data.achievementsUnlocked;
  assert.ok(unlocked.includes('points_500'), 'points_500 should unlock');
  assert.ok(unlocked.includes('points_1000'), 'points_1000 should unlock');
  assert.ok(unlocked.includes('points_5000'), 'points_5000 should unlock');
});

test('quiz: no cascade — points_500 XP reward does not unlock points_1000 in the same submit', async () => {
  const { token, uuid } = await registerUser('casc');
  // 900 XP: a quiz (0 XP for all-wrong) leaves xp at 900 when the thresholds are
  // evaluated. points_500 fires and awards +100 → live xp becomes ~1000, but the
  // threshold row was captured pre-unlock, so points_1000 must NOT fire here.
  await pool.query('UPDATE user_stats SET xp = 900 WHERE user_id = $1', [uuid]);

  const submit = await playQuizAllWrong(token);
  assert.equal(submit.status, 200);

  const unlocked = submit.data.achievementsUnlocked;
  assert.ok(unlocked.includes('points_500'), 'points_500 should unlock');
  assert.ok(!unlocked.includes('points_1000'), 'points_1000 must NOT cascade');

  // The DB confirms it too: points_1000 has no row for this user.
  assert.ok(!(await unlockedKeys(uuid)).includes('points_1000'));
});

test('quiz: streak_3 unlocks when the streak reaches 3 (and streak_30 does not)', async () => {
  const { token, uuid } = await registerUser('s3');
  // Streak 2, last active yesterday → this quiz makes it 3.
  await pool.query(
    `UPDATE user_stats SET streak = 2, last_quiz_date = (now() AT TIME ZONE 'utc')::date - 1
     WHERE user_id = $1`,
    [uuid]
  );

  const submit = await playQuizAllWrong(token);
  assert.equal(submit.status, 200);
  assert.equal(submit.data.stats.streak, 3);

  const unlocked = submit.data.achievementsUnlocked;
  assert.ok(unlocked.includes('streak_3'), 'streak_3 should unlock');
  assert.ok(!unlocked.includes('streak_30'), 'streak_30 must not unlock at streak 3');
});

test('quiz: streak_30 unlocks when the streak reaches 30', async () => {
  const { token, uuid } = await registerUser('s30');
  await pool.query(
    `UPDATE user_stats SET streak = 29, last_quiz_date = (now() AT TIME ZONE 'utc')::date - 1
     WHERE user_id = $1`,
    [uuid]
  );

  const submit = await playQuizAllWrong(token);
  assert.equal(submit.status, 200);
  assert.equal(submit.data.stats.streak, 30);
  assert.ok(submit.data.achievementsUnlocked.includes('streak_30'), 'streak_30 should unlock');
});

test('search: first_search unlocks on the first authenticated search', async () => {
  const { token, uuid } = await registerUser('fs');
  // A real word so the search returns results (searchWords only logs a found search).
  const { rows } = await pool.query('SELECT borrowed_word FROM words LIMIT 1');
  assert.ok(rows.length, 'seed must provide at least one word');

  const res = await api(`/api/words/search?q=${encodeURIComponent(rows[0].borrowed_word)}`, { token });
  assert.equal(res.status, 200, `search failed: ${JSON.stringify(res.data)}`);

  assert.ok((await unlockedKeys(uuid)).includes('first_search'), 'first_search should unlock');
});

test('search: word_explorer unlocks at 20 distinct searched words', async () => {
  const { token, uuid } = await registerUser('we');

  // Backfill 19 distinct prior searches dated yesterday: they count toward the
  // all-time distinct total but not against today's free 5/day cap.
  const priorTerms = Array.from({ length: 19 }, (_, i) => `explorer_seed_term_${i}`);
  await pool.query(
    `INSERT INTO search_logs (search_term, found, ip_address, user_id, created_at)
     SELECT t, true, '127.0.0.1', $1, now() - interval '1 day'
       FROM unnest($2::text[]) AS t`,
    [uuid, priorTerms]
  );

  // Not yet — only 19 distinct so far.
  assert.ok(!(await unlockedKeys(uuid)).includes('word_explorer'));

  // The 20th distinct word, via the real search path (within today's cap).
  const { rows } = await pool.query('SELECT borrowed_word FROM words LIMIT 1');
  const res = await api(`/api/words/search?q=${encodeURIComponent(rows[0].borrowed_word)}`, { token });
  assert.equal(res.status, 200, `search failed: ${JSON.stringify(res.data)}`);

  assert.ok((await unlockedKeys(uuid)).includes('word_explorer'), 'word_explorer should unlock at 20');
});

test('suggestion: suggester unlocks on a successful submission', async () => {
  const { token, uuid } = await registerUser('sug');

  const res = await api('/api/suggestions', {
    method: 'POST',
    token,
    body: { borrowed_word: 'eksperiencë', suggested_albanian: 'përvojë' },
  });
  assert.equal(res.status, 201, `suggestion failed: ${JSON.stringify(res.data)}`);

  assert.ok((await unlockedKeys(uuid)).includes('suggester'), 'suggester should unlock');
});
