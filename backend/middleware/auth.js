import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function authMiddleware(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ [authMiddleware] JWT_SECRET not set');
    return res.status(500).json({ msg: 'Server misconfiguration: JWT_SECRET not set' });
  }

  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ msg: 'No authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ msg: 'Malformed authorization header' });
  }

  const token = parts[1].trim();
  if (!token) {
    return res.status(401).json({ msg: 'Token not provided' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: 'Invalid token user' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('🔒 [authMiddleware] JWT error:', err.name, err.message);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}
