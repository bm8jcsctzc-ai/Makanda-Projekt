import { LoeschenKnopf } from "@/components/LoeschenKnopf";
import { fotoLoeschen } from "@/app/(app)/fotos/actions";
import type { Benutzer, Foto } from "@/db/schema";
import { formatDatumZeit } from "@/lib/format";
import { FOTOKATEGORIEN, DARF_PLANEN } from "@/lib/technik";

export type GalerieFoto = Foto & { von: string | null };

export function FotoGalerie({ fotos, benutzer }: { fotos: GalerieFoto[]; benutzer: Benutzer }) {
  if (fotos.length === 0) return <p className="text-sm text-slate-600">Noch keine Fotos.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {fotos.map((f) => (
        <li key={f.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <a href={`/dateien/${f.dateiId}`} target="_blank" className="block aspect-[4/3] bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- geschützte Datei, keine Bildoptimierung nötig */}
            <img src={`/dateien/${f.dateiId}`} alt={f.beschreibung ?? FOTOKATEGORIEN[f.kategorie]} loading="lazy" className="size-full object-cover" />
          </a>
          <div className="space-y-1 p-2 text-xs">
            <p className="font-medium text-slate-800">{FOTOKATEGORIEN[f.kategorie]}</p>
            {f.beschreibung && <p className="text-slate-600">{f.beschreibung}</p>}
            <p className="text-slate-500">
              {formatDatumZeit(f.aufgenommenAm)}
              {f.von && ` · ${f.von}`}
            </p>
            {(DARF_PLANEN.includes(benutzer.rolle) || f.aufgenommenVon === benutzer.id) && (
              <LoeschenKnopf aktion={fotoLoeschen.bind(null, f.id)} frage="Dieses Foto wirklich löschen?" klein />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
