'use strict';

// Transactional email — the single, only email path in the backend (root CLAUDE.md:
// "one way to do things", no fallback provider). Sends via Resend's documented REST API
// (POST https://api.resend.com/emails) using the built-in fetch, so there is no vendor
// SDK dependency and the exact wire payload is assertable in tests.
//
// Configuration comes entirely from env (Fly secrets); nothing is hardcoded:
//   RESEND_API_KEY  server API key, "re_..."         (required)
//   EMAIL_FROM      verified sender, e.g.             (required)
//                   "Fjalingo <no-reply@fjalingo.com>"
//
// No silent catches: misconfiguration and provider/transport failures throw and are
// logged. Callers decide how to react — this util never swallows an error.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Node's fetch has no default timeout, so a hung Resend connection would hang the caller
// forever — and SAFE-2 awaits sendEmail inside the signup request path. One fixed value,
// no config knob, no retry: on timeout AbortSignal rejects and the catch below logs and
// throws, exactly like every other failure (fail fast).
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Send one transactional email.
 * @param {object} params
 * @param {string|string[]} params.to   recipient address(es)
 * @param {string} params.subject       subject line
 * @param {string} [params.html]        HTML body (html or text required)
 * @param {string} [params.text]        plain-text body (html or text required)
 * @returns {Promise<{ id: string }>}   Resend's message id on success
 * @throws  on misconfiguration, invalid arguments, transport failure, or a non-2xx reply
 */
async function sendEmail({ to, subject, html, text } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  // Fail fast at the boundary — a missing secret is a deploy error, not a runtime maybe.
  if (!apiKey) throw new Error('mailer: RESEND_API_KEY is not set');
  if (!from) throw new Error('mailer: EMAIL_FROM is not set');
  if (!to) throw new Error('mailer: sendEmail requires a "to" address');
  if (!subject) throw new Error('mailer: sendEmail requires a "subject"');
  if (!html && !text) throw new Error('mailer: sendEmail requires "html" or "text"');

  let response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Transport failure (DNS, TLS, network). Log with context, then rethrow — never swallow.
    console.error('mailer: request to Resend failed', { to, subject, err });
    throw err;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = payload && (payload.name || payload.message)
      ? `${payload.name || ''} ${payload.message || ''}`.trim()
      : `HTTP ${response.status}`;
    console.error('mailer: Resend rejected the email', { status: response.status, to, subject, payload });
    throw new Error(`mailer: Resend rejected the email (${detail})`);
  }

  return { id: payload && payload.id };
}

module.exports = { sendEmail };
