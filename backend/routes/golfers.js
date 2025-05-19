// backend/routes/golfers.js
import express from 'express';
import { getLeaderboard } from '../services/sportContentApiFree.js';

const router = express.Router();

// GET /api/golfers/current
// Returns the next PGA event’s full field (golfer IDs + names)
router.get('/current', async (req, res) => {
  try {
    // 1) Pull the cached leaderboard
    const lbData = await getLeaderboard();

    // 2) Normalize the list of competitors (free-tier uses 'results', paid uses 'players')
    const rawPlayers = Array.isArray(lbData.results)
      ? lbData.results
      : Array.isArray(lbData.players)
      ? lbData.players
      : [];

    const field = rawPlayers.map(p => {
      // ID may be 'playerId' or 'player_id'
      const id = (p.playerId || p.player_id)?.toString();
      // Name may be 'name' or first/last
      const name =
        p.name ||
        (p.first_name && p.last_name && `${p.first_name} ${p.last_name}`) ||
        'Unknown';
      return { id, name };
    });

    // 3) Optional: get tournament title
    const tournamentName =
      lbData.meta?.title || lbData.tournament?.name || 'Upcoming PGA Event';

    return res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] Error:', err.message);
    return res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;