import { MfaSettings } from "@/components/merchant/mfa-settings";
import { currentMerchant } from "@/lib/merchant";

export default async function SecurityPage() {
  await currentMerchant();
  return <main className="min-w-0 p-5 sm:p-8"><h1 className="text-2xl font-bold">Account security</h1><p className="mt-1 text-sm text-slate-500">Protect access to your merchant workspace.</p><div className="mt-6"><MfaSettings /></div></main>;
}
