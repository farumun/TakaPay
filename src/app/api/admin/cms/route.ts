import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({
  key: z.string().min(1).max(80),
  content: z.record(z.string(), z.unknown()),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
});

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const sections = await db.cmsSection.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(sections);
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid CMS section data" }, { status: 400 });
  const section = await db.cmsSection.update({
    where: { key: parsed.data.key },
    data: {
      content: JSON.parse(JSON.stringify(parsed.data.content)) as Prisma.InputJsonValue,
      enabled: parsed.data.enabled,
      sortOrder: parsed.data.sortOrder,
    },
    select: { id: true, key: true, enabled: true, sortOrder: true, updatedAt: true },
  });
  await writeAudit({ actorId: access.userId, action: "CMS_SECTION_UPDATED", resource: "CmsSection", resourceId: section.id });
  return NextResponse.json(section);
}
