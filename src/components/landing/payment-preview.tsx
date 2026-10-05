"use client";

import { useState } from "react";
import { Check, CreditCard, LockKeyhole } from "lucide-react";

export function PaymentPreview({ methods }: { methods: string[] }) {
  const [selected, setSelected] = useState(methods[0] ?? "");
  const [message, setMessage] = useState("");
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-8 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="relative rounded-3xl border border-white bg-white p-5 shadow-soft sm:p-7">
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold text-slate-900">Secure checkout preview</p><p className="mt-1 text-xs text-slate-500">Choose a payment method</p></div>
          <div className="rounded-xl bg-brand-50 p-3 text-brand-600"><LockKeyhole size={20} /></div>
        </div>
        <div className="my-6 rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Order total</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">৳ 2,450.00</p></div>
        <div className="space-y-3">
          {methods.map((method) => <button key={method} type="button" aria-pressed={selected === method} onClick={() => { setSelected(method); setMessage(""); }} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selected === method ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/10" : "border-slate-200 hover:border-brand-200"}`}>
            <span className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-lg text-xs font-extrabold ${method === "bKash" ? "bg-pink-100 text-pink-700" : "bg-slate-100 text-slate-600"}`}>{method === "Bank Transfer" ? <CreditCard size={17} /> : method.slice(0, 2).toUpperCase()}</span><span className="text-sm font-semibold text-slate-800">{method}</span></span>
            {selected === method && <Check size={18} className="text-brand-600" />}
          </button>)}
        </div>
        <button type="button" onClick={() => setMessage("Interactive product preview only; no payment will be initiated.")} className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-700">Continue with {selected || "payment"}</button>
        {message && <p role="status" className="mt-3 text-center text-xs text-amber-800">{message}</p>}
        <p className="mt-4 text-center text-xs text-slate-400">Encrypted checkout · Payment provider connection required</p>
      </div>
    </div>
  );
}
