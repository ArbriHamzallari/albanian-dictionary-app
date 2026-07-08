const pool = require('../utils/db');
const { quizSubmitSchema, startQuizSchema, QUIZ_QUESTIONS_PER_SESSION } = require('../utils/validation');
const { buildQuestions, QuestionPoolError } = require('../utils/questionFactory');
const { hasUnlimitedAccess } = require('../utils/access');
const { unlockAchievementByKey } = require('../utils/achievements');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

function normalizeAnswer(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Grade one submitted answer against its stored question. The stored `answer` is
// the grading truth — set server-side at start, never trusted from the client.
// GAME-0 handles `translate` only; match/fill_blank/spot_loanword land in GAME-2/3/4.
function gradeOne(question, submittedAnswer) {
  switch (question.type) {
    case 'translate':
      return normalizeAnswer(submittedAnswer) === normalizeAnswer(question.answer);
    default:
      // A stored session with a type we can't grade yet awards no credit rather
      // than throwing — but this should be unreachable while only translate ships.
      return false;
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
    const isCorrect = gradeOne(question, submitted.answer);
    if (isCorrect) correctAnswers += 1;

    review.push({
      idx: question.idx,
      borrowed_word: question.teach?.borrowed_word ?? question.prompt?.borrowed_word ?? null,
      correct_answer: question.answer,
      your_answer: submitted.answer,
      correct: isCorrect,
      definition_sq: question.teach?.definition_sq ?? null,
      example: question.teach?.example ?? null,
      slug: question.teach?.slug ?? null,
    });
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
      questions = await buildQuestions({ origin, count: QUIZ_QUESTIONS_PER_SESSION, types });
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

    // Strip the grading truth (answer) AND the teach block (it reveals the answer:
    // correct word + definition + example) before questions reach the client. The
    // teach block is served only in the submit response.
    const clientQuestions = questions.map(({ answer, teach, ...rest }) => rest);

    return res.json({
      sessionId: sessionResult.rows[0].id,
      origin,
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

      await tryUnlock('first_quiz');
      if (stats.total_quizzes >= 10) await tryUnlock('quiz_master');
      if (totalQuestions > 0 && correctAnswers === totalQuestions) await tryUnlock('perfect_quiz');
      if (stats.streak >= 7) await tryUnlock('7_day_streak');

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
