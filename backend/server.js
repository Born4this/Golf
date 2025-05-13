// backend/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env
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

// Ensure we have a frontend origin to allow
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('❌ Server misconfiguration: FRONTEND_URL not set');
  process.exit(1);
}

// Only allow requests from our frontend
// new: allow both with- and without-www
const allowedOrigins = [
  'https://fantasyfairway.com',
  'https://www.fantasyfairway.com'
];

app.use(cors({
  origin: (incomingOrigin, callback) => {
    // allow requests with no origin (e.g. mobile apps, curl)
    if (!incomingOrigin) return callback(null, true);
    if (allowedOrigins.includes(incomingOrigin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: origin ${incomingOrigin} not allowed`));
  },
  optionsSuccessStatus: 200
}));

app.use(express.json());

app.use('/api/scores', scoresRoutes);
app.use('/api/leagues', draftRoutes);
app.use('/api/leagues', teamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/leagues', leaderboardRoutes);
app.use('/api/golfers', golferRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✔️ MongoDB connected');
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
