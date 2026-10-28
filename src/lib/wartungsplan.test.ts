import { describe, expect, it } from "vitest";
import { erinnerungFaellig, fuelleText, monatsLast, naechsteMonate, wartungsStatus, type ErinnerungsAnlage } from "./wartungsplan";

describe("Wartungsstatus", () => {
  it("unterscheidet überfällig, bald, später und ohne Termin", () => {
    expect(wartungsStatus("2026-10-01", "2026-10-28", 3)).toBe("ueberfaellig");
    expect(wartungsStatus("2026-10-28", "2026-10-28", 3)).toBe("bald");
    expect(wartungsStatus("2027-01-28", "2026-10-28", 3)).toBe("bald");
    expect(wartungsStatus("2027-01-29", "2026-10-28", 3)).toBe("spaeter");
    expect(wartungsStatus(null, "2026-10-28", 3)).toBe("ohne");
  });
});

describe("Häufung", () => {
  const monate = naechsteMonate("2026-10", 12);

  it("liefert 12 Monate über den Jahreswechsel", () => {
    expect(monate[0]).toBe("2026-10");
    expect(monate[3]).toBe("2027-01");
    expect(monate[11]).toBe("2027-09");
  });

  it("erkennt einen Monat mit vielen Wartungen und schlägt Ausweichmonate vor", () => {
    const daten = [
      ...Array(10).fill("2027-03-10"),
      "2027-01-05",
      "2026-11-02",
      "2026-12-01",
      "2027-05-01",
      "2027-06-01",
    ];
    const { monate: last, durchschnitt } = monatsLast(daten, monate, null);
    expect(durchschnitt).toBeCloseTo(15 / 12);
    const maerz = last.find((m) => m.monat === "2027-03")!;
    expect(maerz.anzahl).toBe(10);
    expect(maerz.auffaellig).toBe(true);
    expect(maerz.ausweichen).toEqual(["2027-01", "2027-02"]);
    expect(last.filter((m) => m.auffaellig)).toHaveLength(1);
  });

  it("zählt überfällige Wartungen in den aktuellen Monat", () => {
    const { monate: last } = monatsLast(["2025-05-01", "2026-09-30"], monate, null);
    expect(last[0].anzahl).toBe(2);
  });

  it("warnt bei kleinen Zahlen nicht, aber bei überschrittener Grenze", () => {
    expect(monatsLast(["2027-03-01", "2027-03-02"], monate, null).monate.some((m) => m.auffaellig)).toBe(false);
    const mitGrenze = monatsLast(["2027-03-01", "2027-03-02"], monate, 1).monate.find((m) => m.monat === "2027-03")!;
    expect(mitGrenze.auffaellig).toBe(true);
    expect(mitGrenze.grund).toBe("mehr als 1 Wartung");
  });

  it("verteilt gleichmäßige Wartungen ohne Warnung", () => {
    const gleich = monate.flatMap((m) => [`${m}-05`, `${m}-20`]);
    expect(monatsLast(gleich, monate, null).monate.some((m) => m.auffaellig)).toBe(false);
  });
});

describe("Erinnerungen", () => {
  const basis: ErinnerungsAnlage = {
    anlageId: "a",
    naechsteWartungAm: "2026-12-15",
    kundeEmail: "kunde@example.com",
    kundeErlaubt: true,
    geplant: false,
    erinnertFuer: [],
  };
  it("erinnert innerhalb des Vorlaufs genau einmal pro Fälligkeit", () => {
    expect(erinnerungFaellig(basis, "2026-10-28", 3)).toBe(true);
    expect(erinnerungFaellig({ ...basis, erinnertFuer: ["2026-12-15"] }, "2026-10-28", 3)).toBe(false);
    // Neuer Termin nach der Wartung → wieder erinnern
    expect(erinnerungFaellig({ ...basis, naechsteWartungAm: "2027-12-15", erinnertFuer: ["2026-12-15"] }, "2027-10-01", 3)).toBe(true);
  });
  it("erinnert nicht, wenn zu früh, überfällig oder schon ein Termin geplant ist", () => {
    expect(erinnerungFaellig(basis, "2026-08-01", 3)).toBe(false);
    expect(erinnerungFaellig(basis, "2026-12-16", 3)).toBe(false);
    expect(erinnerungFaellig({ ...basis, geplant: true }, "2026-10-28", 3)).toBe(false);
  });
});

it("füllt Platzhalter und lässt unbekannte stehen", () => {
  expect(fuelleText("Hallo {kunde}, fällig {faellig} {unbekannt}", { kunde: "Familie Schmidt", faellig: "15.12.2026" })).toBe(
    "Hallo Familie Schmidt, fällig 15.12.2026 {unbekannt}",
  );
});
