const pool = require('../utils/db');
const {
  unitSchema,
  lessonSchema,
  validateExercise,
} = require('../utils/exerciseSchemas');
const { logAdminAction } = require('../utils/auditLog');

// ─────────────────────────────────────────────────────────────
// Admin curriculum CRUD: units -> lessons -> exercises.
// Mounted under /api/admin/curriculum, behind authenticate + authorizeAdmin
// (applied by the parent admin router). All SQL is parameterized.
// ─────────────────────────────────────────────────────────────

function isUniqueViolation(err) {
  return err && err.code === '23505';
}
function isForeignKeyViolation(err) {
  return err && err.code === '23503';
}

// ── Units ────────────────────────────────────────────────────
const listUnits = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM units ORDER BY order_index ASC, created_at ASC');
    return res.json({ units: result.rows });
  } catch (err) {
    return next(err);
  }
};

const getUnit = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM units WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Njësia nuk u gjet.' });
    }
    const lessons = await pool.query(
      'SELECT * FROM lessons WHERE unit_id = $1 ORDER BY order_index ASC',
      [req.params.id]
    );
    return res.json({ unit: result.rows[0], lessons: lessons.rows });
  } catch (err) {
    return next(err);
  }
};

const createUnit = async (req, res, next) => {
  try {
    const { error, value } = unitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e njësisë janë të pavlefshme.', detail: error.message });
    }
    const result = await pool.query(
      `INSERT INTO units (slug, title, description, icon, color, order_index, is_premium_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        value.slug,
        value.title,
        value.description || null,
        value.icon || null,
        value.color || null,
        value.order_index,
        value.is_premium_unit,
      ]
    );
    await logAdminAction(req, { action: 'unit.create', targetType: 'unit', targetId: result.rows[0].id, metadata: { slug: result.rows[0].slug } });
    return res.status(201).json({ unit: result.rows[0] });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: 'Ekziston tashmë një njësi me këtë slug.' });
    }
    return next(err);
  }
};

const updateUnit = async (req, res, next) => {
  try {
    const { error, value } = unitSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e njësisë janë të pavlefshme.', detail: error.message });
    }
    const result = await pool.query(
      `UPDATE units
       SET slug = $1, title = $2, description = $3, icon = $4, color = $5,
           order_index = $6, is_premium_unit = $7, updated_at = now()
       WHERE id = $8
       RETURNING *`,
      [
        value.slug,
        value.title,
        value.description || null,
        value.icon || null,
        value.color || null,
        value.order_index,
        value.is_premium_unit,
        req.params.id,
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Njësia nuk u gjet.' });
    }
    await logAdminAction(req, { action: 'unit.update', targetType: 'unit', targetId: req.params.id, metadata: { slug: result.rows[0].slug } });
    return res.json({ unit: result.rows[0] });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: 'Ekziston tashmë një njësi me këtë slug.' });
    }
    return next(err);
  }
};

const deleteUnit = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM units WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Njësia nuk u gjet.' });
    }
    await logAdminAction(req, { action: 'unit.delete', targetType: 'unit', targetId: req.params.id });
    return res.json({ message: 'Njësia u fshi me sukses.' });
  } catch (err) {
    return next(err);
  }
};

// ── Lessons ──────────────────────────────────────────────────
const listLessons = async (req, res, next) => {
  try {
    const { unit_id: unitId } = req.query;
    let result;
    if (unitId) {
      result = await pool.query(
        'SELECT * FROM lessons WHERE unit_id = $1 ORDER BY order_index ASC',
        [unitId]
      );
    } else {
      result = await pool.query('SELECT * FROM lessons ORDER BY unit_id ASC, order_index ASC');
    }
    return res.json({ lessons: result.rows });
  } catch (err) {
    return next(err);
  }
};

const getLesson = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
    }
    const exercises = await pool.query(
      'SELECT * FROM exercises WHERE lesson_id = $1 ORDER BY order_index ASC',
      [req.params.id]
    );
    return res.json({ lesson: result.rows[0], exercises: exercises.rows });
  } catch (err) {
    return next(err);
  }
};

const createLesson = async (req, res, next) => {
  try {
    const { error, value } = lessonSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e mësimit janë të pavlefshme.', detail: error.message });
    }
    const result = await pool.query(
      `INSERT INTO lessons (unit_id, slug, title, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [value.unit_id, value.slug, value.title, value.order_index]
    );
    await logAdminAction(req, { action: 'lesson.create', targetType: 'lesson', targetId: result.rows[0].id, metadata: { unit_id: result.rows[0].unit_id, slug: result.rows[0].slug } });
    return res.status(201).json({ lesson: result.rows[0] });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: 'Njësia e referuar nuk ekziston.' });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: 'Ekziston tashmë një mësim me këtë renditje ose slug në këtë njësi.' });
    }
    return next(err);
  }
};

const updateLesson = async (req, res, next) => {
  try {
    const { error, value } = lessonSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e mësimit janë të pavlefshme.', detail: error.message });
    }
    const result = await pool.query(
      `UPDATE lessons
       SET unit_id = $1, slug = $2, title = $3, order_index = $4, updated_at = now()
       WHERE id = $5
       RETURNING *`,
      [value.unit_id, value.slug, value.title, value.order_index, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
    }
    await logAdminAction(req, { action: 'lesson.update', targetType: 'lesson', targetId: req.params.id, metadata: { slug: result.rows[0].slug } });
    return res.json({ lesson: result.rows[0] });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: 'Njësia e referuar nuk ekziston.' });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: 'Ekziston tashmë një mësim me këtë renditje ose slug në këtë njësi.' });
    }
    return next(err);
  }
};

const deleteLesson = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Mësimi nuk u gjet.' });
    }
    await logAdminAction(req, { action: 'lesson.delete', targetType: 'lesson', targetId: req.params.id });
    return res.json({ message: 'Mësimi u fshi me sukses.' });
  } catch (err) {
    return next(err);
  }
};

// ── Exercises ────────────────────────────────────────────────
const listExercises = async (req, res, next) => {
  try {
    const { lesson_id: lessonId } = req.query;
    let result;
    if (lessonId) {
      result = await pool.query(
        'SELECT * FROM exercises WHERE lesson_id = $1 ORDER BY order_index ASC',
        [lessonId]
      );
    } else {
      result = await pool.query('SELECT * FROM exercises ORDER BY lesson_id ASC, order_index ASC');
    }
    return res.json({ exercises: result.rows });
  } catch (err) {
    return next(err);
  }
};

const getExercise = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ushtrimi nuk u gjet.' });
    }
    return res.json({ exercise: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const createExercise = async (req, res, next) => {
  try {
    const { error, value } = validateExercise(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e ushtrimit janë të pavlefshme.', detail: error.message });
    }
    const result = await pool.query(
      `INSERT INTO exercises (lesson_id, order_index, type, prompt, answer, why_it_matters)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING *`,
      [
        value.lesson_id,
        value.order_index,
        value.type,
        JSON.stringify(value.prompt),
        JSON.stringify(value.answer),
        value.why_it_matters || null,
      ]
    );
    await logAdminAction(req, { action: 'exercise.create', targetType: 'exercise', targetId: result.rows[0].id, metadata: { lesson_id: value.lesson_id, type: value.type } });
    return res.status(201).json({ exercise: result.rows[0] });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: 'Mësimi i referuar nuk ekziston.' });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: 'Ekziston tashmë një ushtrim me këtë renditje në këtë mësim.' });
    }
    return next(err);
  }
};

const updateExercise = async (req, res, next) => {
  try {
    const { error, value } = validateExercise(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e ushtrimit janë të pavlefshme.', detail: error.message });
    }
    const result = await pool.query(
      `UPDATE exercises
       SET lesson_id = $1, order_index = $2, type = $3,
           prompt = $4::jsonb, answer = $5::jsonb, why_it_matters = $6, updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [
        value.lesson_id,
        value.order_index,
        value.type,
        JSON.stringify(value.prompt),
        JSON.stringify(value.answer),
        value.why_it_matters || null,
        req.params.id,
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ushtrimi nuk u gjet.' });
    }
    await logAdminAction(req, { action: 'exercise.update', targetType: 'exercise', targetId: req.params.id, metadata: { type: value.type } });
    return res.json({ exercise: result.rows[0] });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return res.status(400).json({ message: 'Mësimi i referuar nuk ekziston.' });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ message: 'Ekziston tashmë një ushtrim me këtë renditje në këtë mësim.' });
    }
    return next(err);
  }
};

const deleteExercise = async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM exercises WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ushtrimi nuk u gjet.' });
    }
    await logAdminAction(req, { action: 'exercise.delete', targetType: 'exercise', targetId: req.params.id });
    return res.json({ message: 'Ushtrimi u fshi me sukses.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
};
