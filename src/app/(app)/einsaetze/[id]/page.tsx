import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FotoGalerie } from "@/components/FotoGalerie";
import { FotoHochladen } from "@/components/FotoHochladen";
import { Seitenkopf } from "@/components/Seitenkopf";
import { Angaben, HinweisBox, StatusMarke } from "@/components/Status";
import { getDb } from "@/db";
import { anlage, benutzer, checklisteErgebnis, checklisteVorlage, einsatz, foto, kunde } from "@/db/schema";
import { istUuid } from "@/lib/aktionen";
import { benoetigeBenutzer } from "@/lib/auth";
import { formatDatum, formatDatumZeit } from "@/lib/format";
import { ladeFotos } from "@/lib/fotos";
import { adresse, anlagenName, DARF_PLANEN, darfEinsatzBearbeiten, EINSATZARTEN, navigationsLink, pruefeChecklist } from "@/lib/technik";
import { checklisteStarten } from "../checkliste-actions";
import { einsatzAbschliessen, einsatzWiederOeffnen } from "../actions";
import { AbschlussFormular, ChecklisteStartenFormular } from "../Formulare";

export default async function EinsatzSeite({ params }: { params: Promise<{ id: string }> }) {
  const b = await benoetigeBenutzer();
  const { id } = await params;
  if (!istUuid(id)) notFound();
  const db = await getDb();
  const [zeile] = await db
    .select({ e: einsatz, k: kunde, a: anlage, monteur: benutzer.name })
    .from(einsatz)
    .innerJoin(kunde, eq(einsatz.kundeId, kunde.id))
    .leftJoin(anlage, eq(einsatz.anlageId, anlage.id))
    .leftJoin(benutzer, eq(einsatz.monteurId, benutzer.id))
    .where(eq(einsatz.id, id));
  if (!zeile) notFound();
  const { e, k, a, monteur } = zeile;
  const planer = DARF_PLANEN.includes(b.rolle);
  const darf = darfEinsatzBearbeiten(b, e);
  const offen = e.status !== "abgeschlossen";

  const [checklisten, vorlagen, fotos] = await Promise.all([
    db.select().from(checklisteErgebnis).where(eq(checklisteErgebnis.einsatzId, id)).orderBy(asc(checklisteErgebnis.geaendertAm)),
    db.select().from(checklisteVorlage).where(eq(checklisteVorlage.aktiv, true)).orderBy(asc(checklisteVorlage.name)),
    ladeFotos(eq(foto.einsatzId, id)),
  ]);
  // Passende Vorlagen zuerst: bei Wartung die Wartungsliste zum Anlagentyp, sonst die allgemeinen
  const vorschlaege = vorlagen.map((v) => ({
    id: v.id,
    name: v.name,
    empfohlen:
      e.art === "wartung"
        ? v.istWartung && (!a || v.anlagentyp === a.typ)
        : !v.istWartung && (v.anlagentyp == null || v.anlagentyp === a?.typ),
  }));
  const nav = navigationsLink(k);

  return (
    <>
      <Seitenkopf
        titel={`${EINSATZARTEN[e.art]} bei ${k.name}`}
        untertitel={
          <span className="flex flex-wrap items-center gap-2">
            {formatDatum(e.datum)}
            {e.uhrzeit && `, ${e.uhrzeit} Uhr`} · {monteur ?? "kein Monteur zugeteilt"}
            <StatusMarke status={e.status} />
          </span>
        }
        aktionen={planer && <Link className="btn" href={`/einsaetze/${id}/bearbeiten`}>Bearbeiten</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="karte space-y-3">
          <h2 className="font-semibold">Kunde</h2>
          <p>
            <Link className="font-medium text-marke underline" href={`/kunden/${k.id}`}>{k.name}</Link>
            {k.ansprechpartner && <span className="block text-sm text-slate-600">{k.ansprechpartner}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {nav && <a className="btn" href={nav} target="_blank">🧭 {adresse(k)}</a>}
            {k.telefon && <a className="btn" href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`}>📞 {k.telefon}</a>}
          </div>
          <HinweisBox text={k.hinweise} />
        </section>

        <section className="karte space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Auftrag</h2>
          {e.beschreibung ? <p className="whitespace-pre-line">{e.beschreibung}</p> : <p className="text-sm text-slate-500">Keine Beschreibung.</p>}
          {a ? (
            <div className="rounded-lg bg-slate-50 p-3">
              <Link className="font-medium text-marke underline" href={`/anlagen/${a.id}`}>{anlagenName(a)}</Link>
              <div className="mt-2">
                <Angaben
                  werte={[
                    ["Aufstellort", a.aufstellort],
                    ["Baujahr", a.baujahr],
                    ["Seriennummer", a.seriennummer],
                    ["Letzte Wartung", a.letzteWartungAm && formatDatum(a.letzteWartungAm)],
                  ]}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Keine Anlage zugeordnet.{" "}
              <Link className="text-marke underline" href={`/anlagen/neu?kunde=${k.id}`}>Anlage erfassen</Link>
            </p>
          )}
        </section>

        <section className="karte space-y-3 lg:col-span-3">
          <h2 className="font-semibold">Checklisten</h2>
          {checklisten.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {checklisten.map((c) => {
                const p = pruefeChecklist(c.punkte, c.antworten);
                const fertig = c.punkte.filter((x) => c.antworten[x.id]?.wert).length;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link className="font-medium text-marke underline" href={`/einsaetze/${id}/checkliste/${c.id}`}>{c.name}</Link>
                    {c.abgeschlossen ? (
                      p.maengel.length + p.ausserhalb.length ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">⚠ {p.maengel.length + p.ausserhalb.length} auffällig</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">✓ abgeschlossen</span>
                      )
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{fertig} / {c.punkte.length} ausgefüllt</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {darf && offen ? (
            <ChecklisteStartenFormular aktion={checklisteStarten.bind(null, id)} vorlagen={vorschlaege} />
          ) : (
            checklisten.length === 0 && <p className="text-sm text-slate-500">Keine Checklisten.</p>
          )}
        </section>

        <section className="karte space-y-3 lg:col-span-3">
          <h2 className="font-semibold">Fotos</h2>
          {darf && <FotoHochladen kundeId={k.id} einsatzId={id} anlageId={a?.id} />}
          <FotoGalerie fotos={fotos} benutzer={b} />
        </section>

        <section className="karte space-y-3 lg:col-span-3">
          <h2 className="font-semibold">Abschluss</h2>
          {!offen ? (
            <>
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                ✓ Abgeschlossen{e.abgeschlossenAm && ` am ${formatDatumZeit(e.abgeschlossenAm)}`}
              </p>
              {e.abschlussBemerkung && <p className="text-sm whitespace-pre-line">{e.abschlussBemerkung}</p>}
              {planer && (
                <form action={einsatzWiederOeffnen.bind(null, id)}>
                  <button className="btn">Wieder öffnen</button>
                </form>
              )}
            </>
          ) : darf ? (
            <AbschlussFormular aktion={einsatzAbschliessen.bind(null, id)} />
          ) : (
            <p className="text-sm text-slate-500">Nur der zuständige Monteur oder das Büro kann den Einsatz abschließen.</p>
          )}
        </section>
      </div>
    </>
  );
}
