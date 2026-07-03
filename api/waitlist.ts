import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { withMethods, checkRateLimit, getClientIp } from '../lib/api-handler';
import { addToWaitlist } from '../lib/db/queries/waitlist';
import { sendEmail } from '../lib/email/client';
import { waitlistConfirmationHtml } from '../lib/email/templates/waitlist-confirmation';
import { ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';

const WaitlistSchema = z.object({
  name:        z.string().min(2).max(120),
  email:       z.string().email(),
  phone:       z.string().min(7).max(20).optional().default(''),
  productCode: z.string().min(1),
});

export default withMethods({
  POST: async (req: VercelRequest, res: VercelResponse) => {
    checkRateLimit(`waitlist:${getClientIp(req)}`, 5, 60_000);

    const parsed = WaitlistSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid waitlist submission.', parsed.error.flatten());
    }

    const { name, email, phone, productCode } = parsed.data;

    const entry = await addToWaitlist(name, email, phone, productCode);

    sendEmail({
      to: email,
      subject: "You're on the waitlist — Purposeful Living",
      html: waitlistConfirmationHtml(name, productCode),
    }).catch(err => logger.error('Failed to send waitlist confirmation email', { error: String(err) }));

    logger.info('Waitlist entry created', { productCode });

    res.status(201).json({
      message: "You're on the list. We'll notify you when it becomes available.",
      id: entry.id,
    });
  },
});
