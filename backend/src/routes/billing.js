const express = require('express');
const { authenticate } = require('../middleware/auth');
const { checkoutConfig, getSubscription, paddleWebhook } = require('../controllers/billingController');

const router = express.Router();

router.get('/checkout-config', authenticate, checkoutConfig);
router.get('/subscription', authenticate, getSubscription);
router.post('/webhook', paddleWebhook);

module.exports = router;
