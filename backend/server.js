// backend/server.js
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ─── Force-load backend/.env and debug ────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const envPath    = path.resolve(__dirname, '.env');
console.log('→ loading env from', envPath);
dotenv.config({ path: envPath });
console.log('→ JWT_SECRET is', process.env.JWT_SECRET ? '[SET]' : '[NOT SET]');

// ─── Imports ───────────────────────────────────────────────────────────────────
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import scoresRoutes       from './routes/scores.js';
import draftRoutes        from './routes/draft.js';
import teamRoutes         from './routes/team.js';
import authRoutes         from './routes/auth.js';
import leaguesRoutes      from './routes/leagues.js';
import leaderboardRoutes  from './routes/leaderboard.js';
import golferRoutes       from './routes/golfers.js';

// ─── App initialization ───────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5025;

// ─── Validate critical env vars ────────────────────────────────────────────────
const { FRONTEND_URL, MONGO_URI } = process.env;
if (!FRONTEND_URL) {
  console.error('❌ Server misconfiguration: FRONTEND_URL not set');
  process.exit(1);
}
if (!MONGO_URI) {
  console.error('❌ Server misconfiguration: MONGO_URI not set');
  process.exit(1);
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: FRONTEND_URL,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/scores',    scoresRoutes);
app.use('/api/leagues',   draftRoutes);
app.use('/api/leagues',   teamRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/leagues',   leaguesRoutes);
app.use('/api/leagues',   leaderboardRoutes);
app.use('/api/golfers',   golferRoutes);

// ─── Database connection & server start ───────────────────────────────────────
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✔️ MongoDB connected');
  app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
