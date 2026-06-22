// ─────────────────────────────────────────────────────────────
// Daily quest helpers (*Sfida e ditës*). "Today" is the date in the user's
// timezone. The template for a given day is chosen deterministically from
// (user_id + date) so it is stable across reloads, regardless of whether the
// row is first created by GET /quests/today or by a lesson submit.
// ─────────────────────────────────────────────────────────────

// Stable, deterministic hash -> index in [0, mod).
function hashIndex(str, mod) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

// Longest run of consecutive correct answers within one graded submission.
function longestCorrectRun(results) {
  let best = 0;
  let run = 0;
  for (const r of results) {
    if (r.correct) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

const QUEST_SELECT = `
  SELECT q.user_id,
         to_char(q.date, 'YYYY-MM-DD') AS date,
         q.template_id,
         q.target,
         q.progress,
         q.claimed_at,
         t.type,
         t.title,
         t.xp_reward
  FROM user_daily_quests q
  JOIN daily_quests_template t ON t.id = q.template_id
  WHERE q.user_id = $1::uuid AND q.date = $2::date`;

// Fetch the user's quest for today (in their TZ), creating it on first access.
async function getOrCreateTodayQuest(client, userUuid) {
  const todayResult = await client.query(
    `SELECT to_char((now() AT TIME ZONE COALESCE(timezone, 'UTC'))::date, 'YYYY-MM-DD') AS today
     FROM users WHERE uuid = $1::uuid`,
    [userUuid]
  );
  if (!todayResult.rows.length) return null;
  const today = todayResult.rows[0].today;

  const existing = await client.query(QUEST_SELECT, [userUuid, today]);
  if (existing.rows.length) return existing.rows[0];

  const templates = await client.query(
    `SELECT id, target FROM daily_quests_template
     WHERE active = true
     ORDER BY order_index ASC, code ASC`
  );
  if (!templates.rows.length) return null;

  const chosen = templates.rows[hashIndex(`${userUuid}-${today}`, templates.rows.length)];

  // ON CONFLICT DO NOTHING handles the race where a concurrent request (e.g. a
  // simultaneous submit) created the row first; we re-select below either way.
  await client.query(
    `INSERT INTO user_daily_quests (user_id, date, template_id, target, progress)
     VALUES ($1::uuid, $2::date, $3, $4, 0)
     ON CONFLICT (user_id, date) DO NOTHING`,
    [userUuid, today, chosen.id, chosen.target]
  );

  const created = await client.query(QUEST_SELECT, [userUuid, today]);
  return created.rows[0] || null;
}

// Advance today's quest from a lesson/practice submission. Returns the updated
// quest row (or null). Never touches claimed_at.
async function updateQuestProgress(client, userUuid, { lessonsCompleted = 0, xpEarned = 0, correctRun = 0 }) {
  const quest = await getOrCreateTodayQuest(client, userUuid);
  if (!quest) return null;

  let newProgress = quest.progress;
  if (quest.type === 'complete_lessons') {
    newProgress = Math.min(quest.target, quest.progress + lessonsCompleted);
  } else if (quest.type === 'earn_xp') {
    newProgress = Math.min(quest.target, quest.progress + xpEarned);
  } else if (quest.type === 'correct_streak') {
    newProgress = Math.min(quest.target, Math.max(quest.progress, correctRun));
  }

  if (newProgress !== quest.progress) {
    await client.query(
      `UPDATE user_daily_quests SET progress = $3
       WHERE user_id = $1::uuid AND date = $2::date`,
      [userUuid, quest.date, newProgress]
    );
    quest.progress = newProgress;
  }

  return quest;
}

// Shape the quest row for API responses.
function formatQuest(quest) {
  if (!quest) return null;
  return {
    type: quest.type,
    title: quest.title,
    target: quest.target,
    progress: quest.progress,
    completed: quest.progress >= quest.target,
    claimed: Boolean(quest.claimed_at),
    xp_reward: quest.xp_reward,
    date: quest.date,
  };
}

module.exports = {
  hashIndex,
  longestCorrectRun,
  getOrCreateTodayQuest,
  updateQuestProgress,
  formatQuest,
};
