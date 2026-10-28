import type { Rolle } from "@/db/schema";

export const ROLLEN_NAMEN: Record<Rolle, string> = {
  inhaber: "Inhaber",
  buero: "Büro",
  monteur: "Monteur",
};

// Was die Oberfläche anzeigt. Durchgesetzt werden die Rechte in der Datenbank (0002_funktionen.sql).
export const DARF_FINANZEN: Rolle[] = ["inhaber", "buero"];
export const DARF_GEHAELTER: Rolle[] = ["inhaber"];
export const DARF_BENUTZER: Rolle[] = ["inhaber"];
