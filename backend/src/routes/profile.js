const express = require('express');
const rateLimit = require('express-rate-limit');
const { updateProfile, updateAvatar, getPublicProfile, unlockAchievement } = require('../controllers/profileController');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

const profileTextLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Shumë përditësime. Provoni përsëri më vonë.' },
});

// Authenticated profile edits
router.put('/', authenticate, profileTextLimiter, updateProfile);
router.put('/avatar', authenticate, updateAvatar);

// Achievement unlock — authenticated only, intentionally NOT tier-gated so free
// and premium users unlock identically (FEAT-3).
router.post('/achievements/unlock', authenticate, unlockAchievement);

// Public profile view
router.get('/:uuid', optionalAuthenticate, getPublicProfile);

module.exports = router;
