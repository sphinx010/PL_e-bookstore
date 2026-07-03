import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods } from '../../../lib/api-handler';
import { db } from '../../../lib/db/client';
import { NotFoundError } from '../../../lib/errors';

export default withMethods({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    const reference = req.query['reference'] as string;
    
    const { data: order, error } = await db
      .from('orders')
      .select('*, products(format)')
      .eq('order_reference', reference)
      .single();

    if (error || !order) {
      throw new NotFoundError(`Order not found: ${reference}`);
    }

    res.status(200).json({
      orderReference:   order.order_reference,
      paymentStatus:    order.payment_status,
      fulfilmentStatus: order.fulfilment_status,
      currency:         order.currency,
      totalNaira:       order.total_amount_kobo / 100,
      paidAt:           order.paid_at,
      productFormat:    (order as any).products?.format ?? 'EBOOK',
    });
  },
});
