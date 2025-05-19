// backend/routes/golfers.js
import express from 'express';
import { getLeaderboard } from '../services/sportContentApiFree.js';

const router = express.Router();

// GET /api/golfers/current
// Returns the next PGA event’s full field (golfer IDs + names)
router.get('/current', async (req, res) => {
  try {
    // 1) Pull the cached leaderboard (players & cutLine)
    const lbData = await getLeaderboard();

    // 2) Map into { id, name } for each golfer
    //    (RapidAPI returns playerId & name on root of each object)
    const players = lbData.players || [];
    const field   = players.map(p => ({
      id:   p.playerId.toString(),
      name: p.name
    }));

    // 3) Optional: tournament title if your free‐tier meta includes it
    const tournamentName = lbData.meta?.title || 'Upcoming PGA Event';

    res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] RapidAPI error:', err);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
