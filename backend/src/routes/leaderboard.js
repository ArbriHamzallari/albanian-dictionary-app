const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboardController');
const { optionalAuthenticate } = require('../middleware/auth');
const { isPremium } = require('../middleware/entitlements');

const router = express.Router();

router.get('/', optionalAuthenticate, isPremium, getLeaderboard);

module.exports = router;
