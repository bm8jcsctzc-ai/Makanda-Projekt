import Link from "next/link";
import { formatDatum } from "@/lib/format";
import { EINSATZARTEN } from "@/lib/technik";
import type { ladeKonflikte } from "@/lib/urlaub-daten";

/** Hinweise zu gleichzeitig abwesenden Kollegen und geplanten Einsätzen */
export function Konflikte({ konflikte, teamGroesse }: { konflikte: Awaited<ReturnType<typeof ladeKonflikte>>; teamGroesse: number }) {
  const { andere, einsaetze } = konflikte;
  if (andere.length === 0 && einsaetze.length === 0) {
    return <p className="text-sm text-green-700">✓ Keine Überschneidungen mit Kollegen oder geplanten Einsätzen.</p>;
  }
  const personen = new Set(andere.map((a) => a.name));
  return (
    <div className="space-y-2 text-sm">
      {andere.length > 0 && (
        <div className={`rounded-lg border p-3 ${personen.size + 1 >= teamGroesse / 2 ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <p className="font-medium">
            Gleichzeitig abwesend: {personen.size} von {teamGroesse - 1} Kollegen
          </p>
          <ul className="mt-1 list-disc pl-5">
            {andere.map((a) => (
              <li key={a.id}>
                {a.name}: {formatDatum(a.von)} – {formatDatum(a.bis)}
                {a.status === "beantragt" && " (beantragt)"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {einsaetze.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
          <p className="font-medium">⚠ {einsaetze.length} geplante Einsätze in diesem Zeitraum – bitte umplanen:</p>
          <ul className="mt-1 list-disc pl-5">
            {einsaetze.map((e) => (
              <li key={e.id}>
                <Link className="underline" href={`/einsaetze/${e.id}`}>
                  {formatDatum(e.datum)} · {EINSATZARTEN[e.art]} bei {e.kunde}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
