import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "../../../auth";
import { db } from "@/lib/db";

const links = [
  ["Overview", "/admin"],
  ["CMS", "/admin/cms"],
  ["Gateways & fees", "/admin/gateways"],
  ["Merchants", "/admin/merchants"],
  ["KYC review", "/admin/kyc"],
  ["Global settings", "/admin/settings"],
  ["Audit log", "/admin/audit"],
];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user?.id || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) redirect("/login");
  const administrator = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true, status: true } });
  if (!administrator || administrator.status !== "ACTIVE" || !["SUPER_ADMIN", "SUB_ADMIN"].includes(administrator.role)) redirect("/login");
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-r border-slate-200 bg-white p-5">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-brand-700">Takapay admin</Link>
        <nav className="mt-8 space-y-1" aria-label="Admin navigation">
          {links.map(([label, href]) => <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-700">{label}</Link>)}
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="mt-8 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Sign out</button>
        </form>
      </aside>
      {children}
    </div>
  );
}
