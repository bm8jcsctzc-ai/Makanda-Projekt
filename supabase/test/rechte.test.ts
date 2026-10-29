import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { als, neueDatenbank, registrieren, rpc } from "./datenbank";

// Prüft die Datenbank-Schnittstelle so, wie die App sie über Supabase nutzt: als anonymer Besucher,
// als Inhaber, Büro und Monteur. Besonders wichtig: was jemand NICHT darf.

let db: PGlite;
let inhaber: string;
let buero: string;
let monteur: string;
let kollege: string;
let kunde: string;
let anlage: string;
let einsatzMonteur: string;
let einsatzKollege: string;

const heute = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());

async function einladen(name: string, email: string, rolle: string) {
  const code = await rpc<string>(db, inhaber, "einladung_erstellen", { p_name: name, p_email: email, p_rolle: rolle });
  return registrieren(db, email, { einladungscode: code });
}

beforeAll(async () => {
  db = await neueDatenbank();
  inhaber = await registrieren(db, "chef@example.com", { name: "Thomas Kern" });
  buero = await einladen("Büro", "buero@example.com", "buero");
  monteur = await einladen("Jonas Weber", "jonas@example.com", "monteur");
  kollege = await einladen("Luca Schmid", "luca@example.com", "monteur");
  kunde = await rpc(db, buero, "kunde_speichern", { p_id: null, p_daten: { name: "Familie Brenner", ort: "Esslingen", email: "b@example.com" } });
  anlage = await rpc(db, buero, "anlage_speichern", {
    p_id: null,
    p_kunde_id: kunde,
    p_daten: { typ: "gas", hersteller: "Thermotec", wartungsintervall_monate: 12 },
  });
  einsatzMonteur = await rpc(db, buero, "einsatz_speichern", {
    p_id: null,
    p_daten: { kunde_id: kunde, anlage_id: anlage, monteur_id: monteur, datum: heute(), art: "wartung" },
  });
  einsatzKollege = await rpc(db, buero, "einsatz_speichern", {
    p_id: null,
    p_daten: { kunde_id: kunde, monteur_id: kollege, datum: heute(), art: "stoerung" },
  });
}, 60000);

describe("Anmeldung und Einladungen", () => {
  it("erster Login wird Inhaber, danach ist keine Ersteinrichtung mehr nötig", async () => {
    expect(((await rpc(db, inhaber, "ich")) as { rolle: string }).rolle).toBe("inhaber");
    expect(await rpc(db, null, "ersteinrichtung_noetig")).toBe(false);
  });

  it("ohne gültige Einladung gibt es kein Profil und keinen Zugriff", async () => {
    const fremd = await registrieren(db, "fremd@example.com");
    expect(await rpc(db, fremd, "ich")).toBeNull();
    await expect(rpc(db, fremd, "kunden")).rejects.toThrow("Bitte zuerst anmelden");

    await rpc(db, inhaber, "einladung_erstellen", { p_name: "Ben", p_email: "ben@example.com", p_rolle: "monteur" });
    const falsch = await registrieren(db, "ben@example.com", { einladungscode: "FALSCH" });
    expect(await rpc(db, falsch, "ich")).toBeNull();
  });

  it("Einladungscode prüfen geht auch vor dem Anmelden", async () => {
    const code = await rpc<string>(db, inhaber, "einladung_erstellen", { p_name: "Mia", p_email: "mia@example.com", p_rolle: "monteur" });
    expect(await rpc(db, null, "einladung_pruefen", { p_email: "MIA@example.com", p_code: code.toLowerCase() })).toBe(true);
    expect(await rpc(db, null, "einladung_pruefen", { p_email: "mia@example.com", p_code: "XYZ" })).toBe(false);
  });

  it("nur der Inhaber verwaltet Benutzer; der letzte Inhaber bleibt", async () => {
    await expect(rpc(db, buero, "benutzer_liste")).rejects.toThrow("Berechtigung");
    await expect(rpc(db, monteur, "einladung_erstellen", { p_name: "X", p_email: "x@example.com", p_rolle: "inhaber" })).rejects.toThrow("Berechtigung");
    await expect(
      rpc(db, inhaber, "benutzer_aendern", { p_id: inhaber, p_rolle: "monteur", p_aktiv: true, p_im_team: true }),
    ).rejects.toThrow("mindestens ein aktiver Inhaber");
  });

  it("deaktivierte Benutzer verlieren sofort den Zugriff", async () => {
    const ex = await einladen("Ex", "ex@example.com", "monteur");
    await rpc(db, inhaber, "benutzer_aendern", { p_id: ex, p_rolle: "monteur", p_aktiv: false, p_im_team: false });
    await expect(rpc(db, ex, "kunden")).rejects.toThrow("Bitte zuerst anmelden");
  });

  it("anonyme Besucher kommen an nichts außer der Ersteinrichtungs- und Code-Prüfung", async () => {
    await expect(rpc(db, null, "ich")).rejects.toThrow(/permission denied/);
    await expect(rpc(db, null, "kunden")).rejects.toThrow(/permission denied/);
  });
});

describe("Benutzer bearbeiten", () => {
  const passwortStimmt = async (id: string, pw: string) =>
    (await db.query<{ ok: boolean }>("select encrypted_password = extensions.crypt($1, encrypted_password) as ok from auth.users where id = $2", [pw, id])).rows[0].ok;

  it("Inhaber ändert Name, E-Mail und Passwort; danach gilt die neue Anmeldung", async () => {
    const id = await einladen("Tim Test", "tim@example.com", "monteur");
    await rpc(db, inhaber, "benutzer_daten_aendern", { p_id: id, p_name: " Tim Neu ", p_email: "Tim.Neu@Example.com" });
    expect(await rpc(db, id, "ich")).toMatchObject({ name: "Tim Neu", email: "tim.neu@example.com" });
    expect((await db.query<{ email: string }>("select email from auth.users where id = $1", [id])).rows[0].email).toBe("tim.neu@example.com");

    await rpc(db, inhaber, "passwort_setzen", { p_id: id, p_passwort: "NeuesPasswort1" });
    expect(await passwortStimmt(id, "NeuesPasswort1")).toBe(true);
    expect(await passwortStimmt(id, "falsch-falsch")).toBe(false);
  });

  it("prüft Eingaben: doppelte E-Mail, kurzes Passwort, leerer Name", async () => {
    await expect(rpc(db, inhaber, "benutzer_daten_aendern", { p_id: monteur, p_name: "Jonas", p_email: "LUCA@example.com" })).rejects.toThrow("schon verwendet");
    await expect(rpc(db, inhaber, "benutzer_daten_aendern", { p_id: monteur, p_name: "Jonas", p_email: "keine-adresse" })).rejects.toThrow("gültige E-Mail");
    await expect(rpc(db, inhaber, "benutzer_daten_aendern", { p_id: monteur, p_name: " ", p_email: "jonas@example.com" })).rejects.toThrow("Namen");
    await expect(rpc(db, inhaber, "passwort_setzen", { p_id: monteur, p_passwort: "kurz" })).rejects.toThrow("10 Zeichen");
  });

  it("nur der Inhaber darf fremde Zugänge ändern; jeder ändert seinen eigenen Namen", async () => {
    for (const wer of [buero, monteur]) {
      await expect(rpc(db, wer, "passwort_setzen", { p_id: kollege, p_passwort: "Uebernahme123" })).rejects.toThrow("Berechtigung");
      await expect(rpc(db, wer, "benutzer_daten_aendern", { p_id: kollege, p_name: "X", p_email: "x@example.com" })).rejects.toThrow("Berechtigung");
    }
    await expect(rpc(db, null, "passwort_setzen", { p_id: kollege, p_passwort: "Uebernahme123" })).rejects.toThrow();
    await rpc(db, monteur, "mein_name_aendern", { p_name: "Jonas W." });
    expect(await rpc(db, monteur, "ich")).toMatchObject({ name: "Jonas W." });
    await rpc(db, monteur, "mein_name_aendern", { p_name: "Jonas Weber" });
  });
});

describe("Kunden-Import", () => {
  it("legt neu an und aktualisiert beim zweiten Import, ohne Daten zu löschen", async () => {
    const erst = [
      { taifun_kundennr: "K-100", name: "Import Eins", plz: "72072", ort: "Tübingen", telefon: "07071 1" },
      { taifun_kundennr: null, name: "Ohne Nummer", plz: "70173", ort: "Stuttgart" },
      { taifun_kundennr: null, name: "  ", ort: "leer" },
    ];
    expect(await rpc(db, buero, "kunden_importieren", { p_kunden: erst })).toEqual({ neu: 2, aktualisiert: 0 });
    const id = (await db.query<{ id: string }>("select id from kunde where taifun_kundennr = 'K-100'")).rows[0].id;
    await db.query("update kunde set hinweise = 'Hund im Haus' where id = $1", [id]);

    const zweit = [
      { taifun_kundennr: "K-100", name: "Import Eins GmbH", plz: "72072", ort: "", telefon: "07071 2" },
      { taifun_kundennr: null, name: "ohne nummer", plz: "70173", ort: "Stuttgart-Mitte" },
    ];
    expect(await rpc(db, buero, "kunden_importieren", { p_kunden: zweit })).toEqual({ neu: 0, aktualisiert: 2 });
    const k = (await db.query<{ name: string; ort: string; telefon: string; hinweise: string }>("select * from kunde where id = $1", [id])).rows[0];
    expect(k).toMatchObject({ name: "Import Eins GmbH", ort: "Tübingen", telefon: "07071 2", hinweise: "Hund im Haus" });
    expect((await db.query("select 1 from kunde where lower(name) = 'ohne nummer'")).rows).toHaveLength(1);
  });

  it("nur Inhaber und Büro dürfen importieren", async () => {
    await expect(rpc(db, monteur, "kunden_importieren", { p_kunden: [{ name: "X" }] })).rejects.toThrow("Berechtigung");
    await expect(rpc(db, null, "kunden_importieren", { p_kunden: [{ name: "X" }] })).rejects.toThrow();
    await expect(rpc(db, buero, "kunden_importieren", { p_kunden: { name: "X" } })).rejects.toThrow("Ungültige Daten");
  });
});

describe("Tabellen sind direkt gesperrt", () => {
  it.each(["profil", "rechnung", "personalkosten", "kunde", "einsatz", "abwesenheit", "einladung"])("%s", async (tabelle) => {
    await expect(als(db, inhaber, (tx) => tx.query(`select * from public.${tabelle}`))).rejects.toThrow(/permission denied/);
  });

  it("interne Funktionen sind nicht aufrufbar", async () => {
    await expect(als(db, inhaber, (tx) => tx.query("select intern.wartungsdaten(current_date)"))).rejects.toThrow(/permission denied/);
  });
});

describe("Finanzen", () => {
  it("Monteure sehen keine Finanzen", async () => {
    await expect(rpc(db, monteur, "finanz_daten")).rejects.toThrow("Berechtigung");
    await expect(rpc(db, monteur, "rechnung_speichern", { p_id: null, p_daten: { lieferant: "X", rechnungsdatum: heute(), brutto_cent: 100, kategorie: "Sonstiges" } })).rejects.toThrow("Berechtigung");
  });

  it("Büro sieht Rechnungen und Fixkosten, aber keine Gehälter", async () => {
    await rpc(db, buero, "rechnung_speichern", { p_id: null, p_daten: { lieferant: "Großhandel", rechnungsdatum: heute(), brutto_cent: 11900, mwst_satz: 19, kategorie: "Material / Großhandel" } });
    await rpc(db, inhaber, "personalkosten_speichern", { p_id: null, p_daten: { mitarbeiter: "Jonas", brutto_cent: 340000, gueltig_ab: "2026-01-01" } });
    const b = await rpc<{ rechnungen: unknown[]; personal: unknown }>(db, buero, "finanz_daten");
    expect(b.rechnungen).toHaveLength(1);
    expect(b.personal).toBeNull();
    await expect(rpc(db, buero, "personalkosten_speichern", { p_id: null, p_daten: { mitarbeiter: "X", brutto_cent: 1, gueltig_ab: "2026-01-01" } })).rejects.toThrow("Berechtigung");
    const i = await rpc<{ personal: unknown[] }>(db, inhaber, "finanz_daten");
    expect(i.personal).toHaveLength(1);
  });

  it("Rechnung löschen gibt den Dateipfad zurück", async () => {
    const datei = await rpc<string>(db, buero, "datei_registrieren", { p_pfad: "finanzen/2026/10/r.pdf", p_name: "r.pdf", p_typ: "application/pdf", p_groesse: 10 });
    const { id } = await rpc<{ id: string }>(db, buero, "rechnung_speichern", { p_id: null, p_daten: { lieferant: "Y", rechnungsdatum: heute(), brutto_cent: 500, kategorie: "Sonstiges", datei_id: datei } });
    expect(await rpc(db, buero, "rechnung_loeschen", { p_id: id })).toBe("finanzen/2026/10/r.pdf");
  });

  it("Monteure können keine Finanz-Dateien eintragen", async () => {
    await expect(rpc(db, monteur, "datei_registrieren", { p_pfad: "finanzen/x.pdf", p_name: "x", p_typ: "application/pdf", p_groesse: 1 })).rejects.toThrow("Berechtigung");
  });
});

describe("Einsätze und Checklisten", () => {
  it("Monteur bearbeitet nur eigene Einsätze", async () => {
    const v = await rpc<{ id: string; name: string }[]>(db, monteur, "vorlagen");
    const gas = v.find((x) => x.name.startsWith("Wartung Gas"))!;
    await expect(rpc(db, monteur, "checkliste_starten", { p_einsatz_id: einsatzKollege, p_vorlage_id: gas.id })).rejects.toThrow("nicht dein Einsatz");
    await expect(rpc(db, monteur, "einsatz_abschliessen", { p_id: einsatzKollege, p_bemerkung: "" })).rejects.toThrow("nicht dein Einsatz");
    await expect(rpc(db, monteur, "einsatz_speichern", { p_id: einsatzMonteur, p_daten: { kunde_id: kunde, datum: heute(), art: "wartung", monteur_id: monteur } })).rejects.toThrow("Berechtigung");
    const e = await rpc<{ darf: boolean }>(db, monteur, "einsatz", { p_id: einsatzKollege });
    expect(e.darf).toBe(false);
  });

  it("Checkliste: Pflichtfelder, Zahlen und nächstes Wartungsdatum", async () => {
    const v = await rpc<{ id: string; name: string; punkte: { id: string; typ: string; pflicht: boolean }[] }[]>(db, monteur, "vorlagen");
    const gas = v.find((x) => x.name.startsWith("Wartung Gas"))!;
    const id = await rpc<string>(db, monteur, "checkliste_starten", { p_einsatz_id: einsatzMonteur, p_vorlage_id: gas.id });
    await expect(rpc(db, monteur, "einsatz_abschliessen", { p_id: einsatzMonteur, p_bemerkung: "" })).rejects.toThrow("Checkliste abschließen");
    await expect(rpc(db, monteur, "checkliste_speichern", { p_id: id, p_antworten: {}, p_abschliessen: true })).rejects.toThrow("Noch nicht ausgefüllt");

    const antworten: Record<string, { wert: string }> = {};
    for (const p of gas.punkte) antworten[p.id] = { wert: p.typ === "pruefung" ? "io" : p.typ === "messwert" ? "1,5" : "ok" };
    antworten.co = { wert: "viel" };
    await expect(rpc(db, monteur, "checkliste_speichern", { p_id: id, p_antworten: antworten, p_abschliessen: true })).rejects.toThrow("Keine gültige Zahl");
    antworten.co = { wert: "40" };
    await rpc(db, monteur, "checkliste_speichern", { p_id: id, p_antworten: { ...antworten, unbekannt: { wert: "x" } }, p_abschliessen: true });

    const c = await rpc<{ c: { abgeschlossen: boolean; antworten: Record<string, unknown> }; bearbeitbar: boolean }>(db, monteur, "checkliste", { p_id: id });
    expect(c.c.abgeschlossen).toBe(true);
    expect(c.c.antworten.unbekannt).toBeUndefined();
    expect(c.bearbeitbar).toBe(false);
    await expect(rpc(db, monteur, "checkliste_loeschen", { p_id: id })).rejects.toThrow("Berechtigung");
    await expect(rpc(db, monteur, "checkliste_wieder_oeffnen", { p_id: id })).rejects.toThrow("Berechtigung");

    const a = await rpc<{ anlage: { letzte_wartung_am: string; naechste_wartung_am: string } }>(db, buero, "anlage", { p_id: anlage });
    expect(a.anlage.letzte_wartung_am).toBe(heute());
    expect(a.anlage.naechste_wartung_am.slice(0, 4)).toBe(String(Number(heute().slice(0, 4)) + 1));

    await rpc(db, monteur, "einsatz_abschliessen", { p_id: einsatzMonteur, p_bemerkung: "fertig" });
    const e = await rpc<{ e: { status: string } }>(db, monteur, "einsatz", { p_id: einsatzMonteur });
    expect(e.e.status).toBe("abgeschlossen");
  });

  it("Fotos: nur eigene Uploads verknüpfen, löschen nur Büro oder Fotograf", async () => {
    const datei = await rpc<string>(db, monteur, "datei_registrieren", { p_pfad: "technik/2026/10/a.jpg", p_name: "a.jpg", p_typ: "image/jpeg", p_groesse: 5 });
    await expect(
      rpc(db, kollege, "foto_speichern", { p_datei_id: datei, p_kunde_id: kunde, p_einsatz_id: null, p_anlage_id: anlage, p_kategorie: "typenschild", p_beschreibung: null }),
    ).rejects.toThrow("Foto nicht gefunden");
    const foto = await rpc<string>(db, monteur, "foto_speichern", { p_datei_id: datei, p_kunde_id: kunde, p_einsatz_id: null, p_anlage_id: anlage, p_kategorie: "typenschild", p_beschreibung: "Schild" });
    await expect(rpc(db, kollege, "foto_loeschen", { p_id: foto })).rejects.toThrow("Berechtigung");
    expect(await rpc(db, monteur, "foto_loeschen", { p_id: foto })).toBe("technik/2026/10/a.jpg");
  });
});

describe("Urlaub", () => {
  it("Monteur beantragt nur Urlaub für sich selbst; der Inhaber bekommt eine Mail", async () => {
    const id = await rpc<string>(db, monteur, "abwesenheit_eintragen", {
      p_daten: { benutzer_id: kollege, art: "krank", von: "2030-08-05", bis: "2030-08-09" },
      p_tage: 5,
    });
    const a = await rpc<{ a: { benutzer_id: string; art: string; status: string } }>(db, monteur, "abwesenheit", { p_id: id });
    expect(a.a).toMatchObject({ benutzer_id: monteur, art: "urlaub", status: "beantragt" });
    const mails = await rpc<{ an: string; betreff: string; status: string; text: string }[]>(db, buero, "mail_protokoll");
    expect(mails[0]).toMatchObject({ an: "chef@example.com", betreff: "Urlaubsantrag von Jonas Weber", status: "wartend" });
    expect(mails[0].text).toContain("(5 Tage)");
  });

  it("überlappende Anträge werden abgelehnt", async () => {
    await expect(rpc(db, monteur, "abwesenheit_eintragen", { p_daten: { von: "2030-08-08", bis: "2030-08-12" } })).rejects.toThrow("schon eine Abwesenheit");
  });

  it("Kollegen sehen nur „abwesend“, das Büro sieht den Grund", async () => {
    await rpc(db, buero, "abwesenheit_eintragen", { p_daten: { benutzer_id: kollege, art: "krank", von: "2030-08-12", bis: "2030-08-13" } });
    const sichtMonteur = await rpc<{ name: string; art: string | null; status: string }[]>(db, monteur, "abwesenheiten", { p_von: "2030-08-01", p_bis: "2030-08-31" });
    expect(sichtMonteur.find((x) => x.name === "Luca Schmid")).toMatchObject({ art: null, status: "genehmigt" });
    expect(sichtMonteur.find((x) => x.name === "Jonas Weber")?.art).toBe("urlaub");
    const sichtBuero = await rpc<{ name: string; art: string | null }[]>(db, buero, "abwesenheiten", { p_von: "2030-08-01", p_bis: "2030-08-31" });
    expect(sichtBuero.find((x) => x.name === "Luca Schmid")?.art).toBe("krank");
  });

  it("nur der Inhaber genehmigt; Ablehnen nur mit Begründung", async () => {
    const offen = (await rpc<{ offen: { id: string }[] }>(db, inhaber, "urlaub_uebersicht", { p_jahr: 2030 })).offen;
    expect(offen).toHaveLength(1);
    await expect(rpc(db, buero, "abwesenheit_entscheiden", { p_id: offen[0].id, p_genehmigt: true, p_kommentar: null })).rejects.toThrow("Berechtigung");
    await expect(rpc(db, inhaber, "abwesenheit_entscheiden", { p_id: offen[0].id, p_genehmigt: false, p_kommentar: " " })).rejects.toThrow("begründen");
    await rpc(db, inhaber, "abwesenheit_entscheiden", { p_id: offen[0].id, p_genehmigt: true, p_kommentar: null });
    const mails = await rpc<{ an: string; betreff: string }[]>(db, buero, "mail_protokoll");
    expect(mails[0]).toMatchObject({ an: "jonas@example.com", betreff: "Dein Urlaub vom 05.08.2030 wurde genehmigt" });
  });

  it("Monteure sehen keine fremden Anträge und keine Urlaubskonten", async () => {
    const fremd = (await rpc<{ id: string; name: string }[]>(db, buero, "abwesenheiten", { p_von: "2030-08-01", p_bis: "2030-08-31" })).find((x) => x.name === "Luca Schmid")!;
    await expect(rpc(db, monteur, "abwesenheit", { p_id: fremd.id })).rejects.toThrow("Berechtigung");
    await expect(rpc(db, monteur, "abwesenheit_loeschen", { p_id: fremd.id })).rejects.toThrow("Berechtigung");
    await expect(rpc(db, monteur, "urlaubskonten", { p_jahr: 2030 })).rejects.toThrow("Berechtigung");
  });
});

describe("Speicher-Regeln", () => {
  const hochladen = (wer: string, name: string) =>
    als(db, wer, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('dateien', $1)", [name]));
  const sichtbar = async (wer: string, name: string) =>
    (await als(db, wer, (tx) => tx.query("select 1 from storage.objects where name = $1", [name]))).rows.length > 0;

  it("Monteure können keine Rechnungen hochladen oder sehen", async () => {
    await expect(hochladen(monteur, "finanzen/2026/10/geheim.pdf")).rejects.toThrow(/row-level security/);
    await hochladen(buero, "finanzen/2026/10/beleg.pdf");
    expect(await sichtbar(monteur, "finanzen/2026/10/beleg.pdf")).toBe(false);
    expect(await sichtbar(inhaber, "finanzen/2026/10/beleg.pdf")).toBe(true);
  });

  it("Fotos sehen alle; fremde Fotos löscht nur das Büro", async () => {
    await hochladen(monteur, "technik/2026/10/foto.jpg");
    await rpc(db, monteur, "datei_registrieren", { p_pfad: "technik/2026/10/foto.jpg", p_name: "foto.jpg", p_typ: "image/jpeg", p_groesse: 1 });
    expect(await sichtbar(kollege, "technik/2026/10/foto.jpg")).toBe(true);
    const loeschen = (wer: string) => als(db, wer, (tx) => tx.query("delete from storage.objects where name = 'technik/2026/10/foto.jpg'"));
    expect((await loeschen(kollege)).affectedRows).toBe(0);
    expect((await loeschen(buero)).affectedRows).toBe(1);
  });

  it("andere Ordner und Gäste sind gesperrt", async () => {
    await expect(hochladen(inhaber, "sonstwo/x.jpg")).rejects.toThrow(/row-level security/);
    await expect(als(db, null, (tx) => tx.query("select * from storage.objects"))).rejects.toThrow(/permission denied/);
  });
});
