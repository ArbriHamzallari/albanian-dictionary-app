const express = require('express');
const { getMe, getLastResult } = require('../controllers/leaguesController');
const { authenticate } = require('../middleware/auth');
const { isPremium } = require('../middleware/entitlements');

const router = express.Router();

// isPremium populates req.entitlement so /me can surface the ari upgrade prompt.
router.get('/me', authenticate, isPremium, getMe);
router.get('/last-result', authenticate, getLastResult);

module.exports = router;
