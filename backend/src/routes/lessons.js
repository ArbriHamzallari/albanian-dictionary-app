const express = require('express');
const { getLesson, submitLesson, practiceMistakes } = require('../controllers/lessonController');
const { authenticate } = require('../middleware/auth');
const { isPremium, requirePremium } = require('../middleware/entitlements');

const router = express.Router();

// Practice Mistakes (Premium). Registered before /:lessonId so the literal path
// is matched as an exact route rather than captured as a lessonId.
router.get('/practice-mistakes', authenticate, isPremium, requirePremium, practiceMistakes);

// Lesson player. isPremium populates req.entitlement; the controller enforces
// the free-tier / lesson-lock rules. submitLesson also handles practice mode
// when :lessonId === 'practice' (it checks Premium internally).
router.get('/:lessonId', authenticate, isPremium, getLesson);
router.post('/:lessonId/submit', authenticate, isPremium, submitLesson);

module.exports = router;
