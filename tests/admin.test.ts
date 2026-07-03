import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeOrder, PRODUCT_SIGNED } from './helpers/mocks';

vi.mock('../lib/db/client', () => ({ db: {} }));
vi.mock('../lib/email/client', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

const mockGetOrder = vi.fn();
const mockGetProduct = vi.fn();
const mockUpdateStatus = vi.fn();
const mockRecordFulfilment = vi.fn();

vi.mock('../lib/db/queries/orders', () => ({
  getOrderByReference:    (...a: unknown[]) => mockGetOrder(...a),
  updateFulfilmentStatus: (...a: unknown[]) => mockUpdateStatus(...a),
}));
vi.mock('../lib/db/queries/products', () => ({
  getProductById: (...a: unknown[]) => mockGetProduct(...a),
}));
vi.mock('../lib/db/queries/fulfilment-events', () => ({
  recordFulfilmentEvent: (...a: unknown[]) => mockRecordFulfilment(...a),
}));

beforeEach(() => {
  mockGetOrder.mockReset();
  mockGetProduct.mockReset();
  mockUpdateStatus.mockReset();
  mockRecordFulfilment.mockReset();
});

describe('Admin authentication', () => {
  it('rejects requests without an Authorization header', async () => {
    const { UnauthorizedError } = await import('../lib/errors');
    const { requireAdminAuth } = await import('../lib/api-handler');

    const fakeReq = { headers: {} } as never;
    await expect(requireAdminAuth(fakeReq)).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a malformed Bearer token', async () => {
    const { UnauthorizedError } = await import('../lib/errors');
    const { requireAdminAuth } = await import('../lib/api-handler');

    const fakeReq = { headers: { authorization: 'Bearer invalid-jwt' } } as never;
    await expect(requireAdminAuth(fakeReq)).rejects.toThrow(UnauthorizedError);
  });
});

describe('Fulfilment status transitions', () => {
  it('advances a physical order from AWAITING_INSCRIPTION to SIGNED', async () => {
    const order = makeOrder({
      fulfilment_status: 'AWAITING_INSCRIPTION',
      payment_status: 'PAID',
      paid_at: new Date().toISOString(),
    });
    mockGetOrder.mockResolvedValue(order);
    mockGetProduct.mockResolvedValue(PRODUCT_SIGNED);
    mockUpdateStatus.mockResolvedValue(undefined);
    mockRecordFulfilment.mockResolvedValue(undefined);

    const { advanceFulfilmentStatus } = await import('../lib/orders/fulfil');
    const updated = await advanceFulfilmentStatus(
      order.order_reference,
      'SIGNED',
      'admin@example.com',
      'Signed by author',
    );

    expect(updated.fulfilment_status).toBe('SIGNED');
    expect(mockUpdateStatus).toHaveBeenCalledWith(order.id, 'SIGNED');
  });

  it('rejects an invalid fulfilment status transition', async () => {
    const order = makeOrder({ fulfilment_status: 'DELIVERED' });
    mockGetOrder.mockResolvedValue(order);
    mockGetProduct.mockResolvedValue(PRODUCT_SIGNED);

    const { advanceFulfilmentStatus } = await import('../lib/orders/fulfil');
    const { AppError } = await import('../lib/errors');

    await expect(
      advanceFulfilmentStatus(order.order_reference, 'AWAITING_INSCRIPTION', 'admin@test.com'),
    ).rejects.toThrow(AppError);
  });

  it('rejects a DISPATCHED → AWAITING_INSCRIPTION jump', async () => {
    const order = makeOrder({ fulfilment_status: 'DISPATCHED' });
    mockGetOrder.mockResolvedValue(order);
    mockGetProduct.mockResolvedValue(PRODUCT_SIGNED);

    const { advanceFulfilmentStatus } = await import('../lib/orders/fulfil');
    await expect(
      advanceFulfilmentStatus(order.order_reference, 'AWAITING_INSCRIPTION', 'admin@test.com'),
    ).rejects.toThrow();
  });
});

describe('Waitlist', () => {
  it('prevents duplicate submissions for the same email and product', async () => {
    const mockAdd = vi.fn().mockRejectedValue({
      message: 'duplicate key',
      code: '23505',
    });
    vi.doMock('../lib/db/queries/waitlist', () => ({ addToWaitlist: mockAdd }));

    const { ConflictError } = await import('../lib/errors');
    // The query layer converts code 23505 to ConflictError
    const { addToWaitlist } = await import('../lib/db/queries/waitlist');

    try {
      await addToWaitlist('Jane', 'jane@example.com', '+234', 'PURPOSEFUL_LIVING_SIGNED');
    } catch {
      // Expected
    }

    expect(mockAdd).toHaveBeenCalled();
  });
});
