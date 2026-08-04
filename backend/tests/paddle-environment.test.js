// PAY-3 — the Paddle environment gate and the price-id capture.
//
// Deterministic and DB-free, same approach as subscription-lifecycle.test.js:
// applySubscriptionEvent only calls client.query, so a stub client captures what it
// would write; the environment gate is exercised through the real route handlers with
// stub req/res objects.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres@localhost:5432/fjalingo_test';
process.env.PADDLE_CHECKOUT_SECRET = 'test-checkout-secret';
require('./db-guard');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkoutConfig, paddleWebhook, applySubscriptionEvent } = require('../src/controllers/billingController');
const { signCheckoutUser } = require('../src/utils/paddle');

const USER_UUID = '00000000-0000-4000-8000-000000000009';
const OCCURRED_AT = new Date().toISOString();
const future = new Date(Date.now() + 1_000_000_000).toISOString();

// Runs `fn` with PADDLE_ENVIRONMENT set to `value`, then restores it.
async function withEnvironment(value, fn) {
  const previous = process.env.PADDLE_ENVIRONMENT;
  if (value === undefined) delete process.env.PADDLE_ENVIRONMENT;
  else process.env.PADDLE_ENVIRONMENT = value;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.PADDLE_ENVIRONMENT;
    else process.env.PADDLE_ENVIRONMENT = previous;
  }
}

// Captures whatever the handler does without touching Express.
function stubRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

// The handlers call next(err) rather than throwing, so the error surfaces here.
function capture() {
  const seen = [];
  return { next: (err) => seen.push(err), errors: seen };
}

// ── The gate itself ─────────────────────────────────────────────────────────
// Before PAY-3 this threw for 'production', which made live billing impossible while
// DEPLOYMENT.md documented production as a supported value.

test('checkoutConfig: production is accepted and no longer throws', async () => {
  await withEnvironment('production', async () => {
    const res = stubRes();
    const { next, errors } = capture();
    // Deliberately unconfigured Paddle credentials: reaching the 503 proves the gate
    // let us through, without needing a DB or real tokens.
    const previousToken = process.env.PADDLE_CLIENT_TOKEN;
    delete process.env.PADDLE_CLIENT_TOKEN;
    try {
      await checkoutConfig({ user: { uuid: USER_UUID } }, res, next);
    } finally {
      if (previousToken !== undefined) process.env.PADDLE_CLIENT_TOKEN = previousToken;
    }

    assert.deepEqual(errors, [], 'production must not raise');
    assert.equal(res.statusCode, 503, 'should fall through to the not-configured branch');
    assert.match(res.body.message, /not configured/i);
  });
});

test('checkoutConfig: sandbox behaves exactly as before', async () => {
  await withEnvironment('sandbox', async () => {
    const res = stubRes();
    const { next, errors } = capture();
    const previousToken = process.env.PADDLE_CLIENT_TOKEN;
    delete process.env.PADDLE_CLIENT_TOKEN;
    try {
      await checkoutConfig({ user: { uuid: USER_UUID } }, res, next);
    } finally {
      if (previousToken !== undefined) process.env.PADDLE_CLIENT_TOKEN = previousToken;
    }

    assert.deepEqual(errors, []);
    assert.equal(res.statusCode, 503);
  });
});

test('checkoutConfig: an unknown environment still fails loudly', async () => {
  for (const bad of ['live', 'Production', 'staging', '']) {
    await withEnvironment(bad, async () => {
      const res = stubRes();
      const { next, errors } = capture();
      await checkoutConfig({ user: { uuid: USER_UUID } }, res, next);

      // '' falls back to the 'sandbox' default via ||, so it is valid by design;
      // every other unknown value must raise.
      if (bad === '') {
        assert.deepEqual(errors, [], 'empty falls back to the sandbox default');
        return;
      }
      assert.equal(errors.length, 1, `expected "${bad}" to raise`);
      assert.match(errors[0].message, /expected "sandbox" or "production"/);
    });
  }
});

test('paddleWebhook: the gate applies there too, for both valid values', async () => {
  for (const env of ['sandbox', 'production']) {
    await withEnvironment(env, async () => {
      const res = stubRes();
      const { next, errors } = capture();
      // No valid signature -> 401. Reaching signature verification at all proves the
      // environment gate did not reject the request first.
      await paddleWebhook(
        { body: Buffer.from('{}'), headers: {} },
        res,
        next
      );
      assert.deepEqual(errors, [], `${env} must not raise from the gate`);
      assert.equal(res.statusCode, 401, 'should reach signature verification');
    });
  }
});

test('paddleWebhook: an unknown environment fails before doing any work', async () => {
  await withEnvironment('live', async () => {
    const res = stubRes();
    const { next, errors } = capture();
    await paddleWebhook({ body: Buffer.from('{}'), headers: {} }, res, next);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /expected "sandbox" or "production"/);
  });
});

// ── Price-id capture ────────────────────────────────────────────────────────
// items[].price.id is present on every subscription.* payload; management_urls is NOT
// (Paddle excludes it deliberately — the links are temporary), which is why the plan is
// derived from the price id rather than from stored management links.

function validCustomData() {
  return {
    user_uuid: USER_UUID,
    checkout_signature: signCheckoutUser(USER_UUID, process.env.PADDLE_CHECKOUT_SECRET),
    tier: 'premium',
  };
}

function subscriptionWithItems(items) {
  return {
    id: 'sub_123',
    customer_id: 'ctm_123',
    status: 'active',
    custom_data: validCustomData(),
    current_billing_period: { ends_at: future },
    ...(items === undefined ? {} : { items }),
  };
}

function stubClient() {
  return {
    calls: [],
    async query(text, values) {
      this.calls.push({ text, values });
      if (/FROM users/i.test(text)) return { rows: [{ exists: 1 }] };
      return { rows: [] };
    },
  };
}

function entitlementInsert(client) {
  return client.calls.find((c) => /INSERT INTO entitlements/i.test(c.text));
}

// paddle_price_id is the last bound parameter (appended so the pre-existing positional
// assertions in subscription-lifecycle.test.js keep their meaning).
const priceIdOf = (client) => {
  const { values } = entitlementInsert(client);
  return values[values.length - 1];
};

test('applySubscriptionEvent: captures items[0].price.id', async () => {
  const client = stubClient();
  const outcome = await applySubscriptionEvent(
    client,
    'subscription.created',
    subscriptionWithItems([{ price: { id: 'pri_annual_123' } }]),
    OCCURRED_AT
  );
  assert.deepEqual(outcome, { applied: true, status: 'active' });
  assert.equal(priceIdOf(client), 'pri_annual_123');
});

test('applySubscriptionEvent: tolerates the camelCase convention', async () => {
  const client = stubClient();
  await applySubscriptionEvent(
    client,
    'subscription.updated',
    subscriptionWithItems([{ price: { priceId: 'pri_monthly_456' } }]),
    OCCURRED_AT
  );
  assert.equal(priceIdOf(client), 'pri_monthly_456');
});

test('applySubscriptionEvent: a payload without items writes null, not a crash', async () => {
  for (const items of [undefined, [], null]) {
    const client = stubClient();
    const outcome = await applySubscriptionEvent(
      client,
      'subscription.updated',
      subscriptionWithItems(items),
      OCCURRED_AT
    );
    assert.equal(outcome.applied, true, 'must still apply the rest of the event');
    assert.equal(priceIdOf(client), null);
  }
});

test('applySubscriptionEvent: a null price id never blanks a known one', async () => {
  const client = stubClient();
  await applySubscriptionEvent(client, 'subscription.updated', subscriptionWithItems(undefined), OCCURRED_AT);
  // The upsert must COALESCE rather than overwrite, so a later itemless event (e.g. a
  // status-only update) cannot erase the plan we already recorded.
  assert.match(
    entitlementInsert(client).text,
    /paddle_price_id = COALESCE\(EXCLUDED\.paddle_price_id, entitlements\.paddle_price_id\)/,
  );
});
