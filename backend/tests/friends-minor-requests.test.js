// FRIENDS-1: minors may send each other friend requests by exact username, while their
// profiles stay private everywhere else. These tests pin the four boundary cases from the
// task's acceptance criteria plus the end-to-end accept/list chain, so a future change
// that re-blocks minor pairs — or that widens the opening to adults — fails loudly.
//
// Why this is safe to allow at all: chatController.validateMessageBody only returns ok
// for message_type 'text' when involvesMinor === false, and involvesMinor is true if
// EITHER party is a minor (chatController.js:123). A minor pair is therefore
// preset/emoji-only at the chat layer regardless of what friendship allows.
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

// Friends routes sit behind requirePremium. Complimentary access is the cheapest honest
// way to satisfy it (entitlements.js reads users.complimentary_until first) and keeps
// these tests about child safety rather than billing.
async function grantPremium(uuid) {
  await pool.query(
    `UPDATE users SET complimentary_until = now() + interval '1 day' WHERE uuid = $1::uuid`,
    [uuid]
  );
}

/**
 * age 15 + US  -> is_minor, no consent required (US k-age is 13), profile_private=true
 * age 13 + DE  -> is_minor AND consent-pending (DE k-age is 16)
 * age 25 + US  -> adult, profile_private=false
 * See authController.buildChildSafetyFields + utils/childSafety GDPR_K_AGE_BY_COUNTRY.
 */
async function registerUser({ age, country = 'US', parentEmail = null }) {
  const s = suffix();
  const body = {
    username: `fr_${s}`,
    email: `fr_${s}@example.com`,
    password: 'testpass123',
    age,
    country_code: country,
  };
  if (parentEmail) body.parent_email = parentEmail;

  const res = await api('/api/auth/register', { method: 'POST', body });
  assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.data)}`);
  await grantPremium(res.data.profile.uuid);
  return {
    token: res.data.token,
    uuid: res.data.profile.uuid,
    username: body.username,
    pendingParentalConsent: Boolean(res.data.pendingParentalConsent),
  };
}

const minor = () => registerUser({ age: 15, country: 'US' });
const adult = () => registerUser({ age: 25, country: 'US' });
const consentPendingMinor = () =>
  registerUser({ age: 13, country: 'DE', parentEmail: `parent_${suffix()}@example.com` });

const sendRequestTo = (from, toUsername) =>
  api('/api/friends/request', {
    method: 'POST',
    token: from.token,
    body: { recipient_username: toUsername },
  });

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

// ── Case 1: the change itself ────────────────────────────────────────────────
test('minor -> minor friend request succeeds despite both profiles being private', async () => {
  const [a, b] = [await minor(), await minor()];

  const priv = await pool.query(
    'SELECT is_minor, profile_private FROM users WHERE uuid = ANY($1::uuid[])',
    [[a.uuid, b.uuid]]
  );
  assert.equal(priv.rows.length, 2);
  for (const row of priv.rows) {
    assert.equal(row.is_minor, true, 'fixture must actually be a minor');
    assert.equal(row.profile_private, true, 'minor profiles must be private by default');
  }

  const res = await sendRequestTo(a, b.username);
  assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  assert.equal(res.data.request.status, 'pending');
  assert.equal(res.data.request.requester_id, a.uuid);
  assert.equal(res.data.request.recipient_id, b.uuid);
});

// ── Case 2: the adult<->minor wall must not have moved ───────────────────────
test('adult -> minor is still 403, and minor -> adult is still 403', async () => {
  const [grownUp, kid] = [await adult(), await minor()];

  const down = await sendRequestTo(grownUp, kid.username);
  assert.equal(down.status, 403, 'adult must not reach a minor');
  assert.match(down.data.message, /nuk lejohen/);

  const up = await sendRequestTo(kid, grownUp.username);
  assert.equal(up.status, 403, 'minor must not reach an adult');
  assert.match(up.data.message, /nuk lejohen/);
});

// ── Case 3: private adults keep their 404 ────────────────────────────────────
test('adult -> private adult is still an indistinguishable 404', async () => {
  const [sender, target] = [await adult(), await adult()];
  await pool.query('UPDATE users SET profile_private = true WHERE uuid = $1::uuid', [target.uuid]);

  const res = await sendRequestTo(sender, target.username);
  assert.equal(res.status, 404, 'a private adult must stay unreachable');

  // Identical to the response for a username that does not exist at all — the private
  // account is never confirmed to exist.
  const ghost = await sendRequestTo(sender, `nosuchuser_${suffix()}`);
  assert.equal(ghost.status, 404);
  assert.deepEqual(res.data, ghost.data, 'private-profile 404 must match not-found 404 exactly');
});

// ── Case 4: consent-pending is restricted in both directions ─────────────────
test('consent-pending minor cannot send (403 with code) and cannot receive (404)', async () => {
  const pending = await consentPendingMinor();
  assert.equal(pending.pendingParentalConsent, true, 'fixture must actually be consent-pending');

  const state = await pool.query(
    'SELECT parental_consent_required, parental_consent_given FROM users WHERE uuid = $1::uuid',
    [pending.uuid]
  );
  assert.equal(state.rows[0].parental_consent_required, true);
  assert.equal(state.rows[0].parental_consent_given, false);

  const peer = await minor();

  const outbound = await sendRequestTo(pending, peer.username);
  assert.equal(outbound.status, 403, 'restricted account must not send');
  assert.equal(outbound.data.code, 'PARENTAL_CONSENT_PENDING');

  const inbound = await sendRequestTo(peer, pending.username);
  assert.equal(inbound.status, 404, 'restricted account must not be reachable');

  const ghost = await sendRequestTo(peer, `nosuchuser_${suffix()}`);
  assert.deepEqual(inbound.data, ghost.data, 'restricted 404 must not confirm the account exists');
});

// Consent can be withdrawn after a request already exists, so accept re-checks it.
test('accepting is blocked if consent is withdrawn after the request was sent', async () => {
  const [a, b] = [await minor(), await minor()];
  const sent = await sendRequestTo(a, b.username);
  assert.equal(sent.status, 201);

  await pool.query(
    `UPDATE users SET parental_consent_required = true, parental_consent_given = false
     WHERE uuid = $1::uuid`,
    [b.uuid]
  );

  const accept = await api('/api/friends/accept', {
    method: 'POST',
    token: b.token,
    body: { request_id: sent.data.request.id },
  });
  assert.equal(accept.status, 403);
  assert.equal(accept.data.code, 'PARENTAL_CONSENT_PENDING');
});

// ── Item 4: the rest of the chain actually works for a minor pair ────────────
test('minor pair: request -> accept -> both friend lists -> block flow', async () => {
  const [a, b] = [await minor(), await minor()];

  const sent = await sendRequestTo(a, b.username);
  assert.equal(sent.status, 201);
  const requestId = sent.data.request.id;

  // B sees it incoming; A sees it outgoing.
  const bInbox = await api('/api/friends/requests', { token: b.token });
  assert.equal(bInbox.status, 200);
  assert.ok(
    bInbox.data.incoming.some((r) => r.id === requestId && r.username === a.username),
    'recipient must see the pending request'
  );
  const aInbox = await api('/api/friends/requests', { token: a.token });
  assert.ok(aInbox.data.outgoing.some((r) => r.id === requestId), 'sender must see it outgoing');

  const accepted = await api('/api/friends/accept', {
    method: 'POST',
    token: b.token,
    body: { request_id: requestId },
  });
  assert.equal(accepted.status, 200, `accept failed: ${JSON.stringify(accepted.data)}`);
  assert.equal(accepted.data.request.status, 'accepted');

  // Both directions of the friends list resolve.
  const aFriends = await api('/api/friends', { token: a.token });
  assert.ok(aFriends.data.friends.some((f) => f.username === b.username));
  const bFriends = await api('/api/friends', { token: b.token });
  assert.ok(bFriends.data.friends.some((f) => f.username === a.username));

  // Blocking still hides the friendship from the blocker's list.
  const blocked = await api('/api/chat/block', {
    method: 'POST',
    token: a.token,
    body: { target_username: b.username },
  });
  assert.ok([200, 201].includes(blocked.status), `block failed: ${JSON.stringify(blocked.data)}`);

  const aAfterBlock = await api('/api/friends', { token: a.token });
  assert.ok(
    !aAfterBlock.data.friends.some((f) => f.username === b.username),
    'blocked user must drop out of the friends list'
  );
});
