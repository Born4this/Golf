import express from 'express';
import { getLeaderboard } from '../services/sportContentApiFree.js';

const router = express.Router();

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h (matches service refresh)

// GET /api/golfers/current 
router.get('/current', async (req, res) => {
  try {
    // Reuse cache if fresh
    const now = Date.now();
    if (_cache && now - _cacheAt < CACHE_TTL) {
      return res.json({ field: _cache });
    }

    const lb = await getLeaderboard();
    const event        = lb.events?.[0];
    const competitors  = event?.competitions?.[0]?.competitors || [];

    // [{ id, name }]
    const field = competitors.map(c => ({
      id:   c.athlete.id.toString(),
      name: c.athlete.displayName || c.athlete.shortName || c.athlete.fullName,
    }));

    _cache   = field;
    _cacheAt = now;

    res.json({ field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] ESPN fetch failed:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;