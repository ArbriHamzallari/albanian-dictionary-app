const pool = require('../utils/db');
const Joi = require('joi');
const {
  gradeExercise,
  nextSrsIntervalDays,
  lessonSubmitSchema,
} = require('../utils/exerciseSchemas');
const { updateQuestProgress, longestCorrectRun, formatQuest } = require('../utils/quests');

// ─────────────────────────────────────────────────────────────
// Lesson player: serve lessons (prompt only, no answers), grade submissions
// server-side, award XP, advance streak, and feed the spaced-repetition
// mistake queue. Practice Mistakes (Premium) reuses the same submit handler.
// ─────────────────────────────────────────────────────────────

const FREE_DAILY_LESSON_LIMIT = 5;
const XP_PER_CORRECT = 10;
const LESSON_COMPLETION_BONUS = 20;
const COMPLETION_THRESHOLD = 80; // percent
const PRACTICE_LESSON_ID = 'practice';

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

const uuidSchema = Joi.string().uuid();

// Number of lessons this free user has completed today (UTC day, matching the
// quiz/search limiters). order-0 lessons are always free but still count toward
// the daily total.
async function countCompletedToday(client, userUuid) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM user_lesson_progress
     WHERE user_id = $1::uuid
       AND completed_at IS NOT NULL
       AND completed_at >= (now() AT TIME ZONE 'utc')::date`,
    [userUuid]
  );
  return result.rows[0].count;
}

// Returns null if access is allowed, or { status, body } describing the block.
// Premium users always pass. For free users: premium units are fully locked,
// the first lesson (order_index 0) of every unit is always free, and any other
// lesson is allowed only while under the daily limit.
async function checkFreeAccess(client, { isPremium, lesson, userUuid }) {
  if (isPremium) return null;

  if (lesson.is_premium_unit) {
    return {
      status: 402,
      body: { message: 'Kjo njësi kërkon Premium.', code: 'PREMIUM_REQUIRED' },
    };
  }

  if (lesson.order_index === 0) return null;

  const completedToday = await countCompletedToday(client, userUuid);
  if (completedToday >= FREE_DAILY_LESSON_LIMIT) {
    return {
      status: 402,
      body: {
        message: 'Plani falas përfshin 5 mësime në ditë. Për mësime pa kufi, kaloni në Premium.',
        code: 'DAILY_LESSON_LIMIT_REACHED',
      },
    };
  }

  return null;
}

async function fetchLessonWithUnit(client, lessonId) {
  const result = await client.query(
    `SELECT l.id, l.unit_id, l.slug, l.title, l.order_index,
            u.title AS unit_title, u.slug AS unit_slug, u.is_premium_unit
     FROM lessons l
     JOIN units u ON u.id = l.unit_id
     WHERE l.id = $1`,
    [lessonId]
  );
  return result.rows[0] || null;
}

// ── GET /api/lessons/:lessonId ───────────────────────────────
const getLesson = async (req, res, next) => {
  try {
    const { error } = uuidSchema.validate(req.params.lessonId);
    if (error) {
      return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
    }

    const lesson = await fetchLessonWithUnit(pool, req.params.lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
    }

    const access = await checkFreeAccess(pool, {
      isPremium: Boolean(req.entitlement?.isPremium),
      lesson,
      userUuid: req.user.uuid,
    });
    if (access) {
      return res.status(access.status).json(access.body);
    }

    // Prompt only — `answer` and `why_it_matters` are part of the post-answer
    // reveal and are never sent before the user responds.
    const exercises = await pool.query(
      `SELECT id, type, order_index, prompt
       FROM exercises
       WHERE lesson_id = $1
       ORDER BY order_index ASC`,
      [req.params.lessonId]
    );

    return res.json({
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        order_index: lesson.order_index,
        unit_id: lesson.unit_id,
        unit_title: lesson.unit_title,
        unit_slug: lesson.unit_slug,
      },
      exercises: exercises.rows,
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/lessons/practice-mistakes (Premium) ─────────────
const practiceMistakes = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.type, e.order_index, e.prompt, m.due_at
       FROM user_exercise_mistakes m
       JOIN exercises e ON e.id = m.exercise_id
       WHERE m.user_id = $1::uuid
         AND m.due_at <= now()
       ORDER BY m.due_at ASC
       LIMIT 8`,
      [req.user.uuid]
    );
    return res.json({ exercises: result.rows });
  } catch (err) {
    return next(err);
  }
};

// Upsert the spaced-repetition state for one graded exercise.
// Wrong -> reset to 1 day. Correct on a tracked mistake -> advance the interval
// (1->3->7->14) or graduate (delete) once it passes 14 days.
async function applySrs(client, userUuid, exerciseId, correct) {
  if (!correct) {
    await client.query(
      `INSERT INTO user_exercise_mistakes
         (user_id, exercise_id, last_wrong_at, due_at, interval_days, correct_streak)
       VALUES ($1::uuid, $2::uuid, now(), now() + make_interval(days => 1), 1, 0)
       ON CONFLICT (user_id, exercise_id) DO UPDATE SET
         last_wrong_at = now(),
         due_at = now() + make_interval(days => 1),
         interval_days = 1,
         correct_streak = 0`,
      [userUuid, exerciseId]
    );
    return;
  }

  const existing = await client.query(
    `SELECT interval_days FROM user_exercise_mistakes
     WHERE user_id = $1::uuid AND exercise_id = $2::uuid`,
    [userUuid, exerciseId]
  );
  if (!existing.rows.length) {
    return; // correct answer on an exercise that was never a mistake
  }

  const next = nextSrsIntervalDays(existing.rows[0].interval_days);
  if (next === null) {
    await client.query(
      `DELETE FROM user_exercise_mistakes
       WHERE user_id = $1::uuid AND exercise_id = $2::uuid`,
      [userUuid, exerciseId]
    );
    return;
  }

  await client.query(
    `UPDATE user_exercise_mistakes
     SET interval_days = $3,
         due_at = now() + make_interval(days => $3),
         correct_streak = correct_streak + 1
     WHERE user_id = $1::uuid AND exercise_id = $2::uuid`,
    [userUuid, exerciseId, next]
  );
}

// ── GET /api/lessons/sample (public, onboarding first taste) ──
// One Spot-the-Alblish exercise from the seed curriculum, prompt only.
const getSampleExercise = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.type, e.order_index, e.prompt
       FROM exercises e
       JOIN lessons l ON l.id = e.lesson_id
       JOIN units u ON u.id = l.unit_id
       WHERE e.type = 'spot_alblish'
       ORDER BY u.order_index ASC, l.order_index ASC, e.order_index ASC
       LIMIT 1`
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Asnjë ushtrim shembull nuk u gjet.' });
    }
    return res.json({ exercise: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/lessons/sample/grade (public, onboarding) ───────
// Grades the first-taste exercise without any persistence. Mirrors the `check`
// response shape so the Lesson player can reuse the same code path.
const gradeSampleExercise = async (req, res, next) => {
  try {
    const schema = Joi.object({
      exercise_id: Joi.string().uuid().required(),
      response: Joi.string().trim().min(1).max(500).required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e përgjigjes janë të pavlefshme.' });
    }

    const result = await pool.query(
      `SELECT id, type, answer, why_it_matters FROM exercises WHERE id = $1`,
      [value.exercise_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ushtrimi nuk u gjet.' });
    }

    const ex = result.rows[0];
    const correct = gradeExercise(ex.type, ex.answer, value.response);
    return res.json({
      results: [{
        exercise_id: ex.id,
        type: ex.type,
        correct,
        response: value.response,
        answer: ex.answer,
        why_it_matters: ex.why_it_matters,
      }],
    });
  } catch (err) {
    return next(err);
  }
};

// ── GET /api/lessons/first (auth, onboarding hand-off) ────────
// The first lesson of the first unit (Unit 1, Lesson 1) by order.
const getFirstLesson = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT l.id
       FROM lessons l
       JOIN units u ON u.id = l.unit_id
       ORDER BY u.order_index ASC, l.order_index ASC
       LIMIT 1`
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Asnjë mësim nuk u gjet.' });
    }
    return res.json({ lesson_id: result.rows[0].id });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/lessons/:lessonId/submit ───────────────────────
// Also handles practice mode when :lessonId === 'practice'.
const submitLesson = async (req, res, next) => {
  try {
    const { error, value } = lessonSubmitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e përgjigjeve janë të pavlefshme.' });
    }

    const userUuid = req.user.uuid;
    const isPremium = Boolean(req.entitlement?.isPremium);
    const isPractice = req.params.lessonId === PRACTICE_LESSON_ID;
    const { answers, check } = value;

    // Reject duplicate exercise_ids up front.
    const submittedIds = answers.map((a) => a.exercise_id);
    if (new Set(submittedIds).size !== submittedIds.length) {
      return res.status(400).json({ message: 'Përgjigjet përmbajnë ushtrime të përsëritura.' });
    }

    if (isPractice && !isPremium) {
      return res.status(402).json({ message: 'Përsërit gabimet kërkon Premium.', code: 'PREMIUM_REQUIRED' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let lesson = null;
      let lessonExerciseCount = 0;
      let exerciseRows;

      if (isPractice) {
        // Practice items must already be in this user's mistake queue.
        const result = await client.query(
          `SELECT e.id, e.type, e.answer, e.why_it_matters
           FROM exercises e
           JOIN user_exercise_mistakes m ON m.exercise_id = e.id
           WHERE m.user_id = $1::uuid AND e.id = ANY($2::uuid[])`,
          [userUuid, submittedIds]
        );
        exerciseRows = result.rows;
      } else {
        const { error: idError } = uuidSchema.validate(req.params.lessonId);
        if (idError) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
        }

        lesson = await fetchLessonWithUnit(client, req.params.lessonId);
        if (!lesson) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
        }

        const access = await checkFreeAccess(client, { isPremium, lesson, userUuid });
        if (access) {
          await client.query('ROLLBACK');
          return res.status(access.status).json(access.body);
        }

        const result = await client.query(
          `SELECT id, type, answer, why_it_matters
           FROM exercises
           WHERE lesson_id = $1`,
          [req.params.lessonId]
        );
        exerciseRows = result.rows;
        lessonExerciseCount = result.rows.length;
      }

      const exById = new Map(exerciseRows.map((e) => [e.id, e]));
      for (const id of submittedIds) {
        if (!exById.has(id)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            message: isPractice
              ? 'Një ose më shumë ushtrime nuk janë në radhën e gabimeve.'
              : 'Një ose më shumë ushtrime nuk i përkasin këtij mësimi.',
          });
        }
      }

      const results = answers.map((a) => {
        const ex = exById.get(a.exercise_id);
        const correct = gradeExercise(ex.type, ex.answer, a.response);
        return {
          exercise_id: ex.id,
          type: ex.type,
          correct,
          response: a.response,
          answer: ex.answer,
          why_it_matters: ex.why_it_matters,
        };
      });

      const correctCount = results.filter((r) => r.correct).length;
      const denominator = isPractice ? results.length : lessonExerciseCount;
      const score = denominator > 0 ? Math.round((correctCount / denominator) * 100) : 0;
      const completed = !isPractice && score >= COMPLETION_THRESHOLD;
      const xpEarned = correctCount * XP_PER_CORRECT + (completed ? LESSON_COMPLETION_BONUS : 0);

      // check mode: grade + reveal only, no writes.
      if (check) {
        await client.query('ROLLBACK');
        return res.json({
          check: true,
          results,
          correctCount,
          total: denominator,
          score,
        });
      }

      // Finalize: SRS for every graded exercise.
      for (const r of results) {
        await applySrs(client, userUuid, r.exercise_id, r.correct);
      }

      // Lesson progress (skip for practice).
      if (!isPractice) {
        await client.query(
          `INSERT INTO user_lesson_progress (user_id, lesson_id, completed_at, best_score, attempts)
           VALUES ($1::uuid, $2::uuid, CASE WHEN $3 THEN now() ELSE NULL END, $4, 1)
           ON CONFLICT (user_id, lesson_id) DO UPDATE SET
             attempts = user_lesson_progress.attempts + 1,
             best_score = GREATEST(COALESCE(user_lesson_progress.best_score, 0), EXCLUDED.best_score),
             completed_at = CASE
               WHEN user_lesson_progress.completed_at IS NOT NULL THEN user_lesson_progress.completed_at
               WHEN $3 THEN now()
               ELSE NULL
             END`,
          [userUuid, req.params.lessonId, completed, score]
        );
      }

      // XP + streak. Streak advances on a completed lesson, or on any practice
      // session with at least one correct answer (engagement that day). The
      // "day" boundary is the date in the user's timezone, and the streak is
      // computed from users.last_activity_date (the prior activity day).
      const advanceStreak = completed || (isPractice && correctCount > 0);

      if (advanceStreak) {
        await client.query(
          `UPDATE user_stats us
           SET xp = xp + $2,
               streak = CASE
                 WHEN u.last_activity_date = (now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date THEN us.streak
                 WHEN u.last_activity_date = ((now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date - 1) THEN us.streak + 1
                 ELSE 1
               END
           FROM users u
           WHERE us.user_id = $1::uuid AND u.uuid = $1::uuid`,
          [userUuid, xpEarned]
        );
        await client.query(
          `UPDATE users
           SET last_activity_date = (now() AT TIME ZONE COALESCE(timezone, 'UTC'))::date
           WHERE uuid = $1::uuid`,
          [userUuid]
        );
      } else {
        await client.query(
          `UPDATE user_stats SET xp = xp + $2 WHERE user_id = $1::uuid`,
          [userUuid, xpEarned]
        );
      }

      // Recompute level from the now-current xp and read back fresh stats.
      const statsResult = await client.query(
        `UPDATE user_stats SET level = ${LEVEL_FORMULA_SQL}
         WHERE user_id = $1::uuid
         RETURNING xp, level, streak`,
        [userUuid]
      );
      const stats = statsResult.rows[0] || null;

      // Daily quest progress (atomic with XP/streak in this transaction).
      const quest = await updateQuestProgress(client, userUuid, {
        lessonsCompleted: (!isPractice && completed) ? 1 : 0,
        xpEarned,
        correctRun: longestCorrectRun(results),
      });

      await client.query('COMMIT');

      return res.json({
        check: false,
        practice: isPractice,
        results,
        wrongAnswers: results.filter((r) => !r.correct),
        correctCount,
        total: denominator,
        score,
        completed,
        xpEarned,
        streak: stats ? stats.streak : null,
        stats,
        quest: formatQuest(quest),
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

module.exports = {
  getLesson,
  submitLesson,
  practiceMistakes,
  getSampleExercise,
  gradeSampleExercise,
  getFirstLesson,
  FREE_DAILY_LESSON_LIMIT,
  XP_PER_CORRECT,
  LESSON_COMPLETION_BONUS,
};
