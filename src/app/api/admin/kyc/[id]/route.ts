import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptBytes, requireAdmin, sameOrigin, writeAudit } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const document = await db.kycDocument.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const storageRoot = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "var", "private-uploads"));
  const filename = path.resolve(storageRoot, document.storageKey);
  if (!filename.startsWith(`${storageRoot}${path.sep}`)) throw new Error("Invalid private document path");
  const content = decryptBytes(await readFile(filename));
  const mime = document.storageKey.endsWith(".pdf") ? "application/pdf" : document.storageKey.endsWith(".png") ? "image/png" : "image/jpeg";
  return new Response(content, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="kyc-${document.id}${path.extname(document.storageKey)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const status = body && typeof body === "object" ? (body as { status?: unknown }).status : null;
  if (status !== "APPROVED" && status !== "REJECTED") return NextResponse.json({ error: "Status must be APPROVED or REJECTED" }, { status: 400 });
  const document = await db.kycDocument.findUnique({ where: { id }, select: { id: true, merchantId: true } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  await db.$transaction(async (tx) => {
    await tx.kycDocument.update({ where: { id }, data: { status, reviewedAt: new Date() } });
    const [pending, approved] = await Promise.all([
      tx.kycDocument.count({ where: { merchantId: document.merchantId, status: "PENDING" } }),
      tx.kycDocument.count({ where: { merchantId: document.merchantId, status: "APPROVED" } }),
    ]);
    await tx.merchant.update({
      where: { id: document.merchantId },
      data: { kycStatus: pending > 0 ? "PENDING" : approved > 0 ? "APPROVED" : "REJECTED" },
    });
  });
  await writeAudit({ actorId: access.userId, action: "KYC_DOCUMENT_REVIEWED", resource: "KycDocument", resourceId: id, metadata: { status } });
  return NextResponse.json({ id, status });
}
