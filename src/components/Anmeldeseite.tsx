export function Anmeldeseite({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-lg font-semibold text-marke">Makanda</p>
        <div className="karte">
          <h1 className="mb-4 text-xl font-semibold">{titel}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Meldung({ fehler, erfolg }: { fehler?: string; erfolg?: string }) {
  if (fehler) return <p className="fehler-box">{fehler}</p>;
  if (erfolg) return <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{erfolg}</p>;
  return null;
}
