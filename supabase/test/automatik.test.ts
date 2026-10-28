import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  erinnerungenVorbereiten,
  warteschlangeAbarbeiten,
  wochenbeginn,
  wochenberichtSchonDa,
  wochenberichtSenden,
  type Db,
  type Mail,
} from "@/lib/automatik";
import { neueDatenbank } from "./datenbank";

const HEUTE = "2026-10-28";
let pg: PGlite;
let db: Db;
const verschickt: Mail[] = [];
const versand = async (m: Mail) => {
  verschickt.push(m);
  return { status: "gesendet" as const };
};
const mails = (status: string) => db.abfrage<{ an: string; betreff: string; text: string }>("select an, betreff, text from mail_protokoll where status = $1::mailstatus order by betreff", [status]);

beforeAll(async () => {
  pg = await neueDatenbank();
  db = { abfrage: async (sql, werte) => (await pg.query(sql, werte)).rows as never };
  await pg.exec(`
    update einstellungen set buero_email = 'buero@firma.de', firmenname = 'Makanda SHK', firma_telefon = '07071 123';
    insert into kunde (id, name, ort, email) values ('00000000-0000-0000-0000-00000000000a', 'Familie Schmidt', 'Tübingen', 'schmidt@example.de');
    insert into kunde (id, name, telefon) values ('00000000-0000-0000-0000-00000000000b', 'Bäckerei Maier', '07071 999');
    insert into anlage (kunde_id, typ, naechste_wartung_am) values
      ('00000000-0000-0000-0000-00000000000a', 'gas', '2026-12-15'),
      ('00000000-0000-0000-0000-00000000000b', 'klima', '2027-01-10'),
      ('00000000-0000-0000-0000-00000000000b', 'oel', '2027-09-01'),
      ('00000000-0000-0000-0000-00000000000a', 'waermepumpe', '2026-08-01');
  `);
}, 30000);

describe("Automatik", () => {
  it("bereitet Erinnerungen nur einmal vor", async () => {
    expect(await erinnerungenVorbereiten(db, HEUTE)).toBe("1 Kunden per E-Mail erinnert, 1 zum Anrufen an das Büro gemeldet.");
    const wartend = await mails("wartend");
    expect(wartend.map((m) => m.an).sort()).toEqual(["buero@firma.de", "schmidt@example.de"]);
    const kunde = wartend.find((m) => m.an === "schmidt@example.de")!;
    expect(kunde.text).toContain("Familie Schmidt");
    expect(kunde.text).toContain("15.12.2026");
    expect(kunde.text).toContain("07071 123");
    const buero = wartend.find((m) => m.an === "buero@firma.de")!;
    expect(buero.text).toContain("Bäckerei Maier");
    expect(buero.text).toContain("Tel. 07071 999");

    expect(await erinnerungenVorbereiten(db, HEUTE)).toBe("Keine neuen Erinnerungen nötig.");
  });

  it("verschickt wartende E-Mails", async () => {
    expect(await warteschlangeAbarbeiten(db, versand)).toBe("2 E-Mails verarbeitet.");
    expect(await mails("wartend")).toEqual([]);
    expect((await mails("gesendet")).length).toBe(2);
    expect(verschickt.every((m) => m.antwortAn === "buero@firma.de")).toBe(true);
    expect(await warteschlangeAbarbeiten(db, versand)).toBe("Keine wartenden E-Mails.");
  });

  it("schickt den Wochenbericht mit Excel einmal pro Woche", async () => {
    expect(wochenbeginn("2026-10-28")).toBe("2026-10-26");
    expect(wochenbeginn("2026-11-01")).toBe("2026-10-26");
    expect(wochenbeginn("2026-11-02")).toBe("2026-11-02");

    expect(await wochenberichtSchonDa(db, HEUTE)).toBe(false);
    expect(await wochenberichtSenden(db, HEUTE, versand)).toBe("Wochenbericht an buero@firma.de (4 Anlagen).");
    const bericht = verschickt.at(-1)!;
    expect(bericht.anhang?.name).toBe("Wartungskunden_2026-10-28.xlsx");
    expect(bericht.anhang!.inhalt.byteLength).toBeGreaterThan(1000);
    expect(bericht.text).toContain("Überfällig: 1");
    expect(await wochenberichtSchonDa(db, HEUTE)).toBe(true);
  });

  it("speichert Fehler beim Versand", async () => {
    await pg.exec("insert into mail_protokoll (an, betreff, text, status) values ('x@y.de', 'Test', 'Hallo', 'wartend')");
    expect(await warteschlangeAbarbeiten(db, async () => ({ status: "fehler", fehler: "422: ungültig" }))).toBe("0 E-Mails verarbeitet, 1 mit Fehler.");
    const [z] = await db.abfrage<{ fehler: string }>("select fehler from mail_protokoll where betreff = 'Test'");
    expect(z.fehler).toBe("422: ungültig");
  });
});
