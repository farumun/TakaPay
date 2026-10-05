import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeRateLimit, requireMerchant, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  amountPaisa: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).default("BDT"),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const links = await db.paymentLink.findMany({
    where: { merchantId: access.merchantId },
    select: { id: true, slug: true, title: true, amountPaisa: true, currency: true, expiresAt: true, active: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(links.map((link) => ({ ...link, amountPaisa: link.amountPaisa?.toString() ?? null })));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  if (!(await consumeRateLimit("payment-link-create", access.merchantId, 30, 60 * 60_000))) {
    return NextResponse.json({ error: "Payment link creation limit reached" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment link details" }, { status: 400 });
  const link = await db.paymentLink.create({
    data: {
      merchantId: access.merchantId,
      slug: randomBytes(18).toString("base64url"),
      title: parsed.data.title,
      amountPaisa: parsed.data.amountPaisa === undefined ? null : BigInt(parsed.data.amountPaisa),
      currency: parsed.data.currency,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: { id: true, slug: true, title: true, amountPaisa: true, currency: true, expiresAt: true, createdAt: true },
  });
  await writeAudit({ actorId: access.userId, action: "PAYMENT_LINK_CREATED", resource: "PaymentLink", resourceId: link.id });
  const baseUrl = process.env.APP_BASE_URL;
  return NextResponse.json({
    ...link,
    amountPaisa: link.amountPaisa?.toString() ?? null,
    checkoutUrl: baseUrl ? `${baseUrl.replace(/\/$/, "")}/pay/${link.slug}` : null,
  }, { status: 201 });
}
