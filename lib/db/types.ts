export type ProductFormat = 'PHYSICAL' | 'EBOOK';
export type SalesMode = 'AVAILABLE' | 'WAITLIST' | 'SOLD_OUT';

export interface Product {
  id: string;
  code: string;
  name: string;
  format: ProductFormat;
  description: string;
  price_kobo: number;
  currency: string;
  sales_mode: SalesMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus =
  | 'PENDING'
  | 'INITIALISED'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type FulfilmentStatus =
  | 'NOT_APPLICABLE'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_INSCRIPTION'
  | 'SIGNED'
  | 'PACKAGED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'ACCESS_PENDING'
  | 'ACCESS_ISSUED'
  | 'ACCESS_REVOKED'
  | 'CANCELLED';

export interface Order {
  id: string;
  order_reference: string;
  customer_name: string;
  email: string;
  phone: string;
  product_id: string;
  quantity: number;
  unit_price_kobo: number;
  subtotal_kobo: number;
  delivery_fee_kobo: number;
  total_amount_kobo: number;
  currency: string;
  payment_status: PaymentStatus;
  fulfilment_status: FulfilmentStatus;
  delivery_address: string | null;
  delivery_state: string | null;
  recipient_name: string | null;
  inscription_request: string | null;
  gateway: string | null;
  gateway_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentEvent {
  id: string;
  gateway: string;
  event_type: string;
  gateway_event_id: string;
  order_reference: string | null;
  payload: Record<string, unknown>;
  signature_valid: boolean;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface EbookEntitlement {
  id: string;
  order_id: string;
  customer_email: string;
  storage_path: string;
  download_uuid: string;
  download_token_hash: string;
  expires_at: string;
  maximum_downloads: number;
  download_count: number;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FulfilmentEvent {
  id: string;
  order_id: string;
  previous_status: FulfilmentStatus;
  new_status: FulfilmentStatus;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  product_code: string;
  source: string;
  created_at: string;
}

// Valid fulfilment status transitions
export const PHYSICAL_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  AWAITING_PAYMENT:     ['AWAITING_INSCRIPTION', 'CANCELLED'],
  AWAITING_INSCRIPTION: ['SIGNED', 'CANCELLED'],
  SIGNED:               ['PACKAGED', 'CANCELLED'],
  PACKAGED:             ['DISPATCHED', 'CANCELLED'],
  DISPATCHED:           ['DELIVERED', 'CANCELLED'],
  DELIVERED:            [],
  CANCELLED:            [],
  NOT_APPLICABLE:       [],
  ACCESS_PENDING:       [],
  ACCESS_ISSUED:        [],
  ACCESS_REVOKED:       [],
};

export const EBOOK_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  AWAITING_PAYMENT: ['ACCESS_PENDING'],
  ACCESS_PENDING:   ['ACCESS_ISSUED', 'ACCESS_REVOKED'],
  ACCESS_ISSUED:    ['ACCESS_REVOKED'],
  ACCESS_REVOKED:   [],
  CANCELLED:        [],
  NOT_APPLICABLE:   [],
  AWAITING_INSCRIPTION: [],
  SIGNED:           [],
  PACKAGED:         [],
  DISPATCHED:       [],
  DELIVERED:        [],
};
