const pool = require('../utils/db');

// Public homepage stats are read on every homepage load. `search_logs` grows
// constantly and COUNT(*) is not free, so the result is cached in-memory for
// 60 seconds. One process, one cache — no external store needed for v1.1.
const CACHE_TTL_MS = 60 * 1000;
let cache = null; // { stats, expiresAt }

const getPublicStats = async (req, res, next) => {
  try {
    if (cache && cache.expiresAt > Date.now()) {
      return res.json(cache.stats);
    }

    const [words, users, searches] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM words'),
      pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'user'"),
      pool.query('SELECT COUNT(*)::int AS count FROM search_logs'),
    ]);

    const stats = {
      words: words.rows[0].count,
      users: users.rows[0].count,
      searches: searches.rows[0].count,
    };

    cache = { stats, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicStats };
