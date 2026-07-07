const pool = require('../utils/db');
const {
  signCheckoutUser,
  verifyCheckoutUserSignature,
  verifyPaddleWebhookSignature,
} = require('../utils/paddle');

function checkoutSigningSecret() {
  return process.env.PADDLE_CHECKOUT_SECRET || process.env.JWT_SECRET;
}

function assertPaddleSandbox() {
  const environment = process.env.PADDLE_ENVIRONMENT || 'sandbox';
  if (environment !== 'sandbox') {
    throw new Error('Paddle live mode is not enabled for this integration.');
  }
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

async function checkoutConfig(req, res, next) {
  try {
    assertPaddleSandbox();

    const clientToken = process.env.PADDLE_CLIENT_TOKEN;
    const priceId = process.env.PADDLE_PREMIUM_PRICE_ID;
    const secret = checkoutSigningSecret();
    if (!clientToken || !priceId || !secret) {
      return res.status(503).json({ message: 'Paddle sandbox checkout is not configured.' });
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
      environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
      clientToken,
      items: [{ priceId, quantity: 1 }],
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

  await client.query(
    `INSERT INTO entitlements (
       user_id,
       tier,
       status,
       paddle_subscription_id,
       paddle_customer_id,
       current_period_end,
       updated_at
     )
     VALUES ($1::uuid, 'premium', $2, $3, $4, $5::timestamptz, $6::timestamptz)
     ON CONFLICT (user_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       status = EXCLUDED.status,
       paddle_subscription_id = EXCLUDED.paddle_subscription_id,
       paddle_customer_id = EXCLUDED.paddle_customer_id,
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
    ]
  );

  return { applied: true, status };
}

async function paddleWebhook(req, res, next) {
  try {
    assertPaddleSandbox();

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
  paddleWebhook,
  applySubscriptionEvent,
};
