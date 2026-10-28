import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { personalkosten } from "@/db/schema";
import { benoetigeBenutzer, DARF_GEHAELTER } from "@/lib/auth";
import { istImMonatAktiv, personalkostenGesamt } from "@/lib/finanzen";
import { formatDatum, formatEuro, heute } from "@/lib/format";

export default async function Gehaelter() {
  await benoetigeBenutzer(DARF_GEHAELTER);
  const db = await getDb();
  const alle = await db
    .select()
    .from(personalkosten)
    .orderBy(asc(personalkosten.mitarbeiter), desc(personalkosten.gueltigAb));
  const monat = heute().slice(0, 7);
  const aktuell = alle.filter((p) => istImMonatAktiv(p.gueltigAb, p.gueltigBis, monat));
  const summe = (feld: (p: (typeof alle)[number]) => number) => aktuell.reduce((s, p) => s + feld(p), 0);

  return (
    <>
      <Seitenkopf
        titel="Gehälter"
        untertitel="Nur für den Inhaber sichtbar. Die Lohnabrechnung selbst macht weiter der Steuerberater."
        aktionen={<Link className="btn-primaer" href="/finanzen/gehaelter/neu">+ Gehalt eintragen</Link>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="karte">
          <p className="text-sm text-slate-600">Brutto gesamt / Monat</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEuro(summe((p) => p.bruttoCent))}</p>
        </div>
        <div className="karte">
          <p className="text-sm text-slate-600">Arbeitgeberanteile / Monat</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEuro(summe((p) => p.arbeitgeberanteilCent))}</p>
        </div>
        <div className="karte">
          <p className="text-sm text-slate-600">Personalkosten / Monat</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatEuro(summe(personalkostenGesamt))}</p>
        </div>
      </div>

      <div className="karte overflow-x-auto p-0 sm:p-0">
        {alle.length === 0 ? (
          <p className="p-5 text-slate-600">Noch keine Gehälter eingetragen.</p>
        ) : (
          <table className="tabelle">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th className="betrag">Brutto</th>
                <th className="betrag hidden sm:table-cell">AG-Anteil</th>
                <th className="betrag">Kosten gesamt</th>
                <th className="hidden md:table-cell">Gültig</th>
              </tr>
            </thead>
            <tbody>
              {alle.map((p) => {
                const istAktuell = aktuell.includes(p);
                return (
                  <tr key={p.id} className={istAktuell ? "hover:bg-slate-50" : "text-slate-400 hover:bg-slate-50"}>
                    <td>
                      <Link className="font-medium text-marke hover:underline" href={`/finanzen/gehaelter/${p.id}`}>{p.mitarbeiter}</Link>
                      {p.funktion && <div className="text-xs text-slate-500">{p.funktion}</div>}
                      {!istAktuell && <div className="text-xs">nicht aktuell</div>}
                    </td>
                    <td className="betrag">{formatEuro(p.bruttoCent)}</td>
                    <td className="betrag hidden sm:table-cell">{formatEuro(p.arbeitgeberanteilCent)}</td>
                    <td className="betrag font-medium">{formatEuro(personalkostenGesamt(p))}</td>
                    <td className="hidden whitespace-nowrap md:table-cell">
                      ab {formatDatum(p.gueltigAb)}
                      {p.gueltigBis && ` bis ${formatDatum(p.gueltigBis)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
