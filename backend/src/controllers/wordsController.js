const pool = require('../utils/db');
const { searchSchema } = require('../utils/validation');
const { unlockAchievementByKey } = require('../utils/achievements');

// word_explorer ("Eksplorues — Shiko 20 fjalë", migration 021) fires at this many
// distinct searched words. search_logs is the ONLY per-user word-interaction signal
// that exists — word detail views (getWordById) carry no auth and no per-user row —
// so "20 words viewed" is served by "20 distinct search terms", the closest honest
// proxy without a schema change (out of scope for FIX-3).
const WORD_EXPLORER_THRESHOLD = 20;

const mapWord = (word, definitions, conjugations) => ({
  ...word,
  definitions,
  conjugations,
});

const searchWords = async (req, res, next) => {
  try {
    const { error, value } = searchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ message: 'Kërkimi është i pavlefshëm.' });
    }

    const query = value.q.toLowerCase();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT *
         FROM words
         WHERE borrowed_word ILIKE $1
            OR correct_albanian ILIKE $1
         ORDER BY similarity(borrowed_word, $2) DESC, similarity(correct_albanian, $2) DESC
         LIMIT 10`,
        [`%${query}%`, query]
      );

      const words = result.rows;
      const wordIds = words.map((word) => word.id);

      let definitions = [];
      let conjugations = [];
      if (wordIds.length) {
        const definitionsResult = await client.query(
          'SELECT * FROM definitions WHERE word_id = ANY($1) ORDER BY definition_order ASC',
          [wordIds]
        );
        definitions = definitionsResult.rows;

        const conjugationsResult = await client.query(
          'SELECT * FROM conjugations WHERE word_id = ANY($1)',
          [wordIds]
        );
        conjugations = conjugationsResult.rows;
      }

      const response = words.map((word) =>
        mapWord(
          word,
          definitions.filter((def) => def.word_id === word.id),
          conjugations.filter((conj) => conj.word_id === word.id)
        )
      );

      if (!response.length) {
        return res.status(404).json({ message: 'Nuk u gjetën rezultate.' });
      }

      // Log the search and, for signed-in users, evaluate the search-driven
      // achievements in ONE transaction so the log row that earns first_search /
      // word_explorer commits together with the unlock. Best-effort: any failure here
      // must never fail the search itself — roll back, log, and still return results.
      try {
        if (req.user?.uuid) {
          await client.query('BEGIN');
          await client.query(
            'INSERT INTO search_logs (search_term, found, ip_address, user_id) VALUES ($1, true, $2, $3)',
            [query, req.ip, req.user.uuid]
          );
          await unlockAchievementByKey(client, req.user.uuid, 'first_search');
          const distinct = await client.query(
            'SELECT count(DISTINCT search_term)::int AS n FROM search_logs WHERE user_id = $1 AND found = true',
            [req.user.uuid]
          );
          if (distinct.rows[0].n >= WORD_EXPLORER_THRESHOLD) {
            await unlockAchievementByKey(client, req.user.uuid, 'word_explorer');
          }
          await client.query('COMMIT');
        } else {
          await client.query(
            'INSERT INTO search_logs (search_term, found, ip_address, user_id) VALUES ($1, true, $2, $3)',
            [query, req.ip, null]
          );
        }
      } catch (logError) {
        if (req.user?.uuid) {
          await client.query('ROLLBACK').catch(() => {});
        }
        console.error('[search_logs_insert_failed]', logError);
      }

      return res.json({ results: response });
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

// Accepts either a numeric id (legacy URLs) or a slug (WEB-2). Always returns the
// word's canonical `slug` so the frontend can redirect id/non-canonical URLs. Joins
// the origin name for the badge and returns the enriched example pairs.
const getWordById = async (req, res, next) => {
  try {
    const param = req.params.id;
    const byNumericId = /^\d+$/.test(param); // constant branch — value stays parameterized
    const client = await pool.connect();
    try {
      const wordResult = await client.query(
        `SELECT w.*, o.name_sq AS origin_name
           FROM words w
           LEFT JOIN origins o ON o.code = w.origin_language
          WHERE ${byNumericId ? 'w.id = $1' : 'w.slug = $1'}`,
        [param]
      );
      if (!wordResult.rows.length) {
        return res.status(404).json({ message: 'Fjala nuk u gjet.' });
      }

      const word = wordResult.rows[0];
      const [definitionsResult, conjugationsResult, examplesResult] = await Promise.all([
        client.query(
          'SELECT * FROM definitions WHERE word_id = $1 ORDER BY definition_order ASC',
          [word.id]
        ),
        client.query('SELECT * FROM conjugations WHERE word_id = $1', [word.id]),
        client.query(
          'SELECT id, sentence_loan, sentence_clean FROM word_examples WHERE word_id = $1 ORDER BY id ASC',
          [word.id]
        ),
      ]);

      // FEAT-1: count this word-detail access (the one honest per-word signal — a
      // direct fetch of a specific word, unlike a 10-result search list). Single
      // PK-indexed upsert, counts only (no PII). Best-effort: a counter failure must
      // never fail the fetch, so it is logged, not thrown.
      try {
        await client.query(
          `INSERT INTO word_access_daily (word_id, day, views)
           VALUES ($1, CURRENT_DATE, 1)
           ON CONFLICT (word_id, day) DO UPDATE SET views = word_access_daily.views + 1`,
          [word.id]
        );
      } catch (accessError) {
        console.error('[word_access_daily_upsert_failed]', accessError);
      }

      return res.json({
        word: {
          ...mapWord(word, definitionsResult.rows, conjugationsResult.rows),
          examples: examplesResult.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

const getWordOfTheDay = async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const wordOfDayResult = await client.query(
        `SELECT w.*, wotd.display_date
         FROM word_of_the_day wotd
         JOIN words w ON w.id = wotd.word_id
         WHERE wotd.display_date = CURRENT_DATE
         LIMIT 1`
      );

      if (!wordOfDayResult.rows.length) {
        return res.status(404).json({ message: 'Fjala e ditës nuk është vendosur ende.' });
      }

      const word = wordOfDayResult.rows[0];
      const definitionsResult = await client.query(
        'SELECT * FROM definitions WHERE word_id = $1 ORDER BY definition_order ASC',
        [word.id]
      );
      const conjugationsResult = await client.query('SELECT * FROM conjugations WHERE word_id = $1', [word.id]);

      return res.json({
        word: mapWord(word, definitionsResult.rows, conjugationsResult.rows),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

const getRandomWord = async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM words ORDER BY RANDOM() LIMIT 1');
      if (!result.rows.length) {
        return res.status(404).json({ message: 'Nuk ka fjalë në bazë.' });
      }
      const word = result.rows[0];
      const definitionsResult = await client.query(
        'SELECT * FROM definitions WHERE word_id = $1 ORDER BY definition_order ASC',
        [word.id]
      );
      const conjugationsResult = await client.query('SELECT * FROM conjugations WHERE word_id = $1', [word.id]);

      return res.json({
        word: mapWord(word, definitionsResult.rows, conjugationsResult.rows),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

const getPopularWords = async (req, res, next) => {
  try {
    // Only 'replace' words: this feeds the quiz (a heritage word has no answer to
    // grade) and the homepage "swap this loanword" cards. Legacy rows default to
    // 'replace', so nothing is lost until heritage content is imported.
    const result = await pool.query(
      `SELECT w.*
       FROM words w
       WHERE w.word_type = 'replace'
       ORDER BY w.usage_count DESC, w.borrowed_word ASC
       LIMIT 10`
    );

    return res.json({ words: result.rows });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  searchWords,
  getWordById,
  getWordOfTheDay,
  getRandomWord,
  getPopularWords,
};
