"use client";

import { FormEvent, useEffect, useState } from "react";

type Nav = { id: string; location: "header" | "footer" | "footer-products" | "footer-resources" | "footer-company" | "footer-support"; label: string; href: string; sortOrder: number; enabled: boolean };
type Flag = { key: string; enabled: boolean; description: string | null };
const publicKeys = ["brand", "support", "social", "login_announcement"];

export function SystemSettingsEditor({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Flag[]>([]);
  const [navigation, setNavigation] = useState<Nav[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [settingsResponse, navResponse] = await Promise.all([fetch("/api/admin/settings"), fetch("/api/admin/navigation")]);
    const [settingResult, navResult] = await Promise.all([settingsResponse.json(), navResponse.json()]);
    if (!settingsResponse.ok || !navResponse.ok) throw new Error("Could not load global settings");
    setSettings(Object.fromEntries(settingResult.settings.map((entry: { key: string; value: unknown }) => [entry.key, JSON.stringify(entry.value, null, 2)])));
    setFlags(settingResult.flags);
    setNavigation(navResult);
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function saveSetting(key: string) {
    let value: unknown;
    try { value = JSON.parse(settings[key] ?? "{}"); }
    catch { setMessage(`${key}: invalid JSON`); return; }
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    const result = await response.json();
    setMessage(response.ok ? `${key} saved.` : result.error || "Could not save setting");
  }

  async function saveNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/navigation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: form.get("location"), label: form.get("label"), href: form.get("href"), sortOrder: Number(form.get("sortOrder") || 0) }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not add navigation link"); return; }
    formElement.reset();
    setMessage("Navigation link added.");
    await load();
  }

  async function updateNavigation(item: Nav, patch: Record<string, unknown>) {
    const response = await fetch("/api/admin/navigation", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ...patch }),
    });
    if (!response.ok) { const result = await response.json(); setMessage(result.error || "Could not update link"); return; }
    await load();
  }

  async function setFlag(key: string, enabled: boolean) {
    const response = await fetch("/api/admin/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled, description: flags.find((flag) => flag.key === key)?.description }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not update feature flag"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Public settings</h2>
        <p className="mt-1 text-xs text-slate-500">Only public non-secret configuration is editable here.</p>
        {publicKeys.map((key) => <div key={key} className="mt-4"><label className="text-sm font-medium">{key}<textarea disabled={!isSuperAdmin} rows={5} value={settings[key] ?? "{}"} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-mono text-xs disabled:bg-slate-50" /></label>{isSuperAdmin && <button onClick={() => saveSetting(key)} className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white">Save {key}</button>}</div>)}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Header and footer links</h2>
        <form onSubmit={saveNavigation} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select name="location" className="rounded-lg border border-slate-300 p-2.5 text-sm">
            <option value="header">Header</option>
            <option value="footer">Legal links</option>
            <option value="footer-products">Footer · Products</option>
            <option value="footer-resources">Footer · Resources</option>
            <option value="footer-company">Footer · Company</option>
            <option value="footer-support">Footer · Support</option>
          </select>
          <input name="label" required placeholder="Label" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input name="href" required placeholder="/path or #section" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white">Add link</button>
        </form>
        <ul className="mt-4 divide-y divide-slate-100">{navigation.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span>{item.location}: {item.label} <code className="ml-2 text-xs text-slate-500">{item.href}</code></span>
          <button onClick={() => updateNavigation(item, { enabled: !item.enabled })} className="font-semibold text-brand-700">{item.enabled ? "Hide" : "Show"}</button>
        </li>)}</ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Feature flags</h2>
        <p className="mt-1 text-xs text-slate-500">Flags are configuration only; application code must explicitly consume each key.</p>
        <ul className="mt-4 divide-y divide-slate-100">{flags.map((flag) => <li key={flag.key} className="flex justify-between py-3 text-sm"><span><strong>{flag.key}</strong><span className="ml-2 text-slate-500">{flag.description}</span></span><button disabled={!isSuperAdmin} onClick={() => setFlag(flag.key, !flag.enabled)} className="font-semibold text-brand-700 disabled:text-slate-400">{flag.enabled ? "Enabled" : "Disabled"} · Toggle</button></li>)}</ul>
      </section>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  );
}
