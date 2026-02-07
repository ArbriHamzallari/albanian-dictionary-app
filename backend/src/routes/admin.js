const express = require('express');
const {
  createWord,
  updateWord,
  deleteWord,
  setWordOfDay,
  getTopSearches,
} = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.post('/words', createWord);
router.put('/words/:id', updateWord);
router.delete('/words/:id', deleteWord);
router.post('/word-of-the-day', setWordOfDay);
router.get('/analytics/top-searches', getTopSearches);

module.exports = router;
