import { createOrder } from '../db/queries/orders';
import { getProductByCode } from '../db/queries/products';
import { sendEmail } from '../email/client';
import { orderReceivedHtml } from '../email/templates/order-received';
import { generateOrderReference } from '../id';
import { logger } from '../logger';
import { ValidationError } from '../errors';
import type { Order, FulfilmentStatus } from '../db/types';

export interface CreateOrderInput {
  productCode: string;
  customerName: string;
  email: string;
  phone: string;
  deliveryAddress?: string;
  deliveryState?: string;
  recipientName?: string;
  inscriptionRequest?: string;
}

export interface CreateOrderResult {
  order: Order;
  productName: string;
}

// PENDING: Delivery fee rules to be confirmed with the author.
// Currently 0 for all orders. Update when courier integration is in scope.
function calculateDeliveryFee(_deliveryState: string | undefined): number {
  return 0;
}

export async function createNewOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const product = await getProductByCode(input.productCode);

  if (product.sales_mode === 'SOLD_OUT') {
    throw new ValidationError('This product is currently sold out.');
  }
  if (product.sales_mode === 'WAITLIST') {
    throw new ValidationError('This product is not yet available for direct purchase. Use the waitlist.');
  }

  const quantity = 1;
  const unitPriceKobo = product.price_kobo;
  const subtotalKobo = unitPriceKobo * quantity;
  const deliveryFeeKobo = product.format === 'PHYSICAL'
    ? calculateDeliveryFee(input.deliveryState)
    : 0;
  const totalKobo = subtotalKobo + deliveryFeeKobo;

  if (product.format === 'PHYSICAL' && !input.deliveryAddress) {
    throw new ValidationError('Delivery address is required for physical copy orders.');
  }

  const initialFulfilment: FulfilmentStatus = 'AWAITING_PAYMENT';
  const orderRef = generateOrderReference();

  const order = await createOrder({
    order_reference:    orderRef,
    customer_name:      input.customerName,
    email:              input.email,
    phone:              input.phone,
    product_id:         product.id,
    quantity,
    unit_price_kobo:    unitPriceKobo,
    subtotal_kobo:      subtotalKobo,
    delivery_fee_kobo:  deliveryFeeKobo,
    total_amount_kobo:  totalKobo,
    currency:           product.currency,
    fulfilment_status:  initialFulfilment,
    delivery_address:   input.deliveryAddress,
    delivery_state:     input.deliveryState,
    recipient_name:     input.recipientName,
    inscription_request: input.inscriptionRequest,
  });

  logger.info('Order created', { orderReference: orderRef, productCode: input.productCode, email: '[REDACTED]' });

  // Fire-and-forget — don't block order creation on email delivery
  sendEmail({
    to: order.email,
    subject: `Order received — ${orderRef}`,
    html: orderReceivedHtml(order, product.name),
  }).catch(err => logger.error('Failed to send order-received email', { error: String(err) }));

  return { order, productName: product.name };
}
