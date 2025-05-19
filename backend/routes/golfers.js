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
    const players = lbData.players || [];

    // 2) Map into { id, name } for each golfer
    const field = players.map(p => ({
      id:   p.playerId.toString(),
      name: p.name
    }));

    // 3) (Optional) Grab tournament title if provided
    const tournamentName = lbData.meta?.title || 'Unknown Tournament';

    res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] RapidAPI fetch failed:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
