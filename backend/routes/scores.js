import express from 'express';
import auth from '../middleware/auth.js';
import { getLeaderboard } from '../services/sportContentApiFree.js';
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

    // 2) Fetch leaderboard + cut line from SportContentAPI (cached)
    const lbData = await getLeaderboard();
    const comps = lbData.players || [];
    const rawCut = lbData.cutLine;

    // Determine cut line if league is in "cap at cut" mode
    const cutActive =
      league.cutHandling === 'cap' &&
      typeof rawCut === 'number' &&
      rawCut > 0;
    const cutScore = cutActive ? rawCut : null;

    // 3) Build scores array, clamping at cutScore if needed
    const scores = golferIds.map(id => {
      // Find the player entry by ID
      const player = comps.find(p => p.playerId.toString() === id);
      const toPar = player?.scoreToPar ?? null;

      // Clamp strokes at cut line if needed
      let finalStrokes = toPar;
      if (cutScore != null && toPar != null && toPar > cutScore) {
        finalStrokes = cutScore;
      }

      return { golfer: id, strokes: finalStrokes };
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

    res.json({ scores });
  } catch (err) {
    console.error('❌ [scores] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
