const LEVEL_FORMULA_SQL = `floor(sqrt((xp::numeric)/100))::int + 1`;

// Single server-side path to unlock an achievement (FEAT-3). Used by both the
// quiz flow (7_day_streak) and the POST /profile/achievements/unlock endpoint, so
// there is exactly one place that writes user_achievements and awards its XP.
//
// Idempotent: unlocking an already-unlocked achievement (or an unknown key) is a
// clean no-op that returns false — never an error, never a duplicate row.
// Awards the achievement's existing xp_reward on first unlock and re-levels.
// Must be called inside a transaction (takes the pg client).
async function unlockAchievementByKey(client, userUuid, key) {
  const achResult = await client.query(
    'SELECT id, xp_reward FROM achievements WHERE key = $1',
    [key]
  );
  if (!achResult.rows.length) return false; // unknown achievement key

  const ach = achResult.rows[0];
  const inserted = await client.query(
    `INSERT INTO user_achievements (user_id, achievement_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING user_id`,
    [userUuid, ach.id]
  );
  if (!inserted.rows.length) return false; // already unlocked

  if (ach.xp_reward > 0) {
    // xp in the formula is the pre-update value, so (xp + reward) is the new XP.
    await client.query(
      `UPDATE user_stats
         SET xp = xp + $2,
             level = floor(sqrt(((xp + $2)::numeric)/100))::int + 1
       WHERE user_id = $1`,
      [userUuid, ach.xp_reward]
    );
  }
  return true;
}

module.exports = { unlockAchievementByKey, LEVEL_FORMULA_SQL };
