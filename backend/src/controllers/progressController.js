const pool = require('../utils/db');
const { quizSubmitSchema, startQuizSchema, QUIZ_QUESTIONS_PER_SESSION } = require('../utils/validation');
const { buildQuestions, composeSession, QuestionPoolError } = require('../utils/questionFactory');
const { hasUnlimitedAccess } = require('../utils/access');
const { unlockAchievementByKey } = require('../utils/achievements');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

function normalizeAnswer(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Grade a match answer: the submitted leftId->rightId mapping against the stored
// correct mapping. Returns `{ error }` for a MALFORMED mapping (→ 400: wrong size,
// out-of-range or duplicate right indices, unknown left key) and `{ correct }` for a
// well-formed one (correct only if it equals the stored mapping exactly). Since the
// renderer only locks correct pairs, a completed board always submits the correct
// mapping; the server re-verifies rather than trusting it.
function gradeMatch(question, submittedAnswer) {
  const expected = question.answer;
  if (!expected || typeof expected !== 'object') {
    return { error: 'Pyetja e çiftimit është e dëmtuar.' };
  }
  if (!submittedAnswer || typeof submittedAnswer !== 'object' || Array.isArray(submittedAnswer)) {
    return { error: 'Përgjigja e çiftimit është e pavlefshme.' };
  }

  const expectedKeys = Object.keys(expected);
  const submittedKeys = Object.keys(submittedAnswer);
  if (submittedKeys.length !== expectedKeys.length) {
    return { error: 'Përgjigja e çiftimit është e paplotë ose e tepërt.' };
  }

  const usedRight = new Set();
  for (const key of expectedKeys) {
    if (!(key in submittedAnswer)) {
      return { error: 'Përgjigja e çiftimit nuk përputhet me pyetjen.' };
    }
    const rightIdx = submittedAnswer[key];
    if (!Number.isInteger(rightIdx) || rightIdx < 0 || rightIdx >= expectedKeys.length) {
      return { error: 'Përgjigja e çiftimit është e pavlefshme.' };
    }
    if (usedRight.has(rightIdx)) {
      return { error: 'Përgjigja e çiftimit ka çifte të dyfishta.' };
    }
    usedRight.add(rightIdx);
  }

  const correct = expectedKeys.every((key) => submittedAnswer[key] === expected[key]);
  return { correct };
}

// Grade one submitted answer against its stored question. The stored `answer` is the
// grading truth — set server-side at start, never trusted from the client. Returns
// `{ correct }`, or `{ error }` when the submission is structurally malformed (→ 400).
// GAME-0 translate + GAME-2 match; fill_blank/spot_loanword land in GAME-3/4.
function gradeOne(question, submittedAnswer) {
  switch (question.type) {
    case 'translate':
      return { correct: normalizeAnswer(submittedAnswer) === normalizeAnswer(question.answer) };
    case 'match':
      return gradeMatch(question, submittedAnswer);
    case 'fill_blank':
    case 'spot_loanword':
      // fill_blank: the chosen word-bank INDEX. spot_loanword: the tapped token INDEX.
      // Both grade against the stored correct index; out-of-range / non-integer fails.
      return { correct: Number.isInteger(submittedAnswer) && submittedAnswer === question.answer };
    default:
      // A stored session with a type we can't grade awards no credit rather than
      // throwing — unreachable while translate + match + fill_blank ship.
      return { correct: false };
  }
}

// Grade the whole submission against the session's stored question objects (the
// JSONB served at start). Answers are matched by `idx`, never by anything the
// client could forge into a different question. Also returns a per-question
// `review` (GAME-1 teaching moment): correct answer, the user's answer, and the
// stored teach block (definition + example pair + slug) for the results screen —
// this data is server-side only and never present in the /quiz/start payload.
function gradeAnswers(storedQuestions, submittedAnswers) {
  const submittedByIdx = new Map(submittedAnswers.map((a) => [a.idx, a]));

  const submittedIdxs = submittedAnswers.map((a) => a.idx);
  if (new Set(submittedIdxs).size !== submittedIdxs.length) {
    return { error: 'Përgjigjet e kuizit përmbajnë pyetje të përsëritura.' };
  }

  const knownIdxs = new Set(storedQuestions.map((q) => q.idx));
  if (
    submittedIdxs.length !== storedQuestions.length
    || !submittedIdxs.every((idx) => knownIdxs.has(idx))
  ) {
    return { error: 'Përgjigjet e kuizit nuk përputhen me pyetjet e shërbyera.' };
  }

  let correctAnswers = 0;
  const review = [];
  const ordered = [...storedQuestions].sort((a, b) => a.idx - b.idx);
  for (const question of ordered) {
    const submitted = submittedByIdx.get(question.idx);
    const graded = gradeOne(question, submitted.answer);
    if (graded.error) {
      return { error: graded.error };
    }
    if (graded.correct) correctAnswers += 1;

    // The teaching review covers the single-word teaching types (translate,
    // fill_blank, spot_loanword) — each reuses the same review card (word + your/
    // correct answer + loan/clean pair + link). Match has no single-word teach block,
    // so it scores but is not listed. fill_blank/spot answers are INDEXES — resolve
    // them back to the words/tokens actually shown.
    if (question.type === 'translate' || question.type === 'fill_blank' || question.type === 'spot_loanword') {
      let correctText;
      let yourText;
      if (question.type === 'translate') {
        correctText = question.answer;
        yourText = submitted.answer;
      } else if (question.type === 'fill_blank') {
        const bank = question.prompt?.bank;
        correctText = question.teach?.correct_albanian ?? bank?.[question.answer] ?? null;
        yourText = bank?.[submitted.answer] ?? '—';
      } else { // spot_loanword
        const tokens = question.prompt?.tokens;
        correctText = tokens?.[question.answer] ?? question.teach?.borrowed_word ?? null;
        yourText = tokens?.[submitted.answer] ?? '—';
      }
      review.push({
        idx: question.idx,
        borrowed_word: question.teach?.borrowed_word ?? question.prompt?.borrowed_word ?? null,
        correct_answer: correctText,
        your_answer: yourText,
        correct: graded.correct,
        definition_sq: question.teach?.definition_sq ?? null,
        example: question.teach?.example ?? null,
        slug: question.teach?.slug ?? null,
      });
    }
  }

  const totalQuestions = storedQuestions.length;
  correctAnswers = Math.min(correctAnswers, totalQuestions);

  return {
    totalQuestions,
    correctAnswers,
    score: correctAnswers * 100,
    xpGain: correctAnswers * 100,
    review,
  };
}

const startQuiz = async (req, res, next) => {
  try {
    const { error, value } = startQuizSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e kuizit janë të pavlefshme.' });
    }
    const { origin, types } = value;
    const userUuid = req.user.uuid;

    // Server-side world gate: the free tier plays ONLY the anglisht world; every
    // other origin is Premium. Admins and premium users play any origin. This lives
    // here (not just in route middleware) so the origin itself is authorized —
    // req.entitlement is populated by the isPremium middleware on the route.
    if (origin !== 'anglisht' && !hasUnlimitedAccess(req.user, req.entitlement?.isPremium)) {
      return res.status(403).json({ message: 'Ky funksion kërkon Premium.', code: 'PREMIUM_REQUIRED' });
    }

    let questions;
    try {
      // No `types` → GAME-5 composes a ramped mixed session for the origin. Explicit
      // `types` → build that set (tests / direct API).
      questions = types
        ? await buildQuestions({ origin, count: QUIZ_QUESTIONS_PER_SESSION, types })
        : await composeSession({ origin });
    } catch (err) {
      if (err instanceof QuestionPoolError) {
        // Content is too thin for this origin — an honest empty state, not a 500.
        console.warn(`Quiz start blocked: ${err.message}`);
        return res.status(503).json({ message: 'Kuizi nuk është i disponueshëm.', code: 'NOT_ENOUGH_CONTENT' });
      }
      throw err;
    }

    const sessionResult = await pool.query(
      `INSERT INTO quiz_sessions (user_id, questions, expires_at)
       VALUES ($1, $2::jsonb, now() + interval '1 hour')
       RETURNING id`,
      [userUuid, JSON.stringify(questions)]
    );

    // The origin's display name for the session header (best-effort; null if absent).
    const originRow = await pool.query('SELECT name_sq FROM origins WHERE code = $1', [origin]);

    // Strip the grading truth (answer) AND the teach block (it reveals the answer:
    // correct word + definition + example) before questions reach the client. The
    // teach block is served only in the submit response.
    const clientQuestions = questions.map(({ answer, teach, ...rest }) => rest);

    return res.json({
      sessionId: sessionResult.rows[0].id,
      origin,
      originName: originRow.rows[0]?.name_sq || null,
      questions: clientQuestions,
    });
  } catch (err) {
    return next(err);
  }
};

const submitQuiz = async (req, res, next) => {
  try {
    const { error, value } = quizSubmitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e kuizit janë të pavlefshme.' });
    }

    const userUuid = req.user.uuid;
    const { sessionId, answers } = value;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query(
        `SELECT id, questions
         FROM quiz_sessions
         WHERE id = $1
           AND user_id = $2
           AND submitted_at IS NULL
           AND expires_at > now()
         FOR UPDATE`,
        [sessionId, userUuid]
      );

      if (!sessionResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Sesioni i kuizit është i pavlefshëm ose ka skaduar.' });
      }

      // The session's stored questions (JSONB) are the grading truth.
      const storedQuestions = sessionResult.rows[0].questions;
      const graded = gradeAnswers(storedQuestions, answers);
      if (graded.error) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: graded.error });
      }

      const { totalQuestions, correctAnswers, score, xpGain } = graded;

      const statsResult = await client.query(
        `UPDATE user_stats
         SET
           xp = xp + $2,
           total_quizzes = total_quizzes + 1,
           correct_answers = correct_answers + $3,
           total_questions = total_questions + $4,
           streak = CASE
             WHEN last_quiz_date = ((now() AT TIME ZONE 'utc')::date - 1)
               THEN streak + 1
             WHEN last_quiz_date = (now() AT TIME ZONE 'utc')::date
               THEN streak
             ELSE 1
           END,
           last_quiz_date = (now() AT TIME ZONE 'utc')::date,
           level = ${LEVEL_FORMULA_SQL}
         WHERE user_id = $1
         RETURNING *`,
        [userUuid, xpGain, correctAnswers, totalQuestions]
      );

      if (!statsResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Statistikat nuk u gjetën.' });
      }

      let stats = statsResult.rows[0];

      const levelResult = await client.query(
        `UPDATE user_stats SET level = ${LEVEL_FORMULA_SQL} WHERE user_id = $1 RETURNING *`,
        [userUuid]
      );
      stats = levelResult.rows[0];

      // Quiz + streak milestones — all through the shared helper (FEAT-3) so quiz
      // and the /profile unlock endpoint write achievements through one path.
      // Server-authoritative: the client never mints these. total_quizzes and
      // streak were just incremented above, so they reflect this attempt.
      const achievementsUnlocked = [];
      const tryUnlock = async (key) => {
        if (await unlockAchievementByKey(client, userUuid, key)) {
          achievementsUnlocked.push(key);
        }
      };

      // Every threshold is evaluated against `stats` — the row reflecting THIS quiz's
      // xp/streak but BEFORE any unlock's own xp_reward is applied. `stats` is not
      // re-read until after all tryUnlock calls (below), so a points_500 unlock's +XP
      // can never push xp past 1000 and cascade points_1000 in the same submit.
      await tryUnlock('first_quiz');
      if (stats.total_quizzes >= 10) await tryUnlock('quiz_master');
      if (totalQuestions > 0 && correctAnswers === totalQuestions) await tryUnlock('perfect_quiz');
      if (stats.streak >= 3) await tryUnlock('streak_3');
      if (stats.streak >= 7) await tryUnlock('7_day_streak');
      if (stats.streak >= 30) await tryUnlock('streak_30');
      if (stats.xp >= 500) await tryUnlock('points_500');
      if (stats.xp >= 1000) await tryUnlock('points_1000');
      if (stats.xp >= 5000) await tryUnlock('points_5000');

      if (achievementsUnlocked.length) {
        // The helper awarded XP and re-levelled — re-read the authoritative row.
        const refreshed = await client.query(
          'SELECT * FROM user_stats WHERE user_id = $1',
          [userUuid]
        );
        stats = refreshed.rows[0];
      }
      const achievementUnlocked = achievementsUnlocked[0] || null;

      await client.query(
        `INSERT INTO quiz_attempts (user_id, score, total_questions, correct_answers)
         VALUES ($1, $2, $3, $4)`,
        [userUuid, score, totalQuestions, correctAnswers]
      );

      await client.query(
        `UPDATE quiz_sessions SET submitted_at = now() WHERE id = $1`,
        [sessionId]
      );

      await client.query('COMMIT');

      return res.json({
        stats,
        score,
        correctAnswers,
        totalQuestions,
        review: graded.review,
        achievementUnlocked,
        achievementsUnlocked,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
};

module.exports = { startQuiz, submitQuiz, gradeAnswers };
