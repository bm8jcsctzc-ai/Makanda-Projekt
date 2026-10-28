import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecklisteAnsicht } from "@/components/ChecklisteAnsicht";
import { ChecklisteFormular } from "@/components/ChecklisteFormular";
import { DruckenKnopf } from "@/components/DruckenKnopf";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import { getDb } from "@/db";
import { anlage, benutzer, checklisteErgebnis, einsatz, kunde } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum } from "@/lib/format";
import { adresse, anlagenName, DARF_PLANEN, darfEinsatzBearbeiten, pruefeChecklist } from "@/lib/technik";
import { checklisteLoeschen, checklisteWiederOeffnen } from "../../../checkliste-actions";

export default async function ChecklisteSeite({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const b = await benoetigeBenutzer();
  const { id, cid } = await params;
  if (!istUuid(id) || !istUuid(cid)) notFound();
  const db = await getDb();
  const [zeile] = await db
    .select({ c: checklisteErgebnis, e: einsatz, k: kunde, a: anlage, von: benutzer.name })
    .from(checklisteErgebnis)
    .innerJoin(einsatz, eq(checklisteErgebnis.einsatzId, einsatz.id))
    .innerJoin(kunde, eq(einsatz.kundeId, kunde.id))
    .leftJoin(anlage, eq(checklisteErgebnis.anlageId, anlage.id))
    .leftJoin(benutzer, eq(checklisteErgebnis.ausgefuelltVon, benutzer.id))
    .where(eq(checklisteErgebnis.id, cid));
  if (!zeile || zeile.e.id !== id) notFound();
  const { c, e, k, a, von } = zeile;
  const bearbeitbar = !c.abgeschlossen && darfEinsatzBearbeiten(b, e);
  const planer = DARF_PLANEN.includes(b.rolle);
  const pruefung = pruefeChecklist(c.punkte, c.antworten);

  return (
    <>
      <p className="mb-2 text-sm print:hidden">
        <Link className="text-marke underline" href={`/einsaetze/${id}`}>← zurück zum Einsatz</Link>
      </p>
      <Seitenkopf
        titel={c.name}
        untertitel={
          <>
            {k.name}
            {adresse(k) && `, ${adresse(k)}`}
            <br />
            {a && <>{anlagenName(a)}{a.seriennummer && `, SN ${a.seriennummer}`}<br /></>}
            {formatDatum(e.datum)}
            {von && ` · ${von}`}
          </>
        }
        aktionen={
          <div className="flex flex-wrap gap-2 print:hidden">
            {c.abgeschlossen && <DruckenKnopf />}
            {c.abgeschlossen && planer && (
              <form action={checklisteWiederOeffnen.bind(null, c.id)}>
                <button className="btn">Wieder öffnen</button>
              </form>
            )}
            {(planer || bearbeitbar) && (
              <LoeschenKnopf aktion={checklisteLoeschen.bind(null, c.id)} frage="Diese Checkliste mit allen Eingaben löschen?" />
            )}
          </div>
        }
      />

      {bearbeitbar ? (
        <ChecklisteFormular ergebnisId={c.id} punkte={c.punkte} start={c.antworten} />
      ) : (
        <div className="karte">
          {c.abgeschlossen ? (
            <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${pruefung.maengel.length + pruefung.ausserhalb.length ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
              {pruefung.maengel.length + pruefung.ausserhalb.length
                ? `⚠ ${[
                    pruefung.maengel.length && `${pruefung.maengel.length} ${pruefung.maengel.length === 1 ? "Mangel" : "Mängel"}`,
                    pruefung.ausserhalb.length &&
                      `${pruefung.ausserhalb.length} ${pruefung.ausserhalb.length === 1 ? "Messwert" : "Messwerte"} außerhalb des Richtwerts`,
                  ]
                    .filter(Boolean)
                    .join(", ")}`
                : "✓ Alle Punkte in Ordnung"}
            </p>
          ) : (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Noch nicht abgeschlossen – nur der zuständige Monteur oder das Büro kann sie ausfüllen.</p>
          )}
          <ChecklisteAnsicht punkte={c.punkte} antworten={c.antworten} />
        </div>
      )}
    </>
  );
}
