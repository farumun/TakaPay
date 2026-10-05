"use client";

import { useEffect, useState } from "react";

type Record = { id: string; action: string; resource: string; resourceId: string | null; createdAt: string; actor: { email: string | null; phone: string | null; role: string } | null };

export function AuditLogList() {
  const [records, setRecords] = useState<Record[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/admin/audit").then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load audit log");
      setRecords(result);
    }).catch((error) => setMessage(error.message));
  }, []);
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Action</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Resource</th><th className="px-5 py-3">Time</th></tr></thead>
      <tbody>{records.map((record) => <tr key={record.id} className="border-t border-slate-100"><td className="px-5 py-4 font-medium">{record.action}</td><td className="px-5 py-4">{record.actor?.email || record.actor?.phone || "System"} <span className="text-xs text-slate-400">{record.actor?.role}</span></td><td className="px-5 py-4">{record.resource} {record.resourceId}</td><td className="px-5 py-4 text-slate-500">{new Date(record.createdAt).toLocaleString()}</td></tr>)}</tbody>
    </table>
    {!records.length && <p className="p-6 text-sm text-slate-500">{message || "No audit records."}</p>}
  </div>;
}
