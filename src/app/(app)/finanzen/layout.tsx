import { Navigation, type NavPunkt } from "@/components/Navigation";
import { benoetigeBenutzer, DARF_FINANZEN, DARF_GEHAELTER } from "@/lib/auth";

export default async function FinanzenLayout({ children }: { children: React.ReactNode }) {
  const b = await benoetigeBenutzer(DARF_FINANZEN);
  const reiter: NavPunkt[] = [
    { href: "/finanzen", titel: "Übersicht" },
    { href: "/finanzen/rechnungen", titel: "Rechnungen" },
    { href: "/finanzen/fixkosten", titel: "Fixkosten" },
    ...(DARF_GEHAELTER.includes(b.rolle) ? [{ href: "/finanzen/gehaelter", titel: "Gehälter" }] : []),
  ];
  return (
    <>
      <Navigation punkte={reiter} genau={["/finanzen"]} klein />
      {children}
    </>
  );
}
