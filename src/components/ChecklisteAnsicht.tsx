import type { Antwort, Pruefpunkt } from "@/db/schema";
import { istAusserhalb } from "@/lib/technik";

const PRUEF_TEXT: Record<string, { text: string; klasse: string }> = {
  io: { text: "✓ i. O.", klasse: "text-green-700" },
  nio: { text: "✗ nicht i. O.", klasse: "font-semibold text-red-700" },
  entfaellt: { text: "entfällt", klasse: "text-slate-500" },
};

/** Ausgefüllte Checkliste zum Lesen und Drucken */
export function ChecklisteAnsicht({ punkte, antworten }: { punkte: Pruefpunkt[]; antworten: Record<string, Antwort> }) {
  return (
    <ol className="divide-y divide-slate-100">
      {punkte.map((p, i) => {
        const a = antworten[p.id] ?? {};
        const ausserhalb = istAusserhalb(p, a.wert);
        let wert: React.ReactNode = <span className="text-slate-400">–</span>;
        if (a.wert && p.typ === "pruefung") {
          const t = PRUEF_TEXT[a.wert];
          wert = <span className={t?.klasse}>{t?.text ?? a.wert}</span>;
        } else if (a.wert && p.typ === "messwert") {
          wert = (
            <span className={ausserhalb ? "font-semibold text-red-700" : ""}>
              {a.wert} {p.einheit}
              {ausserhalb && " ⚠"}
            </span>
          );
        } else if (a.wert) {
          wert = <span className="whitespace-pre-line">{a.wert}</span>;
        }
        return (
          <li key={p.id} className="grid gap-1 py-2 text-sm sm:grid-cols-[1fr_14rem] sm:gap-4">
            <span>
              <span className="mr-1 text-slate-400">{i + 1}.</span>
              {p.text}
            </span>
            <span>{wert}</span>
            {a.bemerkung && <span className="text-slate-600 italic sm:col-span-2">Bemerkung: {a.bemerkung}</span>}
          </li>
        );
      })}
    </ol>
  );
}
