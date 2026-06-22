const express = require('express');
const { runDailyCron } = require('../controllers/cronController');
const { optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

// Allow an external scheduler with the shared secret, or a logged-in admin.
function authorizeCron(req, res, next) {
  const secret = process.env.CRON_SECRET;
  const provided = req.get('x-cron-secret');
  if (secret && provided && provided === secret) {
    return next();
  }
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Nuk keni autorizim për këtë veprim.' });
}

router.post('/daily', optionalAuthenticate, authorizeCron, runDailyCron);

module.exports = router;
