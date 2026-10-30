// Kleine Strich-Symbole (24×24), Farbe folgt der Schrift
const strich = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function ProfilSymbol({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...strich}>
      <circle cx="12" cy="12" r="9.25" />
      <circle cx="12" cy="10" r="3.25" />
      <path d="M6.2 18.2c1.3-2.2 3.4-3.4 5.8-3.4s4.5 1.2 5.8 3.4" />
    </svg>
  );
}

export function EinstellungenSymbol({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...strich}>
      <path d="M10.3 3.6a1.7 1.7 0 0 1 3.4 0l.2 1.1a1.7 1.7 0 0 0 2.5 1.1l1-.6a1.7 1.7 0 0 1 2.4 2.4l-.6 1a1.7 1.7 0 0 0 1.1 2.5l1.1.2a1.7 1.7 0 0 1 0 3.4l-1.1.2a1.7 1.7 0 0 0-1.1 2.5l.6 1a1.7 1.7 0 0 1-2.4 2.4l-1-.6a1.7 1.7 0 0 0-2.5 1.1l-.2 1.1a1.7 1.7 0 0 1-3.4 0l-.2-1.1a1.7 1.7 0 0 0-2.5-1.1l-1 .6a1.7 1.7 0 0 1-2.4-2.4l.6-1a1.7 1.7 0 0 0-1.1-2.5l-1.1-.2a1.7 1.7 0 0 1 0-3.4l1.1-.2a1.7 1.7 0 0 0 1.1-2.5l-.6-1a1.7 1.7 0 0 1 2.4-2.4l1 .6a1.7 1.7 0 0 0 2.5-1.1z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
