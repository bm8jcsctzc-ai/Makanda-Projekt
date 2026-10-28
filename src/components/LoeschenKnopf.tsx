"use client";

/** Löschen-Knopf mit Sicherheitsabfrage. `aktion` ist eine Server-Aktion ohne Parameter. */
export function LoeschenKnopf({ aktion, frage }: { aktion: () => Promise<void>; frage: string }) {
  return (
    <form
      action={aktion}
      onSubmit={(e) => {
        if (!confirm(frage)) e.preventDefault();
      }}
    >
      <button className="btn-gefahr">Löschen</button>
    </form>
  );
}
