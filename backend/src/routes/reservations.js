import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../prisma.js';
import { createReservation } from '../services/reservationService.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();

router.get('/', authMiddleware, async (_req, res) => {
  const reservations = await prisma.reservation.findMany({ include: { items: true, customer: true } });
  res.json(reservations);
});

router.post(
  '/',
  body('customerId').isString(),
  body('items').isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const reservation = await createReservation(req.body);
      const populated = await prisma.reservation.findUnique({
        where: { id: reservation.id },
        include: { items: { include: { variant: true } }, customer: true },
      });
      req.app.get('io')?.emit('stock:update');
      await sendEmail({
        to: populated.customer.email,
        subject: 'Reserva creada',
        text: `Tu reserva ${populated.code} expira el ${populated.expiresAt.toISOString()}`,
      });
      res.status(201).json(populated);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
);

router.post('/:id/cancel', authMiddleware, async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!reservation) return res.status(404).json({ message: 'No encontrada' });
  if (reservation.status !== 'PENDING') return res.status(400).json({ message: 'No se puede cancelar' });
  await prisma.$transaction(async (tx) => {
    for (const item of reservation.items) {
      await tx.productVariant.update({ where: { id: item.variantId }, data: { stockReserved: { decrement: item.quantity } } });
    }
    await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'CANCELED', canceledAt: new Date() } });
  });
  req.app.get('io')?.emit('stock:update');
  res.json({ message: 'Reserva cancelada' });
});

router.get('/:code', async (req, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { code: req.params.code }, include: { items: true, customer: true } });
  if (!reservation) return res.status(404).json({ message: 'No encontrada' });
  res.json(reservation);
});

export default router;
