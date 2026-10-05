"use client";

import { useEffect, useState } from "react";

type Gateway = {
  code: string;
  displayName: string;
  enabled: boolean;
  masterCredentialsConfigured: boolean;
  commissionRules: { percentageBps: number; fixedAmountPaisa: string }[];
};

export function GatewayManager({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [message, setMessage] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch("/api/admin/gateways");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load gateways");
    setGateways(result);
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function save(item: Gateway, enabled: boolean) {
    let masterCredentials: Record<string, string> | undefined;
    if (credentials[item.code]) {
      try { masterCredentials = JSON.parse(credentials[item.code]); }
      catch { setMessage(`${item.displayName}: master credentials need valid JSON`); return; }
    }
    const response = await fetch("/api/admin/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: item.code,
        enabled,
        ...(masterCredentials ? { masterCredentials } : {}),
        commissionPercentageBps: item.commissionRules[0]?.percentageBps ?? 0,
        commissionFixedPaisa: Number(item.commissionRules[0]?.fixedAmountPaisa ?? 0),
      }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not update gateway"); return; }
    setMessage(`${item.displayName} saved.`);
    setCredentials((current) => ({ ...current, [item.code]: "" }));
    await load();
  }

  return (
    <div className="space-y-4">
      {gateways.map((gateway) => <article key={gateway.code} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-semibold">{gateway.displayName}</h2><p className="mt-1 text-xs text-slate-500">Master credentials: {gateway.masterCredentialsConfigured ? "Configured" : "Not configured"}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${gateway.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{gateway.enabled ? "Global enabled" : "Disabled"}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Commission percentage
            <input type="number" min="0" max="100" step="0.01" disabled={!isSuperAdmin} value={(gateway.commissionRules[0]?.percentageBps ?? 0) / 100} onChange={(event) => setGateways((current) => current.map((item) => item.code === gateway.code ? { ...item, commissionRules: [{ percentageBps: Math.round(Number(event.target.value) * 100), fixedAmountPaisa: item.commissionRules[0]?.fixedAmountPaisa ?? "0" }] } : item))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" />
          </label>
          <label className="text-sm font-medium">Fixed fee (paisa)
            <input type="number" min="0" step="1" disabled={!isSuperAdmin} value={gateway.commissionRules[0]?.fixedAmountPaisa ?? "0"} onChange={(event) => setGateways((current) => current.map((item) => item.code === gateway.code ? { ...item, commissionRules: [{ percentageBps: item.commissionRules[0]?.percentageBps ?? 0, fixedAmountPaisa: event.target.value }] } : item))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50" />
          </label>
          <label className="text-sm font-medium">Master credentials (JSON)
            <input type="password" autoComplete="new-password" disabled={!isSuperAdmin} value={credentials[gateway.code] ?? ""} onChange={(event) => setCredentials((current) => ({ ...current, [gateway.code]: event.target.value }))} placeholder='{"client_id":"…","secret":"…"}' className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-xs disabled:bg-slate-50" />
          </label>
        </div>
        {isSuperAdmin && <div className="mt-4 flex gap-2"><button onClick={() => save(gateway, gateway.enabled)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save settings</button><button onClick={() => save(gateway, !gateway.enabled)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">{gateway.enabled ? "Disable globally" : "Enable globally"}</button></div>}
      </article>)}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  );
}
