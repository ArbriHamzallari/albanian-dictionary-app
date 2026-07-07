const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, guestUpgrade, heartbeat, consentCheck, refresh, logout, googleAuth, completeProfile, deleteAccount } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Shumë tentativa. Provoni përsëri më vonë.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', register);
router.post('/consent-check', consentCheck);
router.post('/login', loginLimiter, login);
router.post('/google', loginLimiter, googleAuth);
router.post('/complete-profile', authenticate, completeProfile);
router.get('/me', authenticate, me);
router.post('/heartbeat', authenticate, heartbeat);
router.post('/guest-upgrade', guestUpgrade);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.delete('/account', authenticate, deleteAccount);

module.exports = router;
