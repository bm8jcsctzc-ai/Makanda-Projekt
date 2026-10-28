"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fehlertext } from "./api";

/** Lädt Daten beim Öffnen der Seite (und wenn sich `abhaengig` ändert). `aktiv` = erst laden, wenn z. B. die Anmeldung feststeht. */
export function useAbfrage<T>(laden: () => Promise<T>, abhaengig: unknown[], aktiv = true) {
  const [daten, setDaten] = useState<T>();
  const [fehler, setFehler] = useState<string>();
  const [runde, setRunde] = useState(0);

  useEffect(() => {
    if (!aktiv) return;
    let abgebrochen = false;
    laden()
      .then((d) => {
        if (abgebrochen) return;
        setDaten(d);
        setFehler(undefined);
      })
      .catch((e) => !abgebrochen && setFehler(fehlertext(e)));
    return () => {
      abgebrochen = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `laden` ist pro Render neu; neu geladen wird über `abhaengig`
  }, [...abhaengig, runde, aktiv]);

  const neuLaden = useCallback(() => setRunde((r) => r + 1), []);
  return { daten, fehler, neuLaden };
}

/** Wert eines Parameters aus der Adresse, z. B. ?id=… */
export function useParam(name: string): string {
  return useSearchParams().get(name) ?? "";
}
