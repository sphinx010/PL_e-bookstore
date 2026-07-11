import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods, checkRateLimit, getClientIp } from '../../../lib/api-handler';
import { authoriseDownloadByUuid, getSignedDownloadUrl } from '../../../lib/ebooks/entitlement';
import { logger } from '../../../lib/logger';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default withMethods({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    checkRateLimit(`dl:${getClientIp(req)}`, 20, 60_000);

    const downloadUuid = req.query['downloadUuid'] as string;

    if (!downloadUuid || !UUID_RE.test(downloadUuid)) {
      res.status(404).end();
      return;
    }

    const { storagePath, entitlementId } = await authoriseDownloadByUuid(downloadUuid);
    const signedUrl = await getSignedDownloadUrl(storagePath);

    logger.info('Ebook UUID download redirect issued', { entitlementId });

    // Redirect to the short-lived Supabase signed URL. The permanent storage path is never exposed.
    res.redirect(302, signedUrl);
  },
});
