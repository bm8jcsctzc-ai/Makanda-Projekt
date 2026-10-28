"use client";

import type { FormularZustand } from "@/lib/aktionen";
import { useFormular } from "@/lib/useFormular";

type Aktion = (zustand: FormularZustand, form: FormData) => Promise<FormularZustand>;

export function ChecklisteStartenFormular({ aktion, vorlagen }: { aktion: Aktion; vorlagen: { id: string; name: string; empfohlen: boolean }[] }) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  const empfohlen = vorlagen.filter((v) => v.empfohlen);
  const andere = vorlagen.filter((v) => !v.empfohlen);
  return (
    <form {...formularProps} className="flex flex-wrap items-end gap-2">
      {zustand?.fehler && <p className="fehler-box w-full">{zustand.fehler}</p>}
      <div className="min-w-56 flex-1">
        <label className="feld-label" htmlFor="vorlageId">Checkliste</label>
        <select className="eingabe" id="vorlageId" name="vorlageId" defaultValue={empfohlen[0]?.id ?? ""} required>
          <option value="" disabled>Bitte wählen …</option>
          {empfohlen.length > 0 && (
            <optgroup label="Passend zu diesem Einsatz">
              {empfohlen.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </optgroup>
          )}
          <optgroup label={empfohlen.length ? "Weitere" : "Alle Checklisten"}>
            {andere.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </optgroup>
        </select>
      </div>
      <button className="btn-primaer" disabled={laeuft}>Checkliste starten</button>
    </form>
  );
}

export function AbschlussFormular({ aktion }: { aktion: Aktion }) {
  const { zustand, laeuft, formularProps } = useFormular(aktion);
  return (
    <form {...formularProps} className="space-y-3">
      {zustand?.fehler && <p className="fehler-box">{zustand.fehler}</p>}
      <div>
        <label className="feld-label" htmlFor="bemerkung">Abschlussbemerkung (optional)</label>
        <textarea className="eingabe" id="bemerkung" name="bemerkung" rows={2} placeholder="z. B. Ersatzteil bestellt, Kunde informiert" />
      </div>
      <button className="btn-primaer w-full py-3 sm:w-auto" disabled={laeuft}>✓ Einsatz abschließen</button>
    </form>
  );
}
