import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { sendEmail } from '../utils/mailer.js';
import { config } from '../config.js';

const router = express.Router();

router.post(
  '/admin/login',
  body('email').isEmail(),
  body('password').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, config.jwtSecret, { expiresIn: '8h' });
    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
  }
);

router.post('/customer/request-otp', body('target').isEmail(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { target } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  let customer = await prisma.customer.findUnique({ where: { email: target } });
  if (!customer) {
    customer = await prisma.customer.create({ data: { email: target, isVerified: false } });
  }
  await prisma.otpCode.create({ data: { target, code, expiresAt, customerId: customer.id } });
  await sendEmail({ to: target, subject: 'Tu código OTP - Ángel Shop', text: `Tu código es ${code}` });
  res.json({ message: 'OTP enviado' });
});

router.post(
  '/customer/verify-otp',
  body('target').isEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { target, code } = req.body;
    const otp = await prisma.otpCode.findFirst({
      where: { target, code, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return res.status(400).json({ message: 'Código inválido o expirado' });
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const customer = await prisma.customer.upsert({
      where: { email: target },
      update: { isVerified: true },
      create: { email: target, isVerified: true },
    });
    res.json({ customer });
  }
);

export default router;
