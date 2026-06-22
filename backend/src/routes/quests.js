const express = require('express');
const { getToday, claimToday } = require('../controllers/questsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/today', authenticate, getToday);
router.post('/today/claim', authenticate, claimToday);

module.exports = router;
