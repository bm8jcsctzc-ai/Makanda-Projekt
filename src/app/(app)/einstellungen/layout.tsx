import { Navigation, type NavPunkt } from "@/components/Navigation";
import { benoetigeBenutzer, DARF_BENUTZER } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";

export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  const b = await benoetigeBenutzer(DARF_PLANEN);
  const reiter: NavPunkt[] = [
    { href: "/einstellungen/checklisten", titel: "Checklisten" },
    { href: "/einstellungen/wartung", titel: "Wartung & E-Mails" },
    { href: "/einstellungen/emails", titel: "E-Mail-Protokoll" },
    ...(DARF_BENUTZER.includes(b.rolle) ? [{ href: "/einstellungen/benutzer", titel: "Benutzer" }] : []),
  ];
  return (
    <>
      <Navigation punkte={reiter} klein />
      {children}
    </>
  );
}
