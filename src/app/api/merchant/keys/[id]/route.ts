import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchant, sameOrigin, writeAudit } from "@/lib/security";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const result = await db.apiKey.updateMany({
    where: { id, merchantId: access.merchantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: "API key not found" }, { status: 404 });
  await writeAudit({ actorId: access.userId, action: "API_KEY_REVOKED", resource: "ApiKey", resourceId: id });
  return NextResponse.json({ revoked: true });
}
