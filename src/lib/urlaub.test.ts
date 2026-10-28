import { describe, expect, it } from "vitest";
import { feiertag, feiertage, istArbeitstag, ostersonntag } from "./feiertage";
import { arbeitstage, konto, ueberschneidet } from "./urlaub";

describe("Feiertage", () => {
  it("berechnet Ostern richtig", () => {
    expect(ostersonntag(2024)).toBe("2024-03-31");
    expect(ostersonntag(2025)).toBe("2025-04-20");
    expect(ostersonntag(2026)).toBe("2026-04-05");
    expect(ostersonntag(2027)).toBe("2027-03-28");
  });

  it("kennt bewegliche Feiertage 2026", () => {
    expect(feiertag("2026-04-03", null)).toBe("Karfreitag");
    expect(feiertag("2026-05-14", null)).toBe("Christi Himmelfahrt");
    expect(feiertag("2026-05-25", null)).toBe("Pfingstmontag");
    expect(feiertag("2026-06-04", "NW")).toBe("Fronleichnam");
    expect(feiertag("2026-11-18", "SN")).toBe("Buß- und Bettag");
  });

  it("unterscheidet Bundesländer", () => {
    expect(feiertag("2026-10-31", "NI")).toBe("Reformationstag");
    expect(feiertag("2026-10-31", "BY")).toBeNull();
    expect(feiertag("2026-11-01", "BY")).toBe("Allerheiligen");
    expect(feiertag("2026-06-04", "NI")).toBeNull();
    expect(feiertag("2026-01-06", "BW")).toBe("Heilige Drei Könige");
  });

  it("ohne Bundesland nur bundesweite Feiertage", () => {
    expect(feiertage(2026, null).size).toBe(9);
    expect(feiertage(2026, "BY").size).toBe(13);
    expect(feiertage(2026, "NI").size).toBe(10);
  });

  it("Wochenende und Feiertage sind keine Arbeitstage", () => {
    expect(istArbeitstag("2026-10-30", "NI")).toBe(true); // Freitag
    expect(istArbeitstag("2026-10-31", "NI")).toBe(false); // Samstag
    expect(istArbeitstag("2026-12-25", "NI")).toBe(false);
  });
});

describe("Arbeitstage", () => {
  it("zählt eine Woche ohne Feiertag als 5 Tage", () => {
    expect(arbeitstage({ von: "2026-08-10", bis: "2026-08-16", halbtags: false }, "NI")).toBe(5);
  });
  it("zieht Feiertage ab", () => {
    // Osterwoche: Karfreitag und Ostermontag frei
    expect(arbeitstage({ von: "2026-03-30", bis: "2026-04-10", halbtags: false }, "NI")).toBe(8);
    // 1. Mai ist ein Freitag
    expect(arbeitstage({ von: "2026-04-27", bis: "2026-05-01", halbtags: false }, "NI")).toBe(4);
  });
  it("halber Tag", () => {
    expect(arbeitstage({ von: "2026-08-12", bis: "2026-08-12", halbtags: true }, "NI")).toBe(0.5);
  });
  it("teilt Urlaub über den Jahreswechsel auf", () => {
    const a = { von: "2026-12-28", bis: "2027-01-08", halbtags: false };
    expect(arbeitstage(a, "NI", 2026)).toBe(4); // 28.–31.12.
    expect(arbeitstage(a, "NI", 2027)).toBe(5); // 1.1. Feiertag, 4.–8.1.
  });
});

describe("Urlaubskonto", () => {
  it("rechnet Anspruch, Übertrag, genehmigt und beantragt", () => {
    const k = konto(
      [
        { art: "urlaub", status: "genehmigt", von: "2026-08-10", bis: "2026-08-21", halbtags: false },
        { art: "urlaub", status: "beantragt", von: "2026-10-12", bis: "2026-10-16", halbtags: false },
        { art: "urlaub", status: "abgelehnt", von: "2026-11-02", bis: "2026-11-06", halbtags: false },
        { art: "krank", status: "genehmigt", von: "2026-03-02", bis: "2026-03-06", halbtags: false },
      ],
      2026,
      30,
      5,
      "NI",
    );
    expect(k).toEqual({ anspruch: 30, uebertrag: 2.5, genehmigt: 10, beantragt: 5, rest: 17.5 });
  });
});

it("erkennt Überschneidungen", () => {
  expect(ueberschneidet({ von: "2026-08-10", bis: "2026-08-14" }, { von: "2026-08-14", bis: "2026-08-20" })).toBe(true);
  expect(ueberschneidet({ von: "2026-08-10", bis: "2026-08-14" }, { von: "2026-08-15", bis: "2026-08-20" })).toBe(false);
});
