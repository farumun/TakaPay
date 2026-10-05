import { auth } from "../../../../auth";
import { GatewayManager } from "@/components/admin/gateway-manager";

export default async function AdminGatewaysPage() {
  const session = await auth();
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">Gateways & fees</h1><p className="mt-1 text-sm text-slate-500">Global availability, master provider credentials, and commission settings.</p><div className="mt-6"><GatewayManager isSuperAdmin={session?.user.role === "SUPER_ADMIN"} /></div><p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Provider API execution is not enabled. Only configure credentials after adapter implementation and official provider testing.</p></main>;
}
