import express from 'express';
import auth from '../middleware/auth.js';
import League from '../models/League.js';
import Score from '../models/Score.js';

const router = express.Router({ mergeParams: true });

router.get('/:id/team', auth, async (req, res) => {
  try {
    // 1) load league
    const league = await League.findById(req.params.id).lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });
    const myPicks = league.draftPicks.filter(p =>
      p.user?.toString() === req.user._id.toString()
    );

    const golferIds = myPicks.map(p => p.golfer);
    const scoreDocs = await Score.find({ golfer: { $in: golferIds } }).lean();

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
