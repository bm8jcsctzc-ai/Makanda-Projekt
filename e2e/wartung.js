// Browser-Test Wartungsplan – läuft nach finanzen.js und technik.js gegen dieselbe Datenbank.
const path = require("node:path");
const { chromium } = require("playwright");
const ExcelJS = require(path.join(__dirname, "..", "node_modules", "exceljs"));
const S = process.argv[2] || require("node:os").tmpdir();
require("node:fs").mkdirSync(path.join(S, "shots"), { recursive: true });
const B = process.env.APP_URL || "http://localhost:3100";
const ok = (c, m) => { if (!c) throw new Error("FEHLER: " + m); console.log("✓ " + m); };
const norm = (t) => t.replace(/ /g, " ");

const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const plusTage = (t) => new Date(Date.parse(heute + "T00:00:00Z") + t * 86400000).toISOString().slice(0, 10);
const plusMonate = (m, tag = 15) => {
  const d = new Date(Date.UTC(+heute.slice(0, 4), +heute.slice(5, 7) - 1 + m, tag));
  return d.toISOString().slice(0, 10);
};
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const monatName = (iso) => `${MONATE[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

async function login(browser, email, pw) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => { throw new Error("JS-Fehler: " + e.message); });
  await p.goto(B + "/login");
  await p.fill("#email", email);
  await p.fill("#passwort", pw);
  await p.click("button");
  await p.waitForURL(B + "/");
  return p;
}

(async () => {
  const browser = await chromium.launch();
  const p = await login(browser, "test@example.com", "Testpasswort123");

  // Einstellungen
  await p.goto(B + "/einstellungen/wartung");
  await p.fill("#firmenname", "Mustermann Haustechnik");
  await p.fill("#firmaTelefon", "0511 987654");
  await p.fill("#bueroEmail", "buero@example.com");
  ok(norm(await p.textContent("text=Vorschau >> xpath=..")).includes("Mustermann Haustechnik"), "Vorschau der Erinnerung zeigt Firmennamen");
  await p.click("button:text('Speichern')");
  await p.waitForSelector("text=Gespeichert.");
  ok(true, "Einstellungen gespeichert");

  const kunde = async (name, email, erinnerungen = true) => {
    await p.goto(B + "/kunden/neu");
    await p.fill("#name", name);
    await p.fill("#ort", "Hannover");
    if (email) await p.fill("#email", email);
    if (!erinnerungen) await p.uncheck("input[name=erinnerungen]");
    await p.click("button:text('Speichern')");
    await p.waitForURL(/\/kunden\/[0-9a-f-]{36}$/);
    return p.url().split("/").pop();
  };
  const anlage = async (kundeId, typ, naechste, hersteller = "Vaillant") => {
    await p.goto(B + "/anlagen/neu?kunde=" + kundeId);
    await p.selectOption("#typ", typ);
    await p.fill("#hersteller", hersteller);
    await p.fill("#naechsteWartungAm", naechste);
    await p.click("button:text('Speichern')");
    await p.waitForURL(/\/anlagen\/[0-9a-f-]{36}$/);
    return p.url().split("/").pop();
  };

  const meyer = await kunde("Meyer", "meyer@example.com");
  await anlage(meyer, "gas", plusTage(40));
  const weber = await kunde("Weber", null);
  await anlage(weber, "oel", plusTage(60));
  const schulz = await kunde("Schulz", "schulz@example.com", false);
  await anlage(schulz, "klima", plusTage(20));
  const becker = await kunde("Becker", "becker@example.com");
  await anlage(becker, "gas", plusTage(-10));
  const fischer = await kunde("Fischer", "fischer@example.com");
  const fischerAnlage = await anlage(fischer, "waermepumpe", plusTage(30));
  const wagner = await kunde("Wagner", "wagner@example.com");
  await anlage(wagner, "gas", plusMonate(8));
  const linden = await kunde("Wohnanlage Lindenhof", "verwaltung@example.com");
  const haeufungsDatum = plusMonate(5);
  for (let i = 0; i < 6; i++) await anlage(linden, "gas", haeufungsDatum, "Buderus");
  ok(true, "12 Anlagen mit verschiedenen Fälligkeiten angelegt");

  // Fischer hat schon einen Termin
  await p.goto(`${B}/einsaetze/neu?kunde=${fischer}&anlage=${fischerAnlage}&datum=${plusTage(25)}`);
  ok((await p.inputValue("#datum")) === plusTage(25) && (await p.inputValue("#anlageId")) === fischerAnlage, "Einsatzformular übernimmt Kunde, Anlage und Datum");
  await p.click("button:text('Speichern')");
  await p.waitForURL(/\/einsaetze\/[0-9a-f-]{36}$/);

  // Wartungsplan
  await p.goto(B + "/wartung");
  const plan = norm(await p.textContent("main"));
  const kennzahl = async (titel) => Number(await p.locator(".karte", { hasText: titel }).locator("p").nth(1).textContent());
  ok((await kennzahl("Überfällig")) === 1, "1 Wartung überfällig");
  ok((await kennzahl("ohne Termin")) === 3, "3 bald fällig ohne Termin (Fischer hat einen Termin)");
  ok((await kennzahl("Termin geplant")) === 1, "1 Termin geplant");
  ok(plan.includes(`${monatName(haeufungsDatum)}: 6 Wartungen`), `Häufung im ${monatName(haeufungsDatum)} erkannt`);
  ok(plan.includes("Testmodus"), "Hinweis auf Testmodus");
  await p.screenshot({ path: path.join(S, "shots", "wartungsplan.png"), fullPage: true });

  // Excel
  const [download] = await Promise.all([p.waitForEvent("download"), p.click("text=Excel herunterladen")]);
  const datei = path.join(S, "wartung-test.xlsx");
  await download.saveAs(datei);
  const mappe = new ExcelJS.Workbook();
  await mappe.xlsx.readFile(datei);
  const blatt = mappe.getWorksheet("Wartungskunden");
  ok(blatt.rowCount === 13, `Excel enthält alle 12 Anlagen (${blatt.rowCount - 1})`);
  ok(blatt.getRow(2).getCell(5).value === "Becker" && blatt.getRow(2).getCell(2).value === "überfällig", "Excel: überfällige Wartung steht oben");
  const uebersicht = mappe.getWorksheet("Monatsübersicht");
  const hinweise = [];
  uebersicht.eachRow((r) => { if (String(r.getCell(3).value ?? "").includes("Viele")) hinweise.push(r.getCell(1).value); });
  ok(hinweise.includes(monatName(haeufungsDatum)), "Excel-Monatsübersicht markiert die Häufung");

  // Erinnerungen
  await p.click("text=Erinnerungen jetzt prüfen");
  await p.waitForSelector("text=Kunden per E-Mail erinnert");
  ok(norm(await p.textContent("main")).includes("1 Kunden per E-Mail erinnert, 2 zum Anrufen"), "Meyer per Mail erinnert, Weber und Schulz zum Anrufen gemeldet");
  await p.click("text=Erinnerungen jetzt prüfen");
  await p.waitForSelector("text=Keine neuen Erinnerungen nötig");
  ok(true, "Zweiter Lauf verschickt nichts doppelt");
  await p.reload();
  ok(await p.locator("li", { hasText: "Meyer" }).locator("text=erinnert").count() === 1, "Liste zeigt „erinnert“ bei Meyer");

  await p.click("text=Wochenbericht jetzt senden");
  await p.waitForSelector("text=Wochenbericht an buero@example.com");
  ok(true, "Wochenbericht ausgelöst");

  // Protokoll
  await p.goto(B + "/einstellungen/emails");
  const mails = norm(await p.textContent("main"));
  ok(mails.includes("an meyer@example.com") && !mails.includes("an schulz@example.com") && !mails.includes("an becker@example.com"), "Erinnerung nur an Meyer, nicht an Schulz (abgewählt) oder Becker (überfällig)");
  await p.click("summary:has-text('meyer@example.com')");
  const meyerMail = norm(await p.textContent("details:has(summary:has-text('meyer@example.com'))"));
  ok(meyerMail.includes("Guten Tag Meyer") && meyerMail.includes("0511 987654") && meyerMail.includes("Mustermann Haustechnik"), "Erinnerungstext mit Platzhaltern gefüllt");
  await p.click("summary:has-text('Wartungserinnerungen')");
  const bueroMail = norm(await p.textContent("details:has(summary:has-text('Wartungserinnerungen'))"));
  ok(bueroMail.includes("bitte anrufen") && bueroMail.includes("Weber") && bueroMail.includes("Schulz"), "Büro-Übersicht nennt Kunden zum Anrufen");
  await p.click("summary:has-text('Wochenübersicht')");
  const woche = norm(await p.textContent("details:has(summary:has-text('Wochenübersicht'))"));
  ok(mails.includes("📎 Wartungskunden_") && woche.includes("Monate mit vielen Wartungen") && woche.includes("Becker"), "Wochenbericht mit Excel-Anhang, Häufung und überfälligen Kunden");
  await p.screenshot({ path: path.join(S, "shots", "mail-protokoll.png"), fullPage: true });

  // Startseite
  await p.goto(B + "/");
  ok(norm(await p.textContent("a[href='/wartung'] >> nth=1")).includes("1 überfällig"), "Startseite zeigt Wartungshinweis");

  // Schutz
  ok((await p.request.get(B + "/api/cron/taeglich")).status() === 401, "Zeitplaner-Adresse ohne Schlüssel gesperrt");
  const m = await login(browser, "max@example.com", "Startpasswort1");
  await m.goto(B + "/wartung");
  ok(m.url() === B + "/", "Monteur kommt nicht an den Wartungsplan");
  ok((await m.request.get(B + "/wartung/export")).status() === 403, "Monteur kann die Excel nicht herunterladen");

  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
