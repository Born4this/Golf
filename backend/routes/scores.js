// backend/routes/scores.js
import express from 'express';
import auth from '../middleware/auth.js';
import axios from 'axios';
import League from '../models/League.js';
import Score from '../models/Score.js';

const router = express.Router();

// GET /api/scores/:leagueId
router.get('/:leagueId', auth, async (req, res) => {
  try {
    // 1) Load league (to check cutHandling mode)
    const league = await League.findById(req.params.leagueId).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });

    const golferIds = league.draftPicks.map(p => p.golfer);

    // 2) Fetch live leaderboard data from ESPN
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard'
    );
    const event      = data.events?.[0];
    const comps      = event?.competitions?.[0]?.competitors || [];
    const tournament = event?.tournament;

    // Determine cut line if league is in "cap at cut" mode
    const rawCut = tournament?.cutScore;
    const cutScore =
      league.cutHandling === 'cap' && typeof rawCut === 'number' && rawCut > 0
        ? rawCut
        : null;

    // 3) Build scores array, clamping at cutScore if needed
    const scores = golferIds.map(id => {
      const c = comps.find(cmp => cmp.athlete.id.toString() === id);
      // pull the "scoreToPar" statistic, or fall back to displayValue
      const stat = c?.statistics?.find(s => s.name === 'scoreToPar');
      let toPar = null;
      if (stat && typeof stat.value === 'number') {
        toPar = stat.value;
      } else if (c?.score?.displayValue) {
        // e.g. "+3" or "-2"
        toPar = parseInt(c.score.displayValue, 10);
      }

      // If in "cap" mode and cutScore is active, clamp the strokes
      let finalStrokes = toPar;
      if (cutScore != null && toPar != null && toPar > cutScore) {
        finalStrokes = cutScore;
      }

      return { golfer: id, strokes: finalStrokes };
    });

    // 4) Upsert into Score collection
    const bulk = scores.map(s => ({
      updateOne: {
        filter: { golfer: s.golfer },
        update: { $set: { strokes: s.strokes, updatedAt: new Date() } },
        upsert: true
      }
    }));
    await Score.bulkWrite(bulk);

    res.json({ scores });
  } catch (err) {
    console.error('❌ [scores] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
