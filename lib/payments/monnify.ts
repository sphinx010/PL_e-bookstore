/**
 * Monnify payment gateway implementation.
 *
 * IMPORTANT — Webhook signature algorithm:
 * Monnify sends a `paymentEventHash` field in the webhook JSON payload.
 * Based on Monnify's documentation, the hash is computed as:
 *   HMAC-SHA512(secretKey, `${apiKey}|${amountPaid}|${paidOn}|${transactionReference}`)
 * where amountPaid and paidOn come from eventData in the payload.
 *
 * PENDING: Verify the exact field concatenation order and separator character
 * against the current official Monnify webhook documentation before going live.
 * The structure below is written to make this change in one place (computeExpectedHash).
 */

import { createHmac } from 'crypto';
import { config } from '../config';
import { logger } from '../logger';
import type {
  PaymentGateway,
  InitializePaymentInput,
  InitializePaymentResult,
  VerifiedTransaction,
  WebhookValidationInput,
  PaymentWebhookEvent,
} from './types';

interface MonnifyTokenResponse {
  requestSuccessful: boolean;
  responseBody: { accessToken: string; expiresIn: number };
}

interface MonnifyInitResponse {
  requestSuccessful: boolean;
  responseBody: {
    transactionReference: string;
    checkoutUrl: string;
  };
}

interface MonnifyVerifyResponse {
  requestSuccessful: boolean;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    amountPaid: number;
    totalPayable: number;
    paidOn?: string;
    paymentStatus: string;
    currencyCode: string;
  };
}

/** Kobo → naira (Monnify expects naira amounts) */
function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/** Naira → kobo */
function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

async function getMonnifyToken(): Promise<string> {
  const credentials = Buffer.from(
    `${config.MONNIFY_API_KEY}:${config.MONNIFY_SECRET_KEY}`,
  ).toString('base64');

  const response = await fetch(`${config.MONNIFY_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Monnify auth failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as MonnifyTokenResponse;
  if (!body.requestSuccessful || !body.responseBody?.accessToken) {
    throw new Error('Monnify auth: unexpected response format');
  }

  return body.responseBody.accessToken;
}

// PENDING: Verify exact hash fields and separator with Monnify documentation.
function computeExpectedHash(payload: Record<string, unknown>): string {
  const eventData = payload['eventData'] as Record<string, unknown> | undefined;
  if (!eventData) return '';

  const parts = [
    config.MONNIFY_API_KEY,
    String(eventData['amountPaid'] ?? ''),
    String(eventData['paidOn'] ?? ''),
    String(eventData['transactionReference'] ?? ''),
  ];

  return createHmac('sha512', config.MONNIFY_SECRET_KEY)
    .update(parts.join('|'))
    .digest('hex');
}

export class MonnifyPaymentGateway implements PaymentGateway {
  readonly name = 'monnify';

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const token = await getMonnifyToken();

    const body = {
      amount:             koboToNaira(input.amountKobo),
      customerName:       input.customerName,
      customerEmail:      input.customerEmail,
      paymentReference:   input.orderReference,
      paymentDescription: input.description,
      currencyCode:       input.currency,
      contractCode:       config.MONNIFY_CONTRACT_CODE,
      redirectUrl:        input.redirectUrl,
      paymentMethods:     ['CARD', 'ACCOUNT_TRANSFER'],
    };

    const response = await fetch(
      `${config.MONNIFY_BASE_URL}/api/v1/merchant/transactions/init-transaction`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Monnify init-transaction failed: ${response.status} — ${text}`);
    }

    const data = (await response.json()) as MonnifyInitResponse;
    if (!data.requestSuccessful || !data.responseBody?.checkoutUrl) {
      throw new Error('Monnify init-transaction: unexpected response format');
    }

    logger.info('Monnify payment initialised', {
      orderReference: input.orderReference,
      gatewayReference: data.responseBody.transactionReference,
    });

    return {
      checkoutUrl:      data.responseBody.checkoutUrl,
      gatewayReference: data.responseBody.transactionReference,
    };
  }

  async verifyTransaction(gatewayReference: string): Promise<VerifiedTransaction> {
    const token = await getMonnifyToken();
    const encodedRef = encodeURIComponent(gatewayReference);

    const response = await fetch(
      `${config.MONNIFY_BASE_URL}/api/v2/transactions/${encodedRef}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Monnify verify failed: ${response.status}`);
    }

    const data = (await response.json()) as MonnifyVerifyResponse;
    const body = data.responseBody;

    return {
      orderReference:   body.paymentReference,
      gatewayReference: body.transactionReference,
      amountKobo:       nairaToKobo(body.amountPaid),
      currency:         body.currencyCode,
      status: body.paymentStatus === 'PAID' ? 'PAID'
            : body.paymentStatus === 'FAILED' ? 'FAILED'
            : 'PENDING',
      paidAt: body.paidOn,
    };
  }

  async validateWebhook(input: WebhookValidationInput): Promise<boolean> {
    const payload = input.parsedPayload as Record<string, unknown>;
    const receivedHash = payload['paymentEventHash'] as string | undefined;

    if (!receivedHash) {
      logger.warn('Monnify webhook: missing paymentEventHash');
      return false;
    }

    const expected = computeExpectedHash(payload);
    const isValid = receivedHash.toLowerCase() === expected.toLowerCase();

    if (!isValid) {
      logger.warn('Monnify webhook: signature mismatch');
    }

    return isValid;
  }

  parseWebhook(payload: unknown): PaymentWebhookEvent {
    const p = payload as Record<string, unknown>;
    const eventData = (p['eventData'] ?? {}) as Record<string, unknown>;
    const eventType = String(p['eventType'] ?? '');

    const isSuccess = eventType === 'SUCCESSFUL_TRANSACTION'
      || String(eventData['paymentStatus'] ?? '') === 'PAID';

    return {
      type:             isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILURE',
      orderReference:   String(eventData['paymentReference'] ?? ''),
      gatewayReference: String(eventData['transactionReference'] ?? ''),
      gatewayEventId:   String(eventData['transactionReference'] ?? eventType),
      amountKobo:       nairaToKobo(Number(eventData['amountPaid'] ?? 0)),
      currency:         String(eventData['currencyCode'] ?? 'NGN'),
      paidAt:           eventData['paidOn'] ? String(eventData['paidOn']) : undefined,
      raw:              p,
    };
  }
}

export const monnifyGateway = new MonnifyPaymentGateway();
