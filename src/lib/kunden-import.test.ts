import { describe, expect, it } from "vitest";
import { csvParsen, dekodieren, kundenAusZeilen, normalisiere, spaltenErkennen } from "./kunden-import";

describe("Spalten erkennen", () => {
  it("erkennt typische TAIFUN-Überschriften", () => {
    const kopf = ["Kd-Nr.", "Anrede", "Name1", "Name2", "Straße", "PLZ", "Ort", "Telefon", "Mobil", "E-Mail-Adresse"];
    const z = spaltenErkennen(kopf);
    expect(z.kundennr).toBe(0);
    expect(z.name).toBe(2);
    expect(z.name2).toBe(3);
    expect(z.strasse).toBe(4);
    expect(z.plz).toBe(5);
    expect(z.ort).toBe(6);
    expect(z.telefon).toBe(7);
    expect(z.mobil).toBe(8);
    expect(z.email).toBe(9);
    expect(z.vorname).toBe(-1);
  });

  it("vergleicht ohne Groß-/Kleinschreibung, Umlaute und Sonderzeichen", () => {
    expect(normalisiere("Straße / Hausnr.")).toBe("strassehausnr");
    expect(normalisiere("E-Mail")).toBe("email");
  });
});

describe("CSV lesen", () => {
  it("Semikolon, Anführungszeichen und Zeilenumbruch im Feld", () => {
    const text = 'Name;Ort\r\n"Müller; Söhne GmbH";Tübingen\r\n"Mit ""Zitat""\nzweite Zeile";Ulm\r\n';
    expect(csvParsen(text)).toEqual([
      ["Name", "Ort"],
      ["Müller; Söhne GmbH", "Tübingen"],
      ['Mit "Zitat"\nzweite Zeile', "Ulm"],
    ]);
  });

  it("erkennt Komma als Trenner", () => {
    expect(csvParsen("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("liest Windows-Zeichensatz (Umlaute aus TAIFUN)", () => {
    const bytes = new Uint8Array([0x53, 0x74, 0x72, 0x61, 0xdf, 0x65, 0x3b, 0xfc]); // "Straße;ü" in Windows-1252
    expect(dekodieren(bytes)).toBe("Straße;ü");
    expect(dekodieren(new TextEncoder().encode("﻿Straße"))).toBe("Straße");
  });
});

describe("Kunden bilden", () => {
  const kopf = ["Nr", "Vorname", "Nachname", "Strasse", "Hausnummer", "PLZ Ort", "Tel", "Handy", "Email"];

  it("setzt Namen, Adresse und Telefon zusammen", () => {
    const zeilen = [["10023", "Anna", "Schmidt", "Lindenweg", "4a", "72072 Tübingen", "07071 123", "0170 555", "Anna@Example.de"]];
    const { kunden } = kundenAusZeilen(zeilen, spaltenErkennen(kopf));
    expect(kunden[0]).toEqual({
      taifun_kundennr: null, // „Nr“ allein ist zu unsicher – wird von Hand zugeordnet
      name: "Anna Schmidt",
      ansprechpartner: null,
      strasse: "Lindenweg 4a",
      plz: "72072",
      ort: "Tübingen",
      telefon: "07071 123 / 0170 555",
      email: "anna@example.de",
    });
  });

  it("überspringt Zeilen ohne Namen, leert ungültige E-Mails, ergänzt führende Null der PLZ", () => {
    const z = spaltenErkennen(["Kundennummer", "Name", "PLZ", "Ort", "E-Mail"]);
    const r = kundenAusZeilen(
      [
        ["1", "Bäckerei Maier", "1067", "Dresden", "keine-mail"],
        ["2", "", "70173", "Stuttgart", ""],
      ],
      z,
    );
    expect(r.kunden).toHaveLength(1);
    expect(r.kunden[0]).toMatchObject({ taifun_kundennr: "1", plz: "01067", email: null });
    expect(r.ohneName).toBe(1);
    expect(r.ungueltigeEmail).toBe(1);
  });
});
