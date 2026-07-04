const express = require('express');
const { getPublicStats, getOrigins, getOriginByCode } = require('../controllers/publicController');

const router = express.Router();

// Public, unauthenticated homepage stats.
router.get('/stats', getPublicStats);

// Public origin histories (the /origjina narrative spine). No auth; CDN-cacheable.
router.get('/origins', getOrigins);
router.get('/origins/:code', getOriginByCode);

module.exports = router;
