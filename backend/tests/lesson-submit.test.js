const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
}

const pool = require('../src/utils/db');
const app = require('../server');

let server;
let baseUrl;

async function api(pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function rid(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 10).replace(/\d/g, 'a')}`;
}

async function registerUser() {
  const suffix = rid('');
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: {
      username: `lsn_${suffix}`,
      email: `lsn_${suffix}@example.com`,
      password: 'testpass123',
      age: 25,
      country_code: 'US',
    },
  });
  assert.equal(res.status, 201);
  return { token: res.data.token, uuid: res.data.profile.uuid };
}

async function createUnit({ orderIndex = 0, premium = false } = {}) {
  const slug = rid('unit-');
  const r = await pool.query(
    `INSERT INTO units (slug, title, order_index, is_premium_unit)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [slug, 'Test Unit', orderIndex, premium]
  );
  return r.rows[0].id;
}

async function createLesson(unitId, orderIndex) {
  const r = await pool.query(
    `INSERT INTO lessons (unit_id, slug, title, order_index)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [unitId, rid('lesson-'), `Lesson ${orderIndex}`, orderIndex]
  );
  return r.rows[0].id;
}

async function createExercise(lessonId, orderIndex, type, prompt, answer, why) {
  const r = await pool.query(
    `INSERT INTO exercises (lesson_id, order_index, type, prompt, answer, why_it_matters)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6) RETURNING id`,
    [lessonId, orderIndex, type, JSON.stringify(prompt), JSON.stringify(answer), why || null]
  );
  return r.rows[0].id;
}

// A first lesson (order 0) with the three exercise types. Returns ids in order.
async function seedLesson() {
  const unitId = await createUnit({ orderIndex: 0 });
  const lessonId = await createLesson(unitId, 0);
  const ids = [];
  ids.push(await createExercise(lessonId, 0, 'spot_alblish',
    { sentence: 'Kemi nje meeting sot.' },
    { loanword: 'meeting', corrected_sentence: 'Kemi nje takim sot.', correct_albanian: 'takim' },
    'pse'));
  ids.push(await createExercise(lessonId, 1, 'translation',
    { loanword: 'manager', options: ['drejtues', 'takim', 'afat', 'ekip'] },
    { correct: 'drejtues' }, 'pse'));
  ids.push(await createExercise(lessonId, 2, 'fill_blank',
    { sentence: 'Doli nje {{blank}} sot.', options: ['perditesim', 'program', 'skedar', 'ekran'] },
    { correct: 'perditesim' }, 'pse'));
  ids.push(await createExercise(lessonId, 3, 'spot_alblish',
    { sentence: 'Fola me manager-in.' },
    { loanword: 'manager', corrected_sentence: 'Fola me drejtuesin.', correct_albanian: 'drejtues' },
    'pse'));
  ids.push(await createExercise(lessonId, 4, 'translation',
    { loanword: 'office', options: ['zyre', 'takim', 'afat', 'ekip'] },
    { correct: 'zyre' }, 'pse'));
  return { lessonId, ids };
}

const CORRECT = {
  0: 'meeting',
  1: 'drejtues',
  2: 'perditesim',
  3: 'manager-in', // tapped token includes the loanword "manager"
  4: 'zyre',
};

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

test('grades each exercise type correctly (check mode)', async () => {
  const { token } = await registerUser();
  const { lessonId, ids } = await seedLesson();

  // Correct answers, one per type.
  for (const i of [0, 1, 2, 3, 4]) {
    const res = await api(`/api/lessons/${lessonId}/submit`, {
      method: 'POST',
      token,
      body: { answers: [{ exercise_id: ids[i], response: CORRECT[i] }], check: true },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.results[0].correct, true, `exercise ${i} should be correct`);
  }

  // Wrong answers grade as incorrect.
  const wrongSpot = await api(`/api/lessons/${lessonId}/submit`, {
    method: 'POST',
    token,
    body: { answers: [{ exercise_id: ids[0], response: 'Kemi' }], check: true },
  });
  assert.equal(wrongSpot.data.results[0].correct, false);

  const wrongChoice = await api(`/api/lessons/${lessonId}/submit`, {
    method: 'POST',
    token,
    body: { answers: [{ exercise_id: ids[1], response: 'takim' }], check: true },
  });
  assert.equal(wrongChoice.data.results[0].correct, false);

  // check mode must not award XP.
  const me = await api('/api/auth/me', { token });
  assert.equal(me.data.stats.xp, 0);
});

test('awards XP: 10 per correct + 20 completion bonus at >=80%', async () => {
  const { token } = await registerUser();
  const { lessonId, ids } = await seedLesson();

  const res = await api(`/api/lessons/${lessonId}/submit`, {
    method: 'POST',
    token,
    body: {
      answers: ids.map((id, i) => ({ exercise_id: id, response: CORRECT[i] })),
      check: false,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.correctCount, 5);
  assert.equal(res.data.score, 100);
  assert.equal(res.data.completed, true);
  assert.equal(res.data.xpEarned, 70); // 5*10 + 20
  assert.equal(res.data.stats.xp, 70);

  // Progress recorded + completed.
  const prog = await pool.query(
    `SELECT best_score, attempts, completed_at FROM user_lesson_progress WHERE lesson_id = $1`,
    [lessonId]
  );
  assert.equal(prog.rows[0].best_score, 100);
  assert.equal(prog.rows[0].attempts, 1);
  assert.ok(prog.rows[0].completed_at);
});

test('no completion bonus below 80%', async () => {
  const { token } = await registerUser();
  const { lessonId, ids } = await seedLesson();

  // 3/5 correct = 60% -> 30 XP, no bonus, not completed.
  const res = await api(`/api/lessons/${lessonId}/submit`, {
    method: 'POST',
    token,
    body: {
      answers: [
        { exercise_id: ids[0], response: CORRECT[0] },
        { exercise_id: ids[1], response: CORRECT[1] },
        { exercise_id: ids[2], response: CORRECT[2] },
        { exercise_id: ids[3], response: 'Fola' },
        { exercise_id: ids[4], response: 'takim' },
      ],
      check: false,
    },
  });

  assert.equal(res.data.score, 60);
  assert.equal(res.data.completed, false);
  assert.equal(res.data.xpEarned, 30);
});

test('SRS: wrong answer queues a mistake at 1 day; later success advances to 3', async () => {
  const { token, uuid } = await registerUser();
  const { lessonId, ids } = await seedLesson();
  const targetExercise = ids[0];

  // First attempt: target wrong, rest correct.
  await api(`/api/lessons/${lessonId}/submit`, {
    method: 'POST',
    token,
    body: {
      answers: [
        { exercise_id: ids[0], response: 'Kemi' },
        { exercise_id: ids[1], response: CORRECT[1] },
        { exercise_id: ids[2], response: CORRECT[2] },
        { exercise_id: ids[3], response: CORRECT[3] },
        { exercise_id: ids[4], response: CORRECT[4] },
      ],
      check: false,
    },
  });

  let mistake = await pool.query(
    `SELECT interval_days, correct_streak, due_at, last_wrong_at
     FROM user_exercise_mistakes WHERE user_id = $1::uuid AND exercise_id = $2::uuid`,
    [uuid, targetExercise]
  );
  assert.equal(mistake.rows.length, 1, 'mistake should be queued');
  assert.equal(mistake.rows[0].interval_days, 1);
  assert.equal(mistake.rows[0].correct_streak, 0);
  const dueDelta = new Date(mistake.rows[0].due_at).getTime() - Date.now();
  assert.ok(dueDelta > 22 * 3600 * 1000 && dueDelta < 26 * 3600 * 1000, 'due_at ~ +1 day');

  // Second attempt: target now correct -> interval advances 1 -> 3.
  await api(`/api/lessons/${lessonId}/submit`, {
    method: 'POST',
    token,
    body: {
      answers: ids.map((id, i) => ({ exercise_id: id, response: CORRECT[i] })),
      check: false,
    },
  });

  mistake = await pool.query(
    `SELECT interval_days, correct_streak FROM user_exercise_mistakes
     WHERE user_id = $1::uuid AND exercise_id = $2::uuid`,
    [uuid, targetExercise]
  );
  assert.equal(mistake.rows[0].interval_days, 3);
  assert.equal(mistake.rows[0].correct_streak, 1);
});

test('free-tier daily lesson cap returns 402', async () => {
  const { token, uuid } = await registerUser();
  const unitId = await createUnit({ orderIndex: 0 });

  // 7 lessons: order 0..6.
  const lessonIds = [];
  for (let i = 0; i <= 6; i += 1) {
    lessonIds.push(await createLesson(unitId, i));
  }

  // Mark 5 non-first lessons (orders 1..5) as completed today.
  for (let i = 1; i <= 5; i += 1) {
    await pool.query(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, completed_at, best_score, attempts)
       VALUES ($1::uuid, $2::uuid, now(), 100, 1)`,
      [uuid, lessonIds[i]]
    );
  }

  // First lesson (order 0) of a unit is always free, even past the cap.
  const firstLesson = await api(`/api/lessons/${lessonIds[0]}`, { token });
  assert.equal(firstLesson.status, 200);

  // A non-first lesson beyond the daily cap is blocked.
  const capped = await api(`/api/lessons/${lessonIds[6]}`, { token });
  assert.equal(capped.status, 402);
  assert.equal(capped.data.code, 'DAILY_LESSON_LIMIT_REACHED');
});

test('practice-mistakes requires Premium', async () => {
  const { token } = await registerUser();
  const res = await api('/api/lessons/practice-mistakes', { token });
  assert.equal(res.status, 402);
  assert.equal(res.data.code, 'PREMIUM_REQUIRED');
});
