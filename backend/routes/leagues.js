// backend/routes/leagues.js
import express from 'express';
import mongoose from 'mongoose';
import { celebrate } from 'celebrate';
import auth from '../middleware/auth.js';
import League from '../models/League.js';
import { nanoid } from 'nanoid';
import { joinLeagueSchema } from '../validators/joinLeague.js';

const router = express.Router();

// @route   GET /api/leagues
// @desc    List all leagues the current user belongs to
// @access  Private
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

// @route   POST /api/leagues
// @desc    Create a new league (optional custom name + cutHandling)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name: customName, cutHandling, teamCount } = req.body;

    // generate a unique 6-char join code
    let code;
    do {
      code = nanoid(6).toUpperCase();
    } while (await League.findOne({ code }));

    // determine league name
    const leagueName = customName?.trim()
      ? customName.trim()
      : `League-${code}`;

    // build league
    const league = new League({
      name:        leagueName,
      code,
      admin:       req.user.id,
      teamCount,
      members:     [req.user.id],
      cutHandling,
    });

    await league.save();
    res.json({ league });
  } catch (err) {
    console.error('❌ [leagues/create] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/leagues/join
// @desc    Join an existing league by ID or code
// @access  Private
router.post('/join',
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

      // once full, generate draftOrder
      if (league.members.length === league.teamCount) {
        const memberIds      = league.members.map(id => id.toString());
        const picksPerPlayer = 4;
        const shuffled       = [...memberIds].sort(() => Math.random() - 0.5);
        const fullOrder      = [];
        for (let round = 0; round < picksPerPlayer; round++) {
          if (round % 2 === 0) {
            fullOrder.push(...shuffled);
          } else {
            fullOrder.push(...shuffled.reverse());
          }
        }
        league.draftOrder = fullOrder;
      }

      await league.save();
      res.json({ league });
    } catch (err) {
      console.error('❌ [leagues/join] ERROR:', err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route   POST /api/leagues/:id/leave
// @desc    Leave a league you’ve joined
// @access  Private
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) return res.status(404).json({ msg: 'League not found' });
    const uid = req.user.id.toString();
    league.members = league.members.filter(
      m => m.toString() !== uid
    );
    await league.save();
    res.json({ league });
  } catch (err) {
    console.error('❌ [leagues/leave] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/leagues/:id
// @desc    Get league details (members + draftOrder…)
// @access  Private
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
