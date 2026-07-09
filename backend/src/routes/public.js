const express = require('express');
const {
  getPublicStats,
  getOrigins,
  getOriginByCode,
  getDemoQuestion,
  postDemoAnswer,
} = require('../controllers/publicController');

const router = express.Router();

// Public, unauthenticated homepage stats.
router.get('/stats', getPublicStats);

// Public origin histories (the /origjina narrative spine). No auth; CDN-cacheable.
router.get('/origins', getOrigins);
router.get('/origins/:code', getOriginByCode);

// Landing playable demo (UI-1): one spot-the-loanword question, graded server-side.
// No auth, no session, no XP; rate-limited by the global /api limiter.
router.get('/demo-question', getDemoQuestion);
router.post('/demo-answer', postDemoAnswer);

module.exports = router;
