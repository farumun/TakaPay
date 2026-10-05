import { DeveloperTools } from "@/components/merchant/developer-tools";

export default function DevelopersPage() {
  return (
    <main className="min-w-0 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">Developer API</h1>
      <p className="mt-1 text-sm text-slate-500">Manage environment-specific API credentials and webhook endpoints.</p>
      <div className="mt-6"><DeveloperTools /></div>
      <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Signing secret format for Takapay notifications will be published with the outbound delivery worker. Do not treat this configuration page as a live webhook integration until that contract is implemented.</p>
    </main>
  );
}
