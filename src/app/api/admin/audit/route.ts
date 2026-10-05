import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/security";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const records = await db.auditLog.findMany({
    include: { actor: { select: { email: true, phone: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(records);
}
