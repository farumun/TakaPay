import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { asRecord, asString, asStringList, safeContentHref } from "@/lib/cms";
import { PaymentPreview } from "@/components/landing/payment-preview";

export function Hero({ content }: { content: unknown }) {
  const data = asRecord(content);
  const primary = asRecord(data.primaryCta);
  const secondary = asRecord(data.secondaryCta);
  const methods = asStringList(data.paymentMethods);

  return (
    <section className="overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white">
      <div className="container-shell grid min-h-[640px] items-center gap-14 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
        <div className="relative z-10">
          <span className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-bold tracking-[.14em] text-brand-700 shadow-sm">
            {asString(data.eyebrow)}
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.65rem]">
            {asString(data.title)}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            {asString(data.description)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={safeContentHref(primary.href, "/register")} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5 hover:bg-brand-700">
              {asString(primary.label, "Get Started")} <ArrowRight size={17} />
            </Link>
            <Link href={safeContentHref(secondary.href, "/demo")} className="rounded-lg border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
              {asString(secondary.label, "View Live Demo")} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">
            <Check size={16} className="text-emerald-600" /> Built for businesses in Bangladesh
          </p>
        </div>

        <PaymentPreview methods={methods} />
      </div>
    </section>
  );
}
