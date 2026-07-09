const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}

require('./db-guard'); // refuse to run against a non-local DB (see db-guard.js)
const pool = require('../src/utils/db');
const app = require('../server');

let server;
let baseUrl;

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('rejects legacy forged score payload', async () => {
  const suffix = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a');
  const register = await api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `quiz_${suffix}`,
      email: `quiz_${suffix}@example.com`,
      password: 'testpass123',
      age: 18,
      country_code: 'US',
    },
  });
  assert.equal(register.status, 201);

  const token = register.data.token;
  const forged = await api('/api/progress/quiz', {
    method: 'POST',
    token,
    body: {
      score: 10000,
      totalQuestions: 10,
      correctAnswers: 10,
    },
  });

  assert.equal(forged.status, 400);
});

test('rejects answers that do not match the served quiz session', async () => {
  const suffix = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'b');
  const register = await api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `quiz2_${suffix}`,
      email: `quiz2_${suffix}@example.com`,
      password: 'testpass123',
      age: 18,
      country_code: 'US',
    },
  });
  assert.equal(register.status, 201);

  const token = register.data.token;
  const started = await api('/api/progress/quiz/start', {
    method: 'POST',
    token,
    body: { types: ['translate'] },
  });
  assert.equal(started.status, 200);
  assert.ok(started.data.sessionId);
  assert.ok(Array.isArray(started.data.questions));
  assert.ok(started.data.questions.length > 0);
  // Start never leaks the grading answer to the client.
  assert.ok(started.data.questions.every((q) => q.answer === undefined));

  // Answers that don't line up with the served session (here: every answer points
  // at the same question idx) are rejected server-side.
  const mismatch = await api('/api/progress/quiz', {
    method: 'POST',
    token,
    body: {
      sessionId: started.data.sessionId,
      answers: started.data.questions.map((question) => ({
        idx: 0,
        answer: question.options[0],
      })),
    },
  });

  assert.equal(mismatch.status, 400);
});

test('grades server-side and awards zero xp for all-wrong answers', async () => {
  const suffix = Math.random().toString(36).slice(2, 10).replace(/\d/g, 'c');
  const register = await api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `quiz3_${suffix}`,
      email: `quiz3_${suffix}@example.com`,
      password: 'testpass123',
      age: 18,
      country_code: 'US',
    },
  });
  assert.equal(register.status, 201);

  const token = register.data.token;
  const xpBefore = register.data.stats.xp;

  const started = await api('/api/progress/quiz/start', {
    method: 'POST',
    token,
    body: { types: ['translate'] },
  });
  assert.equal(started.status, 200);

  const submitted = await api('/api/progress/quiz', {
    method: 'POST',
    token,
    body: {
      sessionId: started.data.sessionId,
      answers: started.data.questions.map((question) => ({
        idx: question.idx,
        answer: `definitely-wrong-${question.idx}`,
      })),
    },
  });

  assert.equal(submitted.status, 200);
  assert.equal(submitted.data.correctAnswers, 0);
  assert.equal(submitted.data.score, 0);
  // GAME-1: submit returns a per-question teaching review; start never does.
  assert.ok(Array.isArray(submitted.data.review));
  assert.equal(submitted.data.review.length, started.data.questions.length);
  assert.ok(submitted.data.review.every((r) => typeof r.correct_answer === 'string' && r.correct === false));
  assert.equal(started.data.review, undefined);
  // Quiz grading awards no XP for wrong answers. The only XP change here is the
  // one-time "first quiz completed" achievement (+50) — completing counts even
  // when every answer is wrong — proving grading itself stays at zero.
  assert.ok(submitted.data.achievementsUnlocked.includes('first_quiz'));
  assert.equal(submitted.data.stats.xp, xpBefore + 50);
});
