import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encryptSecret, requireMerchant, sameOrigin, writeAudit } from "@/lib/security";
import { isFeatureEnabled } from "@/lib/cms";
import { normalizeSupportedCurrencies } from "@/lib/currencies";

const schema = z.object({
  gatewayCode: z.string().min(2).max(40),
  environment: z.enum(["SANDBOX", "LIVE"]),
  credentials: z.record(z.string().min(1).max(2000)).refine((value) => Object.keys(value).length > 0 && Object.keys(value).length <= 12),
});

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const items = await db.gateway.findMany({
    where: { enabled: true },
    select: {
      id: true,
      code: true,
      displayName: true,
      supportedCurrencies: true,
      merchantAccounts: {
        where: { merchantId: access.merchantId },
        select: { id: true, environment: true, enabled: true, credentialsEnc: true, updatedAt: true },
      },
    },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json(items.map(({ merchantAccounts, ...gateway }) => ({
    ...gateway,
    supportedCurrencies: normalizeSupportedCurrencies(gateway.supportedCurrencies),
    configurations: merchantAccounts.map(({ credentialsEnc, ...config }) => ({
      ...config,
      credentialsConfigured: Boolean(credentialsEnc),
    })),
  })));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid gateway configuration" }, { status: 400 });
  const gateway = await db.gateway.findUnique({ where: { code: parsed.data.gatewayCode } });
  if (!gateway?.enabled) return NextResponse.json({ error: "This payment method is not currently available" }, { status: 403 });
  if (parsed.data.environment === "LIVE") {
    if (!(await isFeatureEnabled("live_payments_enabled"))) return NextResponse.json({ error: "Live gateway configuration is currently disabled" }, { status: 403 });
    const merchant = await db.merchant.findUnique({ where: { id: access.merchantId }, select: { kycStatus: true } });
    if (merchant?.kycStatus !== "APPROVED") return NextResponse.json({ error: "Approved KYC is required for live gateway configuration" }, { status: 403 });
  }
  const credentialsEnc = encryptSecret(JSON.stringify(parsed.data.credentials));
  const account = await db.merchantGateway.upsert({
    where: {
      merchantId_gatewayId_environment: {
        merchantId: access.merchantId,
        gatewayId: gateway.id,
        environment: parsed.data.environment,
      },
    },
    create: {
      merchantId: access.merchantId,
      gatewayId: gateway.id,
      environment: parsed.data.environment,
      enabled: true,
      credentialsEnc,
    },
    update: { enabled: true, credentialsEnc },
    select: { id: true, environment: true, enabled: true, updatedAt: true },
  });
  await writeAudit({ actorId: access.userId, action: "MERCHANT_GATEWAY_CONFIGURED", resource: "MerchantGateway", resourceId: account.id, metadata: { gatewayCode: gateway.code, environment: parsed.data.environment } });
  return NextResponse.json({ ...account, credentialsConfigured: true }, { status: 200 });
}
