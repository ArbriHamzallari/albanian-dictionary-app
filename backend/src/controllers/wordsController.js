const pool = require('../utils/db');
const { searchSchema } = require('../utils/validation');

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

      await client.query(
        'INSERT INTO search_logs (search_term, found, ip_address) VALUES ($1, $2, $3)',
        [query, response.length > 0, req.ip]
      );

      if (!response.length) {
        return res.status(404).json({ message: 'Nuk u gjetën rezultate.' });
      }

      return res.json({ results: response });
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

const getWordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const wordResult = await client.query('SELECT * FROM words WHERE id = $1', [id]);
      if (!wordResult.rows.length) {
        return res.status(404).json({ message: 'Fjala nuk u gjet.' });
      }

      const word = wordResult.rows[0];
      const definitionsResult = await client.query(
        'SELECT * FROM definitions WHERE word_id = $1 ORDER BY definition_order ASC',
        [id]
      );
      const conjugationsResult = await client.query('SELECT * FROM conjugations WHERE word_id = $1', [id]);

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
    const result = await pool.query(
      `SELECT w.*
       FROM words w
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
