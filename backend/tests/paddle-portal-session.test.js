// PAY-4 — customer portal sessions.
//
// The outbound Paddle call is stubbed at global.fetch, so these run with no network and
// no real key. What matters here is the contract around that call: the right URL for the
// environment, the key only ever in the Authorization header, and every failure mode
// answered explicitly rather than crashing or leaking.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres@localhost:5432/fjalingo_test';
process.env.PADDLE_CHECKOUT_SECRET = 'test-checkout-secret';
require('./db-guard');

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const USER_UUID = '00000000-0000-4000-8000-000000000009';
const API_KEY = 'pdl_sdbx_apikey_do_not_leak_me';

// Stub the db module before the controller requires it, so no connection is opened.
let nextEntitlementRow = { paddle_customer_id: 'ctm_123', paddle_subscription_id: 'sub_123' };
const originalLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request === '../utils/db' || request === '../src/utils/db') {
    return { query: async () => ({ rows: nextEntitlementRow ? [nextEntitlementRow] : [] }) };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { createPortalSession } = require('../src/controllers/billingController');
Module._load = originalLoad;

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.PADDLE_API_KEY;
  delete process.env.PADDLE_ENVIRONMENT;
  nextEntitlementRow = { paddle_customer_id: 'ctm_123', paddle_subscription_id: 'sub_123' };
});

function stubRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function capture() {
  const seen = [];
  return { next: (err) => seen.push(err), errors: seen };
}

// A realistic success payload, shaped exactly like Paddle's documented response:
// data.urls.general.overview + data.urls.subscriptions[].{id, cancel_subscription,
// update_subscription_payment_method}.
function sessionPayload(subscriptionId = 'sub_123') {
  return {
    data: {
      id: 'cpls_123',
      customer_id: 'ctm_123',
      urls: {
        general: { overview: 'https://portal.paddle.com/overview?token=abc' },
        subscriptions: [
          {
            id: subscriptionId,
            cancel_subscription: 'https://portal.paddle.com/cancel?token=abc',
            update_subscription_payment_method: 'https://portal.paddle.com/pay?token=abc',
          },
        ],
      },
    },
  };
}

function stubFetch(impl) {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return impl(url, options);
  };
  return calls;
}

const ok = (payload) => async () => ({ ok: true, status: 200, json: async () => payload });

const run = async () => {
  const res = stubRes();
  const { next, errors } = capture();
  await createPortalSession({ user: { uuid: USER_UUID } }, res, next);
  return { res, errors };
};

// ── Happy path ──────────────────────────────────────────────────────────────
test('returns only the portal urls, and asks Paddle for our subscription deep links', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  process.env.PADDLE_ENVIRONMENT = 'sandbox';
  const calls = stubFetch(ok(sessionPayload()));

  const { res, errors } = await run();

  assert.deepEqual(errors, []);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    urls: {
      overview: 'https://portal.paddle.com/overview?token=abc',
      cancel: 'https://portal.paddle.com/cancel?token=abc',
      updatePaymentMethod: 'https://portal.paddle.com/pay?token=abc',
    },
  });

  // Deep links are only returned for ids we ask about.
  const [call] = calls;
  assert.deepEqual(JSON.parse(call.options.body), { subscription_ids: ['sub_123'] });
  assert.equal(call.options.method, 'POST');
});

test('picks the entry matching OUR subscription, not merely the first one', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  const payload = sessionPayload();
  payload.data.urls.subscriptions.unshift({
    id: 'sub_someone_else',
    cancel_subscription: 'https://portal.paddle.com/WRONG',
    update_subscription_payment_method: 'https://portal.paddle.com/WRONG',
  });
  stubFetch(ok(payload));

  const { res } = await run();
  assert.equal(res.body.urls.cancel, 'https://portal.paddle.com/cancel?token=abc');
  assert.ok(!JSON.stringify(res.body).includes('WRONG'));
});

// ── The API key must never escape ───────────────────────────────────────────
test('the api key goes only in the Authorization header, never in the response', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  const calls = stubFetch(ok(sessionPayload()));

  const { res } = await run();

  assert.equal(calls[0].options.headers.Authorization, `Bearer ${API_KEY}`);
  assert.ok(
    !JSON.stringify(res.body).includes(API_KEY),
    'the key must not appear anywhere in the client response'
  );
  // Nor Paddle's raw payload (customer ids, session metadata).
  assert.deepEqual(Object.keys(res.body), ['urls']);
});

// ── Environment routing ─────────────────────────────────────────────────────
test('calls the sandbox or production base url per PADDLE_ENVIRONMENT', async () => {
  for (const [env, expected] of [
    ['sandbox', 'https://sandbox-api.paddle.com'],
    ['production', 'https://api.paddle.com'],
  ]) {
    process.env.PADDLE_API_KEY = API_KEY;
    process.env.PADDLE_ENVIRONMENT = env;
    const calls = stubFetch(ok(sessionPayload()));

    await run();
    assert.equal(calls[0].url, `${expected}/customers/ctm_123/portal-sessions`);
  }
});

// ── Failure modes, each answered explicitly ─────────────────────────────────
test('unset PADDLE_API_KEY returns 503 without calling Paddle', async () => {
  let called = false;
  stubFetch(async () => { called = true; return ok(sessionPayload())(); });

  const { res, errors } = await run();

  assert.deepEqual(errors, [], 'must not crash the app');
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'BILLING_NOT_CONFIGURED');
  assert.equal(called, false, 'no outbound call without a key');
});

test('a user with no paddle_customer_id gets a clean 4xx', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  nextEntitlementRow = { paddle_customer_id: null, paddle_subscription_id: null };
  let called = false;
  stubFetch(async () => { called = true; return ok(sessionPayload())(); });

  const { res, errors } = await run();

  assert.deepEqual(errors, []);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'NO_PADDLE_CUSTOMER');
  assert.equal(called, false);
});

test('no entitlement row at all is the same clean 4xx, not a crash', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  nextEntitlementRow = null;

  const { res, errors } = await run();
  assert.deepEqual(errors, []);
  assert.equal(res.statusCode, 409);
});

test('a network failure becomes 502, not a 500', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  stubFetch(async () => { throw new Error('ECONNREFUSED'); });

  const { res, errors } = await run();

  assert.deepEqual(errors, [], 'handled here, never bubbled to the error handler');
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'PADDLE_UNREACHABLE');
});

test('a 4xx from Paddle becomes 502 and leaks nothing of Paddle’s body', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  stubFetch(async () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: { code: 'entity_not_found', detail: 'customer ctm_123 not found' } }),
  }));

  const { res, errors } = await run();

  assert.deepEqual(errors, []);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'PADDLE_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('ctm_123'));
  assert.ok(!JSON.stringify(res.body).includes('entity_not_found'));
});

test('a 2xx with no usable urls is treated as a failure, not an empty success', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  stubFetch(ok({ data: { urls: {} } }));

  const { res } = await run();
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'PADDLE_ERROR');
});

test('a subscription with no matching deep link still returns the overview link', async () => {
  process.env.PADDLE_API_KEY = API_KEY;
  // Paddle returned the session but no entry for our id (e.g. fully canceled).
  stubFetch(ok({ data: { urls: { general: { overview: 'https://portal.paddle.com/o?token=x' }, subscriptions: [] } } }));

  const { res } = await run();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.urls.overview, 'https://portal.paddle.com/o?token=x');
  assert.equal(res.body.urls.cancel, null);
  assert.equal(res.body.urls.updatePaymentMethod, null);
});
