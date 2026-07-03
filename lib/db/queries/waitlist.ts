import { db } from '../client';
import { ConflictError } from '../../errors';
import type { WaitlistEntry } from '../types';

export async function addToWaitlist(
  name: string,
  email: string,
  phone: string,
  productCode: string,
  source = 'website',
): Promise<WaitlistEntry> {
  const { data, error } = await db
    .from('waitlist_entries')
    .insert({ name, email, phone, product_code: productCode, source })
    .select()
    .single();

  if (error) {
    // Unique constraint violation = duplicate submission
    if (error.code === '23505') {
      throw new ConflictError('This email is already on the waitlist for this product.');
    }
    throw new Error(`Failed to add to waitlist: ${error.message}`);
  }

  return data as WaitlistEntry;
}

export async function getWaitlistEntries(productCode?: string): Promise<WaitlistEntry[]> {
  let query = db
    .from('waitlist_entries')
    .select('*')
    .order('created_at', { ascending: true });

  if (productCode) query = query.eq('product_code', productCode);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch waitlist: ${error.message}`);
  return (data ?? []) as WaitlistEntry[];
}
