// backend/routes/golfers.js – ESPN version (mirrors old RapidAPI logic)
import express from 'express';
import { getLeaderboard } from '../services/sportContentApiFree.js';

const router = express.Router();

// Response cache so multiple clients within the TTL share the same field list
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 h (matches service refresh)

// GET /api/golfers/current – returns field list for the event picked by service
router.get('/current', async (req, res) => {
  try {
    // Reuse cache if fresh
    const now = Date.now();
    if (_cache && now - _cacheAt < CACHE_TTL) {
      return res.json({ field: _cache });
    }

    // 1) Pull live leaderboard (service already picks event with Monday logic & caches ESPN)
    const lb = await getLeaderboard();
    const event        = lb.events?.[0];
    const competitors  = event?.competitions?.[0]?.competitors || [];

    // 2) Normalise into [{ id, name }]
    const field = competitors.map(c => ({
      id:   c.athlete.id.toString(),
      name: c.athlete.displayName || c.athlete.shortName || c.athlete.fullName,
    }));

    // 3) Update route-level cache
    _cache   = field;
    _cacheAt = now;

    res.json({ field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] ESPN fetch failed:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;