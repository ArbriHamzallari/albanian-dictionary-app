const { parseCookies } = require('../utils/cookies');

const ACCESS_COOKIE = 'fjalingo_token';
const CSRF_COOKIE = 'fjalingo_csrf';
const CSRF_HEADER = 'x-fjalingo-csrf';
const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Double-submit-cookie CSRF protection.
// The server sets a non-HttpOnly `fjalingo_csrf` cookie at login/refresh; the
// browser client echoes it in the `x-fjalingo-csrf` header on state-changing
// requests. We compare header vs cookie.
//
// Only enforced for COOKIE-authenticated requests: if there is no session
// cookie (Bearer API clients, the Paddle webhook, the cron endpoint), the
// request is not CSRF-applicable and passes through.
function csrfProtection(req, res, next) {
  if (!STATE_CHANGING.has(req.method)) {
    return next();
  }

  const cookies = parseCookies(req);
  if (!cookies[ACCESS_COOKIE]) {
    return next();
  }

  const headerToken = req.get(CSRF_HEADER);
  const cookieToken = cookies[CSRF_COOKIE];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ message: 'Verifikimi i sigurisë dështoi. Rifresko faqen.', code: 'CSRF_FAILED' });
  }

  return next();
}

module.exports = { csrfProtection };
