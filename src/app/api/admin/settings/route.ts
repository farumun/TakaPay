import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({
  key: z.enum(["brand", "support", "social", "login_announcement"]),
  value: z.record(z.string(), z.unknown()),
});
const flagSchema = z.object({
  key: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  description: z.string().trim().max(300).optional(),
});

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const [settings, flags] = await Promise.all([
    db.systemSetting.findMany({ where: { key: { in: ["brand", "support", "social", "login_announcement"] } } }),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
  ]);
  return NextResponse.json({ settings, flags });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  if (access.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super administrator role required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid global setting" }, { status: 400 });
  const valueJson = JSON.parse(JSON.stringify(parsed.data.value)) as Prisma.InputJsonValue;
  const setting = await db.systemSetting.upsert({
    where: { key: parsed.data.key },
    create: { key: parsed.data.key, value: valueJson },
    update: { value: valueJson },
  });
  await writeAudit({ actorId: access.userId, action: "SYSTEM_SETTING_UPDATED", resource: "SystemSetting", resourceId: setting.key });
  return NextResponse.json({ key: setting.key, updatedAt: setting.updatedAt });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  if (access.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Super administrator role required" }, { status: 403 });
  const parsed = flagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feature flag" }, { status: 400 });
  const flag = await db.featureFlag.upsert({
    where: { key: parsed.data.key },
    create: parsed.data,
    update: parsed.data,
  });
  await writeAudit({ actorId: access.userId, action: "FEATURE_FLAG_UPDATED", resource: "FeatureFlag", resourceId: flag.key, metadata: { enabled: flag.enabled } });
  return NextResponse.json(flag);
}
