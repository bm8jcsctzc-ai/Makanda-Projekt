import type { Fixkosten, Personalkosten, Rechnung } from "@/db/schema";
import { api } from "./api";

export type RechnungMitDatei = Rechnung & { dateiPfad: string | null; dateiName: string | null };

/** Rechnungen, Fixkosten und (nur für den Inhaber) Gehälter */
export function ladeFinanzen() {
  return api<{ rechnungen: RechnungMitDatei[]; fixkosten: Fixkosten[]; personal: Personalkosten[] | null }>("finanz_daten");
}
