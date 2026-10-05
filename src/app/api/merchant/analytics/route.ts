import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMerchant } from "@/lib/security";

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [received, pending, today, monthly, recent] = await Promise.all([
    db.transaction.aggregate({
      where: { merchantId: access.merchantId, status: "SUCCEEDED" },
      _sum: { amountPaisa: true, feePaisa: true },
    }),
    db.transaction.aggregate({
      where: { merchantId: access.merchantId, status: { in: ["CREATED", "PENDING"] } },
      _sum: { amountPaisa: true },
      _count: { id: true },
    }),
    db.transaction.aggregate({
      where: { merchantId: access.merchantId, status: "SUCCEEDED", createdAt: { gte: dayStart } },
      _sum: { amountPaisa: true },
    }),
    db.transaction.findMany({
      where: { merchantId: access.merchantId, status: "SUCCEEDED", createdAt: { gte: monthStart } },
      select: { amountPaisa: true, createdAt: true },
    }),
    db.transaction.count({ where: { merchantId: access.merchantId, status: "SUCCEEDED" } }),
  ]);

  const days = new Array(now.getDate()).fill(0) as number[];
  for (const transaction of monthly) {
    days[transaction.createdAt.getDate() - 1] += Number(transaction.amountPaisa);
  }
  return NextResponse.json({
    receivedPaisa: (received._sum.amountPaisa ?? 0n).toString(),
    feesPaisa: (received._sum.feePaisa ?? 0n).toString(),
    pendingPaisa: (pending._sum.amountPaisa ?? 0n).toString(),
    pendingCount: pending._count.id,
    todayPaisa: (today._sum.amountPaisa ?? 0n).toString(),
    monthlyDailyPaisa: days.map(String),
    successfulTransactions: recent,
  });
}
