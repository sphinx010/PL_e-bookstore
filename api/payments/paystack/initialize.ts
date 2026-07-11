import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withMethods, checkRateLimit, getClientIp } from '../../../lib/api-handler';
import { getOrderByReference } from '../../../lib/db/queries/orders';
import { updateOrderPaymentInit } from '../../../lib/db/queries/orders';
import { paystackGateway } from '../../../lib/payments/paystack';
import { config } from '../../../lib/config';
import { getProductById } from '../../../lib/db/queries/products';
import { buildEbookAccessUrl, ensureEbookEntitlement } from '../../../lib/orders/fulfil';
import { ValidationError, PaymentError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';

const InitSchema = z.object({
  orderReference: z.string().min(1),
});

export default withMethods({
  POST: async (req: VercelRequest, res: VercelResponse) => {
    checkRateLimit(`payinit:${getClientIp(req)}`, 10, 60_000);

    const parsed = InitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('orderReference is required.');
    }

    const order = await getOrderByReference(parsed.data.orderReference);

    if (order.payment_status === 'PAID') {
      const product = await getProductById(order.product_id);
      if (product.format === 'EBOOK') {
        const entitlement = await ensureEbookEntitlement(order);
        res.status(200).json({
          alreadyPaid: true,
          orderReference: order.order_reference,
          downloadUrl: buildEbookAccessUrl(entitlement.download_uuid),
          statusUrl: `${config.APP_URL}/order-confirmation.html?ref=${order.order_reference}`,
        });
        return;
      }
      throw new PaymentError('This order has already been paid.');
    }
    if (order.payment_status === 'CANCELLED') {
      throw new PaymentError('This order has been cancelled.');
    }

    let result;
    try {
      result = await paystackGateway.initializePayment({
        orderReference: order.order_reference,
        amountKobo:     order.total_amount_kobo,
        currency:       order.currency,
        customerName:   order.customer_name,
        customerEmail:  order.email,
        description:    `Purposeful Living — ${order.order_reference}`,
        redirectUrl:    `${config.APP_URL}/order-confirmation.html?ref=${order.order_reference}`,
      });
    } catch (err) {
      logger.error('Paystack init failed', { error: err instanceof Error ? err.message : String(err) });
      throw new PaymentError('Payment initialisation failed. Please try again.');
    }

    await updateOrderPaymentInit(order.id, 'paystack', result.gatewayReference);

    res.status(200).json({
      checkoutUrl:      result.checkoutUrl,
      gatewayReference: result.gatewayReference,
      orderReference:   order.order_reference,
    });
  },
});
