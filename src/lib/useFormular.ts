"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";
import type { FormularZustand } from "./aktionen";
import { fehlertext } from "./api";

type Aktion = (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;

/**
 * Schickt ein Formular an eine Aktion, ohne die Eingaben zu verlieren.
 * (Mit <form action={…}> leert React 19 nach jedem Absenden alle Felder – auch wenn ein Fehler kommt.)
 * Fehler werden als Meldung angezeigt; liefert die Aktion `weiter`, geht es auf diese Seite.
 * Nur bei Erfolg wird das Formular geleert, wenn `leerenBeiErfolg` gesetzt ist.
 */
export function useFormular(
  aktion: Aktion,
  { leerenBeiErfolg = false, vorbereiten }: { leerenBeiErfolg?: boolean; vorbereiten?: (daten: FormData) => Promise<void> } = {},
) {
  const router = useRouter();
  const [zustand, senden, laeuft] = useActionState<FormularZustand, FormData>(async (z, form) => {
    try {
      return await aktion(z, form);
    } catch (e) {
      return { fehler: fehlertext(e) };
    }
  }, undefined);
  const [, startTransition] = useTransition();
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (zustand?.weiter) router.push(zustand.weiter);
    if (leerenBeiErfolg && zustand?.erfolg) formular.current?.reset();
  }, [zustand, leerenBeiErfolg, router]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const daten = new FormData(e.currentTarget);
    startTransition(async () => {
      if (vorbereiten) await vorbereiten(daten);
      // Nach einem await gehört das Absenden in eine eigene Transition (React 19)
      startTransition(() => senden(daten));
    });
  }

  return { zustand, laeuft: laeuft || !!zustand?.weiter, formularProps: { ref: formular, onSubmit } };
}
