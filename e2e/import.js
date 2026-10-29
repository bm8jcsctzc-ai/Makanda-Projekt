const { chromium } = require("playwright");
// Browser-Test Kunden-Import – läuft nach den anderen Tests gegen dieselbe Datenbank.
const path = require("node:path");
const fs = require("node:fs");
const ExcelJS = require("exceljs");
const S = process.argv[2] || require("node:os").tmpdir();
fs.mkdirSync(path.join(S, "shots"), { recursive: true });
const B = process.env.APP_URL || "http://localhost:3100";
const ok = (c, m) => { if (!c) throw new Error("FEHLER: " + m); console.log("✓ " + m); };

// Die Seiten laden ihre Daten erst im Browser: warten, bis nichts mehr lädt
async function bereit(seite) {
  await seite.waitForLoadState("networkidle").catch(() => {});
  await seite.waitForSelector("[aria-busy=true]", { state: "detached", timeout: 10000 }).catch(() => {});
}

// CSV wie aus TAIFUN: Semikolon, Windows-Zeichensatz
function windows1252(text) {
  return Buffer.from([...text].map((z) => ({ "ä": 0xe4, "ö": 0xf6, "ü": 0xfc, "ß": 0xdf, "Ä": 0xc4, "Ö": 0xd6, "Ü": 0xdc })[z] ?? z.charCodeAt(0)));
}

(async () => {
  const csv = path.join(S, "taifun-kunden.csv");
  fs.writeFileSync(
    csv,
    windows1252(
      "Kd-Nr.;Name1;Name2;Straße;PLZ;Ort;Telefon;E-Mail\r\n" +
        "20001;Familie Größer;;Talstraße 3;72070;Tübingen;07071 111;groesser@example.com\r\n" +
        '20002;"Bäckerei Ott; Filiale Nord";;Marktplatz 1;72764;Reutlingen;07121 222;keine-mail\r\n' +
        ";;;;;;;\r\n" +
        "20005;;;Ohne Namen 1;72070;Tübingen;;\r\n" +
        "20003;Weiß;Hausverwaltung;Am Bach 7;72108;Rottenburg;;\r\n",
    ),
  );

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));
  await p.goto(B + "/login/");
  await p.fill("#email", "test@example.com");
  await p.fill("#passwort", "Testpasswort123");
  await p.click("button");
  await p.waitForURL(B + "/");

  await p.goto(B + "/kunden/");
  await bereit(p);
  await p.click("text=Aus TAIFUN importieren");
  await p.waitForURL(B + "/kunden/import/");
  await p.setInputFiles("input[type=file]", csv);
  await p.waitForSelector("text=Vorschau");
  const text = await p.textContent("main");
  ok(text.includes("3 Kunden erkannt") && text.includes("1 Zeile ohne Namen wird übersprungen") && text.includes("bei 1 ist die E-Mail-Adresse ungültig"), "Vorschau zählt Kunden, Leerzeilen und ungültige E-Mails");
  ok(text.includes("Familie Größer") && text.includes("Bäckerei Ott; Filiale Nord") && text.includes("Weiß Hausverwaltung"), "Umlaute und Semikolon im Namen richtig gelesen");
  ok((await p.inputValue("#feld-kundennr")) === "0" && (await p.inputValue("#feld-email")) === "7", "Spalten automatisch zugeordnet");
  await p.screenshot({ path: path.join(S, "shots", "kunden-import.png"), fullPage: true });
  await p.click("button:text('3 Kunden importieren')");
  await p.waitForSelector("text=Fertig: 3 Kunden neu angelegt, 0 aktualisiert");
  ok(true, "3 Kunden importiert");

  // Zweiter Import als Excel: geänderte Telefonnummer, ein neuer Kunde
  const mappe = new ExcelJS.Workbook();
  const blatt = mappe.addWorksheet("Adressen");
  blatt.addRow(["Kundennummer", "Name", "Strasse", "PLZ", "Ort", "Tel"]);
  blatt.addRow([20001, "Familie Größer", "Talstraße 3", 72070, "Tübingen", "07071 999"]);
  blatt.addRow([20004, "Neukunde Dresden", "Elbufer 1", 1067, "Dresden", ""]);
  const xlsx = path.join(S, "taifun-kunden.xlsx");
  await mappe.xlsx.writeFile(xlsx);
  await p.setInputFiles("input[type=file]", xlsx);
  await p.waitForSelector("text=2 Kunden erkannt");
  await p.click("button:text('2 Kunden importieren')");
  await p.waitForSelector("text=Fertig: 1 Kunde neu angelegt, 1 aktualisiert");
  ok(true, "Excel-Import erkennt vorhandene Kunden an der Kundennummer");

  await p.goto(B + "/kunden/?q=Gr%C3%B6%C3%9Fer");
  await bereit(p);
  await p.click("text=Familie Größer");
  await p.waitForURL(/\/kunden\/ansehen\//);
  await bereit(p);
  const kunde = await p.textContent("main");
  ok(kunde.includes("07071 999") && kunde.includes("groesser@example.com"), "Telefon aktualisiert, E-Mail aus erstem Import bleibt");
  await p.goto(B + "/kunden/?q=Neukunde");
  await bereit(p);
  await p.click("text=Neukunde Dresden");
  await p.waitForURL(/\/kunden\/ansehen\//);
  await bereit(p);
  ok((await p.textContent("main")).includes("01067 Dresden"), "PLZ mit führender Null aus Excel");

  // Monteure sehen den Import nicht
  const m = await (await browser.newContext()).newPage();
  await m.goto(B + "/login/");
  await m.fill("#email", "max@example.com");
  await m.fill("#passwort", "Startpasswort1");
  await m.click("button");
  await m.waitForURL(B + "/");
  await m.goto(B + "/kunden/");
  await bereit(m);
  ok(!(await m.isVisible("text=Aus TAIFUN importieren")), "Monteur sieht keinen Import-Knopf");
  await m.goto(B + "/kunden/import/");
  ok(await m.waitForURL(B + "/").then(() => true, () => false), "Monteur kommt nicht auf die Import-Seite");

  ok(fehler.length === 0, "keine JavaScript-Fehler im Browser " + fehler.join("; "));
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
