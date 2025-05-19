// backend/routes/scores.js
import express from 'express';
import auth from '../middleware/auth.js';
import { getLeaderboard } from '../services/sportContentApiFree.js';
import League from '../models/League.js';
import Score from '../models/Score.js';

const router = express.Router();

// GET /api/scores/:leagueId
// Returns current scores (to-par) for each golfer in the league, clamped at cut if applicable
router.get('/:leagueId', auth, async (req, res) => {
  try {
    // 1) Load league to get draft picks and cut handling
    const league = await League.findById(req.params.leagueId).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });
    const golferIds = league.draftPicks.map(p => p.golfer);

    // 2) Fetch live leaderboard data from SportContentAPI
    const lbData = await getLeaderboard();
    const players = Array.isArray(lbData.players)
      ? lbData.players
      : lbData.leaderboard || [];

    // Extract cut line if provided
    const rawCut = lbData.cut_line ?? lbData.cutLine ?? null;
    const cutActive =
      league.cutHandling === 'cap' &&
      typeof rawCut === 'number' && rawCut > 0;
    const cutScore = cutActive ? rawCut : null;

    // 3) Build scores array, clamping strokes at cut if needed
    const scores = golferIds.map(id => {
      // find matching player by id property
      const pl = players.find(
        p => p.player_id?.toString() === id || p.playerId?.toString() === id
      );
      const toPar = pl?.score_to_par ?? pl?.scoreToPar ?? null;

      let final = toPar;
      if (cutScore != null && toPar != null && toPar > cutScore) {
        final = cutScore;
      }

      return { golfer: id, strokes: final };
    });

    // 4) Upsert into Score collection
    const bulkOps = scores.map(s => ({
      updateOne: {
        filter: { golfer: s.golfer },
        update: { $set: { strokes: s.strokes, updatedAt: new Date() } },
        upsert: true
      }
    }));
    await Score.bulkWrite(bulkOps);

    // 5) Return scores
    res.json({ scores });
  } catch (err) {
    console.error('❌ [scores] ERROR:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
