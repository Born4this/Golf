// backend/routes/draft.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import League from '../models/League.js';

const router = express.Router({ mergeParams: true });

// GET /api/leagues/:id/draft-list
router.get('/:id/draft-list', authMiddleware, async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('draftPicks.user', 'username')
      .lean();
    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    const pickedIds = league.draftPicks.map(p => p.golfer);
    const memberIds = league.members.map(id => id.toString());
    const totalPicks = memberIds.length * 4;
    let draftOrder = Array.isArray(league.draftOrder) && league.draftOrder.length === totalPicks
      ? league.draftOrder.map(id => id.toString())
      : Array.from({ length: totalPicks }, (_, i) => memberIds[i % memberIds.length]);

    const picks = league.draftPicks.map(p => ({
      user: p.user?._id?.toString?.() ?? p.user?.toString?.(),
      golfer: p.golfer,
      golferName: p.golferName || null,
      round: p.round,
      pickNo: p.pickNo
    }));

    res.json({ available: [], picks, draftOrder });
  } catch (err) {
    console.error('❌ [draft-list] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/leagues/:id/picks
router.post('/:id/picks', authMiddleware, async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ msg: 'League not found' });
    }

    const maxPicks = league.members.length * 4;
    if (!Array.isArray(league.draftOrder) || league.draftOrder.length < maxPicks) {
      const memberIds = league.members.map(id => id.toString());
      league.draftOrder = Array.from({ length: maxPicks }, (_, i) =>
        memberIds[i % memberIds.length]
      );
    }

    if (league.draftOrder.length === 0) {
      league.draftOrder = Array(4).fill(req.user.id);
    }

    const pickIndex = league.draftPicks.length;
    const currentPicker = league.draftOrder[pickIndex]?.toString();
    const currentUserId = req.user._id?.toString?.() || req.user.id?.toString?.();

    if (currentPicker !== currentUserId) {
      return res.status(403).json({ msg: 'Not your turn' });
    }

    const { golferId, golferName } = req.body;
    if (league.draftPicks.some(p => p.golfer === golferId)) {
      return res.status(400).json({ msg: 'Golfer already picked' });
    }

    const round = Math.floor(pickIndex / league.members.length) + 1;
    league.draftPicks.push({
      user: req.user._id ?? req.user.id,
      golfer: golferId,
      golferName: golferName || null,
      round,
      pickNo: pickIndex + 1
    });

    await league.save();

    const responsePicks = league.draftPicks.map(p => ({
      user: p.user?.toString?.() ?? p.user,
      golfer: p.golfer,
      golferName: p.golferName || null,
      round: p.round,
      pickNo: p.pickNo
    }));

    res.json({
      picks: responsePicks,
      draftOrder: league.draftOrder.map(id => id.toString())
    });
  } catch (err) {
    console.error('❌ [make-pick] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
