const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getNotifications } = require('../controllers/notificationsController');

const router = express.Router();

router.get('/', authenticate, getNotifications);

module.exports = router;
