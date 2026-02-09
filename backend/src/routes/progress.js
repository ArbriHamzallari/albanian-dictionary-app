const express = require('express');
const { submitQuiz } = require('../controllers/progressController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/quiz', authenticate, submitQuiz);

module.exports = router;
