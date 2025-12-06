import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const configs = await prisma.appConfig.findMany();
  res.json(configs);
});

router.post(
  '/',
  authMiddleware,
  body('key').isString(),
  body('value').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { key, value } = req.body;
    const config = await prisma.appConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
    res.json(config);
  }
);

export default router;
