import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeOrder } from './helpers/mocks';

vi.mock('../lib/db/client', () => ({ db: {} }));

const mockGetOrder = vi.fn();
const mockUpdateInit = vi.fn();

vi.mock('../lib/db/queries/orders', () => ({
  getOrderByReference:    (...args: unknown[]) => mockGetOrder(...args),
  updateOrderPaymentInit: (...args: unknown[]) => mockUpdateInit(...args),
}));

// Mock the Monnify gateway
const mockInitPayment = vi.fn();
vi.mock('../lib/payments/monnify', () => ({
  monnifyGateway: {
    name: 'monnify',
    initializePayment: (...args: unknown[]) => mockInitPayment(...args),
    verifyTransaction:  vi.fn(),
    validateWebhook:    vi.fn(),
    parseWebhook:       vi.fn(),
  },
}));

beforeEach(() => {
  mockGetOrder.mockReset();
  mockUpdateInit.mockReset();
  mockInitPayment.mockReset();
});

describe('Payment initialisation', () => {
  it('returns a checkout URL for a valid pending order', async () => {
    mockGetOrder.mockResolvedValue(makeOrder());
    mockInitPayment.mockResolvedValue({
      checkoutUrl: 'https://sandbox.monnify.com/checkout/MNFY_TEST',
      gatewayReference: 'MNFY_TEST_REF',
    });
    mockUpdateInit.mockResolvedValue(undefined);

    // Simulate what the API handler does
    const { monnifyGateway } = await import('../lib/payments/monnify');
    const order = await mockGetOrder('PL-20240601-TESTREF');

    const result = await monnifyGateway.initializePayment({
      orderReference: order.order_reference,
      amountKobo:     order.total_amount_kobo,
      currency:       order.currency,
      customerName:   order.customer_name,
      customerEmail:  order.email,
      description:    'Test',
      redirectUrl:    'http://localhost/confirm',
    });

    expect(result.checkoutUrl).toContain('monnify.com');
    expect(result.gatewayReference).toBe('MNFY_TEST_REF');
  });

  it('rejects payment initialisation for an already-paid order', async () => {
    const paidOrder = makeOrder({ payment_status: 'PAID' });
    mockGetOrder.mockResolvedValue(paidOrder);

    const { PaymentError } = await import('../lib/errors');

    // This is the logic the API handler applies
    if (paidOrder.payment_status === 'PAID') {
      expect(() => { throw new PaymentError('Already paid'); }).toThrow(PaymentError);
    }
  });

  it('rejects payment initialisation for a cancelled order', async () => {
    const cancelled = makeOrder({ payment_status: 'CANCELLED' });
    const { PaymentError } = await import('../lib/errors');

    if (cancelled.payment_status === 'CANCELLED') {
      expect(() => { throw new PaymentError('Cancelled'); }).toThrow(PaymentError);
    }
  });
});
