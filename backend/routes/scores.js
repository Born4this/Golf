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
    console.log('🔍 [scores] lbData.leaderboard type:', typeof lbData.leaderboard);
    console.log('🔍 [scores] lbData.leaderboard sample:', JSON.stringify(lbData.leaderboard).slice(0, 500));

    // 3) Extract players array from possible keys
    let players = [];
    if (Array.isArray(lbData.leaderboard)) {
      players = lbData.leaderboard;
    } else if (lbData.leaderboard && Array.isArray(lbData.leaderboard.players)) {
      players = lbData.leaderboard.players;
    } else if (Array.isArray(lbData.players)) {
      players = lbData.players;
    } else if (Array.isArray(lbData.player_list)) {
      players = lbData.player_list;
    }
    console.log('🔍 [scores] players length:', players.length);

    // 4) Determine cut line
    const rawCut = lbData.cut_line ?? lbData.cutLine ?? null;
    console.log('🔍 [scores] rawCut:', rawCut);
    const cutActive = league.cutHandling === 'cap' && typeof rawCut === 'number' && rawCut > 0;
    const cutScore = cutActive ? rawCut : null;
    console.log('🔍 [scores] cutActive, cutScore:', cutActive, cutScore);

    // 5) Build scores array for each golfer
    const scores = golferIds.map(id => {
      const player = players.find(p => {
        const pid = p.player_id?.toString() ?? p.playerId?.toString();
        return pid === id;
      });
      console.log(`🔍 [scores] found player for ${id}:`, player);

      // Try various score fields
      let toPar = null;
      if (player) {
        toPar =
          player.score_to_par ??
          player.scoreToPar ??
          player.current_round_score ??
          player.currentRoundScore ??
          player.score_to_par_display ??
          null;
      }
      console.log(`🔍 [scores] toPar for ${id}:`, toPar);

      // Apply cut cap if needed
      let final = toPar;
      if (cutScore != null && toPar != null && toPar > cutScore) {
        final = cutScore;
      }
      return { golfer: id, strokes: final };
    });
    console.log('🔍 [scores] final scores:', scores);

    // 6) Upsert into the Score collection
    const bulkOps = scores.map(s => ({
      updateOne: {
        filter: { golfer: s.golfer },
        update: { $set: { strokes: s.strokes, updatedAt: new Date() } },
        upsert: true
      }
    }));
    await Score.bulkWrite(bulkOps);

    // 7) Return the scores
    res.json({ scores });
  } catch (err) {
    console.error('❌ [scores] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
