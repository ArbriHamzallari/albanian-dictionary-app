const pool = require('../utils/db');
const { getOrCreateTodayQuest, formatQuest } = require('../utils/quests');

const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

// ── GET /api/quests/today ────────────────────────────────────
const getToday = async (req, res, next) => {
  try {
    const quest = await getOrCreateTodayQuest(pool, req.user.uuid);
    if (!quest) {
      return res.status(404).json({ message: 'Asnjë sfidë nuk u gjet.' });
    }
    return res.json({ quest: formatQuest(quest) });
  } catch (err) {
    return next(err);
  }
};

// ── POST /api/quests/today/claim ─────────────────────────────
const claimToday = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const quest = await getOrCreateTodayQuest(client, req.user.uuid);
    if (!quest) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Asnjë sfidë nuk u gjet.' });
    }

    if (quest.claimed_at) {
      await client.query('ROLLBACK');
      return res.json({ alreadyClaimed: true, xpAwarded: 0, quest: formatQuest(quest) });
    }

    if (quest.progress < quest.target) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Sfida nuk është përfunduar ende.',
        code: 'QUEST_NOT_COMPLETE',
      });
    }

    await client.query(
      `UPDATE user_daily_quests SET claimed_at = now()
       WHERE user_id = $1::uuid AND date = $2::date`,
      [req.user.uuid, quest.date]
    );

    const statsResult = await client.query(
      `UPDATE user_stats SET xp = xp + $2, level = ${LEVEL_FORMULA_SQL}
       WHERE user_id = $1::uuid
       RETURNING xp, level, streak`,
      [req.user.uuid, quest.xp_reward]
    );

    await client.query('COMMIT');

    return res.json({
      claimed: true,
      xpAwarded: quest.xp_reward,
      quest: formatQuest({ ...quest, claimed_at: new Date() }),
      stats: statsResult.rows[0] || null,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
};

module.exports = { getToday, claimToday };
