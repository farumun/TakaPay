import Link from "next/link";
import { currentMerchant } from "@/lib/merchant";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const merchant = await currentMerchant();
  const search = await searchParams;
  const status = ["CREATED", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "CANCELLED"].includes(search.status ?? "")
    ? search.status as "CREATED" | "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELLED"
    : undefined;
  const items = await db.transaction.findMany({
    where: {
      merchantId: merchant.id,
      ...(status ? { status } : {}),
      ...(search.q?.trim() ? {
        OR: [
          { id: { contains: search.q.trim() } },
          { externalReference: { contains: search.q.trim() } },
          { customerEmail: { contains: search.q.trim() } },
          { customerPhone: { contains: search.q.trim() } },
        ],
      } : {}),
    },
    include: { gateway: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const query = new URLSearchParams({ format: "csv", ...(search.q ? { q: search.q } : {}), ...(status ? { status } : {}) });

  return (
    <main className="min-w-0 p-5 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-slate-500">Payments</p><h1 className="mt-1 text-2xl font-bold">Transactions</h1></div>
        <Link href={`/api/merchant/transactions?${query}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-brand-300">Export CSV</Link>
      </header>
      <form className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4" method="get">
        <input name="q" defaultValue={search.q} placeholder="Search TxID, email, phone" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>{["CREATED", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">TxID</th><th className="px-5 py-3">Gateway</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead>
          <tbody>{items.map((tx) => <tr key={tx.id} className="border-t border-slate-100">
            <td className="px-5 py-4 font-medium">{tx.externalReference ?? tx.id}</td><td className="px-5 py-4">{tx.gateway?.displayName ?? "—"}</td>
            <td className="px-5 py-4 text-slate-600">{tx.customerEmail ?? tx.customerPhone ?? "—"}</td>
            <td className="px-5 py-4">{money(tx.amountPaisa, tx.currency)}</td><td className="px-5 py-4">{tx.status}</td><td className="px-5 py-4 text-slate-500">{tx.createdAt.toLocaleString()}</td>
          </tr>)}</tbody>
        </table>
        {!items.length && <p className="p-8 text-center text-sm text-slate-500">No matching transactions.</p>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Showing up to 100 rows. Refund initiation remains unavailable until a verified provider refund adapter has been configured.</p>
    </main>
  );
}

function money(amount: bigint, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-BD").format(amount / 100n)}.${String(amount % 100n).padStart(2, "0")}`;
}
