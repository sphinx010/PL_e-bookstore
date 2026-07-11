import { createHash } from 'crypto';
import { db } from '../db/client';
import {
  getEntitlementByDownloadUuid,
  getEntitlementByTokenHash,
  incrementDownloadCount,
} from '../db/queries/ebook-entitlements';
import type { EbookEntitlement } from '../db/types';
import { config } from '../config';
import { logger } from '../logger';
import {
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../errors';

export interface DownloadAuthorisation {
  storagePath: string;
  entitlementId: string;
}

async function authoriseEntitlement(
  entitlement: EbookEntitlement | null,
  missingLogMessage: string,
): Promise<DownloadAuthorisation> {
  if (!entitlement) {
    logger.warn(missingLogMessage);
    throw new NotFoundError('Download link not found or expired.');
  }

  if (entitlement.revoked_at) {
    throw new ForbiddenError('This download link has been revoked.');
  }

  if (new Date(entitlement.expires_at) < new Date()) {
    throw new ForbiddenError('This download link has expired.');
  }

  if (entitlement.download_count >= entitlement.maximum_downloads) {
    throw new ForbiddenError('Maximum download limit reached for this link.');
  }

  // Increment before generating URL — if the URL fails, the count is still incremented
  // to prevent retry-abuse. Acceptable trade-off for this volume.
  await incrementDownloadCount(entitlement.id);

  logger.info('Ebook download authorised', {
    entitlementId: entitlement.id,
    downloadCount: entitlement.download_count + 1,
    maximum: entitlement.maximum_downloads,
  });

  return {
    storagePath:   entitlement.storage_path,
    entitlementId: entitlement.id,
  };
}

/**
 * Validates a raw download token and returns the storage path if authorised.
 * Increments the download count atomically.
 * Never returns the stored token hash or the permanent storage URL.
 */
export async function authoriseDownload(rawToken: string): Promise<DownloadAuthorisation> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const entitlement = await getEntitlementByTokenHash(tokenHash);

  return authoriseEntitlement(entitlement, 'Download attempt with unknown token');
}

/**
 * Validates the stable post-payment UUID shown on the confirmation page.
 * The UUID is still a backend entitlement handle, not a permanent storage URL.
 */
export async function authoriseDownloadByUuid(downloadUuid: string): Promise<DownloadAuthorisation> {
  const entitlement = await getEntitlementByDownloadUuid(downloadUuid);
  return authoriseEntitlement(entitlement, 'Download attempt with unknown UUID');
}

/**
 * Generates a short-lived signed Supabase Storage URL.
 * The permanent storage path is never returned to the client.
 */
export async function getSignedDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await db.storage
    .from(config.EBOOK_BUCKET)
    .createSignedUrl(storagePath, 120); // 2-minute signed URL

  if (error || !data?.signedUrl) {
    throw new AppError(500, 'STORAGE_ERROR', 'Failed to generate download URL.');
  }

  return data.signedUrl;
}
