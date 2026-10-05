import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMerchant } from "@/lib/security";

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["CREATED", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "CANCELLED"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  format: z.enum(["json", "csv"]).default("json"),
});

function csvCell(value: string) {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const filters = parsed.data;

  const transactions = await db.transaction.findMany({
    where: {
      merchantId: access.merchantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lte: new Date(filters.to) } : {}) } } : {}),
      ...(filters.q ? {
        OR: [
          { id: { contains: filters.q } },
          { externalReference: { contains: filters.q } },
          { customerEmail: { contains: filters.q } },
          { customerPhone: { contains: filters.q } },
          { gateway: { displayName: { contains: filters.q } } },
        ],
      } : {}),
    },
    include: { gateway: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: filters.limit,
  });
  if (filters.format === "csv") {
    const lines = [
      ["TxID", "Amount minor", "Currency", "Gateway", "Status", "Customer email", "Customer phone", "Created at"].map(csvCell).join(","),
      ...transactions.map((tx) => [
        tx.externalReference ?? tx.id,
        tx.amountPaisa.toString(),
        tx.currency,
        tx.gateway?.displayName ?? "",
        tx.status,
        tx.customerEmail ?? "",
        tx.customerPhone ?? "",
        tx.createdAt.toISOString(),
      ].map(csvCell).join(",")),
    ];
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="takapay-transactions.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  }
  return NextResponse.json(transactions.map((tx) => ({
    ...tx,
    amountPaisa: tx.amountPaisa.toString(),
    feePaisa: tx.feePaisa.toString(),
  })));
}
