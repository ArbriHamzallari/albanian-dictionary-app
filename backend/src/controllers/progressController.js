const pool = require('../utils/db');
const { quizSubmitSchema, QUIZ_QUESTIONS_PER_SESSION } = require('../utils/validation');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeAnswer(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function gradeAnswers(questionIds, answerRows, submittedAnswers) {
  const correctByQuestionId = new Map(
    answerRows.map((row) => [row.id, normalizeAnswer(row.correct_answer)])
  );

  if (correctByQuestionId.size !== questionIds.length) {
    return { error: 'Pyetjet e kuizit nuk përputhen me sesionin.' };
  }

  const submittedIds = submittedAnswers.map((a) => a.questionId);
  const uniqueSubmittedIds = new Set(submittedIds);
  if (uniqueSubmittedIds.size !== submittedIds.length) {
    return { error: 'Përgjigjet e kuizit përmbajnë pyetje të përsëritura.' };
  }

  const expectedIds = new Set(questionIds);
  if (
    submittedIds.length !== questionIds.length
    || !submittedIds.every((id) => expectedIds.has(id))
  ) {
    return { error: 'Përgjigjet e kuizit nuk përputhen me pyetjet e shërbyera.' };
  }

  let correctAnswers = 0;
  for (const submitted of submittedAnswers) {
    const expected = correctByQuestionId.get(submitted.questionId);
    if (expected == null) {
      return { error: 'Përgjigjet e kuizit nuk përputhen me pyetjet e shërbyera.' };
    }
    if (normalizeAnswer(submitted.answer) === expected) {
      correctAnswers += 1;
    }
  }

  const totalQuestions = questionIds.length;
  correctAnswers = Math.min(correctAnswers, totalQuestions);

  return {
    totalQuestions,
    correctAnswers,
    score: correctAnswers * 100,
    xpGain: correctAnswers * 100,
  };
}

const startQuiz = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    const availableResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM quiz_questions WHERE is_active = true`
    );
    if (availableResult.rows[0].count < 4) {
      return res.status(503).json({ message: 'Kuizi nuk është i disponueshëm.' });
    }

    const questionsResult = await pool.query(
      `SELECT id, question_text, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3
       FROM quiz_questions
       WHERE is_active = true
       ORDER BY random()
       LIMIT $1`,
      [QUIZ_QUESTIONS_PER_SESSION]
    );

    const questionIds = questionsResult.rows.map((row) => row.id);
    const sessionResult = await pool.query(
      `INSERT INTO quiz_sessions (user_id, question_ids, expires_at)
       VALUES ($1, $2, now() + interval '1 hour')
       RETURNING id`,
      [userUuid, questionIds]
    );

    const questions = questionsResult.rows.map((row) => ({
      id: row.id,
      borrowed_word: row.question_text,
      options: shuffleArray(
        [row.correct_answer, row.wrong_answer_1, row.wrong_answer_2, row.wrong_answer_3].filter(Boolean)
      ),
    }));

    return res.json({
      sessionId: sessionResult.rows[0].id,
      questions,
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
        `SELECT id, question_ids
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

      const questionIds = sessionResult.rows[0].question_ids;
      const answerRowsResult = await client.query(
        `SELECT id, correct_answer
         FROM quiz_questions
         WHERE id = ANY($1::int[])`,
        [questionIds]
      );

      const graded = gradeAnswers(questionIds, answerRowsResult.rows, answers);
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
        [userUuid, xpGain, correctAnswers]
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

      let achievementUnlocked = null;
      if (stats.streak >= 7) {
        const achResult = await client.query(
          `SELECT id, xp_reward FROM achievements WHERE key = '7_day_streak'`
        );
        if (achResult.rows.length) {
          const ach = achResult.rows[0];
          const insertResult = await client.query(
            `INSERT INTO user_achievements (user_id, achievement_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING
             RETURNING user_id`,
            [userUuid, ach.id]
          );

          if (insertResult.rows.length) {
            await client.query(
              `UPDATE user_stats
               SET xp = xp + $2, level = ${LEVEL_FORMULA_SQL}
               WHERE user_id = $1`,
              [userUuid, ach.xp_reward]
            );
            const relevelResult = await client.query(
              `UPDATE user_stats SET level = ${LEVEL_FORMULA_SQL} WHERE user_id = $1 RETURNING *`,
              [userUuid]
            );
            stats = relevelResult.rows[0];
            achievementUnlocked = '7_day_streak';
          }
        }
      }

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
        achievementUnlocked,
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
