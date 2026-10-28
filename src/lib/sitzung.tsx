"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Benutzer, Rolle } from "@/db/schema";
import { api } from "./api";
import { supabase } from "./supabase";

type Sitzung = {
  /** Profil des angemeldeten Benutzers; null = nicht angemeldet oder (noch) nicht freigeschaltet */
  profil: Benutzer | null;
  angemeldet: boolean;
  laedt: boolean;
  neuLaden: () => Promise<void>;
  abmelden: () => Promise<void>;
};

const Kontext = createContext<Sitzung | null>(null);

export function SitzungsAnbieter({ children }: { children: React.ReactNode }) {
  const [profil, setProfil] = useState<Benutzer | null>(null);
  const [angemeldet, setAngemeldet] = useState(false);
  const [laedt, setLaedt] = useState(true);

  const neuLaden = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setAngemeldet(Boolean(data.session));
    setProfil(data.session ? await api<Benutzer | null>("ich").catch(() => null) : null);
    setLaedt(false);
  }, []);

  useEffect(() => {
    neuLaden();
    const { data } = supabase.auth.onAuthStateChange((ereignis) => {
      if (ereignis === "SIGNED_IN" || ereignis === "SIGNED_OUT") setTimeout(neuLaden, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [neuLaden]);

  const abmelden = useCallback(async () => {
    await supabase.auth.signOut();
    setProfil(null);
    setAngemeldet(false);
  }, []);

  return <Kontext.Provider value={{ profil, angemeldet, laedt, neuLaden, abmelden }}>{children}</Kontext.Provider>;
}

export function useSitzung(): Sitzung {
  const s = useContext(Kontext);
  if (!s) throw new Error("useSitzung außerhalb von SitzungsAnbieter");
  return s;
}

/** Für Seiten: leitet zur Startseite, wenn die Rolle nicht passt. Gibt das Profil zurück, sobald es feststeht. */
export function useBenoetige(erlaubteRollen?: Rolle[]): Benutzer | null {
  const { profil, laedt } = useSitzung();
  const router = useRouter();
  const erlaubt = !!profil && (!erlaubteRollen || erlaubteRollen.includes(profil.rolle));
  useEffect(() => {
    if (!laedt && profil && !erlaubt) router.replace("/");
  }, [laedt, profil, erlaubt, router]);
  return erlaubt ? profil : null;
}
