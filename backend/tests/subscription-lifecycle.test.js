// PAY-2 — subscription lifecycle. Deterministic, no live Paddle and no DB:
// entitlementIsPremium is pure, and applySubscriptionEvent only calls client.query,
// so we inject a stub client and assert what it would write.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres@localhost:5432/fjalingo_test';
process.env.PADDLE_CHECKOUT_SECRET = 'test-checkout-secret';
require('./db-guard');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { entitlementIsPremium } = require('../src/middleware/entitlements');
const { applySubscriptionEvent } = require('../src/controllers/billingController');
const { signCheckoutUser } = require('../src/utils/paddle');

const future = new Date(Date.now() + 1_000_000_000).toISOString();
const past = new Date(Date.now() - 1_000_000_000).toISOString();

// ── Access decision by status (Paddle "provision access" table) ──
test('entitlementIsPremium: active grants until the period ends', () => {
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'active', current_period_end: future }), true);
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'active', current_period_end: past }), false);
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'active', current_period_end: null }), false);
});

test('entitlementIsPremium: trialing is treated like active', () => {
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'trialing', current_period_end: future }), true);
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'trialing', current_period_end: past }), false);
});

test('entitlementIsPremium: past_due grants during dunning (ignores period end)', () => {
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'past_due', current_period_end: past }), true);
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'past_due', current_period_end: null }), true);
});

test('entitlementIsPremium: paused revokes even with period remaining', () => {
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'paused', current_period_end: future }), false);
});

test('entitlementIsPremium: canceled revokes immediately (refund protection)', () => {
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'canceled', current_period_end: future }), false);
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'canceled', current_period_end: past }), false);
});

test('entitlementIsPremium: cancellation keeps Premium until period end, then loses it', () => {
  // Scheduled cancel: Paddle keeps status 'active' until the effective date.
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'active', current_period_end: future }), true);
  // After it takes effect: subscription.canceled -> status 'canceled', period passed.
  assert.equal(entitlementIsPremium({ tier: 'premium', status: 'canceled', current_period_end: past }), false);
});

test('entitlementIsPremium: free / complimentary handling', () => {
  assert.equal(entitlementIsPremium(null), false);
  assert.equal(entitlementIsPremium({ tier: 'free', status: 'free', current_period_end: null }), false);
  // Admin-granted complimentary access overrides tier/status.
  assert.equal(entitlementIsPremium({ tier: 'free', status: 'free', complimentary_until: future }), true);
  assert.equal(entitlementIsPremium({ tier: 'free', status: 'free', complimentary_until: past }), false);
});

// ── Webhook applier: event -> entitlement write ──
const USER_UUID = '00000000-0000-4000-8000-000000000009';
const OCCURRED_AT = new Date().toISOString();

function validCustomData() {
  return {
    user_uuid: USER_UUID,
    checkout_signature: signCheckoutUser(USER_UUID, process.env.PADDLE_CHECKOUT_SECRET),
    tier: 'premium',
  };
}

function subscription(status, endsAt, customData = validCustomData()) {
  return {
    id: 'sub_123',
    customer_id: 'ctm_123',
    status,
    custom_data: customData,
    current_billing_period: { ends_at: endsAt },
  };
}

function stubClient({ userExists = true } = {}) {
  return {
    calls: [],
    async query(text, values) {
      this.calls.push({ text, values });
      // The applier first checks the target user still exists (SEC-DELETE); a
      // deleted user is the one case where it must skip the entitlement write.
      if (/FROM users/i.test(text)) {
        return { rows: userExists ? [{ exists: 1 }] : [] };
      }
      return { rows: [] };
    },
  };
}

// Finds the entitlements INSERT among the applier's queries (it also runs a user
// existence check first), so assertions don't depend on call ordering.
function entitlementInsert(client) {
  return client.calls.find((c) => /INSERT INTO entitlements/i.test(c.text));
}

test('applySubscriptionEvent: syncs status and period end for active', async () => {
  const client = stubClient();
  const outcome = await applySubscriptionEvent(client, 'subscription.updated', subscription('active', future), OCCURRED_AT);
  assert.deepEqual(outcome, { applied: true, status: 'active' });
  const [userUuid, status, , , periodEnd] = entitlementInsert(client).values;
  assert.equal(userUuid, USER_UUID);
  assert.equal(status, 'active');
  assert.equal(periodEnd, future);
});

test('applySubscriptionEvent: canceled event always writes canceled', async () => {
  const client = stubClient();
  // Even if the payload status lags, the canceled event forces canceled.
  const outcome = await applySubscriptionEvent(client, 'subscription.canceled', subscription('active', past), OCCURRED_AT);
  assert.deepEqual(outcome, { applied: true, status: 'canceled' });
  assert.equal(entitlementInsert(client).values[1], 'canceled');
});

test('applySubscriptionEvent: past_due and paused sync their status', async () => {
  for (const status of ['past_due', 'paused', 'trialing']) {
    const client = stubClient();
    const outcome = await applySubscriptionEvent(client, 'subscription.updated', subscription(status, future), OCCURRED_AT);
    assert.deepEqual(outcome, { applied: true, status });
    assert.equal(entitlementInsert(client).values[1], status);
  }
});

test('applySubscriptionEvent: unattributable event changes nothing and does not throw', async () => {
  const client = stubClient();
  const badData = { user_uuid: USER_UUID, checkout_signature: 'deadbeef' };
  const outcome = await applySubscriptionEvent(
    client,
    'subscription.updated',
    subscription('active', future, badData),
    OCCURRED_AT,
  );
  assert.deepEqual(outcome, { applied: false, reason: 'unattributable' });
  assert.equal(client.calls.length, 0);
});

test('applySubscriptionEvent: is price-agnostic — a plan switch keeps premium (PRICE-2)', async () => {
  // Dual pricing (annual/monthly) is one product with two prices. Switching plans
  // changes the subscription's price id, never the entitlement logic: the applier
  // keys off status + user, so a monthly subscription grants premium exactly like
  // annual, and the price id never reaches the entitlements row.
  const monthly = subscription('active', future);
  monthly.items = [{ price: { id: 'pri_monthly_5eur' } }];
  const client = stubClient();
  const outcome = await applySubscriptionEvent(client, 'subscription.updated', monthly, OCCURRED_AT);
  assert.deepEqual(outcome, { applied: true, status: 'active' });
  const insert = entitlementInsert(client);
  assert.ok(insert, 'writes the entitlement regardless of price');
  assert.ok(!JSON.stringify(insert.values).includes('pri_monthly_5eur'), 'price id never touches entitlements');
});

test('applySubscriptionEvent: deleted user is acknowledged and never written (SEC-DELETE)', async () => {
  // A validly-attributed event for a user who has since erased their account:
  // must skip the entitlement write (its FK would fail) and report unknown_user
  // so the webhook 200s instead of retrying forever.
  const client = stubClient({ userExists: false });
  const outcome = await applySubscriptionEvent(client, 'subscription.updated', subscription('active', future), OCCURRED_AT);
  assert.deepEqual(outcome, { applied: false, reason: 'unknown_user' });
  assert.equal(entitlementInsert(client), undefined);
});
