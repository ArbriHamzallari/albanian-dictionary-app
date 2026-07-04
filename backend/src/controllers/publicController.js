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

// The five active origin codes (gjermanisht is reserved in the schema CHECK but has
// no content yet). Used to canonically order the list and validate :code.
const ORIGIN_CODES = ['neolatine', 'anglisht', 'turqisht', 'greqisht', 'sllavisht', 'gjermanisht'];
const ORIGIN_WORDS_PAGE_SIZE = 100;

// GET /api/public/origins — the five origin histories with their word counts.
// Public and CDN-cacheable; ordered by the fixed taxonomy so the "path" numbering
// on the frontend is stable regardless of counts.
const getOrigins = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT code, name_sq, era_sq, intro_sq, word_count
         FROM origins
        ORDER BY array_position($1::text[], code)`,
      [ORIGIN_CODES]
    );
    res.set('Cache-Control', 'public, s-maxage=3600');
    res.json({ origins: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/origins/:code — one origin + its words (paginated, 100/page).
// Words return id + borrowed_word + correct_albanian + word_type; the frontend shows
// the heritage line (not a "correction") when word_type = 'heritage'.
const getOriginByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    if (!ORIGIN_CODES.includes(code)) {
      return res.status(404).json({ message: 'Origjina nuk u gjet.' });
    }

    const originResult = await pool.query(
      `SELECT code, name_sq, era_sq, intro_sq, word_count FROM origins WHERE code = $1`,
      [code]
    );
    if (!originResult.rows.length) {
      return res.status(404).json({ message: 'Origjina nuk u gjet.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * ORIGIN_WORDS_PAGE_SIZE;

    const [wordsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, borrowed_word, correct_albanian, word_type
           FROM words
          WHERE origin_language = $1
          ORDER BY borrowed_word ASC
          LIMIT $2 OFFSET $3`,
        [code, ORIGIN_WORDS_PAGE_SIZE, offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM words WHERE origin_language = $1`,
        [code]
      ),
    ]);

    const total = countResult.rows[0].total;
    res.set('Cache-Control', 'public, s-maxage=3600');
    res.json({
      origin: originResult.rows[0],
      words: wordsResult.rows,
      page,
      pageSize: ORIGIN_WORDS_PAGE_SIZE,
      total,
      hasMore: offset + wordsResult.rows.length < total,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicStats, getOrigins, getOriginByCode };
