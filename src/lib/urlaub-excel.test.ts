import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { Abwesenheit } from "@/db/schema";
import { urlaubsExcel } from "./urlaub-excel";

const team = [
  { id: "a", name: "Anna Schmidt", rolle: "monteur", imTeam: true, urlaubstageProJahr: 30 },
  { id: "b", name: "Bea Büro", rolle: "buero", imTeam: false, urlaubstageProJahr: 28 },
];
const abw = (benutzerId: string, von: string, bis: string, status: "genehmigt" | "beantragt", halbtags = false) =>
  ({ id: von, benutzerId, art: "urlaub", status, von, bis, halbtags }) as Abwesenheit;

describe("Urlaubs-Excel", () => {
  it("enthält Konten, Monate und alle Abwesenheiten", async () => {
    const urlaub = [
      abw("a", "2030-07-29", "2030-08-09", "genehmigt"), // 10 Arbeitstage über den Monatswechsel (3 Juli, 7 August)
      abw("a", "2030-12-30", "2031-01-03", "genehmigt"), // 2 Tage im Jahr 2030
      abw("a", "2030-10-04", "2030-10-04", "beantragt", true),
    ];
    const daten = await urlaubsExcel({
      jahr: 2030,
      land: "BW",
      team,
      konten: [{ id: "k", benutzerId: "a", jahr: 2030, anspruchTage: 30, uebertragHalbeTage: 5 }],
      urlaub,
      abwesenheiten: [
        { id: "x", benutzerId: "a", name: "Anna Schmidt", art: "krank", von: "2030-03-04", bis: "2030-03-05", halbtags: false, status: "genehmigt" },
        ...urlaub.map((u) => ({ ...u, name: "Anna Schmidt" })),
      ],
    });
    const mappe = new ExcelJS.Workbook();
    await mappe.xlsx.load(daten.buffer as ArrayBuffer);
    expect(mappe.worksheets.map((b) => b.name)).toEqual(["Urlaubskonten 2030", "Urlaub pro Monat", "Abwesenheiten 2030"]);

    const konten = mappe.getWorksheet("Urlaubskonten 2030")!;
    expect(konten.getRow(2).values).toEqual([undefined, "Anna Schmidt", 30, 2.5, 32.5, 12, 0.5, 20]);
    expect(konten.getCell("A3").value).toBeNull(); // Bea ist nicht im Urlaubsplaner

    const monate = mappe.getWorksheet("Urlaub pro Monat")!;
    const anna = monate.getRow(2).values as unknown[];
    expect(anna[8]).toBe(3); // Juli
    expect(anna[9]).toBe(7); // August
    expect(anna[13]).toBe(2); // Dezember
    expect(anna[14]).toBe(12); // Summe

    const liste = mappe.getWorksheet("Abwesenheiten 2030")!;
    expect(liste.rowCount).toBe(5);
    expect(liste.getRow(2).getCell(2).value).toBe("Krank");
    expect(liste.getRow(3).getCell(3).value).toEqual(new Date("2030-07-29T12:00:00Z"));
  });
});
