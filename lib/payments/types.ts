/**
 * Payment gateway abstraction.
 * Monnify is the current implementation. Paystack can be added by implementing
 * this interface without touching the order domain.
 */

export interface InitializePaymentInput {
  orderReference: string;
  amountKobo: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  description: string;
  redirectUrl: string;
}

export interface InitializePaymentResult {
  checkoutUrl: string;
  gatewayReference: string;
}

export interface VerifiedTransaction {
  orderReference: string;
  gatewayReference: string;
  amountKobo: number;
  currency: string;
  status: 'PAID' | 'FAILED' | 'PENDING';
  paidAt?: string;
}

export interface WebhookValidationInput {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
  parsedPayload: unknown;
}

export interface PaymentWebhookEvent {
  type: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILURE' | 'OTHER';
  orderReference: string;
  gatewayReference: string;
  gatewayEventId: string;
  amountKobo: number;
  currency: string;
  paidAt?: string;
  raw: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly name: string;
  initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verifyTransaction(gatewayReference: string): Promise<VerifiedTransaction>;
  validateWebhook(input: WebhookValidationInput): Promise<boolean>;
  parseWebhook(payload: unknown): PaymentWebhookEvent;
}
