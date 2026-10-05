import { GatewaySettings } from "@/components/merchant/gateway-settings";

export default function GatewaySettingsPage() {
  return (
    <main className="min-w-0 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">Payment methods</h1>
      <p className="mt-1 text-sm text-slate-500">Configure provider credentials for sandbox or approved live environments.</p>
      <div className="mt-6"><GatewaySettings /></div>
      <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Credentials are securely stored, but checkout processing is unavailable until each payment provider adapter is implemented and tested against its official API.</p>
    </main>
  );
}
