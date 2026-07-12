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

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at?: string;
    currency: string;
    metadata?: Record<string, unknown>;
  };
}

function extractOrderReference(data: Record<string, unknown>, fallback: string): string {
  const metadata = data['metadata'];
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const meta = metadata as Record<string, unknown>;
    const fromCamel = meta['orderReference'];
    const fromSnake = meta['order_reference'];
    if (typeof fromCamel === 'string' && fromCamel.trim()) return fromCamel;
    if (typeof fromSnake === 'string' && fromSnake.trim()) return fromSnake;
  }

  return fallback;
}

export class PaystackPaymentGateway implements PaymentGateway {
  readonly name = 'paystack';

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const body = {
      email:        input.customerEmail,
      amount:       input.amountKobo, // Paystack expects amount in Kobo/cents
      reference:    input.orderReference,
      callback_url: input.redirectUrl,
      metadata: {
        orderReference: input.orderReference,
        customerName: input.customerName,
        description:  input.description,
      },
    };

    const response = await fetch(`${config.PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Paystack init failed: ${response.status} — ${text}`);
    }

    const resBody = (await response.json()) as PaystackInitResponse;
    if (!resBody.status || !resBody.data?.authorization_url) {
      throw new Error(`Paystack init: unexpected response structure: ${resBody.message}`);
    }

    logger.info('Paystack payment initialised', {
      orderReference: input.orderReference,
      gatewayReference: resBody.data.reference,
    });

    return {
      checkoutUrl:      resBody.data.authorization_url,
      gatewayReference: resBody.data.reference,
    };
  }

  async verifyTransaction(gatewayReference: string): Promise<VerifiedTransaction> {
    const encodedRef = encodeURIComponent(gatewayReference);

    const response = await fetch(`${config.PAYSTACK_BASE_URL}/transaction/verify/${encodedRef}`, {
      headers: {
        Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Paystack verify failed: ${response.status}`);
    }

    const resBody = (await response.json()) as PaystackVerifyResponse;
    if (!resBody.status || !resBody.data) {
      throw new Error(`Paystack verify: transaction not found: ${resBody.message}`);
    }

    const d = resBody.data;
    const orderReference = extractOrderReference(
      d as unknown as Record<string, unknown>,
      d.reference,
    );

    return {
      orderReference,
      gatewayReference: d.reference,
      amountKobo:       d.amount,
      currency:         d.currency,
      status:           d.status === 'success' ? 'PAID' : d.status === 'failed' ? 'FAILED' : 'PENDING',
      paidAt:           d.paid_at,
    };
  }

  async validateWebhook(input: WebhookValidationInput): Promise<boolean> {
    const signature = input.headers['x-paystack-signature'];
    if (!signature) {
      logger.warn('Paystack webhook: missing x-paystack-signature header');
      return false;
    }

    // signature header can be string or array
    const sigStr = Array.isArray(signature) ? signature[0] : signature;

    const expectedSignature = createHmac('sha512', config.PAYSTACK_SECRET_KEY)
      .update(input.rawBody)
      .digest('hex');

    const isValid = sigStr === expectedSignature;
    if (!isValid) {
      logger.warn('Paystack webhook: signature verification failed');
    }

    return isValid;
  }

  parseWebhook(payload: unknown): PaymentWebhookEvent {
    const p = payload as Record<string, unknown>;
    const event = String(p['event'] ?? '');
    const data = (p['data'] ?? {}) as Record<string, unknown>;

    const isSuccess = event === 'charge.success';
    const gatewayReference = String(data['reference'] ?? '');
    const orderReference = extractOrderReference(data, gatewayReference);

    return {
      type:             isSuccess ? 'PAYMENT_SUCCESS' : event.startsWith('charge.') ? 'PAYMENT_FAILURE' : 'OTHER',
      orderReference,
      gatewayReference,
      gatewayEventId:   String(data['id'] ?? event),
      amountKobo:       Number(data['amount'] ?? 0),
      currency:         String(data['currency'] ?? 'NGN'),
      paidAt:           data['paid_at'] ? String(data['paid_at']) : undefined,
      raw:              p,
    };
  }
}

export const paystackGateway = new PaystackPaymentGateway();
