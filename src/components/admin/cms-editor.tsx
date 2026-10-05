"use client";

import { useEffect, useState } from "react";

type Section = { key: string; type: string; enabled: boolean; sortOrder: number; content: unknown };

export function CmsEditor() {
  const [sections, setSections] = useState<Section[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/cms").then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load CMS");
      setSections(result);
      setDrafts(Object.fromEntries(result.map((section: Section) => [section.key, JSON.stringify(section.content, null, 2)])));
    }).catch((error) => setMessage(error.message));
  }, []);

  async function save(section: Section) {
    let content: unknown;
    try { content = JSON.parse(drafts[section.key] ?? ""); }
    catch { setMessage(`${section.key}: enter valid JSON first`); return; }
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      setMessage(`${section.key}: content must be a JSON object`); return;
    }
    const response = await fetch("/api/admin/cms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: section.key, content }),
    });
    const result = await response.json();
    setMessage(response.ok ? `Saved ${section.key}` : result.error || "Could not save section");
  }

  async function toggle(section: Section) {
    const response = await fetch("/api/admin/cms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: section.key, content: section.content, enabled: !section.enabled }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not update visibility"); return; }
    setSections((current) => current.map((item) => item.key === section.key ? { ...item, enabled: result.enabled } : item));
    setMessage(`${section.key} ${result.enabled ? "published" : "hidden"}.`);
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => <section key={section.key} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex justify-between"><div><h2 className="font-semibold">{section.key}</h2><p className="text-xs text-slate-500">{section.type} · order {section.sortOrder}</p></div><button onClick={() => toggle(section)} className="text-xs font-semibold text-brand-700">{section.enabled ? "Hide section" : "Publish section"}</button></div>
        <textarea value={drafts[section.key] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [section.key]: event.target.value }))} rows={Math.min(20, Math.max(8, (drafts[section.key]?.split("\n").length ?? 8) + 1))} className="mt-4 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs" />
        <button onClick={() => save(section)} className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save content</button>
      </section>)}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>
  );
}
