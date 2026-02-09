const express = require('express');
const { updateProfile, updateAvatar, getPublicProfile } = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Authenticated profile edits
router.put('/', authenticate, updateProfile);
router.put('/avatar', authenticate, updateAvatar);

// Public profile view
router.get('/:uuid', getPublicProfile);

module.exports = router;
