import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchant, sameOrigin } from "@/lib/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const transaction = await db.transaction.findFirst({ where: { id, merchantId: access.merchantId }, select: { status: true } });
  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (transaction.status !== "SUCCEEDED") return NextResponse.json({ error: "Only successful transactions can be refunded" }, { status: 409 });
  return NextResponse.json(
    { error: "Refunds are disabled until a verified provider refund adapter is configured." },
    { status: 501 },
  );
}
