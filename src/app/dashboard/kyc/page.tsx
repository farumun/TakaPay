import { KycUpload } from "@/components/merchant/kyc-upload";
import { currentMerchant } from "@/lib/merchant";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const merchant = await currentMerchant();
  return (
    <main className="min-w-0 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">KYC verification</h1>
      <p className="mt-1 text-sm text-slate-500">Current verification status: <strong>{merchant.kycStatus}</strong>. Approved KYC is required for live API keys and gateway credentials.</p>
      <div className="mt-6"><KycUpload /></div>
    </main>
  );
}
