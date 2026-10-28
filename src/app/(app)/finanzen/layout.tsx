"use client";

import { Navigation, type NavPunkt } from "@/components/Navigation";
import { DARF_FINANZEN, DARF_GEHAELTER } from "@/lib/rechte";
import { useBenoetige } from "@/lib/sitzung";

export default function FinanzenLayout({ children }: { children: React.ReactNode }) {
  const b = useBenoetige(DARF_FINANZEN);
  if (!b) return null;
  const reiter: NavPunkt[] = [
    { href: "/finanzen/", titel: "Übersicht" },
    { href: "/finanzen/rechnungen/", titel: "Rechnungen" },
    { href: "/finanzen/fixkosten/", titel: "Fixkosten" },
    ...(DARF_GEHAELTER.includes(b.rolle) ? [{ href: "/finanzen/gehaelter/", titel: "Gehälter" }] : []),
  ];
  return (
    <>
      <Navigation punkte={reiter} genau={["/finanzen/"]} klein />
      {children}
    </>
  );
}
