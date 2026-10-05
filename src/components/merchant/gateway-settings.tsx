"use client";

import { FormEvent, useEffect, useState } from "react";

type Gateway = {
  code: string;
  displayName: string;
  supportedCurrencies: string[];
  configurations: { environment: "SANDBOX" | "LIVE"; enabled: boolean; credentialsConfigured: boolean }[];
};

export function GatewaySettings() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [gatewayCode, setGatewayCode] = useState("");
  const [environment, setEnvironment] = useState<"SANDBOX" | "LIVE">("SANDBOX");

  async function load() {
    const response = await fetch("/api/merchant/gateways");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load gateways");
    setGateways(result);
    setGatewayCode((current) => current || result[0]?.code || "");
  }

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    let credentials: unknown;
    try { credentials = JSON.parse(String(values.get("credentials"))); }
    catch { setMessage("Credentials must be valid JSON key/value data."); setBusy(false); return; }
    const response = await fetch("/api/merchant/gateways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gatewayCode, environment, credentials }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Could not save gateway"); return; }
    setMessage("Credentials encrypted and saved. Secret values are not shown again.");
    formElement.reset();
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Available methods</h2>
        <div className="mt-4 space-y-3">{gateways.map((gateway) => <article key={gateway.code} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
          <div><p className="font-medium">{gateway.displayName}</p><p className="mt-1 text-xs text-slate-500">{gateway.supportedCurrencies.join(", ")}</p></div>
          <span className="text-xs text-slate-500">{gateway.configurations.map((config) => `${config.environment}: ${config.credentialsConfigured ? "Configured" : "Not configured"}`).join(" · ") || "Not configured"}</span>
        </article>)}</div>
        {!gateways.length && <p className="mt-4 text-sm text-slate-500">No gateways are globally enabled.</p>}
      </section>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Configure a gateway</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Credentials are encrypted at rest and never returned by this API. Only enter official provider credentials in a trusted deployment.</p>
        <label className="mt-4 block text-sm font-medium">Gateway
          <select required value={gatewayCode} onChange={(event) => setGatewayCode(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5">
            {gateways.map((gateway) => <option key={gateway.code} value={gateway.code}>{gateway.displayName}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">Environment
          <select value={environment} onChange={(event) => setEnvironment(event.target.value as "SANDBOX" | "LIVE")} className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5">
            <option value="SANDBOX">Sandbox</option><option value="LIVE">Live (approved KYC required)</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">Credential fields (JSON)
          <input required name="credentials" type="password" autoComplete="new-password" placeholder='{"merchant_id":"…","api_key":"…"}' className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs" />
        </label>
        <button disabled={busy || !gateways.length} className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save securely"}</button>
        {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
      </form>
    </div>
  );
}
