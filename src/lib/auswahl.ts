import type { Anlage } from "@/db/schema";
import { api } from "./api";
import { anlagenName } from "./technik";

type Roh = {
  kunden: { id: string; name: string; ort: string | null }[];
  anlagen: Anlage[];
  mitarbeiter: { id: string; name: string }[];
  abwesenheiten: { benutzerId: string; von: string; bis: string; status: string }[];
};

/** Auswahllisten für das Einsatz-Formular */
export async function einsatzAuswahl() {
  const r = await api<Roh>("einsatz_auswahl");
  return {
    kunden: r.kunden.map((k) => ({ id: k.id, name: k.ort ? `${k.name} (${k.ort})` : k.name })),
    anlagen: r.anlagen.map((a) => ({ id: a.id, kundeId: a.kundeId, name: anlagenName(a) })),
    mitarbeiter: r.mitarbeiter,
    abwesenheiten: r.abwesenheiten,
  };
}
