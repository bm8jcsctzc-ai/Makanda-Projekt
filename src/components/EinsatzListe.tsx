import Link from "next/link";
import { StatusMarke } from "@/components/Status";
import { pfad } from "@/lib/pfade";
import { anlagenName, EINSATZARTEN } from "@/lib/technik";
import type { EinsatzZeile } from "@/lib/typen";

/** Einsätze als antippbare Karten (für Handy und PC) */
export function EinsatzListe({ zeilen, mitMonteur = true }: { zeilen: EinsatzZeile[]; mitMonteur?: boolean }) {
  return (
    <ul className="space-y-2">
      {zeilen.map(({ e, k, a, monteur }) => (
        <li key={e.id}>
          <Link
            href={pfad.einsatz(e.id)}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-flaeche p-3 shadow-sm hover:border-marke/40 hover:bg-blue-50/40"
          >
            <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-slate-700">{e.uhrzeit ?? "–"}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{k.name}</span>
              <span className="block text-sm text-slate-600">
                {EINSATZARTEN[e.art]}
                {a && ` · ${anlagenName(a)}`}
                {k.ort && ` · ${k.ort}`}
              </span>
              {e.beschreibung && <span className="mt-0.5 block truncate text-sm text-slate-500">{e.beschreibung}</span>}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-slate-500">
              <StatusMarke status={e.status} />
              {mitMonteur && (monteur ?? <span className="text-amber-700">kein Monteur</span>)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
