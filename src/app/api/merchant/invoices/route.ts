import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMerchant, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().email().max(254).optional(),
  description: z.string().trim().max(1000).optional(),
  amountPaisa: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/).default("BDT"),
  dueAt: z.string().datetime().optional(),
});

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const invoices = await db.invoice.findMany({
    where: { merchantId: access.merchantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(invoices.map((invoice) => ({ ...invoice, amountPaisa: invoice.amountPaisa.toString() })));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid invoice details" }, { status: 400 });
  const number = `INV-${Date.now().toString(36).toUpperCase()}`;
  const invoice = await db.invoice.create({
    data: {
      merchantId: access.merchantId,
      number,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      description: parsed.data.description,
      amountPaisa: BigInt(parsed.data.amountPaisa),
      currency: parsed.data.currency,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });
  await writeAudit({ actorId: access.userId, action: "INVOICE_CREATED", resource: "Invoice", resourceId: invoice.id });
  return NextResponse.json({ ...invoice, amountPaisa: invoice.amountPaisa.toString() }, { status: 201 });
}
