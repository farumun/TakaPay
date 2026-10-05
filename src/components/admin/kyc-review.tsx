"use client";

import { useEffect, useState } from "react";

type Kyc = { id: string; documentType: string; status: string; createdAt: string; merchant: { displayName: string; businessName: string | null; user: { email: string | null; phone: string | null } } };

export function KycReview() {
  const [items, setItems] = useState<Kyc[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/kyc");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load KYC");
    setItems(result);
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/admin/kyc/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Review failed"); return; }
    setMessage(`Document ${status.toLowerCase()}.`);
    await load();
  }

  return (
    <div className="space-y-4">
      {items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{item.merchant.businessName || item.merchant.displayName}</h2><p className="text-sm text-slate-500">{item.merchant.user.email || item.merchant.user.phone}</p><p className="mt-2 text-xs uppercase text-slate-500">{item.documentType.replaceAll("_", " ")} · {item.status}</p></div>
          <a href={`/api/admin/kyc/${item.id}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-700">Download document</a>
        </div>
        {item.status === "PENDING" && <div className="mt-4 flex gap-2"><button onClick={() => review(item.id, "APPROVED")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button><button onClick={() => review(item.id, "REJECTED")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Reject</button></div>}
      </article>)}
      {!items.length && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No KYC documents submitted.</p>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  );
}
