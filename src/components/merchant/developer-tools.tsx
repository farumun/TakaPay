"use client";

import { FormEvent, useEffect, useState } from "react";

type ApiKey = { id: string; label: string; publicKey: string; environment: string; createdAt: string };
type Hook = { id: string; url: string; enabled: boolean };

export function DeveloperTools() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [oneTimeSecret, setOneTimeSecret] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [keyResponse, hookResponse] = await Promise.all([fetch("/api/merchant/keys"), fetch("/api/merchant/webhook")]);
    const [keyResult, hookResult] = await Promise.all([keyResponse.json(), hookResponse.json()]);
    if (!keyResponse.ok || !hookResponse.ok) throw new Error("Could not load developer settings");
    setKeys(keyResult);
    setHooks(hookResult);
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/merchant/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: form.get("label"), environment: form.get("environment") }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not create key"); return; }
    setOneTimeSecret(result.secretKey);
    setMessage("Copy the secret now. It cannot be retrieved again.");
    formElement.reset();
    await load();
  }

  async function createWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const response = await fetch("/api/merchant/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: new FormData(formElement).get("url") }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not configure webhook"); return; }
    setOneTimeSecret(result.signingSecret);
    setMessage("Webhook signing secret is shown once. The endpoint must be a public HTTPS URL.");
    formElement.reset();
    await load();
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/merchant/keys/${id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Could not revoke API key"); return; }
    setMessage("API key revoked.");
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={createKey} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">API keys</h2>
          <label className="mt-4 block text-sm font-medium">Label<input name="label" required maxLength={60} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="mt-3 block text-sm font-medium">Environment<select name="environment" className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5"><option value="SANDBOX">Sandbox</option><option value="LIVE">Live (KYC required)</option></select></label>
          <button className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Generate key pair</button>
        </form>
        <form onSubmit={createWebhook} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Webhook endpoint</h2>
          <p className="mt-1 text-xs text-slate-500">Use HTTPS and verify HMAC-SHA256 signatures on raw request bodies.</p>
          <label className="mt-4 block text-sm font-medium">HTTPS URL<input name="url" type="url" required placeholder="https://merchant.example/webhooks/takapay" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <button className="mt-4 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Save and rotate secret</button>
        </form>
      </section>
      {oneTimeSecret && <div className="break-all rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold">{message}</p><code className="mt-2 block select-all text-xs">{oneTimeSecret}</code><button onClick={() => setOneTimeSecret("")} className="mt-2 text-xs font-semibold text-amber-900">Dismiss secret</button></div>}
      {message && !oneTimeSecret && <p role="status" className="text-sm text-slate-600">{message}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Active API keys</h2>
        <ul className="mt-4 divide-y divide-slate-100">{keys.map((key) => <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="text-sm font-medium">{key.label} · {key.environment}</p><code className="text-xs text-slate-500">{key.publicKey}</code></div>
          <button onClick={() => revoke(key.id)} className="text-sm font-semibold text-red-700">Revoke</button>
        </li>)}</ul>
        {!keys.length && <p className="mt-3 text-sm text-slate-500">No active keys.</p>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Webhook endpoints</h2>
        <ul className="mt-4 divide-y divide-slate-100">{hooks.map((hook) => <li key={hook.id} className="break-all py-3 text-sm">{hook.url} <span className="ml-2 text-xs text-slate-500">{hook.enabled ? "Enabled" : "Disabled"}</span></li>)}</ul>
        {!hooks.length && <p className="mt-3 text-sm text-slate-500">No webhook endpoint configured.</p>}
      </section>
    </div>
  );
}
