import { CreateRecordForm } from "@/components/merchant/create-record-form";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const merchant = await currentMerchant();
  const invoices = await db.invoice.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <main className="min-w-0 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <p className="mt-1 text-sm text-slate-500">Create customer invoices. Email delivery and invoice payments require configured delivery and gateway services.</p>
      <div className="mt-6"><CreateRecordForm kind="invoice" /></div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Your invoices</h2>
        {invoices.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Due</th></tr></thead>
          <tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-t border-slate-100"><td className="px-5 py-4 font-medium">{invoice.number}</td><td className="px-5 py-4">{invoice.customerName}<span className="block text-xs text-slate-500">{invoice.customerEmail}</span></td><td className="px-5 py-4">{money(invoice.amountPaisa, invoice.currency)}</td><td className="px-5 py-4">{invoice.status}</td><td className="px-5 py-4">{invoice.dueAt?.toLocaleDateString() ?? "—"}</td></tr>)}</tbody>
        </table></div> : <p className="p-6 text-sm text-slate-500">No invoices created.</p>}
      </section>
    </main>
  );
}

function money(amount: bigint, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-BD").format(amount / 100n)}.${String(amount % 100n).padStart(2, "0")}`;
}
