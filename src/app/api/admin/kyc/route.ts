import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/security";

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const documents = await db.kycDocument.findMany({
    include: { merchant: { select: { id: true, displayName: true, businessName: true, user: { select: { email: true, phone: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(documents.map(({ storageKey: _storageKey, ...document }) => document));
}
