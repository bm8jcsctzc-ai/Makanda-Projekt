"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";
import type { FormularZustand } from "./aktionen";

type Aktion = (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;

/**
 * Schickt ein Formular an eine Server-Aktion, ohne die Eingaben zu verlieren.
 * (Mit <form action={…}> leert React 19 nach jedem Absenden alle Felder – auch wenn ein Fehler kommt.)
 * Nur bei Erfolg wird das Formular geleert, wenn `leerenBeiErfolg` gesetzt ist.
 */
export function useFormular(
  aktion: Aktion,
  { leerenBeiErfolg = false, vorbereiten }: { leerenBeiErfolg?: boolean; vorbereiten?: (daten: FormData) => Promise<void> } = {},
) {
  const [zustand, senden, laeuft] = useActionState(aktion, undefined);
  const [, startTransition] = useTransition();
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (leerenBeiErfolg && zustand?.erfolg) formular.current?.reset();
  }, [zustand, leerenBeiErfolg]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    startTransition(async () => {
      if (vorbereiten) await vorbereiten(daten);
      // Nach einem await gehört das Absenden in eine eigene Transition (React 19)
      startTransition(() => senden(daten));
    });
  }

  return { zustand, laeuft, formularProps: { ref: formular, onSubmit } };
}
