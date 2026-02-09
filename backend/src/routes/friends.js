const express = require('express');
const { authenticate } = require('../middleware/auth');
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

router.post('/request', authenticate, sendRequest);
router.post('/accept', authenticate, acceptRequest);
router.post('/decline', authenticate, declineRequest);
router.post('/cancel', authenticate, cancelRequest);
router.get('/requests', authenticate, listRequests);
router.get('/', authenticate, listFriends);
router.post('/remove', authenticate, removeFriend);

module.exports = router;
