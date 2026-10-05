import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublicPaymentLink({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await db.paymentLink.findUnique({
    where: { slug },
    include: { merchant: { select: { displayName: true } } },
  });
  if (!link || !link.active || (link.expiresAt && link.expiresAt < new Date())) notFound();
  const methods = await db.gateway.findMany({ where: { enabled: true }, select: { displayName: true }, orderBy: { displayName: "asc" } });
  const value = link.amountPaisa === null ? null : `BDT ${new Intl.NumberFormat("en-BD").format(link.amountPaisa / 100n)}.${String(link.amountPaisa % 100n).padStart(2, "0")}`;

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-brand-50 to-white px-5 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-soft">
        <Link href="/" className="text-xl font-extrabold text-brand-700">Takapay.</Link>
        <p className="mt-8 text-sm text-slate-500">Payment request from {link.merchant.displayName}</p>
        <h1 className="mt-2 text-2xl font-bold">{link.title}</h1>
        <p className="mt-4 text-3xl font-bold">{value ?? "Enter amount at checkout"}</p>
        <div className="mt-6 space-y-2">{methods.map((method) => <div key={method.displayName} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium">{method.displayName}</div>)}</div>
        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-sm leading-5 text-amber-900">Checkout is not available yet. This Takapay installation has no verified payment provider adapter enabled, so no money will be collected here.</p>
      </section>
    </main>
  );
}
