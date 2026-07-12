const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { sendEmail } = require('../src/utils/mailer');

const REAL_FETCH = global.fetch;

// Each test sets exactly the env + fetch stub it needs; this restores the world after.
afterEach(() => {
  global.fetch = REAL_FETCH;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});

test('throws when RESEND_API_KEY is missing (misconfiguration)', async () => {
  process.env.EMAIL_FROM = 'Fjalingo <no-reply@fjalingo.com>';
  // fetch must never be reached on a config error.
  global.fetch = () => { throw new Error('fetch should not be called'); };

  await assert.rejects(
    () => sendEmail({ to: 'parent@example.com', subject: 's', html: '<p>h</p>' }),
    /RESEND_API_KEY/,
  );
});

test('throws when EMAIL_FROM is missing (misconfiguration)', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  global.fetch = () => { throw new Error('fetch should not be called'); };

  await assert.rejects(
    () => sendEmail({ to: 'parent@example.com', subject: 's', html: '<p>h</p>' }),
    /EMAIL_FROM/,
  );
});

test('throws when neither html nor text is provided', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'Fjalingo <no-reply@fjalingo.com>';

  await assert.rejects(
    () => sendEmail({ to: 'parent@example.com', subject: 's' }),
    /requires "html" or "text"/,
  );
});

test('calls Resend with the expected URL, auth header, and payload; returns the id', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'Fjalingo <no-reply@fjalingo.com>';

  let captured;
  global.fetch = async (url, opts) => {
    captured = { url, opts };
    return { ok: true, status: 200, json: async () => ({ id: 'email_123' }) };
  };

  const result = await sendEmail({
    to: 'parent@example.com',
    subject: 'Confirm your child’s account',
    html: '<p>hi</p>',
    text: 'hi',
  });

  assert.equal(captured.url, 'https://api.resend.com/emails');
  assert.equal(captured.opts.method, 'POST');
  assert.equal(captured.opts.headers.Authorization, 'Bearer re_test_key');
  assert.equal(captured.opts.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(captured.opts.body), {
    from: 'Fjalingo <no-reply@fjalingo.com>',
    to: 'parent@example.com',
    subject: 'Confirm your child’s account',
    html: '<p>hi</p>',
    text: 'hi',
  });
  assert.equal(result.id, 'email_123');
});

test('rejects (does not hang) when the request times out', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'Fjalingo <no-reply@fjalingo.com>';

  // Prove the request is bounded: sendEmail must pass fetch an AbortSignal, and when that
  // signal fires a timeout the rejection must propagate out. We simulate the abort (rather
  // than wait the real 10s) by rejecting exactly as Node's fetch does on AbortSignal.timeout.
  let sawSignal = false;
  global.fetch = (url, opts) => {
    sawSignal = opts.signal instanceof AbortSignal;
    return Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'));
  };

  await assert.rejects(
    () => sendEmail({ to: 'parent@example.com', subject: 's', html: '<p>h</p>' }),
    (err) => err.name === 'TimeoutError',
  );
  assert.ok(sawSignal, 'fetch should receive an AbortSignal (timeout wiring)');
});

test('throws when Resend replies with a non-2xx status (no silent catch)', async () => {
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'Fjalingo <no-reply@fjalingo.com>';

  global.fetch = async () => ({
    ok: false,
    status: 422,
    json: async () => ({ name: 'validation_error', message: 'from is not verified' }),
  });

  await assert.rejects(
    () => sendEmail({ to: 'parent@example.com', subject: 's', html: '<p>h</p>' }),
    /Resend rejected the email/,
  );
});
