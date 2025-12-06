import express from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const products = await prisma.product.findMany({
    include: { variants: true },
    where: { isActive: true },
  });
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { variants: true } });
  if (!product) return res.status(404).json({ message: 'No encontrado' });
  res.json(product);
});

router.post(
  '/',
  authMiddleware,
  body('name').isString(),
  body('variants').isArray(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { variants, ...data } = req.body;
    const product = await prisma.product.create({
      data: {
        ...data,
        variants: { create: variants },
      },
      include: { variants: true },
    });
    res.status(201).json(product);
  }
);

router.put(
  '/:id',
  authMiddleware,
  body('name').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json(product);
  }
);

router.delete('/:id', authMiddleware, async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Producto desactivado' });
});

router.post('/:id/variants', authMiddleware, body('sku').isString(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const variant = await prisma.productVariant.create({
    data: { ...req.body, productId: req.params.id },
  });
  res.status(201).json(variant);
});

router.put('/variants/:variantId', authMiddleware, async (req, res) => {
  const variant = await prisma.productVariant.update({ where: { id: req.params.variantId }, data: req.body });
  res.json(variant);
});

router.delete('/variants/:variantId', authMiddleware, async (req, res) => {
  await prisma.productVariant.delete({ where: { id: req.params.variantId } });
  res.json({ message: 'Variante eliminada' });
});

export default router;
