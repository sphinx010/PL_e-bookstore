import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withMethods, checkRateLimit, getClientIp } from '../lib/api-handler';
import { createNewOrder } from '../lib/orders/create';
import { ValidationError } from '../lib/errors';

const CreateOrderSchema = z.object({
  productCode:        z.string().min(1),
  customerName:       z.string().min(2).max(120),
  email:              z.string().email(),
  phone:              z.string().min(7).max(20),
  deliveryAddress:    z.string().min(5).max(500).optional(),
  deliveryState:      z.string().min(2).max(60).optional(),
  recipientName:      z.string().max(120).optional(),
  inscriptionRequest: z.string().max(300).optional(),
});

export default withMethods({
  POST: async (req: VercelRequest, res: VercelResponse) => {
    checkRateLimit(`order:${getClientIp(req)}`, 5, 60_000);

    const parsed = CreateOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid order data.', parsed.error.flatten());
    }

    const { order, productName } = await createNewOrder(parsed.data);

    res.status(201).json({
      orderReference:  order.order_reference,
      totalAmountKobo: order.total_amount_kobo,
      totalNaira:      order.total_amount_kobo / 100,
      currency:        order.currency,
      productName,
    });
  },
});
