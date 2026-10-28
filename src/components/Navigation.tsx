"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavPunkt = { href: string; titel: string };

export function Navigation({ punkte }: { punkte: NavPunkt[] }) {
  const pfad = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {punkte.map((p) => {
        // Der Übersichts-Link soll nur auf genau seiner Seite aktiv sein
        const aktiv = p.href === "/finanzen" ? pfad === p.href : pfad.startsWith(p.href);
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
