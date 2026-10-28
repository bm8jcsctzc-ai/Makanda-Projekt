import { asc, count, eq, ilike, min, or } from "drizzle-orm";
import Link from "next/link";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { anlage, kunde } from "@/db/schema";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum } from "@/lib/format";
import { adresse, DARF_PLANEN } from "@/lib/technik";

export default async function Kunden({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const b = await benoetigeBenutzer();
  const { q = "" } = await searchParams;
  const suche = q.trim();
  const db = await getDb();
  const muster = `%${suche.replace(/[\\%_]/g, (z) => `\\${z}`)}%`;
  const liste = await db
    .select({
      k: kunde,
      anlagen: count(anlage.id),
      naechsteWartung: min(anlage.naechsteWartungAm),
    })
    .from(kunde)
    .leftJoin(anlage, eq(anlage.kundeId, kunde.id))
    .where(
      suche
        ? or(ilike(kunde.name, muster), ilike(kunde.ort, muster), ilike(kunde.strasse, muster), ilike(kunde.taifunKundennr, muster))
        : undefined,
    )
    .groupBy(kunde.id)
    .orderBy(asc(kunde.name));

  return (
    <>
      <Seitenkopf
        titel="Kunden"
        aktionen={DARF_PLANEN.includes(b.rolle) && <Link className="btn-primaer" href="/kunden/neu">+ Kunde anlegen</Link>}
      />
      <form className="mb-4 flex gap-2">
        <input className="eingabe" type="search" name="q" defaultValue={suche} placeholder="Suchen nach Name, Ort, Straße, Kundennummer" aria-label="Suche" />
        <button className="btn">Suchen</button>
      </form>
      <div className="karte overflow-x-auto p-0 sm:p-0">
        {liste.length === 0 ? (
          <p className="p-5 text-slate-600">{suche ? "Kein Kunde gefunden." : "Noch keine Kunden angelegt."}</p>
        ) : (
          <table className="tabelle">
            <thead>
              <tr>
                <th>Kunde</th>
                <th className="hidden sm:table-cell">Adresse</th>
                <th className="hidden md:table-cell">Anlagen</th>
                <th>Nächste Wartung</th>
              </tr>
            </thead>
            <tbody>
              {liste.map(({ k, anlagen, naechsteWartung }) => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td>
                    <Link className="font-medium text-marke hover:underline" href={`/kunden/${k.id}`}>{k.name}</Link>
                    <div className="text-xs text-slate-500 sm:hidden">{k.ort}</div>
                  </td>
                  <td className="hidden sm:table-cell">{adresse(k) || "–"}</td>
                  <td className="hidden md:table-cell">{anlagen}</td>
                  <td className="whitespace-nowrap">{formatDatum(naechsteWartung)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
