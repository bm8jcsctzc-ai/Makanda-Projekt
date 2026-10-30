"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Laden } from "@/components/Laden";
import { Logo } from "@/components/Logo";
import { Navigation, type NavPunkt } from "@/components/Navigation";
import { DARF_FINANZEN, ROLLEN_NAMEN } from "@/lib/rechte";
import { useSitzung } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profil, angemeldet, laedt, abmelden } = useSitzung();
  const router = useRouter();

  useEffect(() => {
    if (!laedt && !profil) router.replace("/login/");
  }, [laedt, profil, angemeldet, router]);

  if (!profil) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Laden />
      </main>
    );
  }

  const planer = DARF_PLANEN.includes(profil.rolle);
  const punkte: NavPunkt[] = [
    { href: "/", titel: "Heute" },
    ...(planer ? [{ href: "/einsaetze/", titel: "Einsätze" }, { href: "/wartung/", titel: "Wartung" }] : []),
    { href: "/kunden/", titel: "Kunden" },
    { href: "/urlaub/", titel: "Urlaub" },
    ...(DARF_FINANZEN.includes(profil.rolle) ? [{ href: "/finanzen/", titel: "Finanzen" }] : []),
    ...(planer ? [{ href: "/einstellungen/", titel: "Einstellungen" }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-flaeche print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:gap-x-6">
          <Link href="/" aria-label="Startseite" className="shrink-0">
            <Logo hoehe={36} />
          </Link>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <Navigation punkte={punkte} />
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/konto/" className="text-slate-600 hover:text-slate-900">
              {profil.name} <span className="text-slate-400">· {ROLLEN_NAMEN[profil.rolle]}</span>
            </Link>
            <button className="text-slate-600 underline hover:text-slate-900" onClick={() => abmelden().then(() => router.replace("/login/"))}>
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
