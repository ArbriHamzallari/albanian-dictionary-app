const express = require('express');
const {
  submitSuggestion,
  getSuggestions,
  approveSuggestion,
  rejectSuggestion,
} = require('../controllers/suggestionsController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', submitSuggestion);
router.get('/', authenticate, authorizeAdmin, getSuggestions);
router.put('/:id/approve', authenticate, authorizeAdmin, approveSuggestion);
router.put('/:id/reject', authenticate, authorizeAdmin, rejectSuggestion);

module.exports = router;
