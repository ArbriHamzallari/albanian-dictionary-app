const express = require('express');
const {
  createWord,
  updateWord,
  deleteWord,
  setWordOfDay,
  getTopSearches,
  getAllWords,
} = require('../controllers/adminController');
const { getMetrics } = require('../controllers/metricsController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/words', getAllWords);
router.post('/words', createWord);
router.put('/words/:id', updateWord);
router.delete('/words/:id', deleteWord);
router.post('/word-of-the-day', setWordOfDay);
router.get('/analytics/top-searches', getTopSearches);
router.get('/metrics', getMetrics);

module.exports = router;
