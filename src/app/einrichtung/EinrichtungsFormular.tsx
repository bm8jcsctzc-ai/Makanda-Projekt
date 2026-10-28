"use client";

import { useFormular } from "@/lib/useFormular";
import { ersteinrichtung } from "./actions";

export function EinrichtungsFormular() {
  const { zustand, laeuft, formularProps } = useFormular(ersteinrichtung);
  return (
    <form {...formularProps} className="space-y-4">
      {zustand?.fehler && <p className="fehler-box">{zustand.fehler}</p>}
      <div>
        <label className="feld-label" htmlFor="name">Name</label>
        <input className="eingabe" id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label className="feld-label" htmlFor="email">E-Mail</label>
        <input className="eingabe" id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <label className="feld-label" htmlFor="passwort">Passwort (mind. 10 Zeichen)</label>
        <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <div>
        <label className="feld-label" htmlFor="passwort2">Passwort wiederholen</label>
        <input className="eingabe" id="passwort2" name="passwort2" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <button className="btn-primaer w-full" disabled={laeuft}>
        Zugang anlegen
      </button>
    </form>
  );
}
