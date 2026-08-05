// SAFE-3 — parental consent must gate ONLY the features that create cross-user contact.
//
// The gate a user actually experiences is in the frontend (App.jsx renders the waiting
// notice in place of Miqtë/Bisedat), but the frontend is not the boundary. These tests
// pin the boundary itself: a consent-pending minor is free to use the learning product,
// and is refused exactly at friends and messages. If someone later re-broadens the gate
// — or quietly drops it from chat/friends — one of these fails.
//
// SAFE-3 changed no backend code. This file documents and locks the behavior it relies on.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}
process.env.PADDLE_CHECKOUT_SECRET = process.env.PADDLE_CHECKOUT_SECRET || 'test-checkout-secret';

require('./db-guard');
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

function suffix() {
  return Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a');
}

// age 13 + DE (k-age 16) => is_minor AND consent-pending. Premium via complimentary_until
// so the premium-gated social routes are reachable and we are testing the CONSENT gate
// rather than the paywall.
async function registerConsentPendingMinor() {
  const s = suffix();
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `cs_${s}`,
      email: `cs_${s}@example.com`,
      password: 'testpass123',
      age: 13,
      country_code: 'DE',
      parent_email: `parent_${s}@example.com`,
    },
  });
  assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.data)}`);
  assert.equal(res.data.pendingParentalConsent, true, 'fixture must be consent-pending');

  await pool.query(
    `UPDATE users SET complimentary_until = now() + interval '1 day' WHERE uuid = $1::uuid`,
    [res.data.profile.uuid]
  );
  return { token: res.data.token, uuid: res.data.profile.uuid, username: `cs_${s}` };
}

const setConsent = (uuid, given) => pool.query(
  `UPDATE users SET parental_consent_given = $2 WHERE uuid = $1::uuid`,
  [uuid, given]
);

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

// ── The learning product stays open ─────────────────────────────────────────
test('a consent-pending minor can use the whole learning product', async () => {
  const kid = await registerConsentPendingMinor();

  // One assertion per surface the task lists, so a failure names the broken one.
  const surfaces = [
    ['GET', '/api/lessons', undefined, 'lessons + roadmap progress'],
    ['GET', '/api/lessons/first', undefined, 'first lesson (the roadmap CTA)'],
    ['GET', '/api/words/word-of-the-day', undefined, 'word of the day'],
    ['GET', '/api/public/origins', undefined, 'origins'],
    ['GET', `/api/profile/${kid.uuid}`, undefined, 'own profile page'],
    ['GET', '/api/leaderboard', undefined, 'leaderboard'],
  ];

  for (const [method, route, body, label] of surfaces) {
    const res = await api(route, { method, token: kid.token, body });
    assert.ok(
      res.status < 400,
      `${label} (${route}) must stay open to a consent-pending minor, got ${res.status}`
    );
  }

  // Editing their own profile works.
  const profile = await api('/api/profile', {
    method: 'PUT',
    token: kid.token,
    body: { bio: 'une mesoj shqip' },
  });
  assert.ok(profile.status < 400, `profile edit must work, got ${profile.status}`);

  // And the core loop — starting a quiz — behaves for them exactly as it does for an
  // approved account. Compared against a consented control rather than asserting a bare
  // 2xx, because quiz availability also depends on how much content the database holds:
  // a thin test DB answers 503 NOT_ENOUGH_CONTENT to everyone, which says nothing about
  // consent. Identical statuses prove consent is not the differentiator.
  const control = await registerConsentPendingMinor();
  await setConsent(control.uuid, true);

  const kidQuiz = await api('/api/progress/quiz/start', { method: 'POST', token: kid.token, body: {} });
  const controlQuiz = await api('/api/progress/quiz/start', { method: 'POST', token: control.token, body: {} });

  assert.notEqual(kidQuiz.data.code, 'PARENTAL_CONSENT_PENDING', 'quiz must never be refused for consent');
  assert.equal(
    kidQuiz.status,
    controlQuiz.status,
    `consent-pending and approved accounts must get the same quiz response `
      + `(pending ${kidQuiz.status} vs approved ${controlQuiz.status})`
  );
});

// ── Contact features are refused ────────────────────────────────────────────
test('a consent-pending minor is refused at friends and messages', async () => {
  const kid = await registerConsentPendingMinor();
  const peer = await registerConsentPendingMinor();
  await setConsent(peer.uuid, true); // a normal peer to aim at

  const request = await api('/api/friends/request', {
    method: 'POST',
    token: kid.token,
    body: { recipient_username: peer.username },
  });
  assert.equal(request.status, 403, 'friend request must be refused');
  assert.equal(request.data.code, 'PARENTAL_CONSENT_PENDING');

  const send = await api('/api/chat/message', {
    method: 'POST',
    token: kid.token,
    body: { recipient_username: peer.username, message_type: 'preset', body: 'Tung!' },
  });
  assert.equal(send.status, 403, 'sending a message must be refused');
  assert.equal(send.data.code, 'PARENTAL_CONSENT_PENDING');

  const read = await api(`/api/chat/with/${peer.username}`, { token: kid.token });
  assert.equal(read.status, 403, 'reading a thread must be refused');
  assert.equal(read.data.code, 'PARENTAL_CONSENT_PENDING');
});

// ── Approval opens them with no other change ────────────────────────────────
test('parental approval immediately opens friends and messages', async () => {
  const kid = await registerConsentPendingMinor();
  const peer = await registerConsentPendingMinor();
  await setConsent(peer.uuid, true);

  const before = await api('/api/friends/request', {
    method: 'POST',
    token: kid.token,
    body: { recipient_username: peer.username },
  });
  assert.equal(before.status, 403);

  // What POST /auth/parental-consent ultimately does.
  await setConsent(kid.uuid, true);

  const after = await api('/api/friends/request', {
    method: 'POST',
    token: kid.token,
    body: { recipient_username: peer.username },
  });
  assert.equal(after.status, 201, 'the same token must now work — no re-login required');

  const read = await api(`/api/chat/with/${peer.username}`, { token: kid.token });
  assert.notEqual(read.data.code, 'PARENTAL_CONSENT_PENDING', 'chat must no longer cite consent');
});

// ── Withdrawal re-engages the gate ──────────────────────────────────────────
test('withdrawing consent re-engages the gate on the same flags', async () => {
  const kid = await registerConsentPendingMinor();
  const peer = await registerConsentPendingMinor();
  await setConsent(peer.uuid, true);
  await setConsent(kid.uuid, true);

  const allowed = await api('/api/friends/request', {
    method: 'POST',
    token: kid.token,
    body: { recipient_username: peer.username },
  });
  assert.equal(allowed.status, 201);

  // FRIENDS-1: consent can be withdrawn after friendships already exist.
  await setConsent(kid.uuid, false);

  const refused = await api('/api/chat/message', {
    method: 'POST',
    token: kid.token,
    body: { recipient_username: peer.username, message_type: 'preset', body: 'Tung!' },
  });
  assert.equal(refused.status, 403, 'withdrawal must close messaging again');
  assert.equal(refused.data.code, 'PARENTAL_CONSENT_PENDING');

  // ...while the learning product stays open throughout.
  const lessons = await api('/api/lessons', { token: kid.token });
  assert.ok(lessons.status < 400, 'withdrawal must not lock the learning product');
});
