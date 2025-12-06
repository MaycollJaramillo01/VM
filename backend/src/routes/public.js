import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { signAccessToken } from '../utils/jwt.js';
import { createReservation, cancelReservation, availableFromVariant } from '../services/reservationService.js';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const reservationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

const otpRequestSchema = z.object({
  body: z.object({
    target: z.string(),
    channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']).default('EMAIL'),
  }),
});

router.post('/otp/request', otpLimiter, validate(otpRequestSchema), async (req, res) => {
  const { target, channel } = req.validated.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  let customer = await prisma.customer.findFirst({ where: { OR: [{ email: target }, { phone: target }] } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { email: target.includes('@') ? target : null, phone: target } });
  }
  await prisma.otpCode.create({ data: { target, code, expiresAt, customerId: customer.id } });
  await sendEmail({ to: target, subject: 'Tu OTP Ángel Shop', text: `Código: ${code} (${channel})` });
  res.json({ message: 'OTP enviado' });
});

const otpVerifySchema = z.object({
  body: z.object({
    target: z.string(),
    code: z.string().length(6),
  }),
});

router.post('/otp/verify', validate(otpVerifySchema), async (req, res) => {
  const { target, code } = req.validated.body;
  const otp = await prisma.otpCode.findFirst({
    where: { target, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return res.status(400).json({ message: 'Código inválido o expirado' });
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  const customer = await prisma.customer.upsert({
    where: { email: target.includes('@') ? target : '' },
    update: { isVerified: true, phone: target.includes('@') ? undefined : target },
    create: { email: target.includes('@') ? target : null, phone: target.includes('@') ? null : target, isVerified: true },
  });
  const token = signAccessToken({ role: 'customer', customerId: customer.id });
  res.json({ token, customer });
});

router.get('/products', async (req, res) => {
  const { category, garmentType, size, color, search } = req.query;
  const filters = {
    isActive: true,
    category: category || undefined,
    garmentType: garmentType || undefined,
    name: search ? { contains: search, mode: 'insensitive' } : undefined,
  };
  const products = await prisma.product.findMany({
    where: filters,
    include: {
      variants: {
        where: {
          size: size || undefined,
          color: color || undefined,
        },
      },
    },
  });
  const mapped = products.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, available: availableFromVariant(v) })),
  }));
  res.json(mapped);
});

router.get('/products/:id', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: true },
  });
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  res.json({
    ...product,
    variants: product.variants.map((v) => ({ ...v, available: availableFromVariant(v) })),
  });
});

const reservationSchema = z.object({
  body: z.object({
    items: z.array(z.object({ variantId: z.string(), quantity: z.number().int().positive() })).min(1),
    expiresInHours: z.number().int().positive().max(72).default(48),
    note: z.string().optional(),
    contact: z
      .object({ name: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional() })
      .optional(),
  }),
});

router.post('/reservations', reservationLimiter, requireAuth, validate(reservationSchema), async (req, res) => {
  if (req.user?.role !== 'customer') return res.status(403).json({ message: 'Solo clientes' });
  try {
    const reservation = await createReservation({
      customerId: req.user.customerId,
      items: req.validated.body.items,
      expiresInHours: req.validated.body.expiresInHours,
      note: req.validated.body.note,
      contact: req.validated.body.contact,
    });
    const populated = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: { items: { include: { variant: true } }, customer: true },
    });
    const io = req.app.get('io');
    populated.items.forEach((item) => {
      io?.emit('variant-stock-updated', {
        variantId: item.variantId,
        stockOnHand: item.variant.stockOnHand,
        stockReserved: item.variant.stockReserved + item.quantity,
        available: availableFromVariant({ ...item.variant, stockReserved: item.variant.stockReserved + item.quantity }),
      });
    });
    io?.emit('reservation:created', {
      id: populated.id,
      status: populated.status,
      expiresAt: populated.expiresAt,
      items: populated.items,
    });
    await sendEmail({
      to: populated.customer.email || '',
      subject: 'Reserva creada',
      text: `Tu reserva ${populated.code} expira el ${populated.expiresAt.toISOString()}`,
    });
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/reservations/me', requireAuth, async (req, res) => {
  if (req.user?.role !== 'customer') return res.status(403).json({ message: 'Solo clientes' });
  const reservations = await prisma.reservation.findMany({
    where: { customerId: req.user.customerId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations);
});

router.get('/reservations/:id', requireAuth, async (req, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { items: true, events: true },
  });
  if (!reservation || reservation.customerId !== req.user?.customerId) return res.status(404).json({ message: 'No encontrada' });
  res.json(reservation);
});

router.post('/reservations/:id/cancel', requireAuth, async (req, res) => {
  if (req.user?.role !== 'customer') return res.status(403).json({ message: 'Solo clientes' });
  try {
    const { reservation: canceled, variants } = await cancelReservation({
      reservationId: req.params.id,
      actorType: 'CUSTOMER',
      actorId: req.user.customerId,
    });
    req.app
      .get('io')
      ?.emit('reservation:updated', { id: canceled.id, status: canceled.status, items: canceled.items, expiresAt: canceled.expiresAt });
    variants.forEach((variant) =>
      req.app.get('io')?.emit('variant-stock-updated', {
        variantId: variant.id,
        stockOnHand: variant.stockOnHand,
        stockReserved: variant.stockReserved,
        available: availableFromVariant(variant),
      })
    );
    res.json(canceled);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
