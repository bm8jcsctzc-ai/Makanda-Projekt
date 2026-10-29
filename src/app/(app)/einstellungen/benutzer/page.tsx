"use client";

import { Laden } from "@/components/Laden";
import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { Seitenkopf } from "@/components/Seitenkopf";
import type { Benutzer, Einladung } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { formatDatumZeit } from "@/lib/format";
import { DARF_BENUTZER, ROLLEN_NAMEN } from "@/lib/rechte";
import { useBenoetige, useSitzung } from "@/lib/sitzung";
import { benutzerAendern, benutzerDatenAendern, einladen, einladungLoeschen, passwortSetzen } from "../aktionen";
import { BenutzerZeile, Einladen } from "./Formulare";

export default function BenutzerVerwaltung() {
  const ich = useBenoetige(DARF_BENUTZER);
  const { neuLaden: sitzungNeuLaden } = useSitzung();
  const { daten, fehler, neuLaden } = useAbfrage(
    () => api<{ benutzer: Benutzer[]; einladungen: Einladung[] }>("benutzer_liste"),
    [],
    !!ich,
  );
  if (!ich) return null;
  return (
    <>
      <Seitenkopf titel="Benutzer" untertitel="Jede Person hat einen eigenen Zugang. Ehemalige Mitarbeiter deaktivieren statt löschen." />
      {!daten ? (
        <Laden fehler={fehler} />
      ) : (
        <>
          <div className="karte mb-6 py-0 sm:py-0">
            {daten.benutzer.map((b) => (
              <BenutzerZeile
                key={b.id}
                benutzer={b}
                aktion={benutzerAendern.bind(null, b.id)}
                datenAendern={async (z, f) => {
                  const r = await benutzerDatenAendern(b.id, z, f);
                  neuLaden();
                  if (b.id === ich.id) await sitzungNeuLaden();
                  return r;
                }}
                passwortSetzen={passwortSetzen.bind(null, b.id)}
                binIchSelbst={b.id === ich.id}
              />
            ))}
          </div>

          {daten.einladungen.length > 0 && (
            <section className="karte mb-6">
              <h2 className="mb-1 font-semibold">Offene Einladungen</h2>
              <p className="mb-3 text-sm text-slate-600">
                Registrieren unter „Mit Einladungscode registrieren“ auf der Anmeldeseite – mit genau dieser E-Mail-Adresse.
              </p>
              <ul className="divide-y divide-slate-100">
                {daten.einladungen.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                    <div className="min-w-48 flex-1">
                      <p className="font-medium">{e.name} <span className="text-sm font-normal text-slate-500">({ROLLEN_NAMEN[e.rolle]})</span></p>
                      <p className="text-sm text-slate-500">{e.email} · seit {formatDatumZeit(e.erstelltAm)}</p>
                    </div>
                    <code className="rounded bg-slate-100 px-2 py-1 font-mono text-base tracking-wider">{e.code}</code>
                    <LoeschenKnopf klein text="Zurückziehen" aktion={() => einladungLoeschen(e.id)} frage={`Einladung für ${e.name} zurückziehen?`} nachher={neuLaden} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <Einladen aktion={einladen} nachher={neuLaden} />
    </>
  );
}
