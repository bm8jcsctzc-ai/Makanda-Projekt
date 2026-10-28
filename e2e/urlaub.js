// Browser-Test Urlaubsplaner – läuft nach den anderen Tests gegen dieselbe Datenbank.
// Feste Daten im Jahr 2030, damit Arbeitstage und Feiertage immer gleich sind.
const path = require("node:path");
const { chromium } = require("playwright");

// Die Seiten laden ihre Daten erst im Browser: warten, bis nichts mehr lädt
async function bereit(seite) {
  await seite.waitForLoadState("networkidle").catch(() => {});
  await seite.waitForSelector("[aria-busy=true]", { state: "detached", timeout: 10000 }).catch(() => {});
}
const { einladen } = require("./einladen");
const S = process.argv[2] || require("node:os").tmpdir();
require("node:fs").mkdirSync(path.join(S, "shots"), { recursive: true });
const B = process.env.APP_URL || "http://localhost:3100";
const ok = (c, m) => { if (!c) throw new Error("FEHLER: " + m); console.log("✓ " + m); };
const norm = (t) => t.replace(/ /g, " ");
const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());

async function login(browser, email, pw, mobil = false) {
  const ctx = await browser.newContext(mobil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => { throw new Error("JS-Fehler: " + e.message); });
  p.on("dialog", (d) => d.accept());
  await p.goto(B + "/login");
  await bereit(p);
  await p.fill("#email", email);
  await p.fill("#passwort", pw);
  await p.click("button");
  await p.waitForURL(B + "/");
  await bereit(p);
  return p;
}

(async () => {
  const browser = await chromium.launch();
  const p = await login(browser, "test@example.com", "Testpasswort123");

  // Bundesland und Team
  await p.goto(B + "/einstellungen/wartung");
  await bereit(p);
  ok((await p.inputValue("#bundesland")) === "BW", "Baden-Württemberg ist voreingestellt");
  await p.click("button:text('Speichern')");
  await p.waitForSelector("text=Gespeichert.");
  await p.goto(B + "/einstellungen/benutzer");
  await bereit(p);
  const bea = p.locator("form", { hasText: "bea@example.com" });
  await bea.locator("input[name=imTeam]").uncheck();
  await bea.locator("button").click();
  await bea.locator("text=Gespeichert").waitFor();
  await einladen(browser, p, B, "Moritz Monteur", "moritz@example.com", "monteur");
  ok(true, "Büro aus dem Team genommen, zweiter Monteur angelegt");

  // ---- Max beantragt am Handy ----
  const m = await login(browser, "max@example.com", "Startpasswort1", true);
  await m.goto(B + "/urlaub/neu");
  await bereit(m);
  ok(!(await m.isVisible("#benutzerId")) && !(await m.isVisible("#art")), "Monteur kann nur für sich Urlaub beantragen");
  await m.fill("#von", "2030-10-28");
  await m.fill("#bis", "2030-11-01");
  ok(norm(await m.textContent("[data-testid=arbeitstage]")).includes("4 Tage"), "Live-Berechnung: Allerheiligen (Fr, 01.11.2030) wird abgezogen (4 Tage)");
  await m.fill("#von", "2030-08-03");
  await m.fill("#bis", "2030-08-04");
  await m.click("button:text('Urlaub beantragen')");
  await m.waitForSelector(".fehler-box");
  ok((await m.textContent(".fehler-box")).includes("kein Arbeitstag"), "Urlaub nur am Wochenende wird abgelehnt");
  await m.fill("#von", "2030-08-05");
  await m.fill("#bis", "2030-08-16");
  ok(norm(await m.textContent("[data-testid=arbeitstage]")).includes("10 Tage"), "zwei Wochen = 10 Urlaubstage");
  await m.click("button:text('Urlaub beantragen')");
  await m.waitForURL(/\/urlaub\/ansehen\/\?id=[0-9a-f-]{36}$/);
  await bereit(m);
  const antragUrl = m.url();
  ok(await m.isVisible("text=beantragt"), "Antrag gestellt");
  await m.screenshot({ path: path.join(S, "shots", "urlaub-antrag-handy.png"), fullPage: true });

  await m.goto(B + "/urlaub/neu");
  await bereit(m);
  await m.fill("#von", "2030-08-12");
  await m.fill("#bis", "2030-08-13");
  await m.click("button:text('Urlaub beantragen')");
  await m.waitForSelector(".fehler-box");
  ok((await m.textContent(".fehler-box")).includes("schon eine Abwesenheit"), "überlappender Antrag wird abgelehnt");

  // ---- Inhaber plant trotzdem einen Einsatz in der Zeit ----
  await p.goto(B + "/kunden/neu");
  await bereit(p);
  await p.fill("#name", "Urlaubstest GmbH");
  await p.click("button:text('Speichern')");
  await p.waitForURL(/\/kunden\/ansehen\/\?id=[0-9a-f-]{36}$/);
  await bereit(p);
  await p.click("text=+ Einsatz planen");
  await p.waitForURL(/\/einsaetze\/neu/);
  await bereit(p);
  await p.selectOption("#monteurId", { label: "Max Monteur" });
  await p.fill("#datum", "2030-08-07");
  ok(await p.isVisible("text=Max Monteur ist an diesem Tag abwesend (Urlaub beantragt)"), "Einsatzplanung warnt vor Urlaub");
  await p.click("button:text('Speichern')");
  await p.waitForURL(/\/einsaetze\/ansehen\/\?id=[0-9a-f-]{36}$/);
  await bereit(p);
  ok(await p.isVisible("text=ist an diesem Tag abwesend"), "Einsatzseite warnt ebenfalls");

  // ---- Inhaber entscheidet ----
  await p.goto(B + "/urlaub");
  await bereit(p);
  ok(await p.isVisible("text=Offene Anträge · 1"), "Inhaber sieht offenen Antrag");
  await p.click("text=prüfen →");
  await p.waitForURL(antragUrl);
  await bereit(p);
  ok(norm(await p.textContent("main")).includes("1 geplante Einsätze in diesem Zeitraum"), "Konflikt mit geplantem Einsatz wird angezeigt");
  await p.click("button:text('Ablehnen')");
  await p.waitForSelector(".fehler-box");
  ok((await p.textContent(".fehler-box")).includes("begründen"), "Ablehnen ohne Begründung geht nicht");
  await p.click("button:text('Genehmigen')");
  await p.waitForSelector("span:text-is('genehmigt')");
  ok(!(await p.isVisible("button:text('Genehmigen')")), "Urlaub genehmigt, Entscheidung nicht mehr möglich");

  await p.goto(B + "/einstellungen/emails");
  await bereit(p);
  const mails = norm(await p.textContent("main"));
  ok(mails.includes("Urlaubsantrag von Max Monteur") && mails.includes("an test@example.com"), "Inhaber bekam Mail zum Antrag");
  ok(mails.includes("wurde genehmigt") && mails.includes("an max@example.com"), "Max bekam Mail zur Genehmigung");

  // ---- Büro trägt Krankheit ein ----
  const bp = await login(browser, "bea@example.com", "Startpasswort1");
  await bp.goto(B + "/urlaub/neu");
  await bereit(bp);
  await bp.selectOption("#benutzerId", { label: "Max Monteur" });
  await bp.selectOption("#art", "krank");
  await bp.fill("#von", "2030-08-19");
  await bp.fill("#bis", "2030-08-20");
  await bp.click("button:text('Eintragen')");
  await bp.waitForURL(/\/urlaub\/ansehen\/\?id=[0-9a-f-]{36}$/);
  await bereit(bp);
  ok(await bp.isVisible("text=genehmigt") && await bp.isVisible("text=Krank: Max Monteur"), "Krankmeldung gilt sofort");
  await bp.goto(B + "/urlaub/neu");
  await bereit(bp);
  await bp.selectOption("#benutzerId", { label: "Moritz Monteur" });
  await bp.selectOption("#art", "krank");
  await bp.fill("#von", heute);
  await bp.fill("#bis", heute);
  await bp.click("button:text('Eintragen')");
  await bp.waitForURL(/\/urlaub\/ansehen\/\?id=[0-9a-f-]{36}$/);
  await bereit(bp);

  // ---- Kalender und Datenschutz ----
  await p.goto(B + "/urlaub?monat=2030-08");
  await bereit(p);
  const zelle = (seite, person, tag) => seite.locator(`td[data-person='${person}'][data-tag='${tag}']`);
  ok((await zelle(p, "Max Monteur", "2030-08-06").getAttribute("data-abwesend")) === "genehmigt", "Kalender zeigt genehmigten Urlaub");
  ok((await zelle(p, "Max Monteur", "2030-08-10").getAttribute("data-abwesend")) === null, "Wochenende im Urlaub wird nicht gezählt");
  ok((await zelle(p, "Max Monteur", "2030-08-19").getAttribute("title")).includes("Krank"), "Inhaber sieht den Grund Krank");
  ok((await p.locator("tr", { hasText: "Bea Büro" }).count()) === 0, "Büro-Zugang erscheint nicht im Kalender");
  await p.screenshot({ path: path.join(S, "shots", "teamkalender.png"), fullPage: true });

  const mo = await login(browser, "moritz@example.com", "Startpasswort1", true);
  await mo.goto(B + "/urlaub?monat=2030-08");
  await bereit(mo);
  const titel = await zelle(mo, "Max Monteur", "2030-08-19").getAttribute("title");
  ok(titel.includes("abwesend") && !titel.includes("Krank"), "Kollege sieht nur „abwesend“, nicht „Krank“");
  await mo.goto(antragUrl);
  await bereit(mo);
  ok((await mo.textContent("main")).includes("Dafür fehlt die Berechtigung") && !(await mo.isVisible("text=Max Monteur")), "Kollege kann fremde Anträge nicht öffnen");
  await mo.goto(B + "/urlaub/konten");
  await bereit(mo);
  ok(await mo.waitForURL(B + "/").then(() => true, () => false), "Monteur kommt nicht an die Urlaubskonten");

  // ---- Urlaubskonto ----
  await p.goto(B + "/urlaub/konten?jahr=2030");
  await bereit(p);
  const maxZeile = p.locator("tr", { hasText: "Max Monteur" });
  ok(norm(await maxZeile.textContent()).includes("10 Tage") && norm(await maxZeile.textContent()).includes("20 Tage"), "Konto 2030: 10 genehmigt, 20 Rest (Krankheit zählt nicht)");
  await maxZeile.locator("input[name=uebertrag]").fill("2,5");
  await maxZeile.locator("button").click();
  await maxZeile.locator("text=✓").waitFor();
  await p.reload();
  ok(norm(await p.locator("tr", { hasText: "Max Monteur" }).textContent()).includes("22,5 Tage"), "Übertrag 2,5 Tage erhöht den Rest auf 22,5");

  // ---- Antrag zurückziehen ----
  await m.goto(B + "/urlaub/neu");
  await bereit(m);
  await m.fill("#von", "2030-12-02");
  await m.fill("#bis", "2030-12-03");
  await m.click("button:text('Urlaub beantragen')");
  await m.waitForURL(/\/urlaub\/ansehen\/\?id=[0-9a-f-]{36}$/);
  await bereit(m);
  await m.click("button:text('Antrag zurückziehen')");
  await m.waitForURL(B + "/urlaub/");
  await bereit(m);
  ok(!(norm(await m.textContent("main")).includes("02.12.2030")), "Monteur kann offenen Antrag zurückziehen");

  // ---- Startseite ----
  await p.goto(B + "/");
  await bereit(p);
  ok(norm(await p.textContent("main")).includes("Heute abwesend: Moritz Monteur (Krank)"), "Startseite zeigt, wer heute fehlt");

  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
