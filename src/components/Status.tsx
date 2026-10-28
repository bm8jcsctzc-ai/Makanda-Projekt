import type { Einsatzstatus } from "@/db/schema";
import { EINSATZSTATUS } from "@/lib/technik";

export function StatusMarke({ status }: { status: Einsatzstatus }) {
  const s = EINSATZSTATUS[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.klasse}`}>{s.text}</span>;
}

/** Hinweise für Monteure, gut sichtbar */
export function HinweisBox({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">
      <span className="font-medium">Hinweis: </span>
      {text}
    </p>
  );
}

/** Liste von Angaben (Bezeichnung – Wert); leere Werte werden ausgelassen */
export function Angaben({ werte }: { werte: [string, React.ReactNode][] }) {
  const sichtbar = werte.filter(([, w]) => w != null && w !== "");
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {sichtbar.map(([titel, wert]) => (
        <div key={titel} className="contents">
          <dt className="text-slate-500">{titel}</dt>
          <dd className="break-words">{wert}</dd>
        </div>
      ))}
    </dl>
  );
}
