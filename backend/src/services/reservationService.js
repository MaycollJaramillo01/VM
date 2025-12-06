import { prisma } from '../prisma.js';
import { sendEmail } from '../utils/mailer.js';

const RESERVATION_CODE_PREFIX = 'RSV-';

function buildReservationCode() {
  return `${RESERVATION_CODE_PREFIX}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function assertAvailability(tx, variantId, quantity) {
  const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error('Variante no encontrada');
  const available = variant.stockOnHand - variant.stockReserved;
  if (available < quantity) throw new Error('Stock insuficiente');
  return variant;
}

export async function createReservation({
  customerId,
  items,
  expiresInHours = 48,
  note,
  analytics,
  contact,
  prismaClient = prisma,
}) {
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  return prismaClient.$transaction(async (tx) => {
    let total = 0;
    const enrichedItems = [];
    for (const item of items) {
      const variant = await assertAvailability(tx, item.variantId, item.quantity);
      total += Number(variant.price) * item.quantity;
      enrichedItems.push({ variant, item });
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockReserved: { increment: item.quantity } },
      });
    }

    const reservation = await tx.reservation.create({
      data: {
        code: buildReservationCode(),
        customerId,
        expiresAt,
        expiresInHours,
        totalAmount: total,
        note,
        analyticsSource: analytics?.source,
        utmSource: analytics?.utmSource,
        utmMedium: analytics?.utmMedium,
        utmCampaign: analytics?.utmCampaign,
        items: {
          create: enrichedItems.map(({ variant, item }) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: variant.price,
            subtotal: Number(variant.price) * item.quantity,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    await tx.reservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorType: 'CUSTOMER',
        actorId: customerId,
        eventType: 'PENDING',
        metadata: { note },
      },
    });

    if (contact) {
      await tx.customer.update({ where: { id: customerId }, data: contact });
    }

    return reservation;
  });
}

export async function cancelReservation({ reservationId, actorType, actorId, prismaClient = prisma }) {
  const reservation = await prismaClient.reservation.findUnique({ where: { id: reservationId }, include: { items: true } });
  if (!reservation) throw new Error('Reserva no encontrada');
  if (reservation.status !== 'PENDING') throw new Error('No se puede cancelar');
  return prismaClient.$transaction(async (tx) => {
    const variants = [];
    for (const item of reservation.items) {
      const variant = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockReserved: { decrement: item.quantity } },
      });
      variants.push(variant);
    }
    const updated = await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
      include: { items: true, customer: true },
    });
    await tx.reservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorType,
        actorId,
        eventType: 'CANCELED',
      },
    });
    return { reservation: updated, variants };
  });
}

export async function updateReservationStatus({ reservationId, status, actorType, actorId, deductStock = false, prismaClient = prisma }) {
  const reservation = await prismaClient.reservation.findUnique({ where: { id: reservationId }, include: { items: true } });
  if (!reservation) throw new Error('Reserva no encontrada');
  return prismaClient.$transaction(async (tx) => {
    const variants = [];
    if (status === 'CONFIRMED' && deductStock) {
      for (const item of reservation.items) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockReserved: { decrement: item.quantity },
            stockOnHand: { decrement: item.quantity },
          },
        });
        variants.push(updatedVariant);
        await tx.inventoryAdjustment.create({
          data: {
            variantId: item.variantId,
            reservationId: reservation.id,
            adminId: actorType === 'ADMIN' ? actorId : null,
            reason: 'CONFIRM',
            quantityChange: -item.quantity,
          },
        });
      }
    }
    if (status === 'CANCELED' && reservation.status === 'PENDING') {
      for (const item of reservation.items) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockReserved: { decrement: item.quantity } },
        });
        variants.push(updatedVariant);
      }
    }
    const updated = await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status,
        confirmedAt: status === 'CONFIRMED' ? new Date() : reservation.confirmedAt,
        canceledAt: status === 'CANCELED' ? new Date() : reservation.canceledAt,
      },
      include: { items: true, customer: true },
    });
    await tx.reservationEvent.create({
      data: {
        reservationId: reservation.id,
        actorType,
        actorId,
        eventType: status,
      },
    });
    return { reservation: updated, variants };
  });
}

export async function expirePendingReservations(io, prismaClient = prisma) {
  const now = new Date();
  const pending = await prismaClient.reservation.findMany({
    where: { status: 'PENDING', expiresAt: { lte: now } },
    include: { items: true, customer: true },
  });
  for (const reservation of pending) {
    const variants = [];
    await prismaClient.$transaction(async (tx) => {
      for (const item of reservation.items) {
        const variant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockReserved: { decrement: item.quantity } },
        });
        variants.push(variant);
        await tx.inventoryAdjustment.create({
          data: {
            variantId: item.variantId,
            reservationId: reservation.id,
            reason: 'EXPIRE',
            quantityChange: -item.quantity,
          },
        });
      }
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'EXPIRED', expiredAt: now },
      });
      await tx.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          actorType: 'SYSTEM',
          eventType: 'EXPIRED',
          metadata: { batchRunAt: now.toISOString() },
        },
      });
    });
    io?.emit('reservation:updated', { id: reservation.id, status: 'EXPIRED' });
    variants.forEach((variant) =>
      io?.emit('variant-stock-updated', {
        variantId: variant.id,
        stockOnHand: variant.stockOnHand,
        stockReserved: variant.stockReserved,
        available: availableFromVariant(variant),
      })
    );
    await sendEmail({
      to: reservation.customer?.email || '',
      subject: 'Reserva expirada',
      text: `Tu reserva ${reservation.code} ha expirado.`,
    });
  }
  return pending.length;
}

export function availableFromVariant(variant) {
  return variant.stockOnHand - variant.stockReserved;
}
