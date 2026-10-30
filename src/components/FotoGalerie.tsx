"use client";

import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import type { Benutzer } from "@/db/schema";
import { api } from "@/lib/api";
import { useAbfrage } from "@/lib/daten";
import { dateienEntfernen, signierteUrls } from "@/lib/dateien";
import { formatDatumZeit } from "@/lib/format";
import { DARF_PLANEN, FOTOKATEGORIEN } from "@/lib/technik";
import type { FotoMitPfad } from "@/lib/typen";

async function fotoLoeschen(id: string) {
  const pfad = await api<string | null>("foto_loeschen", { p_id: id });
  await dateienEntfernen([pfad]);
}

export function FotoGalerie({ fotos, benutzer, nachher }: { fotos: FotoMitPfad[]; benutzer: Benutzer; nachher: () => void }) {
  const pfade = fotos.map((f) => f.pfad);
  const { daten: urls } = useAbfrage(() => signierteUrls(pfade), [pfade.join("|")]);
  if (fotos.length === 0) return <p className="text-sm text-slate-600">Noch keine Fotos.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {fotos.map((f) => {
        const url = urls?.get(f.pfad);
        return (
          <li key={f.id} className="overflow-hidden rounded-lg border border-slate-200 bg-flaeche">
            <a href={url} target="_blank" className="block aspect-[4/3] bg-slate-100">
              {url && (
                // eslint-disable-next-line @next/next/no-img-element -- geschützte Datei mit zeitlich begrenztem Link
                <img src={url} alt={f.beschreibung ?? FOTOKATEGORIEN[f.kategorie]} loading="lazy" className="size-full object-cover" />
              )}
            </a>
            <div className="space-y-1 p-2 text-xs">
              <p className="font-medium text-slate-800">{FOTOKATEGORIEN[f.kategorie]}</p>
              {f.beschreibung && <p className="text-slate-600">{f.beschreibung}</p>}
              <p className="text-slate-500">
                {formatDatumZeit(f.aufgenommenAm)}
                {f.von && ` · ${f.von}`}
              </p>
              {(DARF_PLANEN.includes(benutzer.rolle) || f.aufgenommenVon === benutzer.id) && (
                <LoeschenKnopf aktion={() => fotoLoeschen(f.id)} frage="Dieses Foto wirklich löschen?" klein nachher={nachher} />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
