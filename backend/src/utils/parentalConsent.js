'use strict';

// Parental-consent shared logic (SAFE-2c). One place for: signing/verifying the consent
// token, masking the parent email, and emailing the parent. Used by register,
// completeProfile, and guestUpgrade so the flow is never duplicated.
//
// The consent token is a JWT signed with the SAME JWT_SECRET as session tokens, but it
// carries a distinct { type: 'parental_consent' } and uses `user_uuid` (not `uuid`), so
// it can never be mistaken for an access token — the auth middleware also rejects this
// type explicitly. sendEmail is the ONLY email path (no direct provider calls here).

const jwt = require('jsonwebtoken');
const { sendEmail } = require('./mailer');
const { parentalConsentEmail } = require('./emailTemplates');

const CONSENT_TOKEN_TYPE = 'parental_consent';
const CONSENT_TOKEN_TTL = '7d';

// FRONTEND_URL should be a Fly secret in prod; default to the live origin. Trailing
// slash trimmed so the built URL never has a double slash.
function frontendBaseUrl() {
  return (process.env.FRONTEND_URL || 'https://fjalingo.com').replace(/\/+$/, '');
}

function signConsentToken(userUuid, parentEmail) {
  if (!process.env.JWT_SECRET) throw new Error('parentalConsent: JWT_SECRET is not set');
  return jwt.sign(
    { type: CONSENT_TOKEN_TYPE, user_uuid: userUuid, parent_email: parentEmail },
    process.env.JWT_SECRET,
    { expiresIn: CONSENT_TOKEN_TTL },
  );
}

// Verify signature + expiry (jwt.verify throws on either) and assert the shape. Fails
// fast: a token that isn't a parental_consent token throws, never silently passes.
function verifyConsentToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.type !== CONSENT_TOKEN_TYPE || !payload.user_uuid) {
    throw new Error('parentalConsent: token is not a valid parental_consent token');
  }
  return payload;
}

function buildConsentUrl(token) {
  return `${frontendBaseUrl()}/consent/${token}`;
}

// "arben@gmail.com" -> "a***@gmail.com". Never return the full parent email to a client.
function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

// Enforce the parent_email rule against the consent requirement. Kept here rather than in
// Joi because the requirement depends on the per-country GDPR threshold map — encoding
// that into schema conditionals would duplicate childSafety's logic. Returns a stable
// error code the controller maps to a 400, or { ok: true }.
function validateParentEmail(consentRequired, parentEmail, ownEmail) {
  if (consentRequired) {
    if (!parentEmail) return { error: 'PARENT_EMAIL_REQUIRED' };
    if (ownEmail && String(parentEmail).toLowerCase() === String(ownEmail).toLowerCase()) {
      return { error: 'PARENT_EMAIL_SAME_AS_OWN' };
    }
  } else if (parentEmail) {
    return { error: 'PARENT_EMAIL_NOT_ALLOWED' };
  }
  return { ok: true };
}

// The account already exists in a restricted state. Mint a consent token and email the
// parent the approval link. If the email fails (e.g. Resend down) the account still
// stands — the user can retry via /resend-consent — so this logs loudly and does NOT
// throw. Returns the masked hint for the pending-consent response.
async function sendParentalConsentEmail(userUuid, parentEmail) {
  const token = signConsentToken(userUuid, parentEmail);
  const consentUrl = buildConsentUrl(token);
  try {
    await sendEmail({ to: parentEmail, ...parentalConsentEmail({ consentUrl }) });
  } catch (err) {
    console.error('parentalConsent: consent email failed to send', {
      userUuid,
      parentEmailHint: maskEmail(parentEmail),
      err,
    });
  }
  return { parentEmailHint: maskEmail(parentEmail) };
}

module.exports = {
  CONSENT_TOKEN_TYPE,
  signConsentToken,
  verifyConsentToken,
  buildConsentUrl,
  maskEmail,
  validateParentEmail,
  sendParentalConsentEmail,
};
