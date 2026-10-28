"use client";

/** Löschen-Knopf mit Sicherheitsabfrage. `aktion` ist eine Server-Aktion ohne Parameter. */
export function LoeschenKnopf({ aktion, frage, klein = false }: { aktion: () => Promise<void>; frage: string; klein?: boolean }) {
  return (
    <form
      action={aktion}
      onSubmit={(e) => {
        if (!confirm(frage)) e.preventDefault();
      }}
    >
      <button className={klein ? "text-red-700 underline" : "btn-gefahr"}>Löschen</button>
    </form>
  );
}
