const express = require('express');
const {
  createWord,
  updateWord,
  deleteWord,
  setWordOfDay,
  getTopSearches,
  getAllWords,
} = require('../controllers/adminController');
const {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  grantComplimentary,
} = require('../controllers/adminUserController');
const { getMetrics } = require('../controllers/metricsController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const curriculumRoutes = require('./adminCurriculum');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/words', getAllWords);
router.post('/words', createWord);
router.put('/words/:id', updateWord);
router.delete('/words/:id', deleteWord);
router.post('/word-of-the-day', setWordOfDay);
router.get('/analytics/top-searches', getTopSearches);
router.get('/metrics', getMetrics);

// User management (AUTH-5).
router.get('/users', listUsers);
router.get('/users/:uuid', getUser);
router.patch('/users/:uuid', updateUser);
router.delete('/users/:uuid', deleteUser);
router.post('/users/:uuid/grant-complimentary', grantComplimentary);

// Three-level curriculum CRUD (units -> lessons -> exercises).
router.use('/curriculum', curriculumRoutes);

module.exports = router;
