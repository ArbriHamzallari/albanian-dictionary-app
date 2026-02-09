const pool = require('../utils/db');
const { quizProgressSchema } = require('../utils/validation');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

const submitQuiz = async (req, res, next) => {
  try {
    const { error, value } = quizProgressSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e kuizit janë të pavlefshme.' });
    }

    const userUuid = req.user.uuid;
    const { score, totalQuestions, correctAnswers } = value;
    const xpGain = correctAnswers * 100;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ── Update stats with UTC streak logic ─────────────────
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

      // Recompute level (the SQL above uses the pre-update xp for level calc
      // because xp is updated in the same SET — fix by re-calculating)
      const levelResult = await client.query(
        `UPDATE user_stats SET level = ${LEVEL_FORMULA_SQL} WHERE user_id = $1 RETURNING *`,
        [userUuid]
      );
      stats = levelResult.rows[0];

      // ── 7-day streak achievement (award XP only if newly unlocked) ─
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

          // Only award XP if the insert actually happened (newly unlocked)
          if (insertResult.rows.length) {
            const bonusResult = await client.query(
              `UPDATE user_stats
               SET xp = xp + $2, level = ${LEVEL_FORMULA_SQL}
               WHERE user_id = $1
               RETURNING *`,
              [userUuid, ach.xp_reward]
            );
            // Recompute level after bonus
            const relevelResult = await client.query(
              `UPDATE user_stats SET level = ${LEVEL_FORMULA_SQL} WHERE user_id = $1 RETURNING *`,
              [userUuid]
            );
            stats = relevelResult.rows[0];
            achievementUnlocked = '7_day_streak';
          }
        }
      }

      // ── Insert quiz attempt ────────────────────────────────
      await client.query(
        `INSERT INTO quiz_attempts (user_id, score, total_questions, correct_answers)
         VALUES ($1, $2, $3, $4)`,
        [userUuid, score, totalQuestions, correctAnswers]
      );

      await client.query('COMMIT');

      return res.json({ stats, achievementUnlocked });
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

module.exports = { submitQuiz };
