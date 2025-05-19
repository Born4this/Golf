// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function authMiddleware(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ msg: 'Server misconfiguration: JWT_SECRET not set' });
  }

  // 1) Grab & validate the Authorization header format
  const header = req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 2) Extract the token
  const token = header.slice(7).trim();  // remove 'Bearer '
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, secret);
    // Load user without password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.name, err.message);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}
