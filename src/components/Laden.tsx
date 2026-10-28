/** Platzhalter, solange Daten geladen werden – oder die Fehlermeldung */
export function Laden({ fehler }: { fehler?: string }) {
  if (fehler) return <p className="fehler-box">{fehler}</p>;
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Lädt">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-32 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="h-32 animate-pulse rounded-xl bg-slate-200/50" />
    </div>
  );
}

export function NichtGefunden({ was }: { was: string }) {
  return <p className="karte text-slate-600">{was} wurde nicht gefunden oder schon gelöscht.</p>;
}
