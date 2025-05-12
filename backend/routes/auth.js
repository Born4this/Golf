// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to ensure secret is configured
function getSecretOrError(res) {
  const secret = process.env.JWT_SECRET;
  console.log('🔐 [auth] process.env.JWT_SECRET =', secret);
  if (!secret) {
    res.status(500).json({ msg: 'Server misconfiguration: JWT_SECRET not set' });
    return null;
  }
  return secret;
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  console.log('⚡️ [auth] register endpoint hit');
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: 'Username and password required' });
    }

    // Check for existing user
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    // Hash password
    const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));

    // Save user
    user = new User({ username, password: hash });
    await user.save();

    // Grab secret _now_
    const secret = getSecretOrError(res);
    if (!secret) return; // error already sent

    // Sign the token
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
    res.json({
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    console.error('❌ [auth/register] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  console.log('⚡️ [auth] login endpoint hit');
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ msg: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const secret = getSecretOrError(res);
    if (!secret) return;

    const token = jwt.sign({ id: user._id }, secret, { expiresIn: '1h' });
    res.json({
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    console.error('❌ [auth/login] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  console.log('⚡️ [auth] me endpoint hit');
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('❌ [auth/me] ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
