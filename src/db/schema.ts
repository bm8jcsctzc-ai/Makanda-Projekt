import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
});

export const datei = pgTable("datei", {
  id: uuid("id").primaryKey().defaultRandom(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  groesse: integer("groesse").notNull(),
  speicherPfad: text("speicher_pfad").notNull(),
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
