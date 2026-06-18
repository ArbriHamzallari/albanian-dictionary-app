const express = require('express');
const {
  searchWords,
  getWordById,
  getWordOfTheDay,
  getRandomWord,
  getPopularWords,
} = require('../controllers/wordsController');
const { optionalAuthenticate } = require('../middleware/auth');
const { isPremium, enforceDailySearchLimit } = require('../middleware/entitlements');

const router = express.Router();

router.get('/search', optionalAuthenticate, isPremium, enforceDailySearchLimit, searchWords);
router.get('/word-of-the-day', getWordOfTheDay);
router.get('/random', getRandomWord);
router.get('/popular', getPopularWords);
router.get('/:id', getWordById);

module.exports = router;
