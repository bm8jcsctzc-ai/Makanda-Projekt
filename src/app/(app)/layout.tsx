import { abmelden } from "@/app/login/actions";
import { Navigation, type NavPunkt } from "@/components/Navigation";
import { benoetigeBenutzer, DARF_FINANZEN, ROLLEN_NAMEN } from "@/lib/auth";
import { DARF_PLANEN } from "@/lib/technik";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const b = await benoetigeBenutzer();
  const planer = DARF_PLANEN.includes(b.rolle);
  const punkte: NavPunkt[] = [
    { href: "/", titel: "Heute" },
    ...(planer ? [{ href: "/einsaetze", titel: "Einsätze" }, { href: "/wartung", titel: "Wartung" }] : []),
    { href: "/kunden", titel: "Kunden" },
    { href: "/urlaub", titel: "Urlaub" },
    ...(DARF_FINANZEN.includes(b.rolle) ? [{ href: "/finanzen", titel: "Finanzen" }] : []),
    ...(planer ? [{ href: "/einstellungen", titel: "Einstellungen" }] : []),
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white print:hidden">
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
