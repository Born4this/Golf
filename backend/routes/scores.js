// backend/routes/scores.js
import express from 'express';
import auth from '../middleware/auth.js';
import { getLeaderboard } from '../services/sportContentApiFree.js';
import League from '../models/League.js';
import Score from '../models/Score.js';

const router = express.Router();

// GET /api/scores/:leagueId
// Returns current scores (to-par) for each golfer in the league
router.get('/:leagueId', auth, async (req, res) => {
  try {
    // 1) Load league and draft picks
    const league = await League.findById(req.params.leagueId).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });
    const golferIds = league.draftPicks.map(p => p.golfer);
    console.log('🔍 [scores] golferIds:', golferIds);

    // 2) Fetch live leaderboard data
    const lbData = await getLeaderboard();
    console.log('🔍 [scores] lbData keys:', Object.keys(lbData));

    // 3) Identify the player array
    const players = Array.isArray(lbData.leaderboard)
      ? lbData.leaderboard
      : Array.isArray(lbData.players)
      ? lbData.players
      : Array.isArray(lbData.player_list)
      ? lbData.player_list
      : [];
    console.log('🔍 [scores] players length:', players.length);

    // 4) Determine cut line
    const rawCut = lbData.cut_line ?? lbData.cutLine ?? null;
    const cutActive = league.cutHandling === 'cap' && typeof rawCut === 'number' && rawCut > 0;
    const cutScore = cutActive ? rawCut : null;
    console.log('🔍 [scores] cutScore:', cutScore);

    // 5) Build scores array using strokes and total_to_par
    const scores = golferIds.map(id => {
      const pl = players.find(p => {
        const pid = (p.player_id ?? p.playerId)?.toString();
        return pid === id;
      });
      console.log(`🔍 [scores] found player for ${id}:`, pl);

      let toPar = null;
      if (pl) {
        // Use total_to_par (string) if available
        if (pl.total_to_par != null) {
          toPar = parseInt(pl.total_to_par, 10);
        } else if (pl.totalToPar != null) {
          toPar = parseInt(pl.totalToPar, 10);
        }
      }
      console.log(`🔍 [scores] toPar for ${id}:`, toPar);

      // Clamp at cut if needed
      let final = toPar;
      if (cutScore != null && toPar != null && toPar > cutScore) {
        final = cutScore;
      }
      return { golfer: id, strokes: final };
    });
    console.log('🔍 [scores] final scores:', scores);

    // 6) Upsert into Score collection
    const ops = scores.map(s => ({
      updateOne: {
        filter: { golfer: s.golfer },
        update: { $set: { strokes: s.strokes, updatedAt: new Date() } },
        upsert: true
      }
    }));
    await Score.bulkWrite(ops);

    // 7) Return scores
    res.json({ scores });
  } catch (err) {
    console.error('❌ [scores] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
