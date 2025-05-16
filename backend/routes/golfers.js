// backend/routes/golfers.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET current tournament field with basic player info
router.get('/current', async (req, res) => {
  try {
    // Fetch live leaderboard data from ESPN
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard'
    );

    const event        = data.events?.[0];
    const comps        = event?.competitions?.[0]?.competitors || [];
    const tournamentName = event?.name || 'Unknown Tournament';

    // Map competitor info, including headshot and flag
    const field = comps.map(c => ({
      id: c.athlete.id.toString(),
      name: c.athlete.displayName,
      shortName: c.athlete.shortName,
      headshot: c.athlete.headshot?.href || null,
      flag: c.athlete.flag?.href || null
    }));

    res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] ESPN fetch failed:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
