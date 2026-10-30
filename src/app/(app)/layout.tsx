"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Laden } from "@/components/Laden";
import { Logo } from "@/components/Logo";
import { Navigation, type NavPunkt } from "@/components/Navigation";
import { EinstellungenSymbol, ProfilSymbol } from "@/components/Symbole";
import { DARF_FINANZEN } from "@/lib/rechte";
import { useSitzung } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";

const symbolKnopf = (aktiv: boolean) =>
  `flex size-10 items-center justify-center rounded-full ${aktiv ? "bg-marke text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profil, angemeldet, laedt } = useSitzung();
  const router = useRouter();
  const pfad = usePathname();

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
          <div className="ml-auto flex items-center gap-1">
            <Link href="/konto/" className={symbolKnopf(pfad.startsWith("/konto"))} title={`Mein Konto (${profil.name})`} aria-label="Mein Konto">
              <ProfilSymbol />
            </Link>
            {planer && (
              <Link href="/einstellungen/" className={symbolKnopf(pfad.startsWith("/einstellungen"))} title="Einstellungen" aria-label="Einstellungen">
                <EinstellungenSymbol />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
