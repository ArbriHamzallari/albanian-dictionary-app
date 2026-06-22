const express = require('express');
const {
  getLesson,
  submitLesson,
  practiceMistakes,
  practiceMistakesCount,
  getSampleExercise,
  gradeSampleExercise,
  getFirstLesson,
} = require('../controllers/lessonController');
const { authenticate } = require('../middleware/auth');
const { isPremium, requirePremium } = require('../middleware/entitlements');

const router = express.Router();

// Onboarding "first taste" — public, no account, no persistence. Registered
// before /:lessonId so these literal paths are not captured as a lessonId.
router.get('/sample', getSampleExercise);
router.post('/sample/grade', gradeSampleExercise);

// Onboarding hand-off: resolve Unit 1 Lesson 1 after sign-up.
router.get('/first', authenticate, getFirstLesson);

// Practice Mistakes count — authenticated only (free users see the teaser).
// Registered before /practice-mistakes and /:lessonId.
router.get('/practice-mistakes/count', authenticate, practiceMistakesCount);

// Practice Mistakes (Premium). Registered before /:lessonId so the literal path
// is matched as an exact route rather than captured as a lessonId.
router.get('/practice-mistakes', authenticate, isPremium, requirePremium, practiceMistakes);

// Lesson player. isPremium populates req.entitlement; the controller enforces
// the free-tier / lesson-lock rules. submitLesson also handles practice mode
// when :lessonId === 'practice' (it checks Premium internally).
router.get('/:lessonId', authenticate, isPremium, getLesson);
router.post('/:lessonId/submit', authenticate, isPremium, submitLesson);

module.exports = router;
