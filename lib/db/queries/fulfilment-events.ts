import { db } from '../client';
import type { FulfilmentEvent, FulfilmentStatus } from '../types';

export async function recordFulfilmentEvent(
  orderId: string,
  previousStatus: FulfilmentStatus,
  newStatus: FulfilmentStatus,
  createdBy: string,
  note?: string,
): Promise<FulfilmentEvent> {
  const { data, error } = await db
    .from('fulfilment_events')
    .insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      note: note ?? null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to record fulfilment event: ${error.message}`);
  return data as FulfilmentEvent;
}

export async function getFulfilmentHistory(orderId: string): Promise<FulfilmentEvent[]> {
  const { data, error } = await db
    .from('fulfilment_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch fulfilment history: ${error.message}`);
  return (data ?? []) as FulfilmentEvent[];
}
