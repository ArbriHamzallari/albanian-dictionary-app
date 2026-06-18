const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  signCheckoutUser,
  verifyCheckoutUserSignature,
  verifyPaddleWebhookSignature,
} = require('../src/utils/paddle');

test('verifies Paddle webhook signatures over timestamp and raw body', () => {
  const secret = 'sandbox-webhook-secret';
  const body = Buffer.from(JSON.stringify({ event_type: 'subscription.created' }));
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${body.toString('utf8')}`, 'utf8')
    .digest('hex');

  assert.equal(
    verifyPaddleWebhookSignature(body, `ts=${timestamp};h1=${signature}`, secret),
    true
  );
});

test('rejects Paddle webhook signatures for modified raw bodies', () => {
  const secret = 'sandbox-webhook-secret';
  const original = Buffer.from('{"event_type":"subscription.created"}');
  const modified = Buffer.from('{"event_type":"subscription.updated"}');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${original.toString('utf8')}`, 'utf8')
    .digest('hex');

  assert.equal(
    verifyPaddleWebhookSignature(modified, `ts=${timestamp};h1=${signature}`, secret),
    false
  );
});

test('signs checkout custom data for a single user id', () => {
  const secret = 'checkout-secret';
  const userUuid = '00000000-0000-4000-8000-000000000001';
  const signature = signCheckoutUser(userUuid, secret);

  assert.equal(verifyCheckoutUserSignature(userUuid, signature, secret), true);
  assert.equal(
    verifyCheckoutUserSignature('00000000-0000-4000-8000-000000000002', signature, secret),
    false
  );
});
