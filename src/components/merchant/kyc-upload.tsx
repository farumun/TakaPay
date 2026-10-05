"use client";

import { FormEvent, useEffect, useState } from "react";

type Document = { id: string; documentType: string; status: string; createdAt: string };

export function KycUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/merchant/kyc");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load documents");
    setDocuments(result);
  }
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/merchant/kyc", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Upload failed"); return; }
    setMessage("Document uploaded securely for review.");
    formElement.reset();
    await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={upload} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Submit a document</h2>
        <label className="mt-4 block text-sm font-medium">Document type<select name="documentType" className="mt-1.5 w-full rounded-lg border border-slate-300 p-2.5"><option value="NID">National ID</option><option value="TRADE_LICENSE">Trade license</option><option value="BANK_PROOF">Bank proof</option></select></label>
        <label className="mt-3 block text-sm font-medium">File (PDF, JPEG, PNG; max 5 MB)<input name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className="mt-1.5 block w-full text-sm" /></label>
        <button className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Upload for review</button>
        {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Submitted documents</h2>
        <p className="mt-1 text-xs text-slate-500">Files are encrypted at rest and only accessible to authorized administrators.</p>
        <ul className="mt-4 divide-y divide-slate-100">{documents.map((document) => <li key={document.id} className="flex justify-between gap-3 py-3 text-sm"><span>{document.documentType.replaceAll("_", " ")}</span><span className="text-slate-500">{document.status} · {new Date(document.createdAt).toLocaleDateString()}</span></li>)}</ul>
        {!documents.length && <p className="mt-3 text-sm text-slate-500">No documents submitted.</p>}
      </section>
    </div>
  );
}
