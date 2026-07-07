const pool = require('../utils/db');
const { processSeasonEnd } = require('../utils/leagues');

// ─────────────────────────────────────────────────────────────
// Nightly maintenance. Idempotent: safe to run more than once per day.
// Intended to be hit by an external scheduler (with the x-cron-secret header)
// or manually by an admin.
//   1. Grant 2 streak freezes to active-Premium users, once per calendar month.
//   2. For users who missed a day: spend a freeze if available, else reset the
//      streak. The "day" is evaluated in each user's own timezone.
//   3. End-of-season league processing: rank, promote/demote, seed next season.
//   4. Word of the Day: if nobody set one for today, pick a teachable word
//      deterministically from the date so the homepage widget always has content.
// ─────────────────────────────────────────────────────────────
const runDailyCron = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Grant freezes (2 per eligible user) once per calendar month.
    const granted = await client.query(
      `INSERT INTO user_streak_freezes (user_id, granted_at, expires_at)
       SELECT e.user_id, now(), date_trunc('month', now()) + interval '1 month'
       FROM entitlements e
       CROSS JOIN generate_series(1, 2) g
       WHERE e.tier = 'premium'
         AND e.status IN ('active', 'trialing')
         AND e.current_period_end > now()
         AND NOT EXISTS (
           SELECT 1 FROM user_streak_freezes f
           WHERE f.user_id = e.user_id
             AND f.granted_at >= date_trunc('month', now())
             AND f.granted_at < date_trunc('month', now()) + interval '1 month'
         )`
    );

    // 2. Find users with a live streak who were not active today or yesterday
    //    (in their own timezone) — their streak is at risk.
    const candidates = await client.query(
      `SELECT u.uuid,
              to_char(u.last_activity_date, 'YYYY-MM-DD') AS lad,
              to_char((now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date - 1, 'YYYY-MM-DD') AS yesterday,
              to_char((now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date - 2, 'YYYY-MM-DD') AS two_days_ago
       FROM users u
       JOIN user_stats us ON us.user_id = u.uuid
       WHERE us.streak > 0
         AND (
           u.last_activity_date IS NULL
           OR u.last_activity_date <= (now() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::date - 2
         )`
    );

    let frozen = 0;
    let reset = 0;

    for (const c of candidates.rows) {
      // A freeze can only bridge a single missed day. That is the case when the
      // last activity was exactly two days ago (yesterday was the missed day).
      const missedExactlyOneDay = c.lad === c.two_days_ago;
      let usedFreeze = false;

      if (missedExactlyOneDay) {
        const freeze = await client.query(
          `UPDATE user_streak_freezes
           SET used_at = now()
           WHERE id = (
             SELECT id FROM user_streak_freezes
             WHERE user_id = $1::uuid
               AND used_at IS NULL
               AND (expires_at IS NULL OR expires_at > now())
             ORDER BY granted_at ASC
             LIMIT 1
           )
           RETURNING id`,
          [c.uuid]
        );

        if (freeze.rows.length) {
          // Bridge the gap: treat yesterday as active so the streak survives.
          await client.query(
            `UPDATE users SET last_activity_date = $2::date WHERE uuid = $1::uuid`,
            [c.uuid, c.yesterday]
          );
          usedFreeze = true;
          frozen += 1;
        }
      }

      if (!usedFreeze) {
        await client.query(
          `UPDATE user_stats SET streak = 0 WHERE user_id = $1::uuid`,
          [c.uuid]
        );
        reset += 1;
      }
    }

    // 3. End-of-season league processing (rank, promote/demote, seed next).
    const leagues = await processSeasonEnd(client);

    // 4. Word of the Day. If no row exists for today, pick a teachable word
    //    deterministically from the date: number the eligible words (word_type
    //    'replace' WITH at least one definition) by id and take the one at a
    //    date-hashed offset. ON CONFLICT (display_date) DO NOTHING means an
    //    admin's manual pick made earlier today always wins, and re-runs no-op.
    const wotd = await client.query(
      `WITH eligible AS (
         SELECT w.id,
                row_number() OVER (ORDER BY w.id) - 1 AS rn,
                count(*) OVER () AS total
         FROM words w
         WHERE w.word_type = 'replace'
           AND EXISTS (SELECT 1 FROM definitions d WHERE d.word_id = w.id)
       )
       INSERT INTO word_of_the_day (word_id, display_date)
       SELECT id, CURRENT_DATE
       FROM eligible
       WHERE total > 0
         AND rn = ((hashtext(CURRENT_DATE::text) % total) + total) % total
       ON CONFLICT (display_date) DO NOTHING
       RETURNING word_id, display_date`
    );
    if (wotd.rows.length) {
      const { word_id, display_date } = wotd.rows[0];
      console.log(`Cron: word_of_the_day set to word ${word_id} for ${display_date}`);
    }

    await client.query('COMMIT');

    return res.json({
      ok: true,
      freezes_granted: granted.rowCount,
      streaks_frozen: frozen,
      streaks_reset: reset,
      leagues,
      word_of_the_day: wotd.rows[0]?.word_id ?? null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
};

module.exports = { runDailyCron };
