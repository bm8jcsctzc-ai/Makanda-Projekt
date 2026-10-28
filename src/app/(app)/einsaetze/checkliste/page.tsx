"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { ChecklisteAnsicht } from "@/components/ChecklisteAnsicht";
import { ChecklisteFormular } from "@/components/ChecklisteFormular";
import { DruckenKnopf } from "@/components/DruckenKnopf";
import { Laden, NichtGefunden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Anlage, ChecklisteErgebnis, Einsatz, Kunde } from "@/db/schema";
import { api, fehlertext } from "@/lib/api";
import { useAbfrage, useParam } from "@/lib/daten";
import { formatDatum } from "@/lib/format";
import { pfad } from "@/lib/pfade";
import { useBenoetige } from "@/lib/sitzung";
import { adresse, anlagenName, pruefeChecklist } from "@/lib/technik";

type ChecklisteDaten = {
  c: ChecklisteErgebnis;
  e: Einsatz;
  k: Kunde;
  a: Anlage | null;
  von: string | null;
  bearbeitbar: boolean;
  planer: boolean;
  loeschbar: boolean;
};

function Inhalt() {
  const b = useBenoetige();
  const router = useRouter();
  const id = useParam("id");
  const { daten, fehler, neuLaden } = useAbfrage(() => api<ChecklisteDaten | null>("checkliste", { p_id: id }), [id], !!b && !!id);
  if (!b) return null;
  if (daten === null) return <NichtGefunden was="Die Checkliste" />;
  if (!daten) return <Laden fehler={fehler} />;
  const { c, e, k, a, von, bearbeitbar, planer, loeschbar } = daten;
  const pruefung = pruefeChecklist(c.punkte, c.antworten);
  const auffaellig = pruefung.maengel.length + pruefung.ausserhalb.length;

  async function wiederOeffnen() {
    try {
      await api("checkliste_wieder_oeffnen", { p_id: id });
      neuLaden();
    } catch (err) {
      alert(fehlertext(err));
    }
  }

  return (
    <>
      <p className="mb-2 text-sm print:hidden">
        <Link className="text-marke underline" href={pfad.einsatz(e.id)}>← zurück zum Einsatz</Link>
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
            {c.abgeschlossen && planer && <button className="btn" onClick={wiederOeffnen}>Wieder öffnen</button>}
            {loeschbar && (
              <LoeschenKnopf
                aktion={async () => {
                  await api("checkliste_loeschen", { p_id: id });
                  return pfad.einsatz(e.id);
                }}
                frage="Diese Checkliste mit allen Eingaben löschen?"
              />
            )}
          </div>
        }
      />

      {bearbeitbar ? (
        <ChecklisteFormular ergebnisId={c.id} punkte={c.punkte} start={c.antworten} abgeschlossen={() => router.push(pfad.einsatz(e.id))} />
      ) : (
        <div className="karte">
          {c.abgeschlossen ? (
            <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${auffaellig ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
              {auffaellig
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
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Noch nicht abgeschlossen – nur der zuständige Monteur oder das Büro kann sie ausfüllen.
            </p>
          )}
          <ChecklisteAnsicht punkte={c.punkte} antworten={c.antworten} />
        </div>
      )}
    </>
  );
}

export default function ChecklisteSeite() {
  return <Suspense><Inhalt /></Suspense>;
}
