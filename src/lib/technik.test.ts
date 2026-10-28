import { describe, expect, it } from "vitest";
import type { Pruefpunkt } from "@/db/schema";
import { START_VORLAGEN } from "./checklisten-vorlagen";
import { anlagenName, darfEinsatzBearbeiten, istAusserhalb, parseZahl, plusMonate, pruefeChecklist } from "./technik";

const punkte: Pruefpunkt[] = [
  { id: "a", text: "Sichtprüfung", typ: "pruefung", pflicht: true },
  { id: "b", text: "Gasdruck", typ: "messwert", einheit: "mbar", min: 18, max: 25, pflicht: true },
  { id: "c", text: "Hinweise", typ: "text", pflicht: false },
];

describe("Checkliste prüfen", () => {
  it("meldet fehlende Pflichtpunkte", () => {
    expect(pruefeChecklist(punkte, {}).fehlend.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("erkennt Mängel, ungültige und auffällige Messwerte", () => {
    const e = pruefeChecklist(punkte, { a: { wert: "nio" }, b: { wert: "30" } });
    expect(e.fehlend).toEqual([]);
    expect(e.maengel.map((p) => p.id)).toEqual(["a"]);
    expect(e.ausserhalb.map((p) => p.id)).toEqual(["b"]);
    expect(pruefeChecklist(punkte, { a: { wert: "io" }, b: { wert: "zwanzig" } }).ungueltig.map((p) => p.id)).toEqual(["b"]);
  });

  it("akzeptiert Komma als Dezimaltrenner", () => {
    expect(parseZahl("1,5")).toBe(1.5);
    expect(istAusserhalb(punkte[1], "20,5")).toBe(false);
    expect(istAusserhalb(punkte[1], "17,9")).toBe(true);
  });
});

describe("Wartungsdatum", () => {
  it("addiert Monate, auch am Monatsende", () => {
    expect(plusMonate("2026-10-28", 12)).toBe("2027-10-28");
    expect(plusMonate("2026-01-31", 1)).toBe("2026-02-28");
    expect(plusMonate("2026-11-15", 3)).toBe("2027-02-15");
  });
});

describe("Rechte", () => {
  it("Monteur darf nur eigene Einsätze bearbeiten", () => {
    expect(darfEinsatzBearbeiten({ id: "m1", rolle: "monteur" }, { monteurId: "m1" })).toBe(true);
    expect(darfEinsatzBearbeiten({ id: "m1", rolle: "monteur" }, { monteurId: "m2" })).toBe(false);
    expect(darfEinsatzBearbeiten({ id: "b1", rolle: "buero" }, { monteurId: "m2" })).toBe(true);
  });
});

describe("Start-Vorlagen", () => {
  it("haben eindeutige Punkt-IDs und sinnvolle Grenzwerte", () => {
    for (const v of START_VORLAGEN) {
      const ids = v.punkte.map((p) => p.id);
      expect(new Set(ids).size, v.name).toBe(ids.length);
      for (const p of v.punkte) {
        if (p.min != null && p.max != null) expect(p.min, `${v.name}: ${p.text}`).toBeLessThan(p.max);
      }
    }
  });
});

it("benennt Anlagen", () => {
  expect(anlagenName({ typ: "gas", hersteller: "Viessmann", modell: "Vitodens 200" })).toBe("Viessmann Vitodens 200 (Gasheizung)");
  expect(anlagenName({ typ: "klima" })).toBe("Klimaanlage");
});
