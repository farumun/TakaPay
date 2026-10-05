import Link from "next/link";
import { auth, signOut } from "../../../auth";
import { redirect } from "next/navigation";

export default async function PendingReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <img src="/assets/takapay-mark.svg" alt="" width="48" height="48" className="mx-auto" />
        <h1 className="mt-5 text-2xl font-bold">Your account is under review</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Your email or phone has been verified. A Takapay administrator must approve the merchant account before payment and dashboard features are available.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold">Return to home</Link>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="ml-3 mt-6 text-sm font-semibold text-brand-700">Sign out</button></form>
      </section>
    </main>
  );
}
