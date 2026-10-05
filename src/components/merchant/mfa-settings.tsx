"use client";

import { FormEvent, useEffect, useState } from "react";

export function MfaSettings() {
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [message, setMessage] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  async function refresh() {
    const response = await fetch("/api/merchant/security/mfa");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load MFA status");
    setEnabled(result.enabled);
  }
  useEffect(() => { refresh().catch((error) => setMessage(error.message)); }, []);

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/merchant/security/mfa", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "begin", password: new FormData(event.currentTarget).get("password") }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not start MFA setup"); return; }
    setSecret(result.secret);
    setUri(result.uri);
  }

  async function confirm(event: FormEvent<HTMLFormElement>, action: "enable" | "disable") {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    const response = await fetch("/api/merchant/security/mfa", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, code }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not update MFA"); return; }
    setEnabled(result.enabled);
    setSecret("");
    setUri("");
    setMessage(result.enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
  }

  return (
    <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">Two-factor authentication</h2>
      <p className="mt-2 text-sm text-slate-500">Authenticator-app TOTP is required on every password or email/phone OTP login when enabled.</p>
      <p className="mt-3 text-sm font-semibold">{enabled ? "Enabled" : "Not enabled"}</p>
      {!enabled && !secret && !showSetup && <button onClick={() => setShowSetup(true)} className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Set up authenticator</button>}
      {!enabled && !secret && showSetup && <form onSubmit={begin} className="mt-4 flex gap-2"><input name="password" type="password" required autoComplete="current-password" placeholder="Confirm your account password" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2" /><button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Continue</button></form>}
      {secret && <div className="mt-4 break-all rounded-xl bg-slate-50 p-4 text-sm"><p>Add this secret manually to an authenticator app:</p><code className="my-2 block select-all font-bold">{secret}</code><p className="text-xs text-slate-500">{uri}</p><form onSubmit={(event) => confirm(event, "enable")} className="mt-4 flex gap-2"><input name="code" required pattern="[0-9]{6}" inputMode="numeric" placeholder="6-digit code" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2" /><button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Verify & enable</button></form></div>}
      {enabled && <form onSubmit={(event) => confirm(event, "disable")} className="mt-4 flex gap-2"><input name="code" required pattern="[0-9]{6}" inputMode="numeric" placeholder="Current authenticator code" className="min-w-0 rounded-lg border border-slate-300 px-3 py-2" /><button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Disable MFA</button></form>}
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
    </section>
  );
}
