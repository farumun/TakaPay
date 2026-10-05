import { CreateRecordForm } from "@/components/merchant/create-record-form";
import { db } from "@/lib/db";
import { currentMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export default async function PaymentLinksPage() {
  const merchant = await currentMerchant();
  const links = await db.paymentLink.findMany({ where: { merchantId: merchant.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <main className="min-w-0 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">Payment links</h1>
      <p className="mt-1 text-sm text-slate-500">Create checkout links to share with customers. Checkout processing requires a configured live provider adapter.</p>
      <div className="mt-6"><CreateRecordForm kind="payment-link" /></div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Your links</h2>
        {links.length ? <ul className="divide-y divide-slate-100">{links.map((link) => <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><p className="font-medium">{link.title}</p><code className="mt-1 block text-xs text-slate-500">{process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/pay/${link.slug}` : `slug: ${link.slug}`}</code></div>
          <span className="text-sm text-slate-600">{link.amountPaisa === null ? "Customer enters amount" : money(link.amountPaisa, link.currency)}</span>
        </li>)}</ul> : <p className="p-6 text-sm text-slate-500">No payment links created.</p>}
      </section>
    </main>
  );
}

function money(amount: bigint, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-BD").format(amount / 100n)}.${String(amount % 100n).padStart(2, "0")}`;
}
