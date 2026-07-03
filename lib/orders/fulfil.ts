import { markOrderPaid, updateFulfilmentStatus, getOrderByReference } from '../db/queries/orders';
import { getProductById } from '../db/queries/products';
import { recordFulfilmentEvent, getFulfilmentHistory } from '../db/queries/fulfilment-events';
import { createEbookEntitlement } from '../db/queries/ebook-entitlements';
import { sendEmail } from '../email/client';
import { paymentConfirmedPhysicalHtml } from '../email/templates/payment-confirmed-physical';
import { ebookDeliveryHtml } from '../email/templates/ebook-delivery';
import { adminNewOrderHtml } from '../email/templates/admin-new-order';
import { generateDownloadToken } from '../id';
import { config } from '../config';
import { logger } from '../logger';
import { AppError } from '../errors';
import type { Order, FulfilmentStatus, PHYSICAL_TRANSITIONS, EBOOK_TRANSITIONS } from '../db/types';
import { PHYSICAL_TRANSITIONS as physTrans, EBOOK_TRANSITIONS as ebookTrans } from '../db/types';
import { createHash } from 'crypto';

function isTransitionAllowed(
  format: 'PHYSICAL' | 'EBOOK',
  from: FulfilmentStatus,
  to: FulfilmentStatus,
): boolean {
  const map = format === 'PHYSICAL' ? physTrans : ebookTrans;
  return (map[from] ?? []).includes(to);
}

function buildDownloadUrl(rawToken: string): string {
  return `${config.APP_URL}/api/ebooks/download/${rawToken}`;
}

/** Called by the webhook handler after a successful payment is verified. */
export async function fulfilPaidOrder(
  orderReference: string,
  gatewayReference: string,
): Promise<void> {
  const order = await getOrderByReference(orderReference);

  if (order.payment_status === 'PAID') {
    logger.warn('fulfilPaidOrder called on already-paid order — skipping', { orderReference });
    return;
  }

  const product = await getProductById(order.product_id);
  const newFulfilment: FulfilmentStatus =
    product.format === 'EBOOK' ? 'ACCESS_PENDING' : 'AWAITING_INSCRIPTION';

  await markOrderPaid(order.id, gatewayReference, newFulfilment);
  await recordFulfilmentEvent(order.id, order.fulfilment_status, newFulfilment, 'system', 'Payment confirmed via webhook');

  logger.info('Order marked paid', { orderReference, gatewayReference, format: product.format });

  if (product.format === 'EBOOK') {
    await fulfilEbook(order, gatewayReference);
  } else {
    await fulfilPhysical(order, product.name);
  }
}

async function fulfilEbook(order: Order, gatewayReference: string): Promise<void> {
  const rawToken = generateDownloadToken();
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.EBOOK_LINK_TTL_SECONDS * 1000).toISOString();
  const expiresHours = Math.round(config.EBOOK_LINK_TTL_SECONDS / 3600);

  await createEbookEntitlement({
    order_id:            order.id,
    customer_email:      order.email,
    storage_path:        config.EBOOK_STORAGE_PATH,
    download_token_hash: tokenHash,
    expires_at:          expiresAt,
    maximum_downloads:   config.EBOOK_MAX_DOWNLOADS,
  });

  await updateFulfilmentStatus(order.id, 'ACCESS_ISSUED');
  await recordFulfilmentEvent(order.id, 'ACCESS_PENDING', 'ACCESS_ISSUED', 'system', 'Download token generated');

  const downloadUrl = buildDownloadUrl(rawToken);
  sendEmail({
    to: order.email,
    subject: 'Your Purposeful Living e-book is ready',
    html: ebookDeliveryHtml(order, downloadUrl, expiresHours),
  }).catch(err => logger.error('Failed to send ebook delivery email', { error: String(err) }));

  logger.info('Ebook entitlement created and delivery email queued', { orderId: order.id });
}

async function fulfilPhysical(order: Order, productName: string): Promise<void> {
  sendEmail({
    to: order.email,
    subject: `Payment confirmed — ${order.order_reference}`,
    html: paymentConfirmedPhysicalHtml(order, productName),
  }).catch(err => logger.error('Failed to send physical confirmation email', { error: String(err) }));

  sendEmail({
    to: config.ADMIN_EMAIL,
    subject: `[NEW ORDER] ${order.order_reference} — ${productName}`,
    html: adminNewOrderHtml(order, productName, config.APP_URL),
  }).catch(err => logger.error('Failed to send admin notification email', { error: String(err) }));

  logger.info('Physical order confirmation emails queued', { orderId: order.id });
}

/** Admin-initiated fulfilment status update with transition validation. */
export async function advanceFulfilmentStatus(
  orderReference: string,
  newStatus: FulfilmentStatus,
  updatedBy: string,
  note?: string,
): Promise<Order> {
  const order = await getOrderByReference(orderReference);
  const product = await getProductById(order.product_id);

  if (!isTransitionAllowed(product.format, order.fulfilment_status, newStatus)) {
    throw new AppError(
      422,
      'INVALID_TRANSITION',
      `Cannot transition from ${order.fulfilment_status} to ${newStatus} for ${product.format} orders.`,
    );
  }

  await updateFulfilmentStatus(order.id, newStatus);
  await recordFulfilmentEvent(order.id, order.fulfilment_status, newStatus, updatedBy, note);

  logger.info('Fulfilment status advanced', { orderReference, from: order.fulfilment_status, to: newStatus, by: updatedBy });

  return { ...order, fulfilment_status: newStatus };
}
