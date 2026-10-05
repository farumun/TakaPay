type Environment = "SANDBOX" | "LIVE";

export type CreatePaymentInput = {
  merchantId: string;
  transactionId: string;
  amountMinor: bigint;
  currency: string;
  environment: Environment;
  returnUrl: string;
  callbackUrl: string;
  credentials: Readonly<Record<string, string>>;
  customer?: { email?: string; phone?: string };
};

export type CreatePaymentResult = {
  gatewayReference: string;
  checkoutUrl: string;
  expiresAt?: Date;
};

export type VerifiedGatewayEvent = {
  eventId: string;
  environment: Environment;
  gatewayReference: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING" | "REFUNDED";
  amountMinor: bigint;
  currency: string;
};

export interface GatewayAdapter {
  readonly code: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<VerifiedGatewayEvent>;
  refund(input: {
    gatewayReference: string;
    amountMinor?: bigint;
    idempotencyKey: string;
    credentials: Readonly<Record<string, string>>;
  }): Promise<{ gatewayRefundReference: string }>;
}

export type GatewayRegistry = ReadonlyMap<string, GatewayAdapter>;
