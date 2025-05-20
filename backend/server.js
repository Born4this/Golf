// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { errors as celebrateErrors } from 'celebrate';

dotenv.config();

import scoresRoutes from './routes/scores.js';
import draftRoutes from './routes/draft.js';
import teamRoutes from './routes/team.js';
import authRoutes from './routes/auth.js';
import leaguesRoutes from './routes/leagues.js';
import leaderboardRoutes from './routes/leaderboard.js';
import golferRoutes from './routes/golfers.js';

const app = express();
const PORT = process.env.PORT || 5025;

// Trust proxy headers (e.g., X-Forwarded-For) for rate limiting
app.set('trust proxy', 1);

// Ensure FRONTEND_URL is set
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('❌ Server misconfiguration: FRONTEND_URL not set');
  process.exit(1);
}

// 1) Security headers
app.use(helmet());

// 2) CORS: only allow specified frontends
const allowedOrigins = [
  FRONTEND_URL,
  FRONTEND_URL.startsWith('https://')
    ? FRONTEND_URL.replace('https://', 'https://www.')
    : FRONTEND_URL
];
app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      if (!incomingOrigin) return callback(null, true);
      if (allowedOrigins.includes(incomingOrigin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy: origin ${incomingOrigin} not allowed`));
    },
    optionsSuccessStatus: 200
  })
);

// 3) Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4) NoSQL injection sanitization (body & params only)
const { sanitize } = mongoSanitize;
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);
  next();
});

// 5) Rate limiting (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', apiLimiter);

// 6) Prevent HTTP parameter pollution
app.use(hpp());

// Routes
app.use('/api/scores', scoresRoutes);
app.use('/api/leagues', draftRoutes);
app.use('/api/leagues', teamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/leagues', leaderboardRoutes);
app.use('/api/golfers', golferRoutes);

// Celebrate error handler (for Joi validations)
app.use(celebrateErrors());

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✔️ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
