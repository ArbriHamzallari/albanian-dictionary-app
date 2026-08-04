const pool = require('../utils/db');
const {
  signCheckoutUser,
  verifyCheckoutUserSignature,
  verifyPaddleWebhookSignature,
} = require('../utils/paddle');

function checkoutSigningSecret() {
  return process.env.PADDLE_CHECKOUT_SECRET || process.env.JWT_SECRET;
}

// Dual pricing (PRICE-2): one Paddle product, two prices. Annual is the hero,
// monthly is the anchor. PADDLE_PREMIUM_PRICE_ID is still read as the annual
// fallback so a not-yet-renamed prod secret keeps checkout working. Monthly is
// optional — if it is unset the page degrades to annual-only rather than breaking.
function premiumPriceIds() {
  return {
    annual: process.env.PADDLE_PRICE_ID_ANNUAL || process.env.PADDLE_PREMIUM_PRICE_ID || null,
    monthly: process.env.PADDLE_PRICE_ID_MONTHLY || null,
  };
}

// PAY-3: the gate used to throw on anything but 'sandbox' — including 'production',
// which made live billing impossible and contradicted DEPLOYMENT.md ("`sandbox` until
// live billing; `production` after Paddle verification. Must be exactly `sandbox` or
// `production`"). Both are valid; anything else is a misconfiguration worth failing on.
// This mirrors frontend/src/utils/paddleCheckout.js exactly, so the two ends agree on
// what is valid. Flipping the env var itself is a business-side action, not a code one.
const PADDLE_ENVIRONMENTS = ['sandbox', 'production'];

function paddleEnvironment() {
  return process.env.PADDLE_ENVIRONMENT || 'sandbox';
}

function assertPaddleEnvironmentConfigured() {
  const environment = paddleEnvironment();
  if (!PADDLE_ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `Unexpected Paddle environment "${environment}"; expected "sandbox" or "production".`
    );
  }
  return environment;
}

function currentPeriodEndFromSubscription(subscription) {
  return (
    subscription?.current_billing_period?.ends_at
    || subscription?.currentBillingPeriod?.endsAt
    || subscription?.next_billed_at
    || subscription?.nextBilledAt
    || subscription?.canceled_at
    || subscription?.canceledAt
    || null
  );
}

function customDataFromSubscription(subscription) {
  return subscription?.custom_data || subscription?.customData || {};
}

// PAY-3: which price the subscriber is on (items[].price.id on every subscription.*
// payload). One subscription = one Premium price here, so the first item is it; a
// subscription with no items is possible in malformed/partial payloads, hence the
// optional chaining rather than an assumption. Both naming conventions are tolerated,
// matching currentPeriodEndFromSubscription above.
function priceIdFromSubscription(subscription) {
  const items = subscription?.items;
  if (!Array.isArray(items) || !items.length) {
    return null;
  }
  const price = items[0]?.price;
  return price?.id || price?.priceId || null;
}

async function checkoutConfig(req, res, next) {
  try {
    assertPaddleEnvironmentConfigured();

    const clientToken = process.env.PADDLE_CLIENT_TOKEN;
    const { annual, monthly } = premiumPriceIds();
    const secret = checkoutSigningSecret();
    if (!clientToken || !annual || !secret) {
      return res.status(503).json({ message: 'Paddle checkout is not configured.' });
    }

    const userResult = await pool.query(
      'SELECT email FROM users WHERE uuid = $1::uuid',
      [req.user.uuid]
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    const checkoutSignature = signCheckoutUser(req.user.uuid, secret);

    return res.json({
      environment: paddleEnvironment(),
      clientToken,
      // Both plans; the frontend opens checkout with the chosen one's priceId.
      // Monthly is included only when configured.
      plans: {
        annual: { priceId: annual },
        ...(monthly ? { monthly: { priceId: monthly } } : {}),
      },
      customer: { email: userResult.rows[0].email },
      customData: {
        user_uuid: req.user.uuid,
        checkout_signature: checkoutSignature,
        tier: 'premium',
      },
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/billing/subscription — the current user's own subscription, for the Premium
// page's manage panel. /auth/me already returns tier/status/current_period_end, but not
// which plan; rather than widen the auth payload for a billing-only concern, this keeps
// billing reads in the billing controller and gives the page one source to render from.
//
// `plan` is DERIVED, never guessed: the stored price id is compared against the
// configured annual/monthly ids. An unrecognised id (e.g. a legacy price, or a plan
// bought before 028 shipped) yields null, and the page omits the plan line rather than
// asserting something false.
//
// NOTE: the Paddle-hosted "update payment method" / "cancel" links are deliberately not
// here. Paddle excludes management_urls from every subscription webhook and documents
// them as temporary, so they cannot be captured or cached — fetching them needs a
// server-side Paddle API key, which is a scope decision (see the PR).
function planFromPriceId(priceId) {
  if (!priceId) {
    return null;
  }
  const { annual, monthly } = premiumPriceIds();
  if (annual && priceId === annual) {
    return 'annual';
  }
  if (monthly && priceId === monthly) {
    return 'monthly';
  }
  return null;
}

async function getSubscription(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT tier, status, current_period_end, paddle_price_id
       FROM entitlements
       WHERE user_id = $1::uuid`,
      [req.user.uuid]
    );

    // No entitlements row reads as free, matching getEntitlement's behavior.
    const row = result.rows[0] || null;

    return res.json({
      subscription: {
        tier: row?.tier || 'free',
        status: row?.status || 'free',
        currentPeriodEnd: row?.current_period_end || null,
        plan: planFromPriceId(row?.paddle_price_id),
      },
    });
  } catch (err) {
    return next(err);
  }
}

// Applies a subscription.* event to the entitlements table by syncing Paddle's
// subscription.status (the source of truth); entitlements middleware maps that
// status -> access. Returns an outcome and NEVER throws for events we simply can't
// act on: an authentic Paddle event (outer HMAC already verified) whose custom_data
// we can't bind to one of our users is acknowledged and logged, not retried forever
// — throwing would 500, roll back the idempotency row, and loop Paddle's retries.
async function applySubscriptionEvent(client, eventType, subscription, occurredAt) {
  const customData = customDataFromSubscription(subscription);
  const userUuid = customData.user_uuid || customData.userUuid;
  const signature = customData.checkout_signature || customData.checkoutSignature;
  const secret = checkoutSigningSecret();

  if (!verifyCheckoutUserSignature(userUuid, signature, secret)) {
    return { applied: false, reason: 'unattributable' };
  }

  // The user may have deleted their account after subscribing (entitlements
  // cascades on user delete). Re-inserting would violate the users FK and poison
  // the webhook transaction; acknowledge and ignore so Paddle stops retrying
  // (SEC-DELETE). Deletion does not auto-cancel Paddle subscriptions in v1.
  const userExists = await client.query('SELECT 1 FROM users WHERE uuid = $1::uuid', [userUuid]);
  if (!userExists.rows.length) {
    return { applied: false, reason: 'unknown_user' };
  }

  const status = eventType === 'subscription.canceled'
    ? 'canceled'
    : (subscription.status || 'unknown');
  const currentPeriodEnd = currentPeriodEndFromSubscription(subscription);
  const priceId = priceIdFromSubscription(subscription);

  await client.query(
    // paddle_price_id is appended last rather than grouped with the other paddle_*
    // columns on purpose: the existing lifecycle tests read this values array by
    // position, so appending keeps their indices (and their meaning) intact.
    `INSERT INTO entitlements (
       user_id,
       tier,
       status,
       paddle_subscription_id,
       paddle_customer_id,
       current_period_end,
       updated_at,
       paddle_price_id
     )
     VALUES ($1::uuid, 'premium', $2, $3, $4, $5::timestamptz, $6::timestamptz, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       status = EXCLUDED.status,
       paddle_subscription_id = EXCLUDED.paddle_subscription_id,
       paddle_customer_id = EXCLUDED.paddle_customer_id,
       -- A payload without items must not blank a price we already know.
       paddle_price_id = COALESCE(EXCLUDED.paddle_price_id, entitlements.paddle_price_id),
       current_period_end = EXCLUDED.current_period_end,
       updated_at = EXCLUDED.updated_at
     WHERE EXCLUDED.updated_at > entitlements.updated_at`,
    [
      userUuid,
      status,
      subscription.id || null,
      subscription.customer_id || subscription.customerId || null,
      currentPeriodEnd,
      occurredAt,
      priceId,
    ]
  );

  return { applied: true, status };
}

async function paddleWebhook(req, res, next) {
  try {
    assertPaddleEnvironmentConfigured();

    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    const signatureHeader = req.headers['paddle-signature'];
    if (!verifyPaddleWebhookSignature(req.body, signatureHeader, webhookSecret)) {
      return res.status(401).json({ message: 'Invalid Paddle webhook signature.' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const eventId = event.event_id || event.eventId;
    const eventType = event.event_type || event.eventType;
    const occurredAt = event.occurred_at || event.occurredAt;
    if (!eventId || !occurredAt) {
      return res.status(400).json({ message: 'Invalid Paddle webhook event.', code: 'INVALID_EVENT' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query(
        `INSERT INTO processed_webhook_events (event_id, event_type, occurred_at)
         VALUES ($1, $2, $3::timestamptz)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [eventId, eventType || 'unknown', occurredAt]
      );

      if (!inserted.rows.length) {
        await client.query('COMMIT');
        return res.json({ received: true, deduplicated: true });
      }

      // Only subscription.* events change access; everything else (transaction.*,
      // etc.) and any event we can't attribute is acknowledged, not 500'd — a 500
      // would roll back the idempotency row above and make Paddle retry forever.
      const outcome = (eventType?.startsWith('subscription.') && event.data)
        ? await applySubscriptionEvent(client, eventType, event.data, occurredAt)
        : { applied: false, reason: 'unhandled_event_type' };

      await client.query('COMMIT');

      if (outcome.applied) {
        console.info('[paddle_webhook_applied]', eventType, '->', outcome.status);
      } else {
        console.warn('[paddle_webhook_skipped]', eventType, outcome.reason);
      }

      return res.json({ received: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  checkoutConfig,
  getSubscription,
  paddleWebhook,
  applySubscriptionEvent,
};
