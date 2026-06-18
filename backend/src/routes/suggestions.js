const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  submitSuggestion,
  getSuggestions,
  approveSuggestion,
  rejectSuggestion,
} = require('../controllers/suggestionsController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

const suggestionTextLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Shumë propozime. Provoni përsëri më vonë.' },
});

router.post('/', suggestionTextLimiter, submitSuggestion);
router.get('/', authenticate, authorizeAdmin, getSuggestions);
router.put('/:id/approve', authenticate, authorizeAdmin, approveSuggestion);
router.put('/:id/reject', authenticate, authorizeAdmin, rejectSuggestion);

module.exports = router;
