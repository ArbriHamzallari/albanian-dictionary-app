const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, guestUpgrade, heartbeat, consentCheck, refresh, logout, googleAuth, completeProfile, deleteAccount, parentalConsent, withdrawConsent, resendConsent } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Shumë tentativa. Provoni përsëri më vonë.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Re-sending the parental-consent email is limited to 1 per 10 minutes per user (this
// route is authenticated, so key on the user uuid, not the shared IP).
const resendConsentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1,
  keyGenerator: (req) => req.user?.uuid || req.ip,
  message: { message: 'Prisni pak para se ta ridërgoni email-in.', code: 'RESEND_RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', register);
router.post('/consent-check', consentCheck);
// Parental consent: approval/withdrawal are PUBLIC (the parent has no session, only the
// emailed token); resend is for the authenticated pending user and rate-limited.
router.post('/parental-consent', parentalConsent);
router.post('/withdraw-consent', withdrawConsent);
router.post('/resend-consent', authenticate, resendConsentLimiter, resendConsent);
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
