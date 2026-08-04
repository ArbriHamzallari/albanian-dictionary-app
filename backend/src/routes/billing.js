const express = require('express');
const { authenticate } = require('../middleware/auth');
const { checkoutConfig, getSubscription, createPortalSession, paddleWebhook } = require('../controllers/billingController');

const router = express.Router();

router.get('/checkout-config', authenticate, checkoutConfig);
router.get('/subscription', authenticate, getSubscription);
router.post('/portal-session', authenticate, createPortalSession);
router.post('/webhook', paddleWebhook);

module.exports = router;
