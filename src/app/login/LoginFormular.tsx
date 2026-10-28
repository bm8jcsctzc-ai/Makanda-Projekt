"use client";

import { useFormular } from "@/lib/useFormular";
import { anmelden } from "./actions";

export function LoginFormular() {
  const { zustand, laeuft, formularProps } = useFormular(anmelden);
  return (
    <form {...formularProps} className="space-y-4">
      {zustand?.fehler && <p className="fehler-box">{zustand.fehler}</p>}
      <div>
        <label className="feld-label" htmlFor="email">E-Mail</label>
        <input className="eingabe" id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <label className="feld-label" htmlFor="passwort">Passwort</label>
        <input className="eingabe" id="passwort" name="passwort" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn-primaer w-full" disabled={laeuft}>
        {laeuft ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}
