// backend/routes/team.js
import express from 'express';
import auth from '../middleware/auth.js';
import League from '../models/League.js';
import Score from '../models/Score.js';

const router = express.Router({ mergeParams: true });

// GET /api/leagues/:id/team
router.get('/:id/team', auth, async (req, res) => {
  try {
    // 1) load league
    const league = await League.findById(req.params.id).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });

    // 2) filter down to this user’s picks
    const myPicks = league.draftPicks.filter(p =>
      p.user?.toString() === req.user._id.toString()
    );

    // 3) fetch any stored scores for those golfers
    const golferIds = myPicks.map(p => p.golfer);
    const scoreDocs = await Score.find({ golfer: { $in: golferIds } }).lean();

    // 4) build out the response, pulling strokes from Score
    const team = myPicks.map(pick => {
      const doc = scoreDocs.find(s => s.golfer === pick.golfer);
      return {
        golfer:     pick.golfer,
        golferName: pick.golferName,
        round:      pick.round,
        pickNo:     pick.pickNo,
        strokes:    doc?.strokes ?? null
      };
    });

    res.json({ user: req.user.username, team });
  } catch (err) {
    console.error('❌ [GET /leagues/:id/team] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
