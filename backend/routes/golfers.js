// backend/routes/golfers.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/current', async (req, res) => {
  try {
    const { data } = await axios.get('https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard');

    const competitors = data.events?.[0]?.competitions?.[0]?.competitors || [];

    const field = competitors.map(c => ({
      id: c.athlete.id.toString(),
      name: c.athlete.displayName
    }));

    const tournamentName = data.events?.[0]?.name || 'Unknown Tournament';

    res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] ESPN fetch failed:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
