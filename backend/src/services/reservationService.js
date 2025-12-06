import { prisma } from '../prisma.js';
import { sendEmail } from '../utils/mailer.js';

export async function createReservation({ customerId, items, expiresInHours = 48, note, analytics }) {
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    let total = 0;
    for (const item of items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) throw new Error('Variante no encontrada');
      const available = variant.stockOnHand - variant.stockReserved;
      if (available < item.quantity) throw new Error('Stock insuficiente');
      total += Number(variant.price) * item.quantity;
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockReserved: { increment: item.quantity } },
      });
    }
    const reservation = await tx.reservation.create({
      data: {
        code: `RSV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
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
          create: await Promise.all(
            items.map(async (item) => {
              const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
              return {
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: variant.price,
                subtotal: Number(variant.price) * item.quantity,
              };
            })
          ),
        },
      },
      include: { items: true, customer: true },
    });
    return reservation;
  });
}

export async function expirePendingReservations(io) {
  const now = new Date();
  const expired = await prisma.reservation.findMany({ where: { status: 'PENDING', expiresAt: { lte: now } }, include: { items: true } });
  for (const reservation of expired) {
    await prisma.$transaction(async (tx) => {
      for (const item of reservation.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stockReserved: { decrement: item.quantity } } });
      }
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'EXPIRED', expiredAt: now } });
    });
    if (io) io.emit('reservation:expired', { id: reservation.id });
    await sendEmail({ to: reservation.customer?.email || '', subject: 'Reserva expirada', text: `Tu reserva ${reservation.code} ha expirado.` });
  }
  return expired.length;
}
