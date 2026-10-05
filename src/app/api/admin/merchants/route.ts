import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({
  userId: z.string().min(1),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  approved: z.boolean().optional(),
  kycStatus: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]).optional(),
  transactionLimitPaisa: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable().optional(),
});

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const merchants = await db.merchant.findMany({
    include: { user: { select: { id: true, email: true, phone: true, status: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(merchants.map((merchant) => ({
    ...merchant,
    transactionLimitPaisa: merchant.transactionLimitPaisa?.toString() ?? null,
  })));
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.status && parsed.data.approved === undefined && !parsed.data.kycStatus && parsed.data.transactionLimitPaisa === undefined)) {
    return NextResponse.json({ error: "Invalid merchant update" }, { status: 400 });
  }
  const merchant = await db.merchant.findUnique({
    where: { userId: parsed.data.userId },
    select: { id: true, userId: true, user: { select: { emailVerifiedAt: true, phoneVerifiedAt: true, authVersion: true } } },
  });
  if (!merchant) return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  if (parsed.data.status === "ACTIVE" && !merchant.user.emailVerifiedAt && !merchant.user.phoneVerifiedAt) {
    return NextResponse.json({ error: "Merchant must verify an email address or phone number before activation" }, { status: 409 });
  }
  if (parsed.data.approved === true && !merchant.user.emailVerifiedAt && !merchant.user.phoneVerifiedAt) {
    return NextResponse.json({ error: "Merchant must verify an email address or phone number before approval" }, { status: 409 });
  }
  const result = await db.$transaction(async (tx) => {
    if (parsed.data.status) {
      await tx.user.update({ where: { id: merchant.userId }, data: { status: parsed.data.status, ...(parsed.data.status === "SUSPENDED" ? { authVersion: { increment: 1 } } : {}) } });
    }
    return tx.merchant.update({
      where: { id: merchant.id },
      data: {
        kycStatus: parsed.data.kycStatus,
        approvedAt: parsed.data.approved === undefined ? undefined : parsed.data.approved ? new Date() : null,
        transactionLimitPaisa: parsed.data.transactionLimitPaisa === undefined
          ? undefined
          : parsed.data.transactionLimitPaisa === null ? null : BigInt(parsed.data.transactionLimitPaisa),
      },
      select: { id: true, kycStatus: true, transactionLimitPaisa: true },
    });
  });
  await writeAudit({ actorId: access.userId, action: "MERCHANT_ADMIN_UPDATED", resource: "Merchant", resourceId: merchant.id, metadata: { status: parsed.data.status, approved: parsed.data.approved, kycStatus: parsed.data.kycStatus } });
  return NextResponse.json({ ...result, transactionLimitPaisa: result.transactionLimitPaisa?.toString() ?? null });
}
