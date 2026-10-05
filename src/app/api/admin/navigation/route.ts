import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin, writeAudit } from "@/lib/security";
import { safeContentHref } from "@/lib/cms";

const createSchema = z.object({
  location: z.enum(["header", "footer", "footer-products", "footer-resources", "footer-company", "footer-support"]),
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
}).refine((value) => safeContentHref(value.href, "") === value.href, { message: "Navigation links must be relative or HTTPS" });
const updateSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(80).optional(),
  href: z.string().trim().min(1).max(500).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  enabled: z.boolean().optional(),
}).refine((value) => value.href === undefined || safeContentHref(value.href, "") === value.href, { message: "Navigation links must be relative or HTTPS" });

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  return NextResponse.json(await db.navigationItem.findMany({ orderBy: [{ location: "asc" }, { sortOrder: "asc" }] }));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid navigation item" }, { status: 400 });
  const item = await db.navigationItem.create({ data: parsed.data });
  await writeAudit({ actorId: access.userId, action: "NAVIGATION_ITEM_CREATED", resource: "NavigationItem", resourceId: item.id });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid navigation item" }, { status: 400 });
  const { id, ...data } = parsed.data;
  if (!Object.keys(data).length) return NextResponse.json({ error: "No navigation changes supplied" }, { status: 400 });
  const item = await db.navigationItem.update({ where: { id }, data });
  await writeAudit({ actorId: access.userId, action: "NAVIGATION_ITEM_UPDATED", resource: "NavigationItem", resourceId: item.id });
  return NextResponse.json(item);
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Navigation item ID required" }, { status: 400 });
  await db.navigationItem.delete({ where: { id: parsed.data.id } });
  await writeAudit({ actorId: access.userId, action: "NAVIGATION_ITEM_DELETED", resource: "NavigationItem", resourceId: parsed.data.id });
  return NextResponse.json({ deleted: true });
}
