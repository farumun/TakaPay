import { Prisma } from "@prisma/client";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getGatewayAdapter } from "@/lib/payments/registry";
import { consumeRateLimit, decryptSecret, encryptSecret, safeExternalHttpsUrl } from "@/lib/security";
import { isFeatureEnabled } from "@/lib/cms";
import { normalizeSupportedCurrencies } from "@/lib/currencies";

const schema = z.object({
  idempotencyKey: z.string().trim().min(8).max(100),
  gatewayCode: z.string().min(2).max(40),
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/).default("BDT"),
  customer: z.object({
    email: z.string().email().max(254).optional(),
    phone: z.string().max(32).optional(),
  }).optional(),
});

export async function POST(request: Request) {
  const publicKey = request.headers.get("x-takapay-public-key");
  const authorization = request.headers.get("authorization");
  const secret = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!publicKey || !secret) return NextResponse.json({ error: "API credentials required" }, { status: 401 });

  const key = await db.apiKey.findUnique({
    where: { publicKey },
    include: { merchant: { include: { user: { select: { status: true } } } } },
  });
  if (!key || (key.environment !== "SANDBOX" && key.environment !== "LIVE") || key.revokedAt || key.merchant.user.status !== "ACTIVE" || !key.merchant.approvedAt) {
    return NextResponse.json({ error: "Invalid or inactive API credentials" }, { status: 401 });
  }
  if (!(await compare(secret, key.secretHash))) return NextResponse.json({ error: "Invalid or inactive API credentials" }, { status: 401 });
  const secureTransport = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  if (process.env.NODE_ENV === "production" && !secureTransport) return NextResponse.json({ error: "HTTPS is required" }, { status: 400 });
  if (!(await consumeRateLimit("public-api", key.merchantId, 120, 60_000))) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment request" }, { status: 400 });
  if (key.environment === "LIVE" && !(await isFeatureEnabled("live_payments_enabled"))) {
    return NextResponse.json({ error: "Live payment processing is currently disabled" }, { status: 503 });
  }
  if (parsed.data.currency !== key.merchant.defaultCurrency) return NextResponse.json({ error: "Currency is not enabled for this merchant" }, { status: 400 });
  if (key.merchant.transactionLimitPaisa !== null && BigInt(parsed.data.amountMinor) > key.merchant.transactionLimitPaisa) {
    return NextResponse.json({ error: "Payment exceeds the merchant transaction limit" }, { status: 400 });
  }
  const adapter = getGatewayAdapter(parsed.data.gatewayCode);
  if (!adapter) return NextResponse.json({ error: "Payment adapter is not available for this gateway" }, { status: 503 });

  const gateway = await db.gateway.findUnique({ where: { code: parsed.data.gatewayCode } });
  if (!gateway?.enabled) return NextResponse.json({ error: "Gateway is unavailable" }, { status: 503 });
  if (!normalizeSupportedCurrencies(gateway.supportedCurrencies).includes(parsed.data.currency)) return NextResponse.json({ error: "Currency is not supported by this gateway" }, { status: 400 });
  const account = await db.merchantGateway.findUnique({
    where: {
      merchantId_gatewayId_environment: {
        merchantId: key.merchantId,
        gatewayId: gateway.id,
        environment: key.environment,
      },
    },
  });
  if (!account?.enabled || !account.credentialsEnc) return NextResponse.json({ error: "Merchant gateway is not configured" }, { status: 409 });

  const commission = await db.commissionRule.findFirst({
    where: { gatewayId: gateway.id, merchantId: key.merchantId, active: true },
  }) ?? await db.commissionRule.findFirst({
    where: { gatewayId: gateway.id, merchantId: null, active: true },
  });
  let feePaisa = commission
    ? BigInt(commission.fixedAmountPaisa) + (BigInt(parsed.data.amountMinor) * BigInt(commission.percentageBps)) / 10_000n
    : 0n;
  if (commission?.minimumPaisa !== null && commission?.minimumPaisa !== undefined && feePaisa < commission.minimumPaisa) feePaisa = commission.minimumPaisa;
  if (commission?.maximumPaisa !== null && commission?.maximumPaisa !== undefined && feePaisa > commission.maximumPaisa) feePaisa = commission.maximumPaisa;

  const existing = await db.transaction.findUnique({
    where: {
      merchantId_environment_externalReference: {
        merchantId: key.merchantId,
        environment: key.environment,
        externalReference: parsed.data.idempotencyKey,
      },
    },
  });
  if (existing) {
    if (existing.amountPaisa !== BigInt(parsed.data.amountMinor) || existing.currency !== parsed.data.currency || existing.gatewayId !== gateway.id) {
      return NextResponse.json({ error: "Idempotency key was already used for a different request" }, { status: 409 });
    }
    return existing.checkoutUrlEnc
      ? NextResponse.json({ transactionId: existing.id, checkoutUrl: decryptSecret(existing.checkoutUrlEnc), status: existing.status })
      : NextResponse.json({ error: "Payment is already being processed; retry shortly" }, { status: 409 });
  }

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) return NextResponse.json({ error: "Payment service is not fully configured" }, { status: 503 });
  let parsedBase: URL;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    return NextResponse.json({ error: "Payment service base URL is invalid" }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" && parsedBase.protocol !== "https:") {
    return NextResponse.json({ error: "Payment service base URL must use HTTPS" }, { status: 503 });
  }

  const rawCredentials: unknown = JSON.parse(decryptSecret(account.credentialsEnc));
  if (!rawCredentials || typeof rawCredentials !== "object" || Array.isArray(rawCredentials) || !Object.values(rawCredentials).every((item) => typeof item === "string")) {
    return NextResponse.json({ error: "Stored gateway credentials could not be loaded" }, { status: 500 });
  }
  const credentials = rawCredentials as Record<string, string>;

  let transaction;
  try {
    transaction = await db.transaction.create({
      data: {
        merchantId: key.merchantId,
        gatewayId: gateway.id,
        externalReference: parsed.data.idempotencyKey,
        environment: key.environment,
        amountPaisa: BigInt(parsed.data.amountMinor),
        feePaisa,
        currency: parsed.data.currency,
        customerEmail: parsed.data.customer?.email,
        customerPhone: parsed.data.customer?.phone,
        status: "PENDING",
      },
      select: { id: true, status: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Payment request is being processed; retry with the same idempotency key" }, { status: 409 });
    }
    throw error;
  }

  let result;
  try {
    result = await adapter.createPayment({
      merchantId: key.merchantId,
      transactionId: transaction.id,
      amountMinor: BigInt(parsed.data.amountMinor),
      currency: parsed.data.currency,
      environment: key.environment,
      returnUrl: `${parsedBase.origin}/payments/return`,
      callbackUrl: `${parsedBase.origin}/api/webhooks/${gateway.code}`,
      credentials,
      customer: parsed.data.customer,
    });
  } catch (error) {
    console.error(`Payment adapter failed for ${gateway.code}; transaction=${transaction.id}`);
    return NextResponse.json({ error: "Gateway did not confirm checkout creation. Retry with the same idempotency key." }, { status: 502 });
  }
  if (!safeExternalHttpsUrl(result.checkoutUrl)) {
    return NextResponse.json({ error: "Gateway returned an unsafe checkout destination" }, { status: 502 });
  }

  await db.transaction.update({
    where: { id: transaction.id },
    data: { gatewayReference: result.gatewayReference, checkoutUrlEnc: encryptSecret(result.checkoutUrl) },
  });
  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return NextResponse.json({ transactionId: transaction.id, checkoutUrl: result.checkoutUrl, status: transaction.status }, { status: 201 });
}
