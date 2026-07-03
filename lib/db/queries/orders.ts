import { db } from '../client';
import { NotFoundError } from '../../errors';
import type { Order, PaymentStatus, FulfilmentStatus } from '../types';

export interface CreateOrderInput {
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
  fulfilment_status: FulfilmentStatus;
  delivery_address?: string;
  delivery_state?: string;
  recipient_name?: string;
  inscription_request?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data, error } = await db
    .from('orders')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create order: ${error.message}`);
  return data as Order;
}

export async function getOrderByReference(reference: string): Promise<Order> {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('order_reference', reference)
    .single();

  if (error || !data) throw new NotFoundError(`Order not found: ${reference}`);
  return data as Order;
}

export async function updateOrderPaymentInit(
  orderId: string,
  gateway: string,
  gatewayReference: string,
): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({
      payment_status: 'INITIALISED' as PaymentStatus,
      gateway,
      gateway_reference: gatewayReference,
    })
    .eq('id', orderId);

  if (error) throw new Error(`Failed to update order payment init: ${error.message}`);
}

export async function markOrderPaid(
  orderId: string,
  gatewayReference: string,
  newFulfilmentStatus: FulfilmentStatus,
): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({
      payment_status: 'PAID' as PaymentStatus,
      gateway_reference: gatewayReference,
      fulfilment_status: newFulfilmentStatus,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) throw new Error(`Failed to mark order paid: ${error.message}`);
}

export async function updateFulfilmentStatus(
  orderId: string,
  newStatus: FulfilmentStatus,
): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({ fulfilment_status: newStatus })
    .eq('id', orderId);

  if (error) throw new Error(`Failed to update fulfilment status: ${error.message}`);
}

export interface AdminOrderFilters {
  search?: string;
  payment_status?: PaymentStatus;
  fulfilment_status?: FulfilmentStatus;
  product_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

export async function listOrders(filters: AdminOrderFilters = {}): Promise<{ data: Order[]; count: number }> {
  const page = filters.page ?? 1;
  const perPage = Math.min(filters.per_page ?? 50, 200);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = db
    .from('orders')
    .select('*, products(code, name, format)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `order_reference.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`,
    );
  }
  if (filters.payment_status)   query = query.eq('payment_status', filters.payment_status);
  if (filters.fulfilment_status) query = query.eq('fulfilment_status', filters.fulfilment_status);
  if (filters.product_id)       query = query.eq('product_id', filters.product_id);
  if (filters.from_date)        query = query.gte('created_at', filters.from_date);
  if (filters.to_date)          query = query.lte('created_at', filters.to_date);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to list orders: ${error.message}`);
  return { data: (data ?? []) as Order[], count: count ?? 0 };
}
