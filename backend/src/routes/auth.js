const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, me, guestUpgrade } = require('../controllers/authController');
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
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);
router.post('/guest-upgrade', guestUpgrade);

module.exports = router;
