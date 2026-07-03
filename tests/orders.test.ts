import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRODUCT_SIGNED, PRODUCT_EBOOK, makeOrder } from './helpers/mocks';
import { createNewOrder } from '../lib/orders/create';

// Mock the DB layer — do not call live Supabase
vi.mock('../lib/db/client', () => ({ db: {} }));
vi.mock('../lib/email/client', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

const mockGetProductByCode = vi.fn();
const mockCreateOrder = vi.fn();

vi.mock('../lib/db/queries/products', () => ({
  getProductByCode: (...args: unknown[]) => mockGetProductByCode(...args),
}));
vi.mock('../lib/db/queries/orders', () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}));
vi.mock('../lib/id', () => ({
  generateOrderReference: () => 'PL-20240601-TESTREF',
  generateDownloadToken:  () => 'raw-test-token-64-chars-long-placeholder-value-here-ok',
}));



beforeEach(() => {
  mockGetProductByCode.mockReset();
  mockCreateOrder.mockReset();
});

describe('createNewOrder', () => {
  it('creates a valid physical order with correct server-side price', async () => {
    mockGetProductByCode.mockResolvedValue(PRODUCT_SIGNED);
    mockCreateOrder.mockResolvedValue(makeOrder({ order_reference: 'PL-20240601-TESTREF' }));

    const result = await createNewOrder({
      productCode:     'PURPOSEFUL_LIVING_SIGNED',
      customerName:    'Test Customer',
      email:           'test@example.com',
      phone:           '+2348000000000',
      deliveryAddress: '123 Test Street',
      deliveryState:   'Lagos',
    });

    expect(result.order.order_reference).toBe('PL-20240601-TESTREF');

    const callArgs = mockCreateOrder.mock.calls[0]?.[0];
    // Server determines price — never from client input
    expect(callArgs.unit_price_kobo).toBe(PRODUCT_SIGNED.price_kobo);
    expect(callArgs.total_amount_kobo).toBe(PRODUCT_SIGNED.price_kobo);
  });

  it('rejects a manipulated amount — price always comes from database', async () => {
    mockGetProductByCode.mockResolvedValue(PRODUCT_SIGNED);
    mockCreateOrder.mockResolvedValue(makeOrder());

    await createNewOrder({
      productCode:     'PURPOSEFUL_LIVING_SIGNED',
      customerName:    'Attacker',
      email:           'bad@example.com',
      phone:           '+2340000000000',
      deliveryAddress: '1 Fake Street',
    });

    // Even if the caller tried to pass a low amount, the DB product price is used
    const callArgs = mockCreateOrder.mock.calls[0]?.[0];
    expect(callArgs.unit_price_kobo).toBe(2500000); // not any attacker-supplied value
  });

  it('rejects an inactive / SOLD_OUT product', async () => {
    mockGetProductByCode.mockResolvedValue({ ...PRODUCT_SIGNED, sales_mode: 'SOLD_OUT' });

    await expect(createNewOrder({
      productCode:  'PURPOSEFUL_LIVING_SIGNED',
      customerName: 'Test',
      email:        'test@example.com',
      phone:        '+234',
    })).rejects.toThrow('sold out');
  });

  it('rejects a WAITLIST product', async () => {
    mockGetProductByCode.mockResolvedValue({ ...PRODUCT_SIGNED, sales_mode: 'WAITLIST' });

    await expect(createNewOrder({
      productCode:  'PURPOSEFUL_LIVING_SIGNED',
      customerName: 'Test',
      email:        'test@example.com',
      phone:        '+234',
    })).rejects.toThrow('not yet available');
  });

  it('requires delivery address for physical orders', async () => {
    mockGetProductByCode.mockResolvedValue(PRODUCT_SIGNED);

    await expect(createNewOrder({
      productCode:  'PURPOSEFUL_LIVING_SIGNED',
      customerName: 'Test',
      email:        'test@example.com',
      phone:        '+234',
      // no deliveryAddress
    })).rejects.toThrow('Delivery address');
  });

  it('creates an ebook order without requiring delivery address', async () => {
    mockGetProductByCode.mockResolvedValue(PRODUCT_EBOOK);
    mockCreateOrder.mockResolvedValue(makeOrder({
      product_id: PRODUCT_EBOOK.id,
      unit_price_kobo: 500000,
      total_amount_kobo: 500000,
    }));

    const result = await createNewOrder({
      productCode:  'PURPOSEFUL_LIVING_EBOOK',
      customerName: 'Ebook Buyer',
      email:        'ebook@example.com',
      phone:        '+234',
    });

    expect(result.order).toBeDefined();
    const callArgs = mockCreateOrder.mock.calls[0]?.[0];
    expect(callArgs.delivery_fee_kobo).toBe(0);
  });
});
