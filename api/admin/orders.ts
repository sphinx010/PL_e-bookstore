import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods, requireAdminAuth } from '../../lib/api-handler';
import { listOrders } from '../../lib/db/queries/orders';
import type { PaymentStatus, FulfilmentStatus } from '../../lib/db/types';

export default withMethods({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    await requireAdminAuth(req);

    const q = req.query;
    const { data, count } = await listOrders({
      search:           q['search'] as string | undefined,
      payment_status:   q['payment_status'] as PaymentStatus | undefined,
      fulfilment_status: q['fulfilment_status'] as FulfilmentStatus | undefined,
      product_id:       q['product_id'] as string | undefined,
      from_date:        q['from_date'] as string | undefined,
      to_date:          q['to_date'] as string | undefined,
      page:             q['page'] ? parseInt(q['page'] as string, 10) : 1,
      per_page:         q['per_page'] ? parseInt(q['per_page'] as string, 10) : 50,
    });

    res.status(200).json({ orders: data, total: count });
  },
});
