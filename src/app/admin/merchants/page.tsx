import { MerchantManager } from "@/components/admin/merchant-manager";

export default function AdminMerchantsPage() {
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">Merchant management</h1><p className="mt-1 text-sm text-slate-500">Approve verified businesses, suspend access, and manage transaction limits.</p><div className="mt-6"><MerchantManager /></div></main>;
}
