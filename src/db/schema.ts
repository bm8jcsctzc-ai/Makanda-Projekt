import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Beträge werden immer in Cent gespeichert, damit keine Rundungsfehler entstehen.

export const rolle = pgEnum("rolle", ["inhaber", "buero", "monteur"]);

export const benutzer = pgTable("benutzer", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwortHash: text("passwort_hash").notNull(),
  rolle: rolle("rolle").notNull(),
  aktiv: boolean("aktiv").notNull().default(true),
  // Erscheint im Urlaubsplaner (Mitarbeiter des Betriebs; z. B. nicht für reine Test- oder Büro-Zugänge)
  imTeam: boolean("im_team").notNull().default(true),
  urlaubstageProJahr: integer("urlaubstage_pro_jahr").notNull().default(30),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const datei = pgTable("datei", {
  id: uuid("id").primaryKey().defaultRandom(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  groesse: integer("groesse").notNull(),
  speicherPfad: text("speicher_pfad").notNull(),
  // finanzen: nur Inhaber und Büro · technik: alle angemeldeten Benutzer
  bereich: text("bereich").notNull().default("finanzen"),
  hochgeladenVon: uuid("hochgeladen_von").references(() => benutzer.id),
  hochgeladenAm: timestamp("hochgeladen_am", { withTimezone: true }).notNull().defaultNow(),
});

export const rechnung = pgTable("rechnung", {
  id: uuid("id").primaryKey().defaultRandom(),
  lieferant: text("lieferant").notNull(),
  rechnungsnummer: text("rechnungsnummer"),
  rechnungsdatum: date("rechnungsdatum").notNull(),
  faelligAm: date("faellig_am"),
  bruttoCent: integer("brutto_cent").notNull(),
  mwstSatz: integer("mwst_satz").notNull().default(19),
  kategorie: text("kategorie").notNull(),
  bezahltAm: date("bezahlt_am"),
  notiz: text("notiz"),
  dateiId: uuid("datei_id").references(() => datei.id, { onDelete: "set null" }),
  erstelltVon: uuid("erstellt_von").references(() => benutzer.id),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const intervall = pgEnum("intervall", [
  "monatlich",
  "vierteljaehrlich",
  "halbjaehrlich",
  "jaehrlich",
]);

export const fixkosten = pgTable("fixkosten", {
  id: uuid("id").primaryKey().defaultRandom(),
  bezeichnung: text("bezeichnung").notNull(),
  kategorie: text("kategorie").notNull(),
  betragCent: integer("betrag_cent").notNull(),
  intervall: intervall("intervall").notNull(),
  beginn: date("beginn").notNull(),
  ende: date("ende"),
  notiz: text("notiz"),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const personalkosten = pgTable("personalkosten", {
  id: uuid("id").primaryKey().defaultRandom(),
  mitarbeiter: text("mitarbeiter").notNull(),
  funktion: text("funktion"),
  bruttoCent: integer("brutto_cent").notNull(),
  arbeitgeberanteilCent: integer("arbeitgeberanteil_cent").notNull().default(0),
  gueltigAb: date("gueltig_ab").notNull(),
  gueltigBis: date("gueltig_bis"),
  notiz: text("notiz"),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export type Benutzer = typeof benutzer.$inferSelect;
export type Rolle = (typeof rolle.enumValues)[number];
export type Rechnung = typeof rechnung.$inferSelect;
export type Fixkosten = typeof fixkosten.$inferSelect;
export type Intervall = (typeof intervall.enumValues)[number];
export type Personalkosten = typeof personalkosten.$inferSelect;

// ---------- Technik: Kunden, Anlagen, Einsätze, Checklisten, Fotos ----------

export const kunde = pgTable("kunde", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ansprechpartner: text("ansprechpartner"),
  strasse: text("strasse"),
  plz: text("plz"),
  ort: text("ort"),
  telefon: text("telefon"),
  email: text("email"),
  // Hinweise für die Monteure, z. B. "Schlüssel beim Nachbarn", "Hund"
  hinweise: text("hinweise"),
  // Darf der Kunde Wartungserinnerungen per E-Mail bekommen?
  erinnerungen: boolean("erinnerungen").notNull().default(true),
  taifunKundennr: text("taifun_kundennr"),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const anlagentyp = pgEnum("anlagentyp", ["gas", "oel", "waermepumpe", "klima", "sonstige"]);

export const anlage = pgTable("anlage", {
  id: uuid("id").primaryKey().defaultRandom(),
  kundeId: uuid("kunde_id").notNull().references(() => kunde.id, { onDelete: "cascade" }),
  typ: anlagentyp("typ").notNull(),
  bezeichnung: text("bezeichnung"),
  hersteller: text("hersteller"),
  modell: text("modell"),
  seriennummer: text("seriennummer"),
  baujahr: integer("baujahr"),
  leistungKw: text("leistung_kw"),
  kaeltemittel: text("kaeltemittel"),
  kaeltemittelKg: text("kaeltemittel_kg"),
  // Wo im Gebäude, z. B. "Keller, Heizraum"
  aufstellort: text("aufstellort"),
  wartungsintervallMonate: integer("wartungsintervall_monate").notNull().default(12),
  letzteWartungAm: date("letzte_wartung_am"),
  naechsteWartungAm: date("naechste_wartung_am"),
  notiz: text("notiz"),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const einsatzart = pgEnum("einsatzart", ["wartung", "stoerung", "montage", "sonstiges"]);
export const einsatzstatus = pgEnum("einsatzstatus", ["geplant", "in_arbeit", "abgeschlossen"]);

export const einsatz = pgTable("einsatz", {
  id: uuid("id").primaryKey().defaultRandom(),
  kundeId: uuid("kunde_id").notNull().references(() => kunde.id, { onDelete: "cascade" }),
  anlageId: uuid("anlage_id").references(() => anlage.id, { onDelete: "set null" }),
  monteurId: uuid("monteur_id").references(() => benutzer.id),
  datum: date("datum").notNull(),
  uhrzeit: text("uhrzeit"),
  art: einsatzart("art").notNull(),
  beschreibung: text("beschreibung"),
  status: einsatzstatus("status").notNull().default("geplant"),
  abschlussBemerkung: text("abschluss_bemerkung"),
  abgeschlossenAm: timestamp("abgeschlossen_am", { withTimezone: true }),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

/** Ein Prüfpunkt einer Checkliste */
export type Pruefpunkt = {
  id: string;
  text: string;
  // pruefung: in Ordnung / nicht in Ordnung / entfällt · messwert: Zahl mit Einheit · text: freier Text
  typ: "pruefung" | "messwert" | "text";
  einheit?: string;
  min?: number;
  max?: number;
  pflicht: boolean;
  hilfe?: string;
};

/** Antwort auf einen Prüfpunkt */
export type Antwort = {
  wert?: string; // "io" | "nio" | "entfaellt" bei Prüfungen, sonst Zahl oder Text
  bemerkung?: string;
};

export const checklisteVorlage = pgTable("checkliste_vorlage", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // null = passt zu jeder Anlage
  anlagentyp: anlagentyp("anlagentyp"),
  // Ist das eine Wartung? Dann wird beim Abschluss das nächste Wartungsdatum der Anlage gesetzt.
  istWartung: boolean("ist_wartung").notNull().default(false),
  version: integer("version").notNull().default(1),
  punkte: jsonb("punkte").$type<Pruefpunkt[]>().notNull(),
  aktiv: boolean("aktiv").notNull().default(true),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const checklisteErgebnis = pgTable("checkliste_ergebnis", {
  id: uuid("id").primaryKey().defaultRandom(),
  einsatzId: uuid("einsatz_id").notNull().references(() => einsatz.id, { onDelete: "cascade" }),
  anlageId: uuid("anlage_id").references(() => anlage.id, { onDelete: "set null" }),
  vorlageId: uuid("vorlage_id").references(() => checklisteVorlage.id, { onDelete: "set null" }),
  // Kopie der Vorlage zum Zeitpunkt des Ausfüllens – spätere Änderungen an der Vorlage ändern alte Ergebnisse nicht
  name: text("name").notNull(),
  istWartung: boolean("ist_wartung").notNull(),
  punkte: jsonb("punkte").$type<Pruefpunkt[]>().notNull(),
  antworten: jsonb("antworten").$type<Record<string, Antwort>>().notNull().default({}),
  abgeschlossen: boolean("abgeschlossen").notNull().default(false),
  ausgefuelltVon: uuid("ausgefuellt_von").references(() => benutzer.id),
  geaendertAm: timestamp("geaendert_am", { withTimezone: true }).notNull().defaultNow(),
  abgeschlossenAm: timestamp("abgeschlossen_am", { withTimezone: true }),
});

export const fotokategorie = pgEnum("fotokategorie", [
  "typenschild",
  "vorher",
  "nachher",
  "messwert",
  "schaden",
  "sonstiges",
]);

export const foto = pgTable("foto", {
  id: uuid("id").primaryKey().defaultRandom(),
  dateiId: uuid("datei_id").notNull().references(() => datei.id, { onDelete: "cascade" }),
  einsatzId: uuid("einsatz_id").references(() => einsatz.id, { onDelete: "set null" }),
  anlageId: uuid("anlage_id").references(() => anlage.id, { onDelete: "cascade" }),
  kundeId: uuid("kunde_id").notNull().references(() => kunde.id, { onDelete: "cascade" }),
  kategorie: fotokategorie("kategorie").notNull(),
  beschreibung: text("beschreibung"),
  aufgenommenVon: uuid("aufgenommen_von").references(() => benutzer.id),
  aufgenommenAm: timestamp("aufgenommen_am", { withTimezone: true }).notNull().defaultNow(),
});

export type Kunde = typeof kunde.$inferSelect;
export type Anlage = typeof anlage.$inferSelect;
export type Anlagentyp = (typeof anlagentyp.enumValues)[number];
export type Einsatz = typeof einsatz.$inferSelect;
export type Einsatzart = (typeof einsatzart.enumValues)[number];
export type Einsatzstatus = (typeof einsatzstatus.enumValues)[number];
export type ChecklisteVorlage = typeof checklisteVorlage.$inferSelect;
export type ChecklisteErgebnis = typeof checklisteErgebnis.$inferSelect;
export type Fotokategorie = (typeof fotokategorie.enumValues)[number];
export type Foto = typeof foto.$inferSelect;

// ---------- Wartungsplan, Erinnerungen, E-Mails ----------

/** Eine einzige Zeile (id = 1) mit den Einstellungen des Betriebs */
export const einstellungen = pgTable("einstellungen", {
  id: integer("id").primaryKey().default(1),
  firmenname: text("firmenname").notNull().default(""),
  firmaTelefon: text("firma_telefon"),
  // Empfänger für Wochenbericht und Erinnerungs-Übersicht
  bueroEmail: text("buero_email"),
  erinnerungenAktiv: boolean("erinnerungen_aktiv").notNull().default(true),
  erinnerungVorlaufMonate: integer("erinnerung_vorlauf_monate").notNull().default(3),
  erinnerungBetreff: text("erinnerung_betreff").notNull(),
  erinnerungText: text("erinnerung_text").notNull(),
  wochenberichtAktiv: boolean("wochenbericht_aktiv").notNull().default(true),
  // Ab so vielen Wartungen pro Monat wird gewarnt (zusätzlich zur automatischen Erkennung)
  haeufungGrenze: integer("haeufung_grenze"),
  // Kürzel des Bundeslands für die Feiertage, z. B. "NI"
  bundesland: text("bundesland"),
  // Geheimer Schlüssel für die Anmelde-Cookies; wird beim ersten Start erzeugt, falls SESSION_SECRET fehlt
  sitzungsSchluessel: text("sitzungs_schluessel"),
});

export const wartungErinnerung = pgTable(
  "wartung_erinnerung",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anlageId: uuid("anlage_id").notNull().references(() => anlage.id, { onDelete: "cascade" }),
    // Für welchen Fälligkeitstermin erinnert wurde – pro Termin nur eine Erinnerung
    faelligAm: date("faellig_am").notNull(),
    anKunde: text("an_kunde"),
    gesendetAm: timestamp("gesendet_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("wartung_erinnerung_einmalig").on(t.anlageId, t.faelligAm)],
);

export const mailstatus = pgEnum("mailstatus", ["gesendet", "testmodus", "fehler"]);

export const mailProtokoll = pgTable("mail_protokoll", {
  id: uuid("id").primaryKey().defaultRandom(),
  an: text("an").notNull(),
  betreff: text("betreff").notNull(),
  text: text("text").notNull(),
  anhang: text("anhang"),
  status: mailstatus("status").notNull(),
  fehler: text("fehler"),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export type Einstellungen = typeof einstellungen.$inferSelect;
export type MailProtokoll = typeof mailProtokoll.$inferSelect;

// ---------- Urlaubsplaner ----------

export const abwesenheitsart = pgEnum("abwesenheitsart", ["urlaub", "krank", "berufsschule", "sonstiges"]);
export const abwesenheitsstatus = pgEnum("abwesenheitsstatus", ["beantragt", "genehmigt", "abgelehnt"]);

export const abwesenheit = pgTable("abwesenheit", {
  id: uuid("id").primaryKey().defaultRandom(),
  benutzerId: uuid("benutzer_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
  art: abwesenheitsart("art").notNull(),
  von: date("von").notNull(),
  bis: date("bis").notNull(),
  // Nur bei eintägigen Abwesenheiten: halber Tag
  halbtags: boolean("halbtags").notNull().default(false),
  status: abwesenheitsstatus("status").notNull(),
  bemerkung: text("bemerkung"),
  entscheidungKommentar: text("entscheidung_kommentar"),
  entschiedenVon: uuid("entschieden_von").references(() => benutzer.id),
  entschiedenAm: timestamp("entschieden_am", { withTimezone: true }),
  eingetragenVon: uuid("eingetragen_von").references(() => benutzer.id),
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

/** Urlaubsanspruch pro Mitarbeiter und Jahr; fehlt der Eintrag, gilt der Standard aus dem Benutzer */
export const urlaubskonto = pgTable(
  "urlaubskonto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    benutzerId: uuid("benutzer_id").notNull().references(() => benutzer.id, { onDelete: "cascade" }),
    jahr: integer("jahr").notNull(),
    anspruchTage: integer("anspruch_tage").notNull(),
    // Resturlaub aus dem Vorjahr in halben Tagen (5 = 2,5 Tage)
    uebertragHalbeTage: integer("uebertrag_halbe_tage").notNull().default(0),
  },
  (t) => [unique("urlaubskonto_einmalig").on(t.benutzerId, t.jahr)],
);

export type Abwesenheit = typeof abwesenheit.$inferSelect;
export type Abwesenheitsart = (typeof abwesenheitsart.enumValues)[number];
export type Abwesenheitsstatus = (typeof abwesenheitsstatus.enumValues)[number];
export type Urlaubskonto = typeof urlaubskonto.$inferSelect;
