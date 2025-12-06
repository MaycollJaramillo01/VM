import { describe, it, expect, vi } from 'vitest';
import { createReservation, expirePendingReservations } from '../src/services/reservationService.js';

vi.mock('../src/utils/mailer.js', () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));

describe('reservationService', () => {
  it('creates reservation and adjusts stock', async () => {
    const tx = {
      productVariant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'v1', stockOnHand: 5, stockReserved: 1, price: 10 }),
        update: vi.fn().mockResolvedValue({ id: 'v1', stockOnHand: 5, stockReserved: 3 }),
      },
      reservation: {
        create: vi.fn().mockResolvedValue({ id: 'r1', customerId: 'c1', expiresAt: new Date(), items: [], customer: {} }),
      },
      reservationEvent: { create: vi.fn() },
      customer: { update: vi.fn() },
    };
    const prismaMock = {
      $transaction: async (fn) => fn(tx),
    };

    const result = await createReservation({
      customerId: 'c1',
      items: [{ variantId: 'v1', quantity: 2 }],
      prismaClient: prismaMock,
    });

    expect(result.id).toBe('r1');
    expect(tx.productVariant.findUnique).toHaveBeenCalled();
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stockReserved: { increment: 2 } },
    });
  });

  it('expires reservations and emits events', async () => {
    const now = new Date();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const tx = {
      productVariant: {
        update: vi.fn().mockResolvedValue({ id: 'v1', stockOnHand: 5, stockReserved: 0 }),
      },
      inventoryAdjustment: { create: vi.fn() },
      reservation: { update: vi.fn() },
      reservationEvent: { create: vi.fn() },
    };
    const prismaMock = {
      reservation: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'r1', status: 'PENDING', expiresAt: now, items: [{ variantId: 'v1', quantity: 1 }], customer: { email: 'a@b.com' } },
        ]),
      },
      $transaction: async (fn) => fn(tx),
    };
    const ioMock = { emit: vi.fn() };
    const expired = await expirePendingReservations(ioMock, prismaMock);
    expect(expired).toBe(1);
    expect(ioMock.emit).toHaveBeenCalledWith('reservation:updated', { id: 'r1', status: 'EXPIRED' });
    expect(tx.productVariant.update).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
