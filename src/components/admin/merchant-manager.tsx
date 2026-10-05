"use client";

import { useEffect, useState } from "react";

type Merchant = {
  userId: string;
  displayName: string;
  businessName: string | null;
  kycStatus: string;
  approvedAt: string | null;
  transactionLimitPaisa: string | null;
  user: { email: string | null; phone: string | null; status: string; createdAt: string };
};

export function MerchantManager() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/merchants");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load merchants");
    setMerchants(result);
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function update(merchant: Merchant, patch: Record<string, unknown>) {
    const response = await fetch("/api/admin/merchants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: merchant.userId, ...patch }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Update failed"); return; }
    setMessage(`Updated ${merchant.displayName}`);
    await load();
  }

  return (
    <div className="space-y-4">
      {merchants.map((merchant) => <article key={merchant.userId} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-semibold">{merchant.businessName || merchant.displayName}</h2><p className="mt-1 text-sm text-slate-500">{merchant.user.email || merchant.user.phone} · joined {new Date(merchant.user.createdAt).toLocaleDateString()}</p></div>
          <div className="flex gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{merchant.user.status}</span><span className={`rounded-full px-2.5 py-1 text-xs ${merchant.approvedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{merchant.approvedAt ? "APPROVED" : "AWAITING APPROVAL"}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs">{merchant.kycStatus}</span></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!merchant.approvedAt && <button onClick={() => update(merchant, { approved: true })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve merchant</button>}
          {merchant.user.status !== "SUSPENDED" && <button onClick={() => update(merchant, { status: "SUSPENDED" })} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Suspend</button>}
          {merchant.user.status === "SUSPENDED" && <button onClick={() => update(merchant, { status: "ACTIVE" })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Reactivate login</button>}
          <button onClick={() => {
            const value = window.prompt("Transaction limit in paisa (leave blank for no limit)", merchant.transactionLimitPaisa ?? "");
            if (value !== null) update(merchant, { transactionLimitPaisa: value ? Number(value) : null });
          }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Set limit</button>
        </div>
      </article>)}
      {!merchants.length && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No merchants found.</p>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  );
}
