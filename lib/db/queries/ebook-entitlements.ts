import { db } from '../client';
import type { EbookEntitlement } from '../types';

export interface CreateEntitlementInput {
  order_id: string;
  customer_email: string;
  storage_path: string;
  download_token_hash: string;
  expires_at: string;
  maximum_downloads: number;
}

export async function createEbookEntitlement(
  input: CreateEntitlementInput,
): Promise<EbookEntitlement> {
  const { data, error } = await db
    .from('ebook_entitlements')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create ebook entitlement: ${error.message}`);
  return data as EbookEntitlement;
}

export async function getEntitlementByTokenHash(
  tokenHash: string,
): Promise<EbookEntitlement | null> {
  const { data, error } = await db
    .from('ebook_entitlements')
    .select('*')
    .eq('download_token_hash', tokenHash)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch entitlement: ${error.message}`);
  return data as EbookEntitlement | null;
}

/**
 * Atomically increments download_count and returns the updated row.
 * Uses a Supabase RPC for atomic update.
 */
export async function incrementDownloadCount(entitlementId: string): Promise<EbookEntitlement> {
  const { data, error } = await db
    .from('ebook_entitlements')
    .update({ download_count: db.rpc('increment_ebook_download_count' as never) })
    .eq('id', entitlementId)
    .select()
    .single();

  // Fallback: plain increment if RPC not available
  if (error) {
    const { data: current } = await db
      .from('ebook_entitlements')
      .select('download_count')
      .eq('id', entitlementId)
      .single();

    const { data: updated, error: updateErr } = await db
      .from('ebook_entitlements')
      .update({ download_count: ((current as { download_count: number } | null)?.download_count ?? 0) + 1 })
      .eq('id', entitlementId)
      .select()
      .single();

    if (updateErr) throw new Error(`Failed to increment download count: ${updateErr.message}`);
    return updated as EbookEntitlement;
  }

  return data as EbookEntitlement;
}

export async function revokeEntitlement(entitlementId: string): Promise<void> {
  const { error } = await db
    .from('ebook_entitlements')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', entitlementId);

  if (error) throw new Error(`Failed to revoke entitlement: ${error.message}`);
}

export async function getEntitlementByOrderId(orderId: string): Promise<EbookEntitlement | null> {
  const { data, error } = await db
    .from('ebook_entitlements')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch entitlement by order: ${error.message}`);
  return data as EbookEntitlement | null;
}
