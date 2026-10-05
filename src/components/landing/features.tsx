import {
  ArrowRight,
  BadgePercent,
  Check,
  ChartNoAxesCombined,
  CircleDollarSign,
  Globe2,
  Layers3,
  Server,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";
import { asRecord, asString, asStringList, safeContentHref } from "@/lib/cms";

const icons = { Zap, ShieldCheck, Webhook, BadgePercent, Globe2, ChartNoAxesCombined };

export function Features({ content }: { content: unknown }) {
  const data = asRecord(content);
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <section id="features" className="section-space bg-white">
      <div className="container-shell">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-kicker">PAYMENT INFRASTRUCTURE</p>
          <h2 className="section-title">{asString(data.title)}</h2>
          <p className="mt-4 leading-7 text-slate-600">{asString(data.description)}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((value, index) => {
            const item = asRecord(value);
            const iconName = asString(item.icon) as keyof typeof icons;
            const Icon = icons[iconName] ?? Zap;
            return (
              <article key={`${asString(item.title)}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
                <span className="inline-flex rounded-xl bg-brand-50 p-3 text-brand-600"><Icon size={22} /></span>
                <h3 className="mt-5 font-semibold text-slate-900">{asString(item.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{asString(item.description)}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Integrations({ content }: { content: unknown }) {
  const data = asRecord(content);
  const items = asStringList(data.items);
  return (
    <section id="integrations" className="section-space bg-slate-50">
      <div className="container-shell text-center">
        <p className="section-kicker">PLUG INTO YOUR WORKFLOW</p>
        <h2 className="section-title">{asString(data.title)}</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {items.map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm">{item}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing({ content }: { content: unknown }) {
  const data = asRecord(content);
  const plans = Array.isArray(data.plans) ? data.plans : [];
  const planIcons = [CircleDollarSign, Layers3, Server];

  return (
    <section id="pricing" className="relative isolate scroll-mt-20 overflow-hidden bg-slate-50 py-20 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(13,110,253,0.10),transparent_50%)]" />
      <div className="container-shell">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 text-xs font-bold tracking-[.14em] text-brand-700 shadow-sm">
            <Sparkles size={14} aria-hidden="true" />
            CLEAR PLANS, BUILT AROUND YOU
          </span>
          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{asString(data.title, "Simple pricing for the way you do business")}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{asString(data.description, "Start with the payment model that fits your business. Get in touch and we’ll help you find the right setup.")}</p>
        </div>

        {plans.length > 0 ? (
          <div className="mx-auto mt-14 grid max-w-6xl items-stretch gap-6 lg:grid-cols-3">
            {plans.map((value, index) => {
              const plan = asRecord(value);
              const highlighted = plan.highlighted === true;
              const Icon = planIcons[index % planIcons.length];
              const features = asStringList(plan.features);
              return (
                <article
                  key={`${asString(plan.name)}-${index}`}
                  className={`relative flex h-full flex-col rounded-3xl border p-7 transition duration-200 hover:-translate-y-1 sm:p-8 ${
                    highlighted
                      ? "border-brand-600 bg-gradient-to-b from-brand-700 to-blue-950 text-white shadow-[0_24px_64px_rgba(0,77,190,0.22)]"
                      : "border-slate-200 bg-white text-slate-900 shadow-[0_16px_48px_rgba(15,23,42,0.06)] hover:border-brand-200 hover:shadow-soft"
                  }`}
                >
                  {highlighted && (
                    <span className="absolute -top-3 right-6 rounded-full bg-sky-300 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-950 shadow-sm">
                      {asString(plan.badge, "Popular choice")}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl ${highlighted ? "bg-white/10 text-sky-200" : "bg-brand-50 text-brand-600"}`}>
                      <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    {index === 0 && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${highlighted ? "bg-white/10 text-blue-100" : "bg-slate-100 text-slate-600"}`}>Flexible</span>}
                  </div>
                  <h3 className={`mt-6 text-xl font-bold tracking-tight ${highlighted ? "text-white" : "text-slate-950"}`}>{asString(plan.name, `Plan ${index + 1}`)}</h3>
                  <p className={`mt-2 min-h-12 text-sm leading-6 ${highlighted ? "text-blue-100" : "text-slate-500"}`}>{asString(plan.description)}</p>
                  <div className={`mt-7 border-t pt-6 ${highlighted ? "border-white/15" : "border-slate-100"}`}>
                    <p className={`text-4xl font-bold tracking-tight ${highlighted ? "text-white" : "text-slate-950"}`}>{asString(plan.price, "Custom")}</p>
                    {asString(plan.priceNote) && <p className={`mt-2 text-sm ${highlighted ? "text-blue-100" : "text-slate-500"}`}>{asString(plan.priceNote)}</p>}
                  </div>
                  {features.length > 0 && (
                    <ul className="mt-7 flex-1 space-y-4">
                      {features.map((feature) => (
                        <li key={feature} className={`flex items-start gap-3 text-sm leading-6 ${highlighted ? "text-blue-50" : "text-slate-600"}`}>
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${highlighted ? "bg-white/15 text-sky-200" : "bg-emerald-50 text-emerald-600"}`}>
                            <Check size={13} strokeWidth={3} aria-hidden="true" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href={safeContentHref(plan.href, "/contact")}
                    className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition ${
                      highlighted
                        ? "bg-white text-brand-700 hover:bg-blue-50"
                        : "border border-slate-200 bg-white text-slate-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    {asString(plan.cta, "Talk to our team")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            Pricing plans are being updated. Contact our team to discuss the right setup for your business.
          </p>
        )}

        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-5 text-center shadow-sm sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><ShieldCheck size={20} aria-hidden="true" /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{asString(data.noteTitle, "Need a tailored setup?")}</p>
              <p className="mt-1 text-sm text-slate-500">{asString(data.note, "Our team can help you choose a plan that suits your payment workflow.")}</p>
            </div>
          </div>
          <a href={safeContentHref(data.noteHref, "/contact")} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">
            {asString(data.noteCta, "Talk to our team")} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
