import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods } from '../../lib/api-handler';
import { recordPaymentEvent, markEventProcessed } from '../../lib/db/queries/payment-events';
import { getOrderByReference } from '../../lib/db/queries/orders';
import { monnifyGateway } from '../../lib/payments/monnify';
import { fulfilPaidOrder } from '../../lib/orders/fulfil';
import { logger } from '../../lib/logger';

export default withMethods({
  POST: async (req: VercelRequest, res: VercelResponse) => {
    // Respond immediately — Monnify expects a fast acknowledgement
    // Processing is done synchronously within the handler window,
    // but we respond 200 once the event is durably recorded.

    const payload = req.body as Record<string, unknown>;

    // Step 1: Validate signature
    const signatureValid = await monnifyGateway.validateWebhook({
      rawBody:       JSON.stringify(payload),
      headers:       req.headers as Record<string, string>,
      parsedPayload: payload,
    });

    // Step 2: Parse the webhook into a normalised event
    let event;
    try {
      event = monnifyGateway.parseWebhook(payload);
    } catch (err) {
      logger.error('Failed to parse Monnify webhook', { error: String(err) });
      res.status(400).json({ received: false, error: 'Unparseable payload' });
      return;
    }

    // Step 3: Store event (idempotency enforced at DB level)
    const { event: storedEvent, isDuplicate } = await recordPaymentEvent({
      gateway:         'monnify',
      event_type:      event.type,
      gateway_event_id: event.gatewayEventId,
      order_reference: event.orderReference || undefined,
      payload,
      signature_valid: signatureValid,
    });

    if (isDuplicate) {
      logger.info('Duplicate Monnify webhook — skipping', { gatewayEventId: event.gatewayEventId });
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    if (!signatureValid) {
      logger.warn('Monnify webhook signature invalid', { gatewayEventId: event.gatewayEventId });
      await markEventProcessed(storedEvent.id, 'Signature validation failed');
      res.status(200).json({ received: true }); // 200 to prevent Monnify retries on signature mismatch
      return;
    }

    if (event.type !== 'PAYMENT_SUCCESS') {
      logger.info('Monnify webhook: non-success event type', { type: event.type });
      await markEventProcessed(storedEvent.id);
      res.status(200).json({ received: true });
      return;
    }

    // Step 4: Verify the order exists and amounts match
    let processingError: string | undefined;
    try {
      const order = await getOrderByReference(event.orderReference);

      if (order.total_amount_kobo !== event.amountKobo) {
        const msg = `Amount mismatch: expected ${order.total_amount_kobo} kobo, got ${event.amountKobo}`;
        logger.error('Monnify webhook: amount mismatch', {
          orderReference: event.orderReference,
          expected: order.total_amount_kobo,
          received: event.amountKobo,
        });
        await markEventProcessed(storedEvent.id, msg);
        res.status(200).json({ received: true });
        return;
      }

      // Step 5: Fulfil the order (idempotent — checks payment_status internally)
      await fulfilPaidOrder(event.orderReference, event.gatewayReference);

    } catch (err) {
      processingError = err instanceof Error ? err.message : String(err);
      logger.error('Monnify webhook processing error', { error: processingError, orderReference: event.orderReference });
    }

    await markEventProcessed(storedEvent.id, processingError);

    // Always return 200 — errors are recorded; Monnify should not retry on logic failures
    res.status(200).json({ received: true });
  },
});
