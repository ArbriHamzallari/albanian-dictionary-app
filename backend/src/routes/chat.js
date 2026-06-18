const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { isPremium, requirePremium } = require('../middleware/entitlements');
const {
  blockUser,
  listMessages,
  listPresets,
  reportUser,
  sendMessage,
} = require('../controllers/chatController');

const router = express.Router();

const chatTextLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Shumë mesazhe. Provoni përsëri më vonë.' },
});

router.use(authenticate, isPremium, requirePremium);

router.get('/presets', listPresets);
router.get('/with/:username', listMessages);
router.post('/message', chatTextLimiter, sendMessage);
router.post('/block', chatTextLimiter, blockUser);
router.post('/report', chatTextLimiter, reportUser);

module.exports = router;
