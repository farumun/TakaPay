import { SystemSettingsEditor } from "@/components/admin/system-settings-editor";
import { auth } from "../../../../auth";

export default async function AdminSettingsPage() {
  const session = await auth();
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">Global settings</h1><p className="mt-1 text-sm text-slate-500">Manage safe public settings, feature flags, and navigation links.</p><div className="mt-6"><SystemSettingsEditor isSuperAdmin={session?.user.role === "SUPER_ADMIN"} /></div></main>;
}
