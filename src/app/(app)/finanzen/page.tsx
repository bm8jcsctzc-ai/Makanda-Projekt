import { asc } from "drizzle-orm";
import Link from "next/link";
import { KostenVerlauf } from "@/components/KostenVerlauf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { fixkosten, personalkosten, rechnung } from "@/db/schema";
import { benoetigeBenutzer, DARF_FINANZEN, DARF_GEHAELTER } from "@/lib/auth";
import { letzteMonate, monatsWerte, nachKategorie } from "@/lib/finanzen";
import { formatDatum, formatEuro, formatMonat, heute } from "@/lib/format";

function Kennzahl({ titel, cent, vormonat, hinweis }: { titel: string; cent: number; vormonat?: number; hinweis?: string }) {
  const diff = vormonat != null ? cent - vormonat : null;
  return (
    <div className="karte">
      <p className="text-sm text-slate-600">{titel}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEuro(cent)}</p>
      {diff != null && diff !== 0 && (
        <p className="mt-1 text-xs text-slate-500">
          {diff > 0 ? "▲" : "▼"} {formatEuro(Math.abs(diff))} {diff > 0 ? "mehr" : "weniger"} als im Vormonat
        </p>
      )}
      {hinweis && <p className="mt-1 text-xs text-slate-500">{hinweis}</p>}
    </div>
  );
}

export default async function FinanzUebersicht({ searchParams }: { searchParams: Promise<{ monat?: string }> }) {
  const b = await benoetigeBenutzer(DARF_FINANZEN);
  const mitPersonal = DARF_GEHAELTER.includes(b.rolle);
  const stichtag = heute();
  const { monat: monatParam } = await searchParams;
  const monat = monatParam && /^\d{4}-\d{2}$/.test(monatParam) ? monatParam : stichtag.slice(0, 7);

  const db = await getDb();
  const [rechnungen, fix, personal] = await Promise.all([
    db.select().from(rechnung).orderBy(asc(rechnung.faelligAm)),
    db.select().from(fixkosten),
    mitPersonal ? db.select().from(personalkosten) : Promise.resolve(null),
  ]);

  const verlauf = letzteMonate(monat, 12).map((m) => monatsWerte(m, rechnungen, fix, personal));
  const dieser = verlauf[verlauf.length - 1];
  const vor = verlauf[verlauf.length - 2];
  const kategorien = nachKategorie(monat, rechnungen, fix);
  const groessteKategorie = kategorien[0]?.cent ?? 0;

  const offen = rechnungen.filter((r) => !r.bezahltAm);
  const ueberfaellig = offen.filter((r) => r.faelligAm && r.faelligAm < stichtag);
  const bald = offen.filter((r) => !ueberfaellig.includes(r)).slice(0, 5);
  const leer = rechnungen.length === 0 && fix.length === 0 && !personal?.length;

  return (
    <>
      <Seitenkopf
        titel="Finanzübersicht"
        untertitel={`Kosten im ${formatMonat(monat)}`}
        aktionen={
          <form className="flex gap-2">
            <input className="eingabe w-auto" type="month" name="monat" defaultValue={monat} aria-label="Monat" />
            <button className="btn">Anzeigen</button>
          </form>
        }
      />

      {leer && (
        <div className="karte mb-4 border-marke/30 bg-blue-50">
          <p className="font-medium">So geht&apos;s los</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li><Link className="text-marke underline" href="/finanzen/fixkosten/neu">Fixkosten eintragen</Link> – Miete, Leasing, Versicherungen, Software …</li>
            <li><Link className="text-marke underline" href="/finanzen/rechnungen/neu">Rechnungen erfassen</Link> – als PDF oder Handyfoto hochladen</li>
            {mitPersonal && <li><Link className="text-marke underline" href="/finanzen/gehaelter/neu">Gehälter eintragen</Link></li>}
          </ol>
        </div>
      )}

      <div className={`mb-4 grid gap-3 sm:grid-cols-2 ${mitPersonal ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <Kennzahl titel="Kosten gesamt" cent={dieser.gesamtCent} vormonat={vor.gesamtCent} />
        <Kennzahl titel="Rechnungen" cent={dieser.rechnungenCent} vormonat={vor.rechnungenCent} />
        <Kennzahl titel="Fixkosten" cent={dieser.fixkostenCent} hinweis="auf den Monat umgerechnet" />
        {mitPersonal && <Kennzahl titel="Personal" cent={dieser.personalCent} hinweis="Brutto + Arbeitgeberanteile" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="karte lg:col-span-2">
          <h2 className="mb-3 font-semibold">Kosten im Verlauf</h2>
          <KostenVerlauf werte={verlauf} mitPersonal={mitPersonal} />
        </section>

        <section className="karte">
          <h2 className="mb-3 font-semibold">Offene Rechnungen</h2>
          {offen.length === 0 ? (
            <p className="text-sm text-slate-600">Alles bezahlt. 👍</p>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                {offen.length} offen · <strong>{formatEuro(offen.reduce((s, r) => s + r.bruttoCent, 0))}</strong>
              </p>
              {ueberfaellig.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">⚠ {ueberfaellig.length} überfällig</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {ueberfaellig.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2">
                        <Link className="truncate text-red-900 underline" href={`/finanzen/rechnungen/${r.id}`}>{r.lieferant}</Link>
                        <span className="whitespace-nowrap tabular-nums">{formatEuro(r.bruttoCent)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {bald.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {bald.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <Link className="truncate text-marke underline" href={`/finanzen/rechnungen/${r.id}`}>{r.lieferant}</Link>
                      <span className="whitespace-nowrap text-slate-500">
                        {r.faelligAm ? `fällig ${formatDatum(r.faelligAm)}` : "ohne Fälligkeit"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="mt-3 inline-block text-sm text-marke underline" href="/finanzen/rechnungen?status=offen">alle offenen ansehen</Link>
            </>
          )}
        </section>

        <section className="karte lg:col-span-3">
          <h2 className="mb-3 font-semibold">Wofür im {formatMonat(monat)}? <span className="font-normal text-slate-500">(Rechnungen + Fixkosten, ohne Personal)</span></h2>
          {kategorien.length === 0 ? (
            <p className="text-sm text-slate-600">Für diesen Monat gibt es noch keine Kosten.</p>
          ) : (
            <ul className="space-y-2">
              {kategorien.map((k) => (
                <li
                  key={k.kategorie}
                  className="grid grid-cols-[1fr_7rem] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[12rem_1fr_7rem]"
                >
                  <span className="truncate text-slate-700">{k.kategorie}</span>
                  <span className="order-last col-span-2 h-3 rounded-r bg-slate-100 sm:order-none sm:col-span-1">
                    <span
                      className="block h-3 rounded-r"
                      style={{ width: `${Math.max(1, (k.cent / groessteKategorie) * 100)}%`, background: "#2a78d6" }}
                    />
                  </span>
                  <span className="text-right tabular-nums">{formatEuro(k.cent)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
