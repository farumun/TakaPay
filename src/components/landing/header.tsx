import Link from "next/link";
import { asString, getBrandContent, getNavigation, safeContentHref } from "@/lib/cms";
import { MobileNav } from "@/components/landing/mobile-nav";

export async function Header() {
  const [links, brand] = await Promise.all([getNavigation("header"), getBrandContent()]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="container-shell flex h-16 items-center justify-between py-4">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-brand-700">
          {asString(brand.name, "Takapay")}<span className="text-brand-500">.</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {links.map((item) => (
            <Link key={item.id} href={safeContentHref(item.href, "/")} className="text-sm font-medium text-slate-600 transition hover:text-brand-600">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <MobileNav links={links.map((item) => ({ ...item, href: safeContentHref(item.href, "/") }))} />
          <Link href={safeContentHref(brand.signInHref, "/login")} className="hidden px-3 py-2 text-sm font-semibold text-slate-700 sm:inline-flex">
            {asString(brand.signInLabel, "Sign In")}
          </Link>
          <Link href={safeContentHref(brand.primaryCtaHref, "/register")} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
            {asString(brand.primaryCtaLabel, "Get Started")}
          </Link>
        </div>
      </div>
    </header>
  );
}
