const { chromium } = require("playwright");

// Die Seiten laden ihre Daten erst im Browser: warten, bis nichts mehr lädt
async function bereit(seite) {
  await seite.waitForLoadState("networkidle").catch(() => {});
  await seite.waitForSelector("[aria-busy=true]", { state: "detached", timeout: 10000 }).catch(() => {});
}
const { einladen } = require("./einladen");
// Browser-Test gegen eine laufende App mit leerer Datenbank (siehe README).
// Screenshots landen im Ordner, der als erstes Argument übergeben wird (Standard: Temp-Ordner).
const path = require("node:path");
const S = process.argv[2] || require("node:os").tmpdir();
require("node:fs").mkdirSync(path.join(S, "shots"), { recursive: true });
const B = process.env.APP_URL || "http://localhost:3100";
const ok = (c, m) => { if (!c) throw new Error("FEHLER: " + m); console.log("✓ " + m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const fehler = [];
  p.on("pageerror", (e) => fehler.push(e.message));

  await p.goto(B + "/");
  await bereit(p);
  ok(await p.waitForURL(B + "/einrichtung/").then(() => true, () => false), "ohne Benutzer → Ersteinrichtung");
  await p.fill("#name", "Test Zugang");
  await p.fill("#email", "Test@Example.com");
  await p.fill("#passwort", "Testpasswort123");
  await p.fill("#passwort2", "Testpasswort123");
  await p.click("button");
  await p.waitForURL(B + "/");
  await bereit(p);
  await p.goto(B + "/finanzen");
  await bereit(p);
  ok(await p.isVisible("text=So geht"), "leere Übersicht zeigt Einstiegshilfe");

  const fix = async (bez, betrag, iv, kat, beginn) => {
    await p.goto(B + "/finanzen/fixkosten/neu");
    await bereit(p);
    await p.fill("#bezeichnung", bez);
    await p.fill("#betrag", betrag);
    await p.selectOption("#intervall", iv);
    await p.selectOption("#kategorie", kat);
    await p.fill("#beginn", beginn);
    await p.click("text=Speichern");
    await p.waitForURL(B + "/finanzen/fixkosten/");
    await bereit(p);
  };
  await fix("Werkstattmiete", "850,00", "monatlich", "Miete & Nebenkosten", "2026-01-01");
  await fix("Kfz-Versicherung Transporter", "1.440,00", "jaehrlich", "Versicherungen", "2026-01-01");
  await fix("TAIFUN Softwarepflege", "89,90", "monatlich", "Software & EDV", "2026-03-01");
  await fix("Leasing Transporter", "389", "monatlich", "Fahrzeuge", "2026-01-01");
  ok(await p.isVisible("text=1.448,90 €"), "Fixkosten pro Monat korrekt (850+120+89,90+389)");

  // Fehlerfall: ungültiger Betrag
  await p.goto(B + "/finanzen/rechnungen/neu");
  await bereit(p);
  await p.fill("#lieferant", "GC Gruppe");
  await p.fill("#brutto", "abc");
  await p.selectOption("#kategorie", "Material / Großhandel");
  await p.click("text=Speichern");
  await p.waitForSelector(".fehler-box");
  ok((await p.textContent(".fehler-box")).includes("gültigen Betrag"), "ungültiger Betrag wird abgelehnt");
  ok((await p.inputValue("#lieferant")) === "GC Gruppe", "Eingaben bleiben nach Fehlermeldung erhalten");

  const rechnung = async (o) => {
    await p.goto(B + "/finanzen/rechnungen/neu");
    await bereit(p);
    if (o.datei) await p.setInputFiles("#datei", o.datei);
    await p.fill("#lieferant", o.lieferant);
    await p.fill("#rechnungsnummer", o.nr || "");
    await p.fill("#rechnungsdatum", o.datum);
    if (o.faellig) await p.fill("#faelligAm", o.faellig);
    await p.fill("#brutto", o.brutto);
    await p.selectOption("#kategorie", o.kat);
    if (o.bezahlt) await p.fill("#bezahltAm", o.bezahlt);
    await p.click("text=Speichern");
    await p.waitForURL(B + "/finanzen/rechnungen/");
    await bereit(p);
  };
  await rechnung({ lieferant: "GC Gruppe", nr: "R-4711", datum: "2026-10-02", faellig: "2026-11-01", brutto: "2.380,00", kat: "Material / Großhandel", datei: path.join(__dirname, "rechnung.pdf") });
  await rechnung({ lieferant: "Würth", datum: "2026-10-10", faellig: "2026-10-20", brutto: "312,45", kat: "Werkzeug & Geräte" });
  await rechnung({ lieferant: "Aral", datum: "2026-10-15", brutto: "184,20", kat: "Kraftstoff", bezahlt: "2026-10-15" });
  await rechnung({ lieferant: "GC Gruppe", datum: "2026-09-12", brutto: "1.920,00", kat: "Material / Großhandel", bezahlt: "2026-09-30" });
  await rechnung({ lieferant: "Steuerbüro Meyer", datum: "2026-08-31", brutto: "416,50", kat: "Steuerberater & Gebühren", bezahlt: "2026-09-05" });
  ok(await p.locator("tbody span", { hasText: "überfällig" }).count() === 1, "Würth-Rechnung ist überfällig");
  ok(await p.isVisible("text=5.213,15 €"), "Summe aller Rechnungen korrekt");

  // Datei abrufen
  const [anfrage] = await Promise.all([
    ctx.waitForEvent("request", (a) => a.url().includes("token=")),
    p.click("button:text('ansehen')"),
  ]);
  const r = await p.request.get(anfrage.url());
  for (const tab of ctx.pages().slice(1)) await tab.close();
  ok(r.status() === 200 && r.headers()["content-type"] === "application/pdf", "hochgeladene PDF ist abrufbar");

  // Filter
  await p.goto(B + "/finanzen/rechnungen?monat=2026-10");
  await bereit(p);
  ok(await p.isVisible("text=2.876,65 €"), "Monatsfilter Oktober summiert richtig");

  // Gehälter
  const gehalt = async (name, brutto, ag) => {
    await p.goto(B + "/finanzen/gehaelter/neu");
    await bereit(p);
    await p.fill("#mitarbeiter", name);
    await p.fill("#brutto", brutto);
    await p.fill("#arbeitgeberanteil", ag);
    await p.fill("#gueltigAb", "2026-01-01");
    await p.click("text=Speichern");
    await p.waitForURL(B + "/finanzen/gehaelter/");
    await bereit(p);
  };
  await gehalt("Monteur A", "3.400,00", "720,00");
  await gehalt("Monteur B", "3.100,00", "650,00");
  await gehalt("Azubi C", "950,00", "200,00");
  ok(await p.isVisible("text=9.020,00 €"), "Personalkosten gesamt korrekt");

  // Übersicht (fester Monat, damit der Test auch später noch stimmt)
  await p.goto(B + "/finanzen?monat=2026-10");
  await bereit(p);
  const text = (await p.textContent("main")).replace(/\u00a0/g, " ");
  // Okt: Rechnungen 2876,65 + Fix 1448,90 + Personal 9020 = 13345,55
  ok(text.includes("13.345,55 €"), "Kosten gesamt Oktober korrekt");
  ok(text.includes("1 überfällig"), "Übersicht warnt vor überfälliger Rechnung");
  await p.screenshot({ path: S + "/shots/uebersicht-desktop.png", fullPage: true });
  await p.hover("svg rect >> nth=11");
  await p.waitForTimeout(200);
  await p.screenshot({ path: S + "/shots/uebersicht-hover.png" });

  // Als bezahlt markieren
  await p.goto(B + "/finanzen/rechnungen?status=ueberfaellig");
  await bereit(p);
  await p.click("text=als bezahlt markieren");
  await p.waitForTimeout(500);
  await p.goto(B + "/finanzen/rechnungen?status=ueberfaellig");
  await bereit(p);
  ok(await p.isVisible("text=Keine Rechnungen für diesen Filter"), "als bezahlt markieren funktioniert");

  // Mitarbeiter einladen; sie registrieren sich selbst mit dem Code
  await p.goto(B + "/registrieren/");
  await bereit(p);
  await p.fill("#email", "fremd@example.com");
  await p.fill("#code", "ABCDEFGHIJ");
  await p.fill("#passwort", "Startpasswort1");
  await p.fill("#passwort2", "Startpasswort1");
  await p.click("button");
  await p.waitForSelector(".fehler-box");
  ok((await p.textContent(".fehler-box")).includes("Einladungscode stimmen nicht"), "Registrierung ohne gültige Einladung wird abgelehnt");
  await einladen(browser, p, B, "Max Monteur", "max@example.com", "monteur");
  await einladen(browser, p, B, "Bea Büro", "bea@example.com", "buero");
  ok((await p.inputValue("#neu-name")) === "", "Formular wird nach dem Einladen geleert");
  await p.goto(B + "/einstellungen/benutzer/");
  await bereit(p);
  ok(await p.isVisible("text=bea@example.com") && !(await p.isVisible("text=Offene Einladungen")), "Monteur und Büro haben sich registriert");
  await p.fill("#neu-name", "Olaf Offen");
  await p.fill("#neu-email", "olaf@example.com");
  await p.click("button:text('Einladen')");
  await p.waitForSelector("text=Offene Einladungen");
  p.once("dialog", (d) => d.accept());
  await p.click("button:text('Zurückziehen')");
  await p.waitForSelector("text=Offene Einladungen", { state: "detached" });
  ok(true, "offene Einladung wird angezeigt und kann zurückgezogen werden");

  // Zugangsdaten ändern: Inhaber setzt neue E-Mail und neues Passwort, die Person ändert ihren Namen selbst
  await einladen(browser, p, B, "Tina Test", "tina@example.com", "monteur");
  await p.goto(B + "/einstellungen/benutzer/");
  await bereit(p);
  const tina = p.locator("div.border-b", { hasText: "Tina Test" });
  await tina.locator("summary").click();
  await tina.locator("input[name=email]").fill("tina.neu@example.com");
  await tina.locator("button:text('Name und E-Mail speichern')").click();
  await tina.locator("text=Name und E-Mail gespeichert").waitFor();
  await tina.locator("input[name=passwort]").fill("kurz");
  await tina.locator("input[name=passwort]").evaluate((e) => e.removeAttribute("minLength"));
  await tina.locator("button:text('Passwort setzen')").click();
  await tina.locator("text=mindestens 10 Zeichen").waitFor();
  await tina.locator("input[name=passwort]").fill("TinasNeuesPw1");
  await tina.locator("button:text('Passwort setzen')").click();
  await tina.locator("text=Neues Passwort gesetzt").waitFor();
  ok(await p.isVisible("text=tina.neu@example.com"), "Inhaber ändert E-Mail und Passwort eines Zugangs");

  const t = await (await browser.newContext()).newPage();
  await t.goto(B + "/login/");
  await t.fill("#email", "tina@example.com");
  await t.fill("#passwort", "Startpasswort1");
  await t.click("button");
  await t.waitForSelector(".fehler-box");
  await t.fill("#email", "tina.neu@example.com");
  await t.fill("#passwort", "TinasNeuesPw1");
  await t.click("button");
  await t.waitForURL(B + "/");
  ok(true, "Anmeldung nur noch mit neuer E-Mail und neuem Passwort");
  await t.goto(B + "/konto/");
  await bereit(t);
  await t.fill("#name", "Tina Neumann");
  await t.click("button:text('Name speichern')");
  await t.waitForSelector("text=Dein Name ist gespeichert");
  await t.goto(B + "/");
  await bereit(t);
  ok(await t.isVisible("text=Hallo Tina"), "Mitarbeiter ändert den eigenen Namen");
  await t.context().close();
  // Letzten Inhaber nicht deaktivierbar
  const meineZeile = p.locator("form", { hasText: "(du)" });
  await meineZeile.locator("select").selectOption("monteur");
  await meineZeile.locator("button").click();
  await p.waitForSelector("text=mindestens ein aktiver Inhaber");
  ok(true, "letzter Inhaber kann nicht herabgestuft werden");

  // Monteur-Rechte
  const m = await (await browser.newContext()).newPage();
  await m.goto(B + "/login");
  await bereit(m);
  await m.fill("#email", "max@example.com");
  await m.fill("#passwort", "Startpasswort1");
  await m.click("button");
  await m.waitForURL(B + "/");
  await bereit(m);
  ok(await m.isVisible("text=Hallo Max"), "Monteur landet auf seiner Startseite");
  await m.goto(B + "/finanzen/rechnungen");
  await bereit(m);
  ok(await m.waitForURL(B + "/").then(() => true, () => false), "Monteur kommt nicht an die Rechnungen");
  // Dass Monteure keine Rechnungsdateien abrufen können, prüft supabase/test/rechte.test.ts

  // Büro-Rechte
  const bc = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const bp = await bc.newPage();
  await bp.goto(B + "/login");
  await bereit(bp);
  await bp.fill("#email", "bea@example.com");
  await bp.fill("#passwort", "falsch-falsch");
  await bp.click("button");
  await bp.waitForSelector(".fehler-box");
  ok((await bp.inputValue("#email")) === "bea@example.com", "falsches Passwort wird abgelehnt, E-Mail bleibt stehen");
  await bp.fill("#passwort", "Startpasswort1");
  await bp.click("button");
  await bp.waitForURL(B + "/");
  await bereit(bp);
  await bp.goto(B + "/finanzen?monat=2026-10");
  await bereit(bp);
  const btext = (await bp.textContent("body")).replace(/\u00a0/g, " ");
  ok(!btext.includes("Gehälter") && !btext.includes("Arbeitgeberanteile") && !btext.includes("9.020"), "Büro sieht keine Gehälter");
  ok(btext.includes("4.325,55 €"), "Büro-Summe ohne Personal korrekt");
  await bp.goto(B + "/finanzen/gehaelter");
  await bereit(bp);
  ok(await bp.waitForURL(B + "/").then(() => true, () => false), "Büro kommt nicht an die Gehälter (umgeleitet auf Startseite)");
  await bp.goto(B + "/finanzen");
  await bereit(bp);
  await bp.screenshot({ path: S + "/shots/uebersicht-handy.png", fullPage: true });
  await bp.goto(B + "/finanzen/rechnungen/neu");
  await bereit(bp);
  await bp.screenshot({ path: S + "/shots/rechnung-handy.png", fullPage: true });
  const breite = await bp.evaluate(() => document.documentElement.scrollWidth);
  ok(breite <= 390, "keine waagerechte Scrollleiste am Handy (" + breite + "px)");

  ok(fehler.length === 0, "keine JavaScript-Fehler im Browser " + fehler.join("; "));
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
