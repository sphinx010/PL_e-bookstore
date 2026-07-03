import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withMethods, requireAdminAuth } from '../../lib/api-handler';
import { getOrderByReference } from '../../lib/db/queries/orders';
import { getFulfilmentHistory } from '../../lib/db/queries/fulfilment-events';
import { getEntitlementByOrderId } from '../../lib/db/queries/ebook-entitlements';
import { advanceFulfilmentStatus } from '../../lib/orders/fulfil';
import { ValidationError } from '../../lib/errors';
import type { FulfilmentStatus } from '../../lib/db/types';

const UpdateSchema = z.object({
  fulfilmentStatus: z.string().min(1),
  note:             z.string().max(500).optional(),
});

export default withMethods({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    const { userId } = await requireAdminAuth(req);
    const reference = req.query['reference'] as string;

    const order = await getOrderByReference(reference);
    const history = await getFulfilmentHistory(order.id);
    const entitlement = await getEntitlementByOrderId(order.id);

    res.status(200).json({
      order,
      history,
      entitlement: entitlement
        ? {
            id:              entitlement.id,
            expiresAt:       entitlement.expires_at,
            maximumDownloads: entitlement.maximum_downloads,
            downloadCount:   entitlement.download_count,
            revokedAt:       entitlement.revoked_at,
          }
        : null,
    });
  },

  PATCH: async (req: VercelRequest, res: VercelResponse) => {
    const { email } = await requireAdminAuth(req);
    const reference = req.query['reference'] as string;

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid update payload.', parsed.error.flatten());
    }

    const updatedOrder = await advanceFulfilmentStatus(
      reference,
      parsed.data.fulfilmentStatus as FulfilmentStatus,
      email,
      parsed.data.note,
    );

    res.status(200).json({ order: updatedOrder });
  },
});
