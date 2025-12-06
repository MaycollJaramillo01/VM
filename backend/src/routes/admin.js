import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { signAdminToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { expirePendingReservations, updateReservationStatus } from '../services/reservationService.js';
import { availableFromVariant } from '../services/reservationService.js';

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const refreshStore = new Set();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

router.post('/auth/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated.body;
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return res.status(401).json({ message: 'Credenciales inválidas' });
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });
  const token = signAdminToken({ id: admin.id, role: admin.role });
  const refresh = signRefreshToken({ id: admin.id, role: admin.role });
  refreshStore.add(refresh);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  res.json({ token, refresh });
});

router.post('/auth/refresh', async (req, res) => {
  const { refresh } = req.body;
  if (!refresh || !refreshStore.has(refresh)) return res.status(401).json({ message: 'Refresh inválido' });
  try {
    const payload = verifyRefreshToken(refresh);
    const token = signAdminToken({ id: payload.id, role: payload.role });
    res.json({ token });
  } catch (err) {
    res.status(401).json({ message: 'Refresh inválido' });
  }
});

router.get('/reservations', requireRole('ADMIN'), async (req, res) => {
  const { status, from, to, contact } = req.query;
  const filters = {
    status: status || undefined,
    createdAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
  };
  const reservations = await prisma.reservation.findMany({
    where: filters,
    include: { customer: true, items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations.filter((r) => (!contact ? true : (r.customer?.email || '').includes(contact))));
});

const statusSchema = z.object({
  body: z.object({
    status: z.enum(['CONFIRMED', 'CANCELED']),
    deductStock: z.boolean().optional(),
  }),
});

router.patch('/reservations/:id/status', requireRole('ADMIN'), validate(statusSchema), async (req, res) => {
  try {
    const { reservation: updated, variants } = await updateReservationStatus({
      reservationId: req.params.id,
      status: req.validated.body.status,
      actorId: req.user.id,
      actorType: 'ADMIN',
      deductStock: req.validated.body.deductStock,
    });
    req.app.get('io')?.emit('reservation:updated', { id: updated.id, status: updated.status, items: updated.items });
    variants.forEach((variant) =>
      req.app.get('io')?.emit('variant-stock-updated', {
        variantId: variant.id,
        stockOnHand: variant.stockOnHand,
        stockReserved: variant.stockReserved,
        available: availableFromVariant(variant),
      })
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/reservations/manual-expire', requireRole('ADMIN'), async (req, res) => {
  const count = await expirePendingReservations(req.app.get('io'));
  res.json({ expired: count });
});

const productSchema = z.object({
  body: z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    garmentType: z.string().optional(),
    variants: z.array(
      z.object({
        sku: z.string(),
        size: z.string(),
        color: z.string(),
        price: z.number(),
        stockOnHand: z.number().int().nonnegative().optional(),
        stockReserved: z.number().int().nonnegative().optional(),
      })
    ),
  }),
});

router.post('/products', requireRole('ADMIN'), validate(productSchema), async (req, res) => {
  const product = await prisma.product.create({
    data: { ...req.validated.body, variants: { create: req.validated.body.variants } },
    include: { variants: true },
  });
  res.status(201).json(product);
});

const productUpdateSchema = z.object({ body: z.object({ name: z.string().optional(), description: z.string().optional() }) });
router.patch('/products/:id', requireRole('ADMIN'), validate(productUpdateSchema), async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: req.validated.body });
  res.json(product);
});

const variantSchema = z.object({
  body: z.object({
    sku: z.string(),
    size: z.string(),
    color: z.string(),
    price: z.number(),
    stockOnHand: z.number().int().nonnegative().optional(),
    stockReserved: z.number().int().nonnegative().optional(),
  }),
});
router.post('/products/:id/variants', requireRole('ADMIN'), validate(variantSchema), async (req, res) => {
  const variant = await prisma.productVariant.create({ data: { ...req.validated.body, productId: req.params.id } });
  res.status(201).json(variant);
});

const variantUpdateSchema = z.object({
  body: z.object({
    price: z.number().optional(),
    stockOnHand: z.number().int().optional(),
  }),
});
router.patch('/variants/:id', requireRole('ADMIN'), validate(variantUpdateSchema), async (req, res) => {
  const previous = await prisma.productVariant.findUnique({ where: { id: req.params.id } });
  const variant = await prisma.productVariant.update({ where: { id: req.params.id }, data: req.validated.body });
  await prisma.inventoryAdjustment.create({
    data: {
      variantId: variant.id,
      adminId: req.user.id,
      reason: 'MANUAL',
      quantityChange:
        req.validated.body.stockOnHand !== undefined && previous
          ? variant.stockOnHand - previous.stockOnHand
          : 0,
      notes: 'Actualización manual',
    },
  });
  req.app.get('io')?.emit('variant-stock-updated', {
    variantId: variant.id,
    stockOnHand: variant.stockOnHand,
    stockReserved: variant.stockReserved,
    available: availableFromVariant(variant),
  });
  res.json(variant);
});

router.get('/reports/reservations', requireRole('ADMIN'), async (_req, res) => {
  const totals = await prisma.reservation.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  res.json({ totals });
});

router.get('/reports/demand', requireRole('ADMIN'), async (_req, res) => {
  const items = await prisma.reservationItem.groupBy({
    by: ['variantId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
  });
  res.json({ demand: items });
});

export default router;
