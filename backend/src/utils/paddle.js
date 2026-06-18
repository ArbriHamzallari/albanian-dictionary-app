const crypto = require('crypto');

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function parsePaddleSignature(header) {
  if (typeof header !== 'string' || !header.trim()) {
    return null;
  }

  const parts = header.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      const normalizedKey = key.trim();
      if (normalizedKey === 'h1') {
        acc.h1.push(value.trim());
      } else {
        acc[normalizedKey] = value.trim();
      }
    }
    return acc;
  }, { h1: [] });

  if (!parts.ts || !parts.h1.length) {
    return null;
  }

  return { timestamp: parts.ts, signatures: parts.h1 };
}

function timingSafeHexEqual(left, right) {
  try {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function verifyPaddleWebhookSignature(rawBody, signatureHeader, secret) {
  if (!Buffer.isBuffer(rawBody) || typeof secret !== 'string' || !secret.trim()) {
    return false;
  }

  const parsed = parsePaddleSignature(signatureHeader);
  if (!parsed) {
    return false;
  }

  const timestampSeconds = Number.parseInt(parsed.timestamp, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}:${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return parsed.signatures.some((signature) => timingSafeHexEqual(expected, signature));
}

function signCheckoutUser(userUuid, secret) {
  if (!userUuid || typeof secret !== 'string' || !secret.trim()) {
    throw new Error('Cannot sign Paddle checkout data without a user id and secret.');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(String(userUuid), 'utf8')
    .digest('hex');
}

function verifyCheckoutUserSignature(userUuid, signature, secret) {
  if (!userUuid || !signature) {
    return false;
  }

  const expected = signCheckoutUser(userUuid, secret);
  return timingSafeHexEqual(expected, signature);
}

module.exports = {
  WEBHOOK_TOLERANCE_SECONDS,
  parsePaddleSignature,
  verifyPaddleWebhookSignature,
  signCheckoutUser,
  verifyCheckoutUserSignature,
};
