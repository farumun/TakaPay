import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encryptSecret, requireAdmin, sameOrigin, writeAudit } from "@/lib/security";
import { normalizeSupportedCurrencies } from "@/lib/currencies";

const schema = z.object({
  code: z.string().min(2).max(40),
  enabled: z.boolean(),
  masterCredentials: z.record(z.string().min(1).max(2000)).optional(),
  commissionFixedPaisa: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  commissionPercentageBps: z.number().int().min(0).max(10_000).optional(),
});

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const gateways = await db.gateway.findMany({
    select: {
      id: true,
      code: true,
      displayName: true,
      enabled: true,
      supportedCurrencies: true,
      configurationEnc: true,
      commissionRules: { where: { active: true, merchantId: null }, select: { id: true, fixedAmountPaisa: true, percentageBps: true, currency: true } },
    },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json(gateways.map(({ configurationEnc, commissionRules, ...gateway }) => ({
    ...gateway,
    supportedCurrencies: normalizeSupportedCurrencies(gateway.supportedCurrencies),
    masterCredentialsConfigured: Boolean(configurationEnc),
    commissionRules: commissionRules.map((rule) => ({ ...rule, fixedAmountPaisa: rule.fixedAmountPaisa.toString() })),
  })));
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  if (access.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super administrator role required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid gateway settings" }, { status: 400 });
  const gateway = await db.gateway.update({
    where: { code: parsed.data.code },
    data: {
      enabled: parsed.data.enabled,
      ...(parsed.data.masterCredentials ? { configurationEnc: encryptSecret(JSON.stringify(parsed.data.masterCredentials)) } : {}),
    },
    select: { id: true, code: true, enabled: true },
  });
  if (parsed.data.commissionPercentageBps !== undefined || parsed.data.commissionFixedPaisa !== undefined) {
    await db.commissionRule.upsert({
      where: { id: `global-${gateway.id}` },
      create: {
        id: `global-${gateway.id}`,
        gatewayId: gateway.id,
        fixedAmountPaisa: BigInt(parsed.data.commissionFixedPaisa ?? 0),
        percentageBps: parsed.data.commissionPercentageBps ?? 0,
        currency: "BDT",
        active: true,
      },
      update: {
        fixedAmountPaisa: parsed.data.commissionFixedPaisa === undefined ? undefined : BigInt(parsed.data.commissionFixedPaisa),
        percentageBps: parsed.data.commissionPercentageBps,
        active: true,
      },
    });
  }
  await writeAudit({ actorId: access.userId, action: "GLOBAL_GATEWAY_SETTINGS_UPDATED", resource: "Gateway", resourceId: gateway.id, metadata: { enabled: gateway.enabled } });
  return NextResponse.json(gateway);
}
