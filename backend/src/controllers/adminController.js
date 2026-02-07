const pool = require('../utils/db');
const { wordSchema, wordOfDaySchema } = require('../utils/validation');

const createWord = async (req, res, next) => {
  try {
    const { error, value } = wordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e fjalës janë të pavlefshme.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const wordResult = await client.query(
        `INSERT INTO words
        (borrowed_word, correct_albanian, category, difficulty_level, is_verified, added_by)
        VALUES ($1, $2, $3, $4, true, $5)
        RETURNING *`,
        [
          value.borrowed_word,
          value.correct_albanian,
          value.category || null,
          value.difficulty_level || null,
          req.user.id,
        ]
      );

      const word = wordResult.rows[0];
      for (const definition of value.definitions) {
        await client.query(
          `INSERT INTO definitions
          (word_id, definition_text, example_sentence, definition_order)
          VALUES ($1, $2, $3, $4)`,
          [
            word.id,
            definition.definition_text,
            definition.example_sentence || null,
            definition.definition_order || 1,
          ]
        );
      }

      if (value.conjugations) {
        for (const conjugation of value.conjugations) {
          await client.query(
            `INSERT INTO conjugations
            (word_id, conjugation_type, conjugation_text)
            VALUES ($1, $2, $3)`,
            [word.id, conjugation.conjugation_type, conjugation.conjugation_text]
          );
        }
      }

      await client.query('COMMIT');
      return res.status(201).json({ word });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

const updateWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, value } = wordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e fjalës janë të pavlefshme.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const wordResult = await client.query(
        `UPDATE words
         SET borrowed_word = $1,
             correct_albanian = $2,
             category = $3,
             difficulty_level = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          value.borrowed_word,
          value.correct_albanian,
          value.category || null,
          value.difficulty_level || null,
          id,
        ]
      );

      if (!wordResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Fjala nuk u gjet.' });
      }

      await client.query('DELETE FROM definitions WHERE word_id = $1', [id]);
      await client.query('DELETE FROM conjugations WHERE word_id = $1', [id]);

      for (const definition of value.definitions) {
        await client.query(
          `INSERT INTO definitions
          (word_id, definition_text, example_sentence, definition_order)
          VALUES ($1, $2, $3, $4)`,
          [
            id,
            definition.definition_text,
            definition.example_sentence || null,
            definition.definition_order || 1,
          ]
        );
      }

      if (value.conjugations) {
        for (const conjugation of value.conjugations) {
          await client.query(
            `INSERT INTO conjugations
            (word_id, conjugation_type, conjugation_text)
            VALUES ($1, $2, $3)`,
            [id, conjugation.conjugation_type, conjugation.conjugation_text]
          );
        }
      }

      await client.query('COMMIT');
      return res.json({ word: wordResult.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return next(error);
  }
};

const deleteWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM words WHERE id = $1 RETURNING *', [id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Fjala nuk u gjet.' });
    }
    return res.json({ message: 'Fjala u fshi me sukses.' });
  } catch (error) {
    return next(error);
  }
};

const setWordOfDay = async (req, res, next) => {
  try {
    const { error, value } = wordOfDaySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e fjalës së ditës janë të pavlefshme.' });
    }

    const result = await pool.query(
      `INSERT INTO word_of_the_day (word_id, display_date)
       VALUES ($1, $2)
       ON CONFLICT (display_date)
       DO UPDATE SET word_id = EXCLUDED.word_id
       RETURNING *`,
      [value.word_id, value.display_date]
    );

    return res.json({ word_of_the_day: result.rows[0] });
  } catch (error) {
    return next(error);
  }
};

const getTopSearches = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT search_term, COUNT(*) as total
       FROM search_logs
       GROUP BY search_term
       ORDER BY total DESC
       LIMIT 10`
    );
    return res.json({ top_searches: result.rows });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createWord,
  updateWord,
  deleteWord,
  setWordOfDay,
  getTopSearches,
};
