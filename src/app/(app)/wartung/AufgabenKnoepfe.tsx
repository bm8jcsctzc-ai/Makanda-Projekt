"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { FormularZustand } from "@/lib/aktionen";
import { aufgabeStarten } from "./actions";

export function AufgabenKnoepfe({ testmodus }: { testmodus: boolean }) {
  const [meldung, setMeldung] = useState<FormularZustand>();
  const [laeuft, startTransition] = useTransition();
  const starten = (aufgabe: "erinnerungen" | "wochenbericht") =>
    startTransition(async () => setMeldung(await aufgabeStarten(aufgabe)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={laeuft} onClick={() => starten("erinnerungen")}>Erinnerungen jetzt prüfen</button>
        <button type="button" className="btn" disabled={laeuft} onClick={() => starten("wochenbericht")}>Wochenbericht jetzt senden</button>
      </div>
      {laeuft && <p className="text-sm text-slate-600">Läuft …</p>}
      {meldung?.erfolg && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {meldung.erfolg}
          {testmodus && (
            <>
              {" "}(Testmodus – <Link className="underline" href="/einstellungen/emails">E-Mails ansehen</Link>)
            </>
          )}
        </p>
      )}
    </div>
  );
}
