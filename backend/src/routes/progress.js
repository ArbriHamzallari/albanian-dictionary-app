const express = require('express');
const { startQuiz, submitQuiz } = require('../controllers/progressController');
const { authenticate } = require('../middleware/auth');
const { isPremium, enforceDailyQuizLimit } = require('../middleware/entitlements');

const router = express.Router();

router.post('/quiz/start', authenticate, isPremium, enforceDailyQuizLimit, startQuiz);
router.post('/quiz', authenticate, submitQuiz);

module.exports = router;
