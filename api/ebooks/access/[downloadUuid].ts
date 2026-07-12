import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { withMethods, checkRateLimit, getClientIp } from '../../../lib/api-handler';
import { authoriseDownloadByUuid, getSignedDownloadUrl } from '../../../lib/ebooks/entitlement';
import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function contentDispositionFilename(storagePath: string): string {
  const fallback = 'purposeful-living-ebook.pdf';
  const filename = storagePath.split('/').pop()?.replace(/[^a-z0-9._-]/gi, '-') || fallback;
  return filename.toLowerCase().endsWith('.pdf') ? filename : fallback;
}

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
    const directDownload = req.query['download'] === '1';

    if (directDownload) {
      const upstream = await fetch(signedUrl);

      if (!upstream.ok) {
        logger.error('Ebook signed URL fetch failed', {
          entitlementId,
          status: upstream.status,
        });
        throw new AppError(502, 'STORAGE_ERROR', 'Failed to start the e-book download.');
      }

      const contentLength = upstream.headers.get('content-length');
      const contentType = upstream.headers.get('content-type') || 'application/pdf';
      const filename = contentDispositionFilename(storagePath);

      res.statusCode = 200;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (contentLength) res.setHeader('Content-Length', contentLength);

      logger.info('Ebook UUID download stream issued', { entitlementId });

      if (upstream.body) {
        await pipeline(Readable.fromWeb(upstream.body), res);
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.end(buffer);
      return;
    }

    logger.info('Ebook UUID download redirect issued', { entitlementId });

    // Redirect to the short-lived Supabase signed URL. The permanent storage path is never exposed.
    res.redirect(302, signedUrl);
  },
});
