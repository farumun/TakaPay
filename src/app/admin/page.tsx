import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [transactions, merchants, pendingKyc, pendingUsers] = await Promise.all([
    db.transaction.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountPaisa: true, feePaisa: true }, _count: { id: true } }),
    db.merchant.count(),
    db.merchant.count({ where: { kycStatus: "PENDING" } }),
    db.user.count({ where: { role: "MERCHANT", status: "PENDING" } }),
  ]);
  return (
    <main className="min-w-0 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">Control center</h1>
      <p className="mt-1 text-sm text-slate-500">Global platform activity and operations.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Processed volume" value={money(transactions._sum.amountPaisa ?? 0n)} />
        <Metric label="Recorded fees" value={money(transactions._sum.feePaisa ?? 0n)} />
        <Metric label="Merchants" value={String(merchants)} />
        <Metric label="Pending reviews" value={`${pendingUsers} accounts · ${pendingKyc} KYC`} />
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {[["Manage website CMS", "/admin/cms", "Edit landing page content and navigation sections."], ["Manage gateways and fees", "/admin/gateways", "Configure global availability and commission rules."], ["Merchant management", "/admin/merchants", "Approve accounts, suspend access, and set transaction limits."], ["Review KYC documents", "/admin/kyc", "Review encrypted business identity documents."]].map(([title, href, description]) => <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></Link>)}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p></article>;
}
function money(amount: bigint) {
  return `BDT ${new Intl.NumberFormat("en-BD").format(amount / 100n)}.${String(amount % 100n).padStart(2, "0")}`;
}
