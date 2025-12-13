import 'dotenv/config';
import { prisma } from '../src/prisma.js';

const catalog = [
  {
    name: 'Camisa Oxford Blanca',
    description: 'Camisa manga larga de algodón orgánico con acabado suave, ideal para oficina o eventos formales.',
    category: 'Camisas',
    garmentType: 'Camisa',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
    variants: [
      { sku: 'OXF-BLANCA-S', size: 'S', color: 'Blanco', price: 24900, stockOnHand: 12 },
      { sku: 'OXF-BLANCA-M', size: 'M', color: 'Blanco', price: 24900, stockOnHand: 18 },
      { sku: 'OXF-BLANCA-L', size: 'L', color: 'Blanco', price: 24900, stockOnHand: 10 },
    ],
  },
  {
    name: 'Jeans Slim Indigo',
    description: 'Jeans denim corte slim con un ligero stretch para máxima comodidad y movilidad diaria.',
    category: 'Pantalones',
    garmentType: 'Jeans',
    imageUrl: 'https://images.unsplash.com/photo-1542293772-8b1c29d1dda0?auto=format&fit=crop&w=1200&q=80',
    variants: [
      { sku: 'JEAN-INDIGO-28', size: '28', color: 'Indigo', price: 33900, stockOnHand: 14 },
      { sku: 'JEAN-INDIGO-30', size: '30', color: 'Indigo', price: 33900, stockOnHand: 20 },
      { sku: 'JEAN-INDIGO-32', size: '32', color: 'Indigo', price: 33900, stockOnHand: 16 },
    ],
  },
  {
    name: 'Vestido Midi Floral',
    description: 'Vestido midi en viscosa con estampa floral y falda amplia, perfecto para días cálidos.',
    category: 'Vestidos',
    garmentType: 'Vestido',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
    variants: [
      { sku: 'VEST-FLORAL-S', size: 'S', color: 'Azul', price: 41900, stockOnHand: 9 },
      { sku: 'VEST-FLORAL-M', size: 'M', color: 'Azul', price: 41900, stockOnHand: 12 },
      { sku: 'VEST-FLORAL-L', size: 'L', color: 'Azul', price: 41900, stockOnHand: 7 },
    ],
  },
  {
    name: 'Chaqueta Denim Clásica',
    description: 'Chaqueta de mezclilla azul medio con botones metálicos y bolsillos frontales reforzados.',
    category: 'Abrigos',
    garmentType: 'Chaqueta',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
    variants: [
      { sku: 'CHQ-DENIM-S', size: 'S', color: 'Azul Medio', price: 52900, stockOnHand: 8 },
      { sku: 'CHQ-DENIM-M', size: 'M', color: 'Azul Medio', price: 52900, stockOnHand: 12 },
      { sku: 'CHQ-DENIM-L', size: 'L', color: 'Azul Medio', price: 52900, stockOnHand: 10 },
    ],
  },
  {
    name: 'Blusa de Lino Arena',
    description: 'Blusa ligera de lino con cuello mao y botones de madera, ideal para clima tropical.',
    category: 'Blusas',
    garmentType: 'Blusa',
    imageUrl: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=1200&q=80',
    variants: [
      { sku: 'BLU-LINO-S', size: 'S', color: 'Arena', price: 27900, stockOnHand: 15 },
      { sku: 'BLU-LINO-M', size: 'M', color: 'Arena', price: 27900, stockOnHand: 17 },
      { sku: 'BLU-LINO-L', size: 'L', color: 'Arena', price: 27900, stockOnHand: 11 },
    ],
  },
  {
    name: 'Sudadera Verde Olivo',
    description: 'Sudadera unisex de algodón perchado con capucha y bolsillo frontal estilo canguro.',
    category: 'Sudaderas',
    garmentType: 'Sudadera',
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80',
    variants: [
      { sku: 'SUD-OLIVO-S', size: 'S', color: 'Verde Olivo', price: 29900, stockOnHand: 13 },
      { sku: 'SUD-OLIVO-M', size: 'M', color: 'Verde Olivo', price: 29900, stockOnHand: 19 },
      { sku: 'SUD-OLIVO-L', size: 'L', color: 'Verde Olivo', price: 29900, stockOnHand: 14 },
    ],
  },
];

async function seedProducts() {
  for (const product of catalog) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (existing) {
      await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          description: product.description,
          category: product.category,
          garmentType: product.garmentType,
          imageUrl: product.imageUrl,
          isActive: true,
          variants: {
            create: product.variants,
          },
        },
      });
      console.log(`Actualizado: ${product.name}`);
    } else {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          category: product.category,
          garmentType: product.garmentType,
          imageUrl: product.imageUrl,
          variants: {
            create: product.variants,
          },
        },
      });
      console.log(`Creado: ${product.name}`);
    }
  }
}

seedProducts()
  .then(() => console.log('Catálogo de prueba listo.'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
