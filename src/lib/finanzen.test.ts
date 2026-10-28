import { describe, expect, it } from "vitest";
import { fixkostenProMonat, istImMonatAktiv, letzteMonate, monatsWerte, nachKategorie, nettoAusBrutto } from "./finanzen";
import { centAlsEingabe, formatDatum, parseEuro } from "./format";

describe("parseEuro", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,5", 123450],
    ["1234.56", 123456],
    ["1.234", 123400],
    ["89", 8900],
    ["  45,00 € ", 4500],
  ])("%s → %i Cent", (eingabe, cent) => expect(parseEuro(eingabe)).toBe(cent));

  it.each(["", "abc", "12,345", "1,2,3"])("lehnt %s ab", (eingabe) => expect(parseEuro(eingabe)).toBeNull());
});

describe("Formatierung", () => {
  it("Cent als Eingabe", () => expect(centAlsEingabe(123456)).toBe("1234,56"));
  it("Datum deutsch", () => expect(formatDatum("2026-10-28")).toBe("28.10.2026"));
});

describe("Finanzlogik", () => {
  it("rechnet Netto aus Brutto", () => {
    expect(nettoAusBrutto(11900, 19)).toBe(10000);
    expect(nettoAusBrutto(10700, 7)).toBe(10000);
    expect(nettoAusBrutto(5000, 0)).toBe(5000);
  });

  it("rechnet Fixkosten auf den Monat um", () => {
    expect(fixkostenProMonat({ betragCent: 120000, intervall: "jaehrlich" })).toBe(10000);
    expect(fixkostenProMonat({ betragCent: 30000, intervall: "vierteljaehrlich" })).toBe(10000);
  });

  it("erkennt Laufzeiten im Monat", () => {
    expect(istImMonatAktiv("2026-10-31", null, "2026-10")).toBe(true);
    expect(istImMonatAktiv("2026-11-01", null, "2026-10")).toBe(false);
    expect(istImMonatAktiv("2025-01-01", "2026-10-01", "2026-10")).toBe(true);
    expect(istImMonatAktiv("2025-01-01", "2026-09-30", "2026-10")).toBe(false);
    expect(istImMonatAktiv("2024-02-01", null, "2024-02")).toBe(true);
  });

  it("liefert die letzten Monate über den Jahreswechsel", () => {
    expect(letzteMonate("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("summiert einen Monat", () => {
    const w = monatsWerte(
      "2026-10",
      [
        { rechnungsdatum: "2026-10-05", bruttoCent: 5000 },
        { rechnungsdatum: "2026-09-30", bruttoCent: 9999 },
      ],
      [{ betragCent: 120000, intervall: "jaehrlich", beginn: "2026-01-01", ende: null }],
      [{ bruttoCent: 300000, arbeitgeberanteilCent: 60000, gueltigAb: "2026-01-01", gueltigBis: null }],
    );
    expect(w).toEqual({ monat: "2026-10", rechnungenCent: 5000, fixkostenCent: 10000, personalCent: 360000, gesamtCent: 375000 });
  });

  it("gruppiert nach Kategorie, größte zuerst", () => {
    const k = nachKategorie(
      "2026-10",
      [
        { rechnungsdatum: "2026-10-05", bruttoCent: 5000, kategorie: "Kraftstoff" },
        { rechnungsdatum: "2026-10-06", bruttoCent: 2000, kategorie: "Kraftstoff" },
      ],
      [{ betragCent: 50000, intervall: "monatlich", beginn: "2026-01-01", ende: null, kategorie: "Fahrzeuge" }],
    );
    expect(k).toEqual([
      { kategorie: "Fahrzeuge", cent: 50000 },
      { kategorie: "Kraftstoff", cent: 7000 },
    ]);
  });
});
