"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavPunkt = { href: string; titel: string };

/** Hauptnavigation oder Unter-Reiter. `genau` = Links, die nur auf exakt ihrer Seite aktiv sind. */
export function Navigation({ punkte, genau = ["/"], klein = false }: { punkte: NavPunkt[]; genau?: string[]; klein?: boolean }) {
  const pfad = usePathname();
  return (
    <nav className={`flex flex-wrap gap-1 ${klein ? "mb-5 border-b border-slate-200 pb-3" : ""}`}>
      {punkte.map((p) => {
        const aktiv = genau.includes(p.href) ? pfad === p.href : pfad.startsWith(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              aktiv ? "bg-marke text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {p.titel}
          </Link>
        );
      })}
    </nav>
  );
}
