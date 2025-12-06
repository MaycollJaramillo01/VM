import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAccessToken(payload, options = {}) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.customerTokenTtl, ...options });
}

export function signAdminToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.adminTokenTtl });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.refreshSecret, { expiresIn: '30d' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshSecret);
}
