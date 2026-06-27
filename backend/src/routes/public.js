const express = require('express');
const { getPublicStats } = require('../controllers/publicController');

const router = express.Router();

// Public, unauthenticated homepage stats.
router.get('/stats', getPublicStats);

module.exports = router;
