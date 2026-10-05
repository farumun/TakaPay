import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeRateLimit, opaqueToken, requireMerchant, sameOrigin, writeAudit } from "@/lib/security";
import { isFeatureEnabled } from "@/lib/cms";

const schema = z.object({
  label: z.string().trim().min(1).max(60),
  environment: z.enum(["SANDBOX", "LIVE"]),
});

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const keys = await db.apiKey.findMany({
    where: { merchantId: access.merchantId, revokedAt: null },
    select: { id: true, label: true, publicKey: true, environment: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  if (!(await consumeRateLimit("api-key-create", access.merchantId, 5, 60 * 60_000))) {
    return NextResponse.json({ error: "Key creation limit reached" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid API key request" }, { status: 400 });
  if (parsed.data.environment === "LIVE") {
    if (!(await isFeatureEnabled("live_api_keys_enabled"))) return NextResponse.json({ error: "Live API keys are currently disabled" }, { status: 403 });
    const merchant = await db.merchant.findUnique({ where: { id: access.merchantId }, select: { kycStatus: true } });
    if (merchant?.kycStatus !== "APPROVED") return NextResponse.json({ error: "Approved KYC is required for live keys" }, { status: 403 });
  }
  const publicKey = opaqueToken(parsed.data.environment === "LIVE" ? "tpk_live" : "tpk_test", 18);
  const secretKey = opaqueToken(parsed.data.environment === "LIVE" ? "tsk_live" : "tsk_test", 32);
  const key = await db.apiKey.create({
    data: {
      merchantId: access.merchantId,
      label: parsed.data.label,
      publicKey,
      secretHash: await hash(secretKey, 12),
      environment: parsed.data.environment,
    },
    select: { id: true, label: true, publicKey: true, environment: true, createdAt: true },
  });
  await writeAudit({ actorId: access.userId, action: "API_KEY_CREATED", resource: "ApiKey", resourceId: key.id });
  return NextResponse.json({ ...key, secretKey }, { status: 201 });
}
