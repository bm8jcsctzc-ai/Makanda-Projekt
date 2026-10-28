"use client";

import { Navigation, type NavPunkt } from "@/components/Navigation";
import { DARF_BENUTZER } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";
import { DARF_PLANEN } from "@/lib/technik";

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  const b = useBenoetige(DARF_PLANEN);
  if (!b) return null;
  const reiter: NavPunkt[] = [
    { href: "/einstellungen/checklisten/", titel: "Checklisten" },
    { href: "/einstellungen/wartung/", titel: "Betrieb & E-Mails" },
    { href: "/einstellungen/emails/", titel: "E-Mail-Protokoll" },
    ...(DARF_BENUTZER.includes(b.rolle) ? [{ href: "/einstellungen/benutzer/", titel: "Benutzer" }] : []),
  ];
  return (
    <>
      <Navigation punkte={reiter} klein />
      {children}
    </>
  );
}
