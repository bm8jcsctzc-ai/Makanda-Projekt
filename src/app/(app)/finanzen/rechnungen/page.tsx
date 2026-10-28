import { desc } from "drizzle-orm";
import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { rechnung, type Rechnung } from "@/db/schema";
import { benoetigeBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { KATEGORIEN, nettoAusBrutto } from "@/lib/finanzen";
import { formatDatum, formatEuro, formatMonat, heute } from "@/lib/format";
import { alsBezahltMarkieren } from "./actions";

type Status = "offen" | "ueberfaellig" | "bezahlt";

function statusVon(r: Rechnung, stichtag: string): Status {
  if (r.bezahltAm) return "bezahlt";
  return r.faelligAm && r.faelligAm < stichtag ? "ueberfaellig" : "offen";
}

const STATUS_ANZEIGE: Record<Status, { text: string; klasse: string }> = {
  bezahlt: { text: "bezahlt", klasse: "bg-green-100 text-green-800" },
  offen: { text: "offen", klasse: "bg-amber-100 text-amber-800" },
  ueberfaellig: { text: "überfällig", klasse: "bg-red-100 text-red-800" },
};

type Filter = { monat?: string; kategorie?: string; status?: string };

export default async function Rechnungen({ searchParams }: { searchParams: Promise<Filter> }) {
  await benoetigeBenutzer(DARF_FINANZEN);
  const filter = await searchParams;
  const stichtag = heute();
  const db = await getDb();
  const alle = await db.select().from(rechnung).orderBy(desc(rechnung.rechnungsdatum), desc(rechnung.erstelltAm));

  const monat = filter.monat && /^\d{4}-\d{2}$/.test(filter.monat) ? filter.monat : "";
  const liste = alle.filter(
    (r) =>
      (!monat || r.rechnungsdatum.startsWith(monat)) &&
      (!filter.kategorie || r.kategorie === filter.kategorie) &&
      (!filter.status || statusVon(r, stichtag) === filter.status),
  );
  const summe = liste.reduce((s, r) => s + r.bruttoCent, 0);
  const summeNetto = liste.reduce((s, r) => s + nettoAusBrutto(r.bruttoCent, r.mwstSatz), 0);
  const gefiltert = Boolean(monat || filter.kategorie || filter.status);

  return (
    <>
      <Seitenkopf
        titel="Rechnungen"
        untertitel="Eingangsrechnungen von Lieferanten, Werkstatt, Versicherung usw."
        aktionen={<Link className="btn-primaer" href="/finanzen/rechnungen/neu">+ Rechnung erfassen</Link>}
      />

      <form className="karte mb-4 grid gap-3 sm:grid-cols-4 sm:items-end">
        <div>
          <label className="feld-label" htmlFor="monat">Monat</label>
          <input className="eingabe" id="monat" name="monat" type="month" defaultValue={monat} />
        </div>
        <div>
          <label className="feld-label" htmlFor="kategorie">Kategorie</label>
          <select className="eingabe" id="kategorie" name="kategorie" defaultValue={filter.kategorie ?? ""}>
            <option value="">alle</option>
            {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="feld-label" htmlFor="status">Status</label>
          <select className="eingabe" id="status" name="status" defaultValue={filter.status ?? ""}>
            <option value="">alle</option>
            <option value="offen">offen</option>
            <option value="ueberfaellig">überfällig</option>
            <option value="bezahlt">bezahlt</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primaer">Filtern</button>
          {gefiltert && <Link className="btn" href="/finanzen/rechnungen">Zurücksetzen</Link>}
        </div>
      </form>

      <div className="karte overflow-x-auto p-0 sm:p-0">
        {liste.length === 0 ? (
          <p className="p-5 text-slate-600">
            {alle.length === 0 ? "Noch keine Rechnungen erfasst." : "Keine Rechnungen für diesen Filter."}
          </p>
        ) : (
          <table className="tabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Lieferant</th>
                <th className="hidden md:table-cell">Kategorie</th>
                <th className="betrag hidden sm:table-cell">Netto</th>
                <th className="betrag">Brutto</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Datei</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => {
                const status = statusVon(r, stichtag);
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap">{formatDatum(r.rechnungsdatum)}</td>
                    <td>
                      <Link className="font-medium text-marke hover:underline" href={`/finanzen/rechnungen/${r.id}`}>
                        {r.lieferant}
                      </Link>
                      {r.rechnungsnummer && <div className="text-xs text-slate-500">Nr. {r.rechnungsnummer}</div>}
                    </td>
                    <td className="hidden md:table-cell">{r.kategorie}</td>
                    <td className="betrag hidden sm:table-cell">{formatEuro(nettoAusBrutto(r.bruttoCent, r.mwstSatz))}</td>
                    <td className="betrag font-medium">{formatEuro(r.bruttoCent)}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_ANZEIGE[status].klasse}`}>
                        {STATUS_ANZEIGE[status].text}
                      </span>
                      {status !== "bezahlt" && (
                        <>
                          {r.faelligAm && <div className="mt-1 text-xs text-slate-500">fällig {formatDatum(r.faelligAm)}</div>}
                          <form action={alsBezahltMarkieren.bind(null, r.id)}>
                            <button className="mt-1 text-xs text-marke underline">als bezahlt markieren</button>
                          </form>
                        </>
                      )}
                    </td>
                    <td className="hidden sm:table-cell">
                      {r.dateiId ? (
                        <a className="text-marke underline" href={`/dateien/${r.dateiId}`} target="_blank">ansehen</a>
                      ) : (
                        <span className="text-slate-400">–</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={2} className="px-3 py-2">
                  Summe ({liste.length} {liste.length === 1 ? "Rechnung" : "Rechnungen"}
                  {monat ? `, ${formatMonat(monat)}` : ""})
                </td>
                <td className="hidden md:table-cell" />
                <td className="betrag hidden px-3 py-2 sm:table-cell">{formatEuro(summeNetto)}</td>
                <td className="betrag px-3 py-2">{formatEuro(summe)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
