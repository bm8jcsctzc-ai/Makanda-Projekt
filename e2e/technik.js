const { chromium } = require("playwright");
// Browser-Test gegen eine laufende App mit leerer Datenbank (siehe README).
// Screenshots landen im Ordner, der als erstes Argument übergeben wird (Standard: Temp-Ordner).
const path = require("node:path");
const S = process.argv[2] || require("node:os").tmpdir();
require("node:fs").mkdirSync(path.join(S, "shots"), { recursive: true });
const B = process.env.APP_URL || "http://localhost:3100";
const ok = (c, m) => { if (!c) throw new Error("FEHLER: " + m); console.log("✓ " + m); };
const norm = (t) => t.replace(/ /g, " ");
const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
const de = (iso) => iso.split("-").reverse().join(".");

async function login(browser, email, pw, mobil = false) {
  const ctx = await browser.newContext(mobil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
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

  // Kunde anlegen
  await p.goto(B + "/kunden/neu");
  await p.fill("#name", "Familie Schmidt");
  await p.fill("#strasse", "Musterstraße 12");
  await p.fill("#plz", "30159");
  await p.fill("#ort", "Hannover");
  await p.fill("#telefon", "0511 123456");
  await p.fill("#hinweise", "Hund im Haus, bitte klingeln");
  await p.click("text=Speichern");
  await p.waitForURL(/\/kunden\/[0-9a-f-]{36}$/);
  const kundeUrl = p.url();
  ok(await p.isVisible("text=Hund im Haus"), "Kunde angelegt, Hinweis sichtbar");

  // Anlage anlegen
  await p.click("text=+ Anlage");
  await p.waitForURL(/\/anlagen\/neu/);
  await p.selectOption("#typ", "gas");
  await p.fill("#hersteller", "Viessmann");
  await p.fill("#modell", "Vitodens 200-W");
  await p.fill("#seriennummer", "7654321");
  await p.fill("#baujahr", "2016");
  await p.fill("#aufstellort", "Keller, Heizraum");
  await p.fill("#letzteWartungAm", "2025-10-15");
  await p.click("text=Speichern");
  await p.waitForURL(/\/anlagen\/[0-9a-f-]{36}$/);
  const anlageUrl = p.url();
  ok(await p.isVisible("text=15.10.2026 – überfällig"), "nächste Wartung automatisch berechnet und als überfällig markiert");

  // Fehlerfall Baujahr
  await p.goto(anlageUrl + "/bearbeiten");
  await p.fill("#baujahr", "1800");
  await p.click("text=Speichern");
  await p.waitForSelector(".fehler-box");
  ok((await p.inputValue("#hersteller")) === "Viessmann", "ungültiges Baujahr abgelehnt, Eingaben bleiben");

  // Einsatz planen für Max
  await p.goto(kundeUrl);
  await p.click("text=+ Einsatz planen");
  await p.waitForURL(/\/einsaetze\/neu/);
  await p.selectOption("#anlageId", { index: 1 });
  await p.selectOption("#art", "wartung");
  await p.selectOption("#monteurId", { label: "Max Monteur" });
  await p.fill("#uhrzeit", "08:00");
  await p.fill("#beschreibung", "Jahreswartung Gastherme");
  await p.click("text=Speichern");
  await p.waitForURL(/\/einsaetze\/[0-9a-f-]{36}$/);
  const einsatzUrl = p.url();
  ok(norm(await p.textContent("main")).includes("Wartung bei Familie Schmidt"), "Einsatz geplant");

  // Zweiter Einsatz ohne Monteur
  await p.goto(B + "/einsaetze/neu?kunde=" + kundeUrl.split("/").pop());
  await p.selectOption("#art", "stoerung");
  await p.fill("#beschreibung", "Heizung macht Geräusche");
  await p.click("text=Speichern");
  await p.waitForURL(/\/einsaetze\/[0-9a-f-]{36}$/);
  const fremderEinsatz = p.url();
  await p.goto(B + "/einsaetze");
  ok(await p.isVisible("text=noch keinen Monteur"), "Einsatzliste warnt vor Einsatz ohne Monteur");

  // ---- Monteur am Handy ----
  const m = await login(browser, "max@example.com", "Startpasswort1", true);
  ok(await m.isVisible("text=Familie Schmidt"), "Monteur sieht seinen Einsatz auf der Startseite");
  ok(!(await m.isVisible("nav >> text=Finanzen")) && !(await m.isVisible("nav >> text=Einsätze")), "Monteur sieht keine Finanzen und keine Einsatzplanung");
  await m.click("text=Familie Schmidt");
  await m.waitForURL(einsatzUrl);
  ok(await m.isVisible("text=Hund im Haus"), "Kundenhinweis im Einsatz sichtbar");
  ok((await m.getAttribute("a:has-text('Musterstraße')", "href")).includes("google.com/maps"), "Navigations-Link vorhanden");
  ok((await m.inputValue("#vorlageId")) !== "" && (await m.textContent("#vorlageId option:checked")).includes("Gas-Brennwert"), "passende Checkliste vorgeschlagen");
  await m.click("text=Checkliste starten");
  await m.waitForURL(/\/checkliste\//);
  const checkUrl = m.url();

  await m.click("text=Abschließen");
  await m.waitForSelector(".fehler-box");
  ok((await m.textContent(".fehler-box")).includes("Noch nicht ausgefüllt"), "Abschließen ohne Pflichtfelder wird verhindert");

  // Alle Prüfungen i. O., Dichtungen nicht i. O.
  const punkte = await m.$$("li[data-punkt]");
  for (const li of punkte) {
    const id = await li.getAttribute("data-punkt");
    const io = await li.$("button[role=radio]:has-text('i. O.'):not(:has-text('nicht'))");
    if (io) await (id === "dichtungen" ? (await li.$("button:has-text('nicht i. O.')")) : io).click();
  }
  await m.fill("li[data-punkt=dichtungen] textarea", "Brennerdichtung porös, Ersatz bestellt");
  const werte = { gasdruck: "20", co2: "9,1", co: "1200", abgastemp: "48", anlagendruck: "1,6", mag: "1,0" };
  for (const [id, w] of Object.entries(werte)) await m.fill(`li[data-punkt=${id}] input`, w);
  ok(await m.isVisible("li[data-punkt=co] >> text=Außerhalb des Richtwerts"), "CO-Wert über Richtwert wird gewarnt");
  await m.fill("li[data-punkt=co] textarea", "Nach Einstellung erneut messen");
  await m.click("text=Zwischenspeichern");
  await m.waitForSelector("text=Zwischengespeichert");
  await m.reload();
  ok((await m.inputValue("li[data-punkt=gasdruck] input")) === "20", "Zwischenspeichern bleibt nach Neuladen erhalten");
  await m.screenshot({ path: S + "/shots/checkliste-handy.png", fullPage: false });
  await m.click("text=Abschließen");
  await m.waitForURL(einsatzUrl);
  ok(await m.isVisible("text=2 auffällig"), "abgeschlossene Checkliste zeigt 2 Auffälligkeiten");

  // Foto hochladen
  await m.screenshot({ path: path.join(S, "testfoto.png") });
  await m.selectOption("#foto-kategorie", "typenschild");
  await m.fill("#foto-beschreibung", "Typenschild Therme");
  await m.setInputFiles("[data-testid=foto-eingabe]", path.join(S, "testfoto.png"));
  await m.waitForSelector("img[alt='Typenschild Therme']", { timeout: 20000 });
  const bild = await m.getAttribute("img[alt='Typenschild Therme']", "src");
  const antwort = await m.request.get(B + bild);
  ok(antwort.status() === 200 && antwort.headers()["content-type"] === "image/jpeg", "Foto hochgeladen und als verkleinertes JPEG gespeichert");

  // Einsatz abschließen
  await m.fill("#bemerkung", "Dichtung wird nachgeliefert");
  await m.click("text=Einsatz abschließen");
  await m.waitForSelector("text=Abgeschlossen am");
  ok(true, "Einsatz abgeschlossen");
  await m.screenshot({ path: S + "/shots/einsatz-handy.png", fullPage: true });

  // Rechte des Monteurs
  await m.goto(fremderEinsatz);
  ok((await m.locator("button", { hasText: /Checkliste starten|Einsatz abschließen|Foto aufnehmen/ }).count()) === 0 && (await m.isVisible("text=Nur der zuständige Monteur")), "fremden Einsatz kann der Monteur nur ansehen");
  await m.goto(B + "/einsaetze");
  ok(m.url() === B + "/", "Monteur kommt nicht an die Einsatzplanung");
  await m.goto(B + "/einstellungen/checklisten");
  ok(m.url() === B + "/", "Monteur kommt nicht an die Vorlagen");
  await m.goto(checkUrl);
  ok(!(await m.isVisible("text=Wieder öffnen")) && (await m.isVisible("text=1 Mangel")), "abgeschlossene Checkliste ist für Monteur schreibgeschützt");

  // Anlagenakte beim Inhaber
  const nachWartung = new Date(Date.UTC(+heute.slice(0, 4) + 1, +heute.slice(5, 7) - 1, +heute.slice(8, 10))).toISOString().slice(0, 10);
  await p.goto(anlageUrl);
  const akte = norm(await p.textContent("main"));
  ok(akte.includes(de(heute)) && akte.includes(de(nachWartung)) && !akte.includes("überfällig"), "Wartung abgeschlossen → nächste Wartung in 12 Monaten");
  ok(akte.includes("Typenschild Therme") && akte.includes("2 auffällig"), "Anlagenakte zeigt Foto und Checklisten-Historie");
  await p.screenshot({ path: S + "/shots/anlagenakte.png", fullPage: true });

  // Druckansicht
  await p.goto(checkUrl);
  ok(await p.isVisible("text=Drucken / PDF") && await p.isVisible("text=Brennerdichtung porös"), "Druckansicht mit Bemerkungen");
  await p.emulateMedia({ media: "print" });
  await p.screenshot({ path: S + "/shots/checkliste-druck.png", fullPage: true });
  await p.emulateMedia({ media: "screen" });

  // Vorlage bearbeiten
  await p.goto(B + "/einstellungen/checklisten");
  await p.click("text=Störung / Reparatur");
  await p.click("text=+ Prüfpunkt hinzufügen");
  await p.fill("input[aria-label='Text Punkt 6']", "Kunde über Kosten informiert");
  await p.click("button:text('Speichern')");
  await p.waitForURL(B + "/einstellungen/checklisten");
  const zeile = norm(await p.textContent("tr:has-text('Störung / Reparatur')"));
  ok(zeile.includes("6") && zeile.includes("2"), "Vorlage geändert, Version erhöht");

  // Leerer Punkt wird abgelehnt
  await p.click("text=Störung / Reparatur");
  await p.click("text=+ Prüfpunkt hinzufügen");
  await p.click("button:text('Speichern')");
  await p.waitForSelector(".fehler-box");
  ok(true, "Prüfpunkt ohne Text wird abgelehnt");

  // Büro
  const bp = await login(browser, "bea@example.com", "Startpasswort1");
  ok(await bp.isVisible("text=Alle Einsätze heute") && await bp.isVisible("nav >> text=Einsätze"), "Büro sieht alle Einsätze des Tages");
  await bp.goto(B + "/einstellungen/benutzer");
  ok(bp.url() === B + "/", "Büro kommt nicht an die Benutzerverwaltung");

  // Kunde löschen räumt auf
  await p.goto(kundeUrl + "/bearbeiten");
  p.once("dialog", (d) => d.accept());
  await p.click("button:text('Löschen')");
  await p.waitForURL(B + "/kunden");
  ok((await p.request.get(B + bild)).status() === 404, "Kunde gelöscht – Fotos sind mit entfernt");

  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
