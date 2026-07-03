import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods, checkRateLimit, getClientIp } from '../../../lib/api-handler';
import { authoriseDownload, getSignedDownloadUrl } from '../../../lib/ebooks/entitlement';
import { logger } from '../../../lib/logger';

export default withMethods({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    checkRateLimit(`dl:${getClientIp(req)}`, 20, 60_000);

    const rawToken = req.query['token'] as string;

    if (!rawToken || rawToken.length < 10) {
      res.status(404).end();
      return;
    }

    const { storagePath } = await authoriseDownload(rawToken);
    const signedUrl = await getSignedDownloadUrl(storagePath);

    logger.info('Ebook download redirect issued');

    // Redirect to the short-lived Supabase signed URL — permanent path never exposed
    res.redirect(302, signedUrl);
  },
});
