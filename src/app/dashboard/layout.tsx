import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, FileText, KeyRound, LayoutDashboard, Link2, ShieldCheck, Settings2, ReceiptText } from "lucide-react";
import { auth, signOut } from "../../../auth";
import { currentMerchant } from "@/lib/merchant";

const links = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/dashboard/transactions", icon: ArrowUpRight },
  { label: "Payment methods", href: "/dashboard/gateways", icon: Settings2 },
  { label: "Developer API", href: "/dashboard/developers", icon: KeyRound },
  { label: "Payment links", href: "/dashboard/payment-links", icon: Link2 },
  { label: "Invoices", href: "/dashboard/invoices", icon: ReceiptText },
  { label: "KYC verification", href: "/dashboard/kyc", icon: ShieldCheck },
];

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MERCHANT") redirect("/login");
  await currentMerchant();
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-r border-slate-200 bg-white p-5 lg:min-h-screen">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand-700">
          <img src="/assets/takapay-mark.svg" alt="" width="30" height="30" /> Takapay
        </Link>
        <p className="mb-4 mt-8 text-xs font-bold uppercase tracking-wider text-slate-400">Workspace</p>
        <nav aria-label="Merchant navigation" className="space-y-1">
          {links.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-700">
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-10 rounded-xl bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} /> Developer docs</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Browse API and integration guidance.</p>
          <Link href="/docs" className="mt-3 inline-block text-xs font-semibold text-brand-700">Open docs →</Link>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="mt-6 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Sign out</button>
        </form>
      </aside>
      {children}
    </div>
  );
}
