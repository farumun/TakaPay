import Link from "next/link";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const merchant = await currentMerchant();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [received, pending, today, monthly, gateways, linkCount, invoiceCount, transactions] = await Promise.all([
    db.transaction.aggregate({ where: { merchantId: merchant.id, status: "SUCCEEDED" }, _sum: { amountPaisa: true }, _count: { id: true } }),
    db.transaction.aggregate({ where: { merchantId: merchant.id, status: { in: ["CREATED", "PENDING"] } }, _sum: { amountPaisa: true }, _count: { id: true } }),
    db.transaction.aggregate({ where: { merchantId: merchant.id, status: "SUCCEEDED", createdAt: { gte: dayStart } }, _sum: { amountPaisa: true } }),
    db.$queryRaw<{ day: number; total: string }[]>`
      SELECT EXTRACT(DAY FROM "createdAt" AT TIME ZONE 'UTC')::int AS day,
             SUM("amountPaisa")::text AS total
      FROM "Transaction"
      WHERE "merchantId" = ${merchant.id} AND "status" = 'SUCCEEDED' AND "createdAt" >= ${monthStart}
      GROUP BY day ORDER BY day
    `,
    db.merchantGateway.findMany({ where: { merchantId: merchant.id }, include: { gateway: { select: { displayName: true } } }, orderBy: { createdAt: "asc" } }),
    db.paymentLink.count({ where: { merchantId: merchant.id, active: true } }),
    db.invoice.count({ where: { merchantId: merchant.id, status: { in: ["DRAFT", "SENT", "OVERDUE"] } } }),
    db.transaction.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, externalReference: true, amountPaisa: true, currency: true, status: true, createdAt: true, gateway: { select: { displayName: true } } },
    }),
  ]);

  const buckets = new Array(now.getUTCDate()).fill(0) as number[];
  for (const transaction of monthly) buckets[transaction.day - 1] = Number(transaction.total);
  const max = Math.max(1, ...buckets);

  return (
    <main className="min-w-0 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-slate-500">Merchant workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Hello, {merchant.displayName}</h1></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${merchant.kycStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          KYC {merchant.kycStatus.toLowerCase().replaceAll("_", " ")}
        </span>
      </div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total received" value={money(received._sum.amountPaisa ?? 0n)} detail={`${received._count.id} successful transactions`} />
        <Metric label="Pending payments" value={money(pending._sum.amountPaisa ?? 0n)} detail={`${pending._count.id} awaiting confirmation`} />
        <Metric label="Received today" value={money(today._sum.amountPaisa ?? 0n)} detail="Successful payments since midnight UTC" />
        <Metric label="Active checkout links" value={String(linkCount)} detail={`${invoiceCount} open invoices`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between"><div><h2 className="font-semibold">Monthly revenue</h2><p className="mt-1 text-xs text-slate-500">Daily successful volume for this month</p></div><span className="text-sm font-semibold text-brand-700">{money(received._sum.amountPaisa ?? 0n)} lifetime</span></div>
          <div className="mt-7 flex h-40 items-end gap-1.5" role="img" aria-label="Daily revenue bar chart">
            {buckets.map((amount, index) => <div key={index} title={`${index + 1}: ${money(BigInt(Math.round(amount)))}`} className="min-w-1 flex-1 rounded-t bg-brand-500/80" style={{ height: `${Math.max(3, (amount / max) * 100)}%` }} />)}
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>1</span><span>Day of month</span><span>{now.getUTCDate()}</span></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Payment methods</h2><p className="mt-1 text-xs text-slate-500">Your configured gateways</p></div><Link href="/dashboard/gateways" className="text-sm font-semibold text-brand-700">Manage</Link></div>
          <div className="mt-5 space-y-3">
            {gateways.length ? gateways.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><span className="text-sm font-medium">{item.gateway.displayName}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.enabled ? "Enabled" : "Disabled"}</span></div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No payment methods configured.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold">Recent transactions</h2><p className="mt-1 text-xs text-slate-500">Your latest payment activity</p></div><Link href="/dashboard/transactions" className="text-sm font-semibold text-brand-700">View all</Link></div>
        {transactions.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">TxID</th><th className="px-5 py-3">Gateway</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead>
          <tbody>{transactions.map((tx) => <tr key={tx.id} className="border-t border-slate-100"><td className="px-5 py-4 font-medium">{tx.externalReference ?? tx.id.slice(-10)}</td><td className="px-5 py-4 text-slate-600">{tx.gateway?.displayName ?? "—"}</td><td className="px-5 py-4">{money(tx.amountPaisa, tx.currency)}</td><td className="px-5 py-4">{tx.status.toLowerCase()}</td><td className="px-5 py-4 text-slate-500">{tx.createdAt.toLocaleDateString()}</td></tr>)}</tbody>
        </table></div> : <p className="p-8 text-center text-sm text-slate-500">No transactions yet.</p>}
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article>;
}

function money(amount: bigint, currency = "BDT") {
  const main = amount / 100n;
  const fraction = String(amount % 100n).padStart(2, "0");
  const formatted = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(main);
  return `${currency} ${formatted}.${fraction}`;
}
