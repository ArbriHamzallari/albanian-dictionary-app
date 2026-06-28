const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const { parseCookies } = require('../utils/cookies');

const ACCESS_COOKIE = 'fjalingo_token';

// Token comes from the httpOnly session cookie (browser) or, as a fallback, a
// Bearer Authorization header (API clients, tests, server-to-server).
function extractToken(req) {
  const cookies = parseCookies(req);
  if (cookies[ACCESS_COOKIE]) {
    return cookies[ACCESS_COOKIE];
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

const authenticate = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Kërkohet autorizim.' });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Token i pavlefshëm ose i skaduar.' });
  }
  // The JWT is stateless, so a deleted or admin-suspended account would otherwise
  // keep working until expiry. Check the live row on every authenticated request
  // and reject it immediately.
  try {
    const result = await pool.query(
      'SELECT is_suspended FROM users WHERE uuid = $1::uuid',
      [payload.uuid]
    );
    if (!result.rows.length) {
      return res.status(401).json({ message: 'Token i pavlefshëm ose i skaduar.' });
    }
    if (result.rows[0].is_suspended) {
      return res.status(403).json({ message: 'Llogaria juaj është pezulluar.', code: 'ACCOUNT_SUSPENDED' });
    }
  } catch (error) {
    return next(error);
  }
  req.user = payload;
  return next();
};

const optionalAuthenticate = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    // Treat an invalid/expired token as anonymous rather than erroring.
    return next();
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nuk keni autorizim për këtë veprim.' });
  }
  return next();
};

module.exports = { authenticate, optionalAuthenticate, authorizeAdmin };
