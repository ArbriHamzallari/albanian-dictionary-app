const pool = require('../utils/db');
const {
  signCheckoutUser,
  verifyCheckoutUserSignature,
  verifyPaddleWebhookSignature,
} = require('../utils/paddle');

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.updated',
  'subscription.canceled',
]);

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
      environment: 'sandbox',
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

async function upsertEntitlementFromSubscription(eventType, subscription) {
  const customData = customDataFromSubscription(subscription);
  const userUuid = customData.user_uuid || customData.userUuid;
  const signature = customData.checkout_signature || customData.checkoutSignature;
  const secret = checkoutSigningSecret();

  if (!verifyCheckoutUserSignature(userUuid, signature, secret)) {
    throw new Error('Paddle subscription custom data failed verification.');
  }

  const status = eventType === 'subscription.canceled'
    ? 'canceled'
    : (subscription.status || 'unknown');
  const currentPeriodEnd = currentPeriodEndFromSubscription(subscription);

  await pool.query(
    `INSERT INTO entitlements (
       user_id,
       tier,
       status,
       paddle_subscription_id,
       paddle_customer_id,
       current_period_end,
       updated_at
     )
     VALUES ($1::uuid, 'premium', $2, $3, $4, $5::timestamptz, now())
     ON CONFLICT (user_id) DO UPDATE SET
       tier = EXCLUDED.tier,
       status = EXCLUDED.status,
       paddle_subscription_id = EXCLUDED.paddle_subscription_id,
       paddle_customer_id = EXCLUDED.paddle_customer_id,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = now()`,
    [
      userUuid,
      status,
      subscription.id || null,
      subscription.customer_id || subscription.customerId || null,
      currentPeriodEnd,
    ]
  );
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
    const eventType = event.event_type || event.eventType;
    if (SUBSCRIPTION_EVENTS.has(eventType)) {
      await upsertEntitlementFromSubscription(eventType, event.data);
    }

    return res.json({ received: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  checkoutConfig,
  paddleWebhook,
  upsertEntitlementFromSubscription,
};
