import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = express.Router();

router.get('/overview', authMiddleware, async (_req, res) => {
  const [productCount, reservationCount, activeReservations] = await Promise.all([
    prisma.product.count(),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
  ]);
  res.json({ productCount, reservationCount, activeReservations });
});

export default router;
