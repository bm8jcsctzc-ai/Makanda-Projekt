"use client";

export function DruckenKnopf() {
  return (
    <button type="button" className="btn print:hidden" onClick={() => window.print()}>
      Drucken / PDF
    </button>
  );
}
