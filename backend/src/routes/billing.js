const express = require('express');
const { authenticate } = require('../middleware/auth');
const { checkoutConfig, paddleWebhook } = require('../controllers/billingController');

const router = express.Router();

router.get('/checkout-config', authenticate, checkoutConfig);
router.post('/webhook', paddleWebhook);

module.exports = router;
