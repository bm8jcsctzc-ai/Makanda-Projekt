"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fehlertext } from "@/lib/api";

/**
 * Löschen-Knopf mit Sicherheitsabfrage. `aktion` löscht und gibt optional die Seite zurück, auf die es danach geht;
 * sonst wird `nachher` aufgerufen (z. B. Daten neu laden).
 */
export function LoeschenKnopf({
  aktion,
  frage,
  klein = false,
  text = "Löschen",
  nachher,
}: {
  aktion: () => Promise<string | void>;
  frage: string;
  klein?: boolean;
  text?: string;
  nachher?: () => void;
}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string>();
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        className={klein ? "text-left text-red-700 underline" : "btn-gefahr"}
        disabled={laeuft}
        onClick={async () => {
          if (!confirm(frage)) return;
          setLaeuft(true);
          setFehler(undefined);
          try {
            const weiter = await aktion();
            if (weiter) router.push(weiter);
            else nachher?.();
          } catch (e) {
            setFehler(fehlertext(e));
          }
          setLaeuft(false);
        }}
      >
        {laeuft ? "…" : text}
      </button>
      {fehler && <span className="text-sm text-red-700">{fehler}</span>}
    </span>
  );
}
