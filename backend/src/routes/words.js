const express = require('express');
const {
  searchWords,
  getWordById,
  getWordOfTheDay,
  getRandomWord,
  getPopularWords,
} = require('../controllers/wordsController');

const router = express.Router();

router.get('/search', searchWords);
router.get('/word-of-the-day', getWordOfTheDay);
router.get('/random', getRandomWord);
router.get('/popular', getPopularWords);
router.get('/:id', getWordById);

module.exports = router;
