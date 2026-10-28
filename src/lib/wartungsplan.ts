import { plusMonate } from "./technik";

export const STANDARD_BETREFF = "Wartung Ihrer {anlage} – bitte Termin vereinbaren";
export const STANDARD_TEXT = `Guten Tag {kunde},

die nächste Wartung Ihrer {anlage} ist am {faellig} fällig. Eine regelmäßige Wartung sorgt für einen sicheren und sparsamen Betrieb Ihrer Anlage.

Bitte melden Sie sich bei uns, damit wir einen Termin vereinbaren können – telefonisch unter {telefon} oder einfach als Antwort auf diese E-Mail.

Mit freundlichen Grüßen
{firma}`;

export const PLATZHALTER = ["{kunde}", "{anlage}", "{faellig}", "{firma}", "{telefon}"];

/** Ersetzt {platzhalter} im Text */
export function fuelleText(vorlage: string, werte: Record<string, string>): string {
  return vorlage.replace(/\{(\w+)\}/g, (ganz, name: string) => werte[name] ?? ganz);
}

/** Die nächsten `anzahl` Monate ab einschließlich `startMonat` ("YYYY-MM") */
export function naechsteMonate(startMonat: string, anzahl: number): string[] {
  return Array.from({ length: anzahl }, (_, i) => plusMonate(`${startMonat}-01`, i).slice(0, 7));
}

export type WartungsStatus = "ueberfaellig" | "bald" | "spaeter" | "ohne";

/** überfällig · bald (innerhalb des Erinnerungs-Vorlaufs) · später · ohne Termin */
export function wartungsStatus(naechste: string | null, heute: string, vorlaufMonate: number): WartungsStatus {
  if (!naechste) return "ohne";
  if (naechste < heute) return "ueberfaellig";
  if (naechste <= plusMonate(heute, vorlaufMonate)) return "bald";
  return "spaeter";
}

export type MonatsLast = {
  monat: string;
  anzahl: number;
  auffaellig: boolean;
  /** Warum der Monat auffällig ist */
  grund?: string;
  /** Monate davor mit wenig Wartungen, in die man Termine vorziehen kann */
  ausweichen?: string[];
};

const MIN_FUER_HAEUFUNG = 3;

/**
 * Zählt die Wartungen pro Monat und markiert Häufungen.
 * Überfällige Wartungen zählen in den aktuellen (ersten) Monat – sie müssen jetzt erledigt werden.
 * Auffällig ist ein Monat, wenn er mindestens 50 % über dem Durchschnitt liegt (und mindestens 3 Wartungen hat)
 * oder die eingestellte Grenze überschreitet.
 */
export function monatsLast(faelligkeiten: string[], monate: string[], grenze: number | null): { monate: MonatsLast[]; durchschnitt: number } {
  const erster = monate[0];
  const zaehler = new Map(monate.map((m) => [m, 0]));
  for (const datum of faelligkeiten) {
    const monat = datum.slice(0, 7) < erster ? erster : datum.slice(0, 7);
    if (zaehler.has(monat)) zaehler.set(monat, zaehler.get(monat)! + 1);
  }
  const werte = [...zaehler.values()];
  const durchschnitt = werte.reduce((s, x) => s + x, 0) / (werte.length || 1);

  const ergebnis: MonatsLast[] = monate.map((monat) => {
    const anzahl = zaehler.get(monat)!;
    const ueberGrenze = grenze != null && anzahl > grenze;
    const ueberSchnitt = anzahl >= MIN_FUER_HAEUFUNG && anzahl >= durchschnitt * 1.5;
    const grund = ueberGrenze
      ? `mehr als ${grenze} ${grenze === 1 ? "Wartung" : "Wartungen"}`
      : ueberSchnitt
        ? `deutlich über dem Durchschnitt von ${durchschnitt.toLocaleString("de-DE", { maximumFractionDigits: 1 })}`
        : undefined;
    return { monat, anzahl, auffaellig: ueberGrenze || ueberSchnitt, grund };
  });

  // Ausweich-Vorschlag: die bis zu zwei Monate davor, die unter dem Durchschnitt liegen
  ergebnis.forEach((m, i) => {
    if (!m.auffaellig) return;
    m.ausweichen = ergebnis
      .slice(Math.max(0, i - 2), i)
      .filter((v) => !v.auffaellig && v.anzahl < durchschnitt)
      .map((v) => v.monat);
  });
  return { monate: ergebnis, durchschnitt };
}

export type ErinnerungsAnlage = {
  anlageId: string;
  naechsteWartungAm: string | null;
  kundeEmail: string | null;
  kundeErlaubt: boolean;
  /** Ist schon ein Wartungs-Einsatz geplant? */
  geplant: boolean;
  /** Fälligkeitstermine, für die schon erinnert wurde */
  erinnertFuer: string[];
};

/**
 * Welche Anlagen bekommen heute eine Erinnerung?
 * Nur Wartungen, die innerhalb des Vorlaufs fällig werden (nicht überfällige – die stehen in der Büro-Übersicht),
 * für die noch kein Termin geplant ist und für deren Termin noch nicht erinnert wurde.
 */
export function erinnerungFaellig(a: ErinnerungsAnlage, heute: string, vorlaufMonate: number): boolean {
  return (
    a.naechsteWartungAm != null &&
    wartungsStatus(a.naechsteWartungAm, heute, vorlaufMonate) === "bald" &&
    !a.geplant &&
    !a.erinnertFuer.includes(a.naechsteWartungAm)
  );
}
