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
const leaderboardRoutes = require('./src/routes/leaderboard');
const friendsRoutes = require('./src/routes/friends');
const notificationsRoutes = require('./src/routes/notifications');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const frontendUrlAlt = process.env.FRONTEND_URL_ALT || 'http://localhost:5174';
const normalizeOrigin = (origin) => origin.replace(/\/+$/, '');
const corsOrigins = [frontendUrl, frontendUrlAlt]
  .filter(Boolean)
  .map((origin) => normalizeOrigin(origin));
if (process.env.FRONTEND_URL_EXTRA) {
  corsOrigins.push(
    ...process.env.FRONTEND_URL_EXTRA
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((origin) => normalizeOrigin(origin))
  );
}

app.use(helmet());
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/words', wordsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/avatars', avatarsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/notifications', notificationsRoutes);

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
} else {
  if (!process.env.DATABASE_URL) {
    console.warn('Warning: DATABASE_URL is not set. Create backend/.env from .env.example.');
  }
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Admin login will not work.');
  }
}

const server = app.listen(port, () => {
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
