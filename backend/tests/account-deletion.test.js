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
const { deleteUserData } = require('../src/utils/deleteUser');
const { applySubscriptionEvent } = require('../src/controllers/billingController');
const { signCheckoutUser } = require('../src/utils/paddle');

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

function suffix() {
  return Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a');
}

async function registerUser() {
  const s = suffix();
  const email = `del_${s}@example.com`;
  const password = 'testpass123';
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { username: `del_${s}`, email, password, age: 25, country_code: 'US' },
  });
  assert.equal(res.status, 201);
  return { email, password, token: res.data.token, uuid: res.data.profile.uuid };
}

async function countRows(uuid) {
  const [users, stats, ent] = await Promise.all([
    pool.query('SELECT 1 FROM users WHERE uuid = $1::uuid', [uuid]),
    pool.query('SELECT 1 FROM user_stats WHERE user_id = $1::uuid', [uuid]),
    pool.query('SELECT 1 FROM entitlements WHERE user_id = $1::uuid', [uuid]),
  ]);
  return { users: users.rows.length, stats: stats.rows.length, entitlements: ent.rows.length };
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

test('wrong password does not delete the account (401)', async () => {
  const user = await registerUser();

  const res = await api('/api/auth/account', {
    method: 'DELETE',
    token: user.token,
    body: { password: 'not-the-password' },
  });
  assert.equal(res.status, 401);

  const rows = await countRows(user.uuid);
  assert.equal(rows.users, 1, 'user row must survive a failed identity check');

  // cleanup
  await deleteUserData(pool, user.uuid);
});

test('unauthenticated deletion is rejected (401)', async () => {
  const res = await api('/api/auth/account', { method: 'DELETE', body: { password: 'x' } });
  assert.equal(res.status, 401);
});

test('correct password erases the account and blocks re-login', async () => {
  const user = await registerUser();

  const before = await countRows(user.uuid);
  assert.deepEqual(before, { users: 1, stats: 1, entitlements: 1 });

  const del = await api('/api/auth/account', {
    method: 'DELETE',
    token: user.token,
    body: { password: user.password },
  });
  assert.equal(del.status, 200);

  const after = await countRows(user.uuid);
  assert.deepEqual(after, { users: 0, stats: 0, entitlements: 0 }, 'owned rows must cascade away');

  const relogin = await api('/api/auth/login', {
    method: 'POST',
    body: { email: user.email, password: user.password },
  });
  assert.equal(relogin.status, 401, 'a deleted user can no longer log in');

  // A PII-free tombstone is retained in the audit trail (a legal record).
  const tomb = await pool.query(
    `SELECT admin_user_id, target_id FROM admin_audit_log
     WHERE action = 'account.self_delete' ORDER BY created_at DESC LIMIT 1`,
  );
  assert.equal(tomb.rows.length, 1);
  assert.equal(tomb.rows[0].admin_user_id, null, 'tombstone holds no user reference');
  assert.notEqual(tomb.rows[0].target_id, user.uuid, 'identifier is hashed, not the raw uuid');
});

test('shared deleteUserData also backs admin deletion', async () => {
  const user = await registerUser();
  const deleted = await deleteUserData(pool, user.uuid);
  assert.equal(deleted.email, user.email);
  const rows = await countRows(user.uuid);
  assert.deepEqual(rows, { users: 0, stats: 0, entitlements: 0 });
});

test('a Paddle webhook for a deleted user is acknowledged, not 500 (real DB)', async () => {
  const user = await registerUser();
  await deleteUserData(pool, user.uuid);

  const subscription = {
    id: 'sub_del_test',
    customer_id: 'ctm_del_test',
    status: 'active',
    custom_data: {
      user_uuid: user.uuid,
      checkout_signature: signCheckoutUser(user.uuid, process.env.PADDLE_CHECKOUT_SECRET),
    },
    current_billing_period: { ends_at: new Date(Date.now() + 1_000_000_000).toISOString() },
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const outcome = await applySubscriptionEvent(
      client,
      'subscription.updated',
      subscription,
      new Date().toISOString(),
    );
    await client.query('COMMIT');
    assert.deepEqual(outcome, { applied: false, reason: 'unknown_user' });
  } finally {
    client.release();
  }

  const ent = await pool.query('SELECT 1 FROM entitlements WHERE user_id = $1::uuid', [user.uuid]);
  assert.equal(ent.rows.length, 0, 'no entitlement is resurrected for a deleted user');
});
