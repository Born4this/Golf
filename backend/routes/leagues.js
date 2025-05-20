// backend/routes/leagues.js – updated to allow 1‑team demo leagues & auto‑draft‑order
import express from 'express';
import mongoose from 'mongoose';
import { celebrate } from 'celebrate';
import auth from '../middleware/auth.js';
import League from '../models/League.js';
import { nanoid } from 'nanoid';
import { joinLeagueSchema } from '../validators/joinLeague.js';

const router = express.Router();

/** Utility to build serpentine draft order */
function buildDraftOrder(memberIds, picksPerPlayer = 4) {
  const shuffled = [...memberIds].sort(() => Math.random() - 0.5);
  const order    = [];
  for (let round = 0; round < picksPerPlayer; round++) {
    if (round % 2 === 0) {
      order.push(...shuffled);
    } else {
      order.push(...shuffled.slice().reverse());
    }
  }
  return order;
}

// -------------------------------------------------------------------------
// GET /api/leagues – list leagues for current user
// -------------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const leagues = await League.find({ members: req.user.id })
      .select('-__v')
      .populate('members', 'username')
      .lean();
    res.json({ leagues });
  } catch (err) {
    console.error('❌ [leagues/list] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/leagues – create new league (now 1‑6 teams allowed)
// -------------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
  try {
    let { name: customName, cutHandling = 'standard', teamCount = 6 } = req.body;

    // sanitize teamCount
    teamCount = Number(teamCount);
    if (isNaN(teamCount) || teamCount < 1 || teamCount > 6) {
      return res.status(400).json({ msg: 'Team count must be between 1 and 6' });
    }

    // generate a unique 6‑char join code
    let code;
    do {
      code = nanoid(6).toUpperCase();
    } while (await League.findOne({ code }));

    // determine league name
    const leagueName = customName?.trim() ? customName.trim() : `League-${code}`;

    // initial members & (if single‑team) immediate draft order
    const members = [req.user.id];
    const draftOrder = teamCount === 1 ? buildDraftOrder(members) : [];

    const league = await League.create({
      name:        leagueName,
      code,
      admin:       req.user.id,
      teamCount,
      members,
      cutHandling,
      draftOrder,
    });

    res.json({ league });
  } catch (err) {
    console.error('❌ [leagues/create] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/leagues/join – join by ID or code
// -------------------------------------------------------------------------
router.post(
  '/join',
  auth,
  celebrate({ body: joinLeagueSchema }),
  async (req, res) => {
    try {
      const { leagueId, code } = req.body;
      let league = null;

      if (leagueId && mongoose.Types.ObjectId.isValid(leagueId)) {
        league = await League.findById(leagueId);
      }
      if (!league && code) {
        league = await League.findOne({ code: code.trim().toUpperCase() });
      }

      if (!league) return res.status(404).json({ msg: 'League not found' });
      if (league.members.includes(req.user.id))
        return res.status(400).json({ msg: 'Already joined' });
      if (league.members.length >= league.teamCount)
        return res.status(400).json({ msg: 'League is full' });

      league.members.push(req.user.id);

      // when league reaches capacity, generate draft order
      if (league.members.length === league.teamCount) {
        const memberIds = league.members.map(id => id.toString());
        league.draftOrder = buildDraftOrder(memberIds);
      }

      await league.save();
      res.json({ league });
    } catch (err) {
      console.error('❌ [leagues/join] ERROR:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

// -------------------------------------------------------------------------
// POST /api/leagues/:id/leave – leave a league
// -------------------------------------------------------------------------
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ msg: 'League not found' });

    const uid = req.user.id.toString();
    league.members = league.members.filter(m => m.toString() !== uid);
    await league.save();
    res.json({ league });
  } catch (err) {
    console.error('❌ [leagues/leave] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/leagues/:id – league details
// -------------------------------------------------------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('members', 'username')
      .lean();
    if (!league) return res.status(404).json({ msg: 'League not found' });
    res.json({ league });
  } catch (err) {
    console.error('❌ [leagues/get] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
