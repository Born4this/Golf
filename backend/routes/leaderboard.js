import express from 'express';
import authMiddleware from '../middleware/auth.js';
import League from '../models/League.js';
import Score from '../models/Score.js';

const router = express.Router({ mergeParams: true });

// GET /api/leagues/:id/leaderboard, Get league standings, Private
router.get('/:id/leaderboard', authMiddleware, async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('members', 'username')
      .populate('draftPicks.user', 'username')
      .lean();
    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    // User IDs to usernames
    const userMap = league.members.reduce((map, u) => {
      map[u._id.toString()] = u.username;
      return map;
    }, {});

    const picksByUser = league.draftPicks.reduce((acc, pick) => {
      const uid = pick.user._id.toString();
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push({
        golferId: pick.golfer,
        name:     pick.golferName
      });
      return acc;
    }, {});

    const allGolferIds = league.draftPicks.map(p => p.golfer);
    const scoreDocs    = await Score.find({ golfer: { $in: allGolferIds } }).lean();
    const scoreMap     = scoreDocs.reduce((map, doc) => {
      map[doc.golfer] = doc.strokes;
      return map;
    }, {});

    const standings = Object.entries(picksByUser).map(([uid, picks]) => {
      const totalStrokes = picks.reduce(
        (sum, p) => sum + (scoreMap[p.golferId] || 0),
        0
      );

      return {
        userId:      uid,
        username:    userMap[uid] || 'Unknown',
        totalStrokes,
        picks: picks.map(p => ({
          golferId: p.golferId,
          name:     p.name,
          strokes:  scoreMap[p.golferId] || 0
        }))
      };
    })
    .sort((a, b) => a.totalStrokes - b.totalStrokes);

    res.json({ standings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
