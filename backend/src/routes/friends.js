const express = require('express');
const { authenticate } = require('../middleware/auth');
const { isPremium, requirePremium } = require('../middleware/entitlements');
const {
  sendRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  listRequests,
  listFriends,
  removeFriend,
} = require('../controllers/friendsController');

const router = express.Router();

router.use(authenticate, isPremium, requirePremium);

router.post('/request', sendRequest);
router.post('/accept', acceptRequest);
router.post('/decline', declineRequest);
router.post('/cancel', cancelRequest);
router.get('/requests', listRequests);
router.get('/', listFriends);
router.post('/remove', removeFriend);

module.exports = router;
