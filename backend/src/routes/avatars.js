const express = require('express');
const { getAvatarList } = require('../utils/avatars');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const avatars = getAvatarList();
    return res.json({ avatars });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
