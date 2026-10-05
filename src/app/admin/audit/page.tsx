import { AuditLogList } from "@/components/admin/audit-log-list";

export default function AuditPage() {
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">Audit log</h1><p className="mt-1 text-sm text-slate-500">Recent administrative and account security actions.</p><div className="mt-6"><AuditLogList /></div></main>;
}
