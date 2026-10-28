import type { Abwesenheit, Anlage, ChecklisteErgebnis, ChecklisteVorlage, Einsatz, Foto, Kunde } from "@/db/schema";

// Formen der Antworten aus den Datenbank-Funktionen (siehe 0002_funktionen.sql)

export type EinsatzZeile = { e: Einsatz; k: Kunde; a: Anlage | null; monteur: string | null };

export type FotoMitPfad = Foto & { pfad: string; von: string | null };

export type WartungsZeile = {
  a: Anlage;
  k: Kunde;
  /** Datum des nächsten geplanten Wartungs-Einsatzes, falls vorhanden */
  geplantAm: string | null;
  /** Wann für den aktuellen Fälligkeitstermin erinnert wurde */
  erinnertAm: Date | null;
  /** Alle Fälligkeitstermine, für die schon erinnert wurde */
  erinnertFuer: string[];
};

export type EinsatzDetail = EinsatzZeile & {
  darf: boolean;
  planer: boolean;
  checklisten: ChecklisteErgebnis[];
  vorlagen: ChecklisteVorlage[];
  fotos: FotoMitPfad[];
  abwesend: { status: string } | null;
};

/** Abwesenheit im Kalender; `art` fehlt, wenn der Betrachter den Grund nicht sehen darf */
export type AbwesenheitImKalender = Pick<Abwesenheit, "id" | "benutzerId" | "von" | "bis" | "halbtags" | "status"> & {
  name: string;
  art: Abwesenheit["art"] | null;
};

export type TeamMitglied = { id: string; name: string; rolle: string; imTeam: boolean; urlaubstageProJahr: number };
