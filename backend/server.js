const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const wordsRoutes = require('./src/routes/words');
const suggestionsRoutes = require('./src/routes/suggestions');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');

const app = express();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({
  origin: frontendUrl,
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

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/words', wordsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  const isDev = process.env.NODE_ENV !== 'production';
  const message = isDev && err.message
    ? err.message
    : 'Ndodhi një gabim i brendshëm. Ju lutem provoni më vonë.';
  res.status(500).json({ message });
});

const port = process.env.PORT || 5000;

if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL is not set. Create backend/.env from .env.example and set DATABASE_URL. Database requests will fail.');
}
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Set JWT_SECRET in backend/.env for admin login to work.');
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
