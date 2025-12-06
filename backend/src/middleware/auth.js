import { verifyAccessToken } from '../utils/jwt.js';

function parseAuthHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [, token] = authHeader.split(' ');
  return token;
}

export function requireAuth(req, res, next) {
  const token = parseAuthHeader(req);
  if (!token) return res.status(401).json({ message: 'Authorization required' });
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    requireAuth(req, res, (err) => {
      if (err) return;
      if (req.user?.role !== role) return res.status(403).json({ message: 'Forbidden' });
      next();
    });
  };
}

export function optionalAuth(req, _res, next) {
  const token = parseAuthHeader(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch (err) {
      // ignore invalid tokens for optional auth
    }
  }
  next();
}
