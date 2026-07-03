import { db } from '../client';
import type { PaymentEvent } from '../types';

export interface RecordPaymentEventInput {
  gateway: string;
  event_type: string;
  gateway_event_id: string;
  order_reference?: string;
  payload: Record<string, unknown>;
  signature_valid: boolean;
}

/**
 * Records a payment event and returns whether it is new (not a duplicate).
 * The unique constraint on (gateway, gateway_event_id) enforces idempotency.
 */
export async function recordPaymentEvent(
  input: RecordPaymentEventInput,
): Promise<{ event: PaymentEvent; isDuplicate: boolean }> {
  const { data, error } = await db
    .from('payment_events')
    .upsert(
      { ...input },
      { onConflict: 'gateway,gateway_event_id', ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to record payment event: ${error.message}`);

  if (!data) {
    // Row already existed — fetch it so callers can inspect
    const { data: existing, error: fetchErr } = await db
      .from('payment_events')
      .select('*')
      .eq('gateway', input.gateway)
      .eq('gateway_event_id', input.gateway_event_id)
      .single();

    if (fetchErr || !existing) throw new Error('Failed to retrieve duplicate payment event');
    return { event: existing as PaymentEvent, isDuplicate: true };
  }

  return { event: data as PaymentEvent, isDuplicate: false };
}

export async function markEventProcessed(eventId: string, error?: string): Promise<void> {
  const { error: dbErr } = await db
    .from('payment_events')
    .update({
      processed: true,
      processing_error: error ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', eventId);

  if (dbErr) throw new Error(`Failed to mark event processed: ${dbErr.message}`);
}
