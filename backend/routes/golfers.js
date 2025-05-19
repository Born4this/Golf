// backend/routes/golfers.js
import express from 'express';
import auth from '../middleware/auth.js';
import { getLeaderboard } from '../services/sportContentApiFree.js';

const router = express.Router();

// GET /api/golfers/:leagueId
// Returns the full field (golfer IDs + names) for the next PGA event
router.get('/:leagueId', auth, async (req, res) => {
  try {
    // 1) Fetch the leaderboard (cached under the hood)
    const lbData = await getLeaderboard();
    const players = lbData.players || [];

    // 2) Map into { id, name } format
    const field = players.map(p => ({
      id: p.playerId.toString(),
      name: p.name
    }));

    res.json({ field });
  } catch (err) {
    console.error('❌ [golfers] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
