// FEAT-1 — Word of the Day popularity selection.
//
// Proves: word-detail fetch increments word_access_daily (single upsert, counts only);
// with ZERO access data the cron picks exactly the old deterministic date-hash word;
// with seeded access rows yesterday's most-accessed word wins; an admin's manual pick
// still wins (ON CONFLICT DO NOTHING); and a word shown in the last 30 days is excluded
// from popularity so the surface rotates.
//
// Needs a live LOCAL Postgres (db-guard.js) with migrations + seed — what CI provisions.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}
process.env.NODE_ENV = 'test';
process.env.CRON_SECRET = 'test-cron-secret'; // authorizeCron reads this at request time

require('./db-guard');
const pool = require('../src/utils/db');
const app = require('../server');

let server;
let baseUrl;

async function api(pathname, { method = 'GET', headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

const runCron = () =>
  api('/api/cron/daily', { method: 'POST', headers: { 'x-cron-secret': 'test-cron-secret' } });

// Eligible = the exact set the cron considers (word_type 'replace' WITH a definition).
async function eligibleIds() {
  const { rows } = await pool.query(
    `SELECT w.id FROM words w
      WHERE w.word_type = 'replace'
        AND EXISTS (SELECT 1 FROM definitions d WHERE d.word_id = w.id)
      ORDER BY w.id`
  );
  return rows.map((r) => r.id);
}

// The deterministic date-hash pick — a copy of the cron's fallback, to assert parity.
async function fallbackPick() {
  const { rows } = await pool.query(
    `WITH eligible AS (
       SELECT w.id FROM words w
        WHERE w.word_type = 'replace'
          AND EXISTS (SELECT 1 FROM definitions d WHERE d.word_id = w.id)
     )
     SELECT id FROM (
       SELECT e.id, row_number() OVER (ORDER BY e.id) - 1 AS rn, count(*) OVER () AS total
       FROM eligible e
     ) ranked
     WHERE total > 0 AND rn = ((hashtext(CURRENT_DATE::text) % total) + total) % total`
  );
  return rows[0]?.id ?? null;
}

const todaysWotd = async () => {
  const { rows } = await pool.query(
    'SELECT word_id FROM word_of_the_day WHERE display_date = CURRENT_DATE'
  );
  return rows[0]?.word_id ?? null;
};

// Clean slate for a cron run: no WOTD history, no access rows.
async function reset() {
  await pool.query('DELETE FROM word_access_daily');
  await pool.query('DELETE FROM word_of_the_day');
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

beforeEach(reset);

test('instrumentation: a word-detail fetch upserts word_access_daily (counts only)', async () => {
  const [id] = await eligibleIds();
  const r1 = await api(`/api/words/${id}`);
  assert.equal(r1.status, 200);
  assert.equal(r1.data.word.id, id, 'fetch still returns the word unchanged');

  await api(`/api/words/${id}`); // second hit

  const { rows } = await pool.query(
    'SELECT views FROM word_access_daily WHERE word_id = $1 AND day = CURRENT_DATE',
    [id]
  );
  assert.equal(rows.length, 1, 'exactly one (word_id, day) row');
  assert.equal(rows[0].views, 2, 'two fetches => views = 2');
});

test('zero access data: cron picks exactly the deterministic date-hash word (parity)', async () => {
  const expected = await fallbackPick();
  assert.ok(expected, 'seed must yield at least one eligible word');

  const res = await runCron();
  assert.equal(res.status, 200);
  assert.equal(await todaysWotd(), expected, 'no access data => identical to the old behavior');
});

test('seeded access rows: yesterday\'s most-accessed eligible word wins', async () => {
  const ids = await eligibleIds();
  const fallback = await fallbackPick();
  // Pick a popular word that is NOT the fallback, so a win proves popularity overrode it.
  const popular = ids.find((id) => id !== fallback);
  assert.ok(popular, 'need a second eligible word');

  await pool.query(
    'INSERT INTO word_access_daily (word_id, day, views) VALUES ($1, CURRENT_DATE - 1, 50)',
    [popular]
  );

  const res = await runCron();
  assert.equal(res.status, 200);
  assert.equal(await todaysWotd(), popular, 'the popular word should win over the date-hash pick');
  assert.notEqual(popular, fallback, 'sanity: the winner really differs from the fallback');
});

test('admin manual pick still wins (ON CONFLICT DO NOTHING)', async () => {
  const ids = await eligibleIds();
  const popular = ids[0];
  const manual = ids.find((id) => id !== popular);
  assert.ok(manual, 'need a second eligible word');

  // A popular word that would otherwise win…
  await pool.query(
    'INSERT INTO word_access_daily (word_id, day, views) VALUES ($1, CURRENT_DATE - 1, 99)',
    [popular]
  );
  // …but an admin already set today's word manually.
  await pool.query(
    'INSERT INTO word_of_the_day (word_id, display_date) VALUES ($1, CURRENT_DATE)',
    [manual]
  );

  const res = await runCron();
  assert.equal(res.status, 200);
  assert.equal(await todaysWotd(), manual, 'the admin pick must survive the cron');
});

test('rotation: a word shown in the last 30 days is excluded from popularity', async () => {
  const ids = await eligibleIds();
  const fallback = await fallbackPick();
  const popular = ids.find((id) => id !== fallback);
  assert.ok(popular, 'need a second eligible word');

  // Popular yesterday, but already shown 5 days ago → must be skipped, so the cron
  // falls back to the deterministic pick (the only other candidate has no access data).
  await pool.query(
    'INSERT INTO word_access_daily (word_id, day, views) VALUES ($1, CURRENT_DATE - 1, 77)',
    [popular]
  );
  await pool.query(
    'INSERT INTO word_of_the_day (word_id, display_date) VALUES ($1, CURRENT_DATE - 5)',
    [popular]
  );

  const res = await runCron();
  assert.equal(res.status, 200);
  const chosen = await todaysWotd();
  assert.notEqual(chosen, popular, 'a recently-shown word must not be re-picked by popularity');
  assert.equal(chosen, fallback, 'with the popular word excluded, the deterministic fallback wins');
});
