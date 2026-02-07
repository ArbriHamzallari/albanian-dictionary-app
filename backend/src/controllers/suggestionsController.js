const pool = require('../utils/db');
const { suggestionSchema } = require('../utils/validation');

const submitSuggestion = async (req, res, next) => {
  try {
    const { error, value } = suggestionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e propozimit janë të pavlefshme.' });
    }

    const result = await pool.query(
      `INSERT INTO word_suggestions
      (borrowed_word, suggested_albanian, suggested_definition, submitter_name, submitter_email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        value.borrowed_word,
        value.suggested_albanian || null,
        value.suggested_definition || null,
        value.submitter_name || null,
        value.submitter_email || null,
      ]
    );

    return res.status(201).json({
      message: 'Faleminderit! Propozimi juaj u dërgua me sukses.',
      suggestion: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

const getSuggestions = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM word_suggestions ORDER BY created_at DESC');
    return res.json({ suggestions: result.rows });
  } catch (error) {
    return next(error);
  }
};

const approveSuggestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const suggestionResult = await client.query('SELECT * FROM word_suggestions WHERE id = $1', [id]);
      if (!suggestionResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Propozimi nuk u gjet.' });
      }

      const suggestion = suggestionResult.rows[0];

      const wordResult = await client.query(
        `INSERT INTO words
        (borrowed_word, correct_albanian, category, is_verified, added_by)
        VALUES ($1, $2, $3, true, $4)
        RETURNING *`,
        [
          suggestion.borrowed_word,
          suggestion.suggested_albanian || suggestion.borrowed_word,
          'Emër',
          req.user.id,
        ]
      );

      if (suggestion.suggested_definition) {
        await client.query(
          `INSERT INTO definitions (word_id, definition_text, example_sentence)
           VALUES ($1, $2, $3)`,
          [wordResult.rows[0].id, suggestion.suggested_definition, null]
        );
      }

      await client.query(
        `UPDATE word_suggestions
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Propozimi u aprovua me sukses.' });
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

const rejectSuggestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE word_suggestions
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Propozimi nuk u gjet.' });
    }

    return res.json({ message: 'Propozimi u refuzua.' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitSuggestion,
  getSuggestions,
  approveSuggestion,
  rejectSuggestion,
};
