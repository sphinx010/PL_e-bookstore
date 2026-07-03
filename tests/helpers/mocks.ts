import { vi } from 'vitest';
import type { Product, Order } from '../../lib/db/types';

// ── Product fixtures ──────────────────────────────────────────────────────────
export const PRODUCT_SIGNED: Product = {
  id: 'prod-signed-uuid',
  code: 'PURPOSEFUL_LIVING_SIGNED',
  name: 'Purposeful Living — Signed Physical Copy',
  format: 'PHYSICAL',
  description: 'Signed hardcover',
  price_kobo: 2500000,
  currency: 'NGN',
  sales_mode: 'AVAILABLE',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const PRODUCT_EBOOK: Product = {
  id: 'prod-ebook-uuid',
  code: 'PURPOSEFUL_LIVING_EBOOK',
  name: 'Purposeful Living — E-book',
  format: 'EBOOK',
  description: 'PDF edition',
  price_kobo: 500000,
  currency: 'NGN',
  sales_mode: 'AVAILABLE',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// ── Order fixtures ────────────────────────────────────────────────────────────
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-uuid-1',
    order_reference: 'PL-20240601-ABCDEFGH',
    customer_name: 'Test Customer',
    email: 'test@example.com',
    phone: '+2348000000000',
    product_id: PRODUCT_SIGNED.id,
    quantity: 1,
    unit_price_kobo: 2500000,
    subtotal_kobo: 2500000,
    delivery_fee_kobo: 0,
    total_amount_kobo: 2500000,
    currency: 'NGN',
    payment_status: 'PENDING',
    fulfilment_status: 'AWAITING_PAYMENT',
    delivery_address: '123 Test Street',
    delivery_state: 'Lagos',
    recipient_name: null,
    inscription_request: null,
    gateway: null,
    gateway_reference: null,
    paid_at: null,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    ...overrides,
  };
}

// ── Mock Supabase builder ─────────────────────────────────────────────────────
export function mockSupabaseResponse<T>(data: T, error: null | { message: string; code?: string } = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    range:  vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: undefined as never,
  };
  // Allow the chain to resolve directly when awaited
  Object.defineProperty(builder, 'then', {
    get() { return (resolve: (v: { data: T; error: typeof error; count?: null }) => void) =>
      resolve({ data, error, count: null }); }
  });
  return builder;
}

// ── Mock fetch helper ─────────────────────────────────────────────────────────
export function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}
