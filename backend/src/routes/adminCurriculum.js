const express = require('express');
const {
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
} = require('../controllers/curriculumController');

// Mounted at /api/admin/curriculum. Auth + admin gating is applied by the
// parent admin router (authenticate, authorizeAdmin), so no middleware here.
const router = express.Router();

// Units
router.get('/units', listUnits);
router.get('/units/:id', getUnit);
router.post('/units', createUnit);
router.put('/units/:id', updateUnit);
router.delete('/units/:id', deleteUnit);

// Lessons (optionally filter by ?unit_id=)
router.get('/lessons', listLessons);
router.get('/lessons/:id', getLesson);
router.post('/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// Exercises (optionally filter by ?lesson_id=)
router.get('/exercises', listExercises);
router.get('/exercises/:id', getExercise);
router.post('/exercises', createExercise);
router.put('/exercises/:id', updateExercise);
router.delete('/exercises/:id', deleteExercise);

module.exports = router;
