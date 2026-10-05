import Link from "next/link";
import { asString, getBrandContent, getNavigation, getSystemSetting, safeContentHref } from "@/lib/cms";

const footerGroups = [
  { location: "footer-products", label: "Products" },
  { location: "footer-resources", label: "Resources" },
  { location: "footer-company", label: "Company" },
  { location: "footer-support", label: "Support" },
] as const;

export async function Footer({ tagline }: { tagline: string }) {
  const [brand, social, legal, ...groups] = await Promise.all([
    getBrandContent(),
    getSystemSetting("social"),
    getNavigation("footer"),
    ...footerGroups.map(({ location }) => getNavigation(location)),
  ]);
  const validSocialLinks = Object.entries(social)
    .map(([network, href]) => ({ network, href: safeContentHref(href, "") }))
    .filter((item) => item.href);

  return (
    <footer className="bg-black text-white">
      <div aria-hidden="true" className="h-3 bg-gradient-to-r from-blue-950 via-blue-600 to-sky-300" />
      <div className="container-shell py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div className="lg:border-r lg:border-white/15 lg:pr-8">
            <Link href="/" className="text-2xl font-extrabold tracking-tight text-sky-400">
              {asString(brand.name, "Takapay")}<span className="text-blue-300">.</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">{tagline}</p>
            {validSocialLinks.length > 0 && (
              <nav aria-label="Social media links" className="mt-5 flex flex-wrap gap-3">
                {validSocialLinks.map(({ network, href }) => (
                  <a key={network} href={href} aria-label={network} rel="noopener noreferrer" target="_blank" className="grid h-9 min-w-9 place-items-center rounded-full bg-white/10 px-2 text-xs font-bold uppercase text-slate-300 transition hover:bg-white/20 hover:text-white">
                    {network.slice(0, 2)}
                  </a>
                ))}
              </nav>
            )}
          </div>
          {footerGroups.map((group, index) => (
            <nav key={group.location} aria-label={`${group.label} footer links`}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-white">{group.label}</h2>
              <ul className="mt-5 space-y-3">
                {groups[index].map((item) => (
                  <li key={item.id}>
                    <Link href={safeContentHref(item.href, "/")} className="text-sm text-slate-400 transition hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-sm text-slate-400">
          <span>© {new Date().getFullYear()} {asString(brand.name, "Takapay")}</span>
          {legal.map((item) => (
            <Link key={item.id} href={safeContentHref(item.href, "/")} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
        <div aria-hidden="true" className="mt-12 select-none overflow-hidden bg-gradient-to-r from-blue-900 via-sky-500 to-sky-200 bg-clip-text text-center text-[18vw] font-black leading-[0.78] tracking-[-0.08em] text-transparent">
          {asString(brand.name, "Takapay")}
        </div>
      </div>
    </footer>
  );
}
