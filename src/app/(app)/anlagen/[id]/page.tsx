import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FotoGalerie } from "@/components/FotoGalerie";
import { FotoHochladen } from "@/components/FotoHochladen";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben, StatusMarke } from "@/components/Status";
import { getDb } from "@/db";
import { anlage, benutzer, checklisteErgebnis, einsatz, foto, kunde } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum, heute } from "@/lib/format";
import { ladeFotos } from "@/lib/fotos";
import { anlagenName, ANLAGENTYPEN, EINSATZARTEN, pruefeChecklist } from "@/lib/technik";

export default async function Anlagenakte({ params }: { params: Promise<{ id: string }> }) {
  const b = await benoetigeBenutzer();
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [zeile] = await db.select({ a: anlage, k: kunde }).from(anlage).innerJoin(kunde, eq(anlage.kundeId, kunde.id)).where(eq(anlage.id, id));
  if (!zeile) notFound();
  const { a, k } = zeile;

  const [fotos, checklisten, einsaetze] = await Promise.all([
    ladeFotos(eq(foto.anlageId, id)),
    db
      .select({ c: checklisteErgebnis, datum: einsatz.datum, von: benutzer.name })
      .from(checklisteErgebnis)
      .innerJoin(einsatz, eq(checklisteErgebnis.einsatzId, einsatz.id))
      .leftJoin(benutzer, eq(checklisteErgebnis.ausgefuelltVon, benutzer.id))
      .where(eq(checklisteErgebnis.anlageId, id))
      .orderBy(desc(einsatz.datum)),
    db.select().from(einsatz).where(eq(einsatz.anlageId, id)).orderBy(desc(einsatz.datum)).limit(20),
  ]);
  const ueberfaellig = a.naechsteWartungAm != null && a.naechsteWartungAm < heute();

  return (
    <>
      <Seitenkopf
        titel={anlagenName(a)}
        untertitel={<>bei <Link className="text-marke underline" href={`/kunden/${k.id}`}>{k.name}</Link></>}
        aktionen={<Link className="btn" href={`/anlagen/${id}/bearbeiten`}>Bearbeiten</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="karte lg:col-span-2">
          <h2 className="mb-3 font-semibold">Technische Daten</h2>
          <Angaben
            werte={[
              ["Art", ANLAGENTYPEN[a.typ]],
              ["Hersteller", a.hersteller],
              ["Modell / Typ", a.modell],
              ["Seriennummer", a.seriennummer],
              ["Baujahr", a.baujahr],
              ["Leistung", a.leistungKw && `${a.leistungKw} kW`],
              ["Kältemittel", a.kaeltemittel && `${a.kaeltemittel}${a.kaeltemittelKg ? `, ${a.kaeltemittelKg} kg` : ""}`],
              ["Aufstellort", a.aufstellort],
              ["Notiz", a.notiz && <span className="whitespace-pre-line">{a.notiz}</span>],
            ]}
          />
        </section>

        <section className={`karte ${ueberfaellig ? "border-red-200 bg-red-50" : ""}`}>
          <h2 className="mb-3 font-semibold">Wartung</h2>
          <Angaben
            werte={[
              ["Intervall", `alle ${a.wartungsintervallMonate} Monate`],
              ["Letzte", formatDatum(a.letzteWartungAm)],
              ["Nächste", <span key="n" className={ueberfaellig ? "font-semibold text-red-700" : ""}>{formatDatum(a.naechsteWartungAm)}{ueberfaellig && " – überfällig"}</span>],
            ]}
          />
        </section>

        <section className="karte space-y-3 lg:col-span-3">
          <h2 className="font-semibold">Fotos</h2>
          <FotoHochladen kundeId={k.id} anlageId={a.id} standardKategorie="typenschild" />
          <FotoGalerie fotos={fotos} benutzer={b} />
        </section>

        <section className="karte lg:col-span-2">
          <h2 className="mb-3 font-semibold">Checklisten & Messwerte</h2>
          {checklisten.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Checklisten zu dieser Anlage.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {checklisten.map(({ c, datum, von }) => {
                const p = pruefeChecklist(c.punkte, c.antworten);
                const auffaellig = p.maengel.length + p.ausserhalb.length;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link className="text-marke hover:underline" href={`/einsaetze/${c.einsatzId}/checkliste/${c.id}`}>
                      {formatDatum(datum)} · {c.name}
                    </Link>
                    <span className="flex items-center gap-2 text-slate-500">
                      {von}
                      {!c.abgeschlossen ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">offen</span>
                      ) : auffaellig ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">⚠ {auffaellig} auffällig</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">✓ alles i. O.</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="karte">
          <h2 className="mb-3 font-semibold">Einsätze</h2>
          {einsaetze.length === 0 ? (
            <p className="text-sm text-slate-600">Noch keine Einsätze.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {einsaetze.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <Link className="text-marke hover:underline" href={`/einsaetze/${e.id}`}>
                    {formatDatum(e.datum)} · {EINSATZARTEN[e.art]}
                  </Link>
                  <StatusMarke status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
