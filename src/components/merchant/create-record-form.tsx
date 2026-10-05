"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "payment-link" | "invoice";

export function CreateRecordForm({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") || "");
    const amountPaisa = toMinorUnits(amount);
    if (amount && amountPaisa === null) {
      setMessage("Enter an amount with up to two decimal places.");
      setBusy(false);
      return;
    }
    const data: Record<string, unknown> = {
      title: form.get("title"),
      customerName: form.get("customerName"),
      customerEmail: form.get("customerEmail") || undefined,
      description: form.get("description") || undefined,
      amountPaisa: amountPaisa ?? undefined,
      currency: "BDT",
    };
    try {
      const response = await fetch(kind === "payment-link" ? "/api/merchant/payment-links" : "/api/merchant/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create record");
      setMessage(kind === "payment-link" ? `Created: ${result.checkoutUrl ?? result.slug}` : `Invoice ${result.number} created.`);
      formElement.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{kind === "payment-link" ? "Create payment link" : "Create invoice"}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {kind === "payment-link"
          ? <Field name="title" label="Link title" required />
          : <><Field name="customerName" label="Customer name" required /><Field name="customerEmail" label="Customer email" type="email" /><Field name="description" label="Description" /></>}
        <Field name="amount" label={kind === "payment-link" ? "Amount (leave empty for customer-entered)" : "Amount (BDT)"}
          inputMode="decimal" required={kind === "invoice"} />
      </div>
      <button disabled={busy} className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Saving…" : kind === "payment-link" ? "Create link" : "Create invoice"}
      </button>
      {message && <p role="status" className="mt-3 break-all text-sm text-slate-600">{message}</p>}
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return <label className="block text-sm font-medium text-slate-700">{label}<input {...input} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>;
}

function toMinorUnits(value: string): number | null {
  if (!value) return null;
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}
