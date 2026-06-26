const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const wordsRoutes = require('./src/routes/words');
const suggestionsRoutes = require('./src/routes/suggestions');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const profileRoutes = require('./src/routes/profile');
const avatarsRoutes = require('./src/routes/avatars');
const progressRoutes = require('./src/routes/progress');
const lessonsRoutes = require('./src/routes/lessons');
const questsRoutes = require('./src/routes/quests');
const leaguesRoutes = require('./src/routes/leagues');
const cronRoutes = require('./src/routes/cron');
const leaderboardRoutes = require('./src/routes/leaderboard');
const friendsRoutes = require('./src/routes/friends');
const chatRoutes = require('./src/routes/chat');
const notificationsRoutes = require('./src/routes/notifications');
const billingRoutes = require('./src/routes/billing');
const { csrfProtection } = require('./src/middleware/csrf');
const pool = require('./src/utils/db');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Behind a TLS-terminating proxy (Fly/Render) so req.ip and req.secure
// reflect the client, and Secure cookies behave correctly.
if (isProduction) {
  app.set('trust proxy', 1);
}

// Paddle.js loads from cdn.paddle.com and opens checkout iframes from
// *.paddle.com; allow exactly those. style-src keeps 'unsafe-inline' until the
// design-system styles are externalized.
const PADDLE = 'https://*.paddle.com';
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://cdn.paddle.com', PADDLE],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'", PADDLE],
  frameSrc: ["'self'", PADDLE],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'self'"],
};
const normalizeOrigin = (origin) => origin.replace(/\/+$/, '');

function parseOriginList(value) {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin));
}

function buildCorsOrigins() {
  const origins = [];
  if (isProduction) {
    origins.push(...parseOriginList(process.env.FRONTEND_URL));
    if (process.env.FRONTEND_URL_ALT?.trim()) {
      origins.push(normalizeOrigin(process.env.FRONTEND_URL_ALT.trim()));
    }
  } else {
    origins.push(
      normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:5173'),
      normalizeOrigin(process.env.FRONTEND_URL_ALT || 'http://localhost:5174'),
    );
  }
  origins.push(...parseOriginList(process.env.FRONTEND_URL_EXTRA));
  return [...new Set(origins.filter(Boolean))];
}

const corsOrigins = buildCorsOrigins();

app.use(helmet({
  contentSecurityPolicy: { directives: cspDirectives },
  // HSTS is sent only over HTTPS; harmless in dev (browsers ignore it on http).
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = normalizeOrigin(origin);
    if (corsOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// CSRF for cookie-authenticated, state-changing requests (no-op for Bearer/
// webhook/cron requests that carry no session cookie).
app.use(csrfProtection);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Shumë tentativa. Provoni përsëri më vonë.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', async (req, res) => {
  let db = 'fail';
  try {
    await pool.query('SELECT 1');
    db = 'ok';
  } catch (err) {
    console.error('Health check DB error:', err.message);
  }
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    db,
  });
});

app.use('/api/words', wordsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/avatars', avatarsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/billing', billingRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const isDev = process.env.NODE_ENV !== 'production';
  const message = isDev && err.message
    ? err.message
    : 'Ndodhi një gabim i brendshëm. Ju lutem provoni më vonë.';
  res.status(500).json({ message });
});

const port = process.env.PORT || 5000;

if (isProduction) {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    console.error('Production requires DATABASE_URL and JWT_SECRET in backend/.env');
    process.exit(1);
  }
  if (!corsOrigins.length) {
    console.error(
      'Production requires at least one CORS origin. Set FRONTEND_URL (and optionally FRONTEND_URL_ALT or FRONTEND_URL_EXTRA).'
    );
    process.exit(1);
  }
} else {
  if (!process.env.DATABASE_URL) {
    console.warn('Warning: DATABASE_URL is not set. Create backend/.env from .env.example.');
  }
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Admin login will not work.');
  }
}

if (require.main === module) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the process using that port or set a different PORT in .env.`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });
}

module.exports = app;
