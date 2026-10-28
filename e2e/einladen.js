// Lädt eine Person über Einstellungen › Benutzer ein und registriert sie mit dem Code (Passwort "Startpasswort1").
module.exports.einladen = async function einladen(browser, p, B, name, email, rolle) {
  await p.goto(B + "/einstellungen/benutzer/");
  await p.fill("#neu-name", name);
  await p.fill("#neu-email", email);
  await p.selectOption("#neu-rolle", rolle);
  await p.click("button:text('Einladen')");
  const meldung = await p.locator(`text=${name} ist eingeladen`).textContent();
  const code = meldung.match(/Einladungscode: (\w+)/)[1];

  const ctx = await browser.newContext();
  const r = await ctx.newPage();
  await r.goto(B + "/registrieren/");
  await r.fill("#email", email.toUpperCase());
  await r.fill("#code", code.toLowerCase());
  await r.fill("#passwort", "Startpasswort1");
  await r.fill("#passwort2", "Startpasswort1");
  await r.click("button");
  await r.waitForURL(B + "/");
  await r.locator(`text=Hallo ${name.split(" ")[0]}`).waitFor();
  await ctx.close();
  return code;
};
