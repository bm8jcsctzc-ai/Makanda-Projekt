"use client";

import { useRef, useState } from "react";
import { api, fehlertext } from "@/lib/api";
import { verkleinern } from "@/lib/bild";
import { dateiHochladen } from "@/lib/dateien";
import { FOTOKATEGORIEN } from "@/lib/technik";

type Props = {
  kundeId: string;
  einsatzId?: string;
  anlageId?: string | null;
  standardKategorie?: string;
  /** Nach dem Hochladen, z. B. Galerie neu laden */
  fertig: () => void;
};

export function FotoHochladen({ kundeId, einsatzId, anlageId, standardKategorie = "vorher", fertig }: Props) {
  const eingabe = useRef<HTMLInputElement>(null);
  const [kategorie, setKategorie] = useState(standardKategorie);
  const [beschreibung, setBeschreibung] = useState("");
  const [fortschritt, setFortschritt] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function hochladen(dateien: FileList | null) {
    if (!dateien?.length) return;
    setFehler(null);
    const liste = [...dateien];
    for (const [i, original] of liste.entries()) {
      setFortschritt(`Foto ${i + 1} von ${liste.length} wird hochgeladen …`);
      try {
        const dateiId = await dateiHochladen(await verkleinern(original), "technik");
        await api("foto_speichern", {
          p_datei_id: dateiId,
          p_kunde_id: kundeId,
          p_einsatz_id: einsatzId ?? null,
          p_anlage_id: anlageId ?? null,
          p_kategorie: kategorie,
          p_beschreibung: beschreibung || null,
        });
      } catch (e) {
        setFehler(fehlertext(e));
        break;
      }
    }
    setFortschritt(null);
    setBeschreibung("");
    if (eingabe.current) eingabe.current.value = "";
    fertig();
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="feld-label" htmlFor="foto-kategorie">Art des Fotos</label>
          <select className="eingabe" id="foto-kategorie" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
            {Object.entries(FOTOKATEGORIEN).map(([wert, name]) => <option key={wert} value={wert}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="feld-label" htmlFor="foto-beschreibung">Beschreibung (optional)</label>
          <input className="eingabe" id="foto-beschreibung" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
        </div>
      </div>
      {fehler && <p className="fehler-box">{fehler}</p>}
      <label className={`btn-primaer w-full cursor-pointer py-3 ${fortschritt ? "pointer-events-none opacity-60" : ""}`}>
        📷 {fortschritt ?? "Foto aufnehmen oder auswählen"}
        <input
          ref={eingabe}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={!!fortschritt}
          onChange={(e) => hochladen(e.target.files)}
          data-testid="foto-eingabe"
        />
      </label>
    </div>
  );
}
