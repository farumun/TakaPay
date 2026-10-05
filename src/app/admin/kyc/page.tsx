import { KycReview } from "@/components/admin/kyc-review";

export default function AdminKycPage() {
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">KYC review</h1><p className="mt-1 text-sm text-slate-500">Review identity documents and business verification submissions.</p><div className="mt-6"><KycReview /></div></main>;
}
