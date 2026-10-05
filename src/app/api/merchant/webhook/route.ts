import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encryptSecret, opaqueToken, requireMerchant, safeExternalHttpsUrl, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({ url: z.string().url().max(2048) });

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const endpoints = await db.webhookEndpoint.findMany({
    where: { merchantId: access.merchantId },
    select: { id: true, url: true, enabled: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(endpoints);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !safeExternalHttpsUrl(parsed.data.url)) {
    return NextResponse.json({ error: "Webhook URL must be a valid public HTTPS URL without credentials or a custom port" }, { status: 400 });
  }
  const secret = opaqueToken("whsec", 32);
  const previous = await db.webhookEndpoint.findFirst({ where: { merchantId: access.merchantId }, orderBy: { updatedAt: "desc" } });
  const endpoint = previous
    ? await db.webhookEndpoint.update({
        where: { id: previous.id },
        data: { url: parsed.data.url, signingSecretEnc: encryptSecret(secret), enabled: true },
        select: { id: true, url: true, enabled: true },
      })
    : await db.webhookEndpoint.create({
        data: { merchantId: access.merchantId, url: parsed.data.url, signingSecretEnc: encryptSecret(secret) },
        select: { id: true, url: true, enabled: true },
      });
  await writeAudit({ actorId: access.userId, action: "WEBHOOK_ENDPOINT_CONFIGURED", resource: "WebhookEndpoint", resourceId: endpoint.id });
  return NextResponse.json({ ...endpoint, signingSecret: secret }, { status: 201 });
}
