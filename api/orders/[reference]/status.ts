import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods, checkRateLimit, getClientIp } from '../../../lib/api-handler';
import { getOrderByReference } from '../../../lib/db/queries/orders';
import { getProductById } from '../../../lib/db/queries/products';
import { getEntitlementByOrderId } from '../../../lib/db/queries/ebook-entitlements';
import { buildEbookAccessUrl, ensureEbookEntitlement, fulfilPaidOrder } from '../../../lib/orders/fulfil';
import { paystackGateway } from '../../../lib/payments/paystack';
import { logger } from '../../../lib/logger';
import type { Order } from '../../../lib/db/types';

async function reconcilePaystackPayment(order: Order): Promise<Order> {
  if (order.payment_status === 'PAID') return order;
  if (order.gateway !== 'paystack') return order;

  const gatewayReference = order.gateway_reference ?? order.order_reference;

  try {
    const verified = await paystackGateway.verifyTransaction(gatewayReference);

    if (verified.status !== 'PAID') return order;

    if (verified.orderReference !== order.order_reference) {
      logger.error('Paystack status reconciliation reference mismatch', {
        orderReference: order.order_reference,
        verifiedReference: verified.orderReference,
      });
      return order;
    }

    if (verified.amountKobo !== order.total_amount_kobo || verified.currency !== order.currency) {
      logger.error('Paystack status reconciliation amount/currency mismatch', {
        orderReference: order.order_reference,
        expectedAmount: order.total_amount_kobo,
        verifiedAmount: verified.amountKobo,
        expectedCurrency: order.currency,
        verifiedCurrency: verified.currency,
      });
      return order;
    }

    await fulfilPaidOrder(order.order_reference, verified.gatewayReference);
    return getOrderByReference(order.order_reference);
  } catch (err) {
    logger.warn('Paystack status reconciliation skipped', {
      orderReference: order.order_reference,
      error: err instanceof Error ? err.message : String(err),
    });
    return order;
  }
}

export default withMethods({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    checkRateLimit(`status:${getClientIp(req)}`, 30, 60_000);

    const reference = req.query['reference'] as string;

    let order = await getOrderByReference(reference);
    order = await reconcilePaystackPayment(order);

    const product = await getProductById(order.product_id);
    let ebookAccess:
      | {
          available: boolean;
          downloadUrl?: string;
          expiresAt?: string;
          maximumDownloads?: number;
          downloadCount?: number;
        }
      | undefined;

    if (product.format === 'EBOOK' && order.payment_status === 'PAID') {
      const entitlement = await ensureEbookEntitlement(order);
      order = { ...order, fulfilment_status: 'ACCESS_ISSUED' };
      ebookAccess = {
        available: true,
        downloadUrl: buildEbookAccessUrl(entitlement.download_uuid),
        expiresAt: entitlement.expires_at,
        maximumDownloads: entitlement.maximum_downloads,
        downloadCount: entitlement.download_count,
      };
    } else if (product.format === 'EBOOK') {
      const entitlement = await getEntitlementByOrderId(order.id);
      ebookAccess = entitlement
        ? {
            available: order.payment_status === 'PAID',
            downloadUrl: order.payment_status === 'PAID' ? buildEbookAccessUrl(entitlement.download_uuid) : undefined,
            expiresAt: entitlement.expires_at,
            maximumDownloads: entitlement.maximum_downloads,
            downloadCount: entitlement.download_count,
          }
        : { available: false };
    }

    res.status(200).json({
      orderReference:   order.order_reference,
      paymentStatus:    order.payment_status,
      fulfilmentStatus: order.fulfilment_status,
      currency:         order.currency,
      totalNaira:       order.total_amount_kobo / 100,
      paidAt:           order.paid_at,
      productFormat:    product.format,
      ebookAccess,
    });
  },
});
