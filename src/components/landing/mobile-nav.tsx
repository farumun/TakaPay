"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type Item = { id: string; label: string; href: string };

export function MobileNav({ links }: { links: Item[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative md:hidden">
      <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-lg border border-slate-200 p-2 text-slate-700">
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>
      {open && <nav aria-label="Mobile navigation" className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-soft">
        {links.map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50">{item.label}</Link>)}
      </nav>}
    </div>
  );
}
