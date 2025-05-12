// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function authMiddleware(req, res, next) {
  // Debug: log the JWT secret on every protected request
  console.log('🔑 [authMiddleware] JWT_SECRET =', process.env.JWT_SECRET);

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ msg: 'Server misconfiguration: JWT_SECRET not set' });
  }

  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ msg: 'Token is not valid' });
  }
}
