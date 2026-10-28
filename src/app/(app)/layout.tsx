import { abmelden } from "@/app/login/actions";
import { Navigation, type NavPunkt } from "@/components/Navigation";
import { benoetigeBenutzer, DARF_BENUTZER, DARF_FINANZEN, DARF_GEHAELTER, ROLLEN_NAMEN } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const b = await benoetigeBenutzer();
  const punkte: NavPunkt[] = [];
  if (DARF_FINANZEN.includes(b.rolle)) {
    punkte.push(
      { href: "/finanzen", titel: "Übersicht" },
      { href: "/finanzen/rechnungen", titel: "Rechnungen" },
      { href: "/finanzen/fixkosten", titel: "Fixkosten" },
    );
  }
  if (DARF_GEHAELTER.includes(b.rolle)) punkte.push({ href: "/finanzen/gehaelter", titel: "Gehälter" });
  if (DARF_BENUTZER.includes(b.rolle)) punkte.push({ href: "/einstellungen/benutzer", titel: "Benutzer" });

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-marke">Makanda</span>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <Navigation punkte={punkte} />
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {b.name} <span className="text-slate-400">· {ROLLEN_NAMEN[b.rolle]}</span>
            </span>
            <form action={abmelden}>
              <button className="text-slate-600 underline hover:text-slate-900">Abmelden</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
