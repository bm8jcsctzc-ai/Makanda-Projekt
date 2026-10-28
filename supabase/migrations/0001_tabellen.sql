-- Tabellen der Betriebs-App. Erzeugt aus src/db/schema.ts (drizzle-kit) und für Supabase ergänzt.
-- Direkter Zugriff auf die Tabellen ist gesperrt (siehe 0003_rechte.sql); alles läuft über die Funktionen in 0002.

CREATE TYPE "public"."abwesenheitsart" AS ENUM('urlaub', 'krank', 'berufsschule', 'sonstiges');
CREATE TYPE "public"."abwesenheitsstatus" AS ENUM('beantragt', 'genehmigt', 'abgelehnt');
CREATE TYPE "public"."anlagentyp" AS ENUM('gas', 'oel', 'waermepumpe', 'klima', 'sonstige');
CREATE TYPE "public"."einsatzart" AS ENUM('wartung', 'stoerung', 'montage', 'sonstiges');
CREATE TYPE "public"."einsatzstatus" AS ENUM('geplant', 'in_arbeit', 'abgeschlossen');
CREATE TYPE "public"."fotokategorie" AS ENUM('typenschild', 'vorher', 'nachher', 'messwert', 'schaden', 'sonstiges');
CREATE TYPE "public"."intervall" AS ENUM('monatlich', 'vierteljaehrlich', 'halbjaehrlich', 'jaehrlich');
CREATE TYPE "public"."mailstatus" AS ENUM('wartend', 'gesendet', 'testmodus', 'fehler');
CREATE TYPE "public"."rolle" AS ENUM('inhaber', 'buero', 'monteur');
CREATE TABLE "abwesenheit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"art" "abwesenheitsart" NOT NULL,
	"von" date NOT NULL,
	"bis" date NOT NULL,
	"halbtags" boolean DEFAULT false NOT NULL,
	"status" "abwesenheitsstatus" NOT NULL,
	"bemerkung" text,
	"entscheidung_kommentar" text,
	"entschieden_von" uuid,
	"entschieden_am" timestamp with time zone,
	"eingetragen_von" uuid,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "anlage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kunde_id" uuid NOT NULL,
	"typ" "anlagentyp" NOT NULL,
	"bezeichnung" text,
	"hersteller" text,
	"modell" text,
	"seriennummer" text,
	"baujahr" integer,
	"leistung_kw" text,
	"kaeltemittel" text,
	"kaeltemittel_kg" text,
	"aufstellort" text,
	"wartungsintervall_monate" integer DEFAULT 12 NOT NULL,
	"letzte_wartung_am" date,
	"naechste_wartung_am" date,
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "profil" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"rolle" "rolle" NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"im_team" boolean DEFAULT true NOT NULL,
	"urlaubstage_pro_jahr" integer DEFAULT 30 NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "checkliste_ergebnis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"einsatz_id" uuid NOT NULL,
	"anlage_id" uuid,
	"vorlage_id" uuid,
	"name" text NOT NULL,
	"ist_wartung" boolean NOT NULL,
	"punkte" jsonb NOT NULL,
	"antworten" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"abgeschlossen" boolean DEFAULT false NOT NULL,
	"ausgefuellt_von" uuid,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	"abgeschlossen_am" timestamp with time zone
);

CREATE TABLE "checkliste_vorlage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"anlagentyp" "anlagentyp",
	"ist_wartung" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"punkte" jsonb NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "datei" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"groesse" integer NOT NULL,
	"speicher_pfad" text NOT NULL,
	"bereich" text DEFAULT 'finanzen' NOT NULL,
	"hochgeladen_von" uuid,
	"hochgeladen_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "einladung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"rolle" "rolle" NOT NULL,
	"code" text NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "einladung_email_unique" UNIQUE("email")
);

CREATE TABLE "einsatz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kunde_id" uuid NOT NULL,
	"anlage_id" uuid,
	"monteur_id" uuid,
	"datum" date NOT NULL,
	"uhrzeit" text,
	"art" "einsatzart" NOT NULL,
	"beschreibung" text,
	"status" "einsatzstatus" DEFAULT 'geplant' NOT NULL,
	"abschluss_bemerkung" text,
	"abgeschlossen_am" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "einstellungen" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"firmenname" text DEFAULT '' NOT NULL,
	"firma_telefon" text,
	"buero_email" text,
	"erinnerungen_aktiv" boolean DEFAULT true NOT NULL,
	"erinnerung_vorlauf_monate" integer DEFAULT 3 NOT NULL,
	"erinnerung_betreff" text NOT NULL,
	"erinnerung_text" text NOT NULL,
	"wochenbericht_aktiv" boolean DEFAULT true NOT NULL,
	"haeufung_grenze" integer,
	"bundesland" text
);

CREATE TABLE "fixkosten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bezeichnung" text NOT NULL,
	"kategorie" text NOT NULL,
	"betrag_cent" integer NOT NULL,
	"intervall" intervall NOT NULL,
	"beginn" date NOT NULL,
	"ende" date,
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "foto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"datei_id" uuid NOT NULL,
	"einsatz_id" uuid,
	"anlage_id" uuid,
	"kunde_id" uuid NOT NULL,
	"kategorie" "fotokategorie" NOT NULL,
	"beschreibung" text,
	"aufgenommen_von" uuid,
	"aufgenommen_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "kunde" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ansprechpartner" text,
	"strasse" text,
	"plz" text,
	"ort" text,
	"telefon" text,
	"email" text,
	"hinweise" text,
	"erinnerungen" boolean DEFAULT true NOT NULL,
	"taifun_kundennr" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "mail_protokoll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"an" text NOT NULL,
	"betreff" text NOT NULL,
	"text" text NOT NULL,
	"anhang" text,
	"status" "mailstatus" NOT NULL,
	"fehler" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "personalkosten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mitarbeiter" text NOT NULL,
	"funktion" text,
	"brutto_cent" integer NOT NULL,
	"arbeitgeberanteil_cent" integer DEFAULT 0 NOT NULL,
	"gueltig_ab" date NOT NULL,
	"gueltig_bis" date,
	"notiz" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rechnung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lieferant" text NOT NULL,
	"rechnungsnummer" text,
	"rechnungsdatum" date NOT NULL,
	"faellig_am" date,
	"brutto_cent" integer NOT NULL,
	"mwst_satz" integer DEFAULT 19 NOT NULL,
	"kategorie" text NOT NULL,
	"bezahlt_am" date,
	"notiz" text,
	"datei_id" uuid,
	"erstellt_von" uuid,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "urlaubskonto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"jahr" integer NOT NULL,
	"anspruch_tage" integer NOT NULL,
	"uebertrag_halbe_tage" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "urlaubskonto_einmalig" UNIQUE("benutzer_id","jahr")
);

CREATE TABLE "wartung_erinnerung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anlage_id" uuid NOT NULL,
	"faellig_am" date NOT NULL,
	"an_kunde" text,
	"gesendet_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wartung_erinnerung_einmalig" UNIQUE("anlage_id","faellig_am")
);

ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_benutzer_id_profil_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."profil"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_entschieden_von_profil_id_fk" FOREIGN KEY ("entschieden_von") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_eingetragen_von_profil_id_fk" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "anlage" ADD CONSTRAINT "anlage_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_einsatz_id_einsatz_id_fk" FOREIGN KEY ("einsatz_id") REFERENCES "public"."einsatz"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_vorlage_id_checkliste_vorlage_id_fk" FOREIGN KEY ("vorlage_id") REFERENCES "public"."checkliste_vorlage"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_ausgefuellt_von_profil_id_fk" FOREIGN KEY ("ausgefuellt_von") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "datei" ADD CONSTRAINT "datei_hochgeladen_von_profil_id_fk" FOREIGN KEY ("hochgeladen_von") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "einsatz" ADD CONSTRAINT "einsatz_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "einsatz" ADD CONSTRAINT "einsatz_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "einsatz" ADD CONSTRAINT "einsatz_monteur_id_profil_id_fk" FOREIGN KEY ("monteur_id") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "foto" ADD CONSTRAINT "foto_datei_id_datei_id_fk" FOREIGN KEY ("datei_id") REFERENCES "public"."datei"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "foto" ADD CONSTRAINT "foto_einsatz_id_einsatz_id_fk" FOREIGN KEY ("einsatz_id") REFERENCES "public"."einsatz"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "foto" ADD CONSTRAINT "foto_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "foto" ADD CONSTRAINT "foto_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "foto" ADD CONSTRAINT "foto_aufgenommen_von_profil_id_fk" FOREIGN KEY ("aufgenommen_von") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_datei_id_datei_id_fk" FOREIGN KEY ("datei_id") REFERENCES "public"."datei"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_erstellt_von_profil_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."profil"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "urlaubskonto" ADD CONSTRAINT "urlaubskonto_benutzer_id_profil_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."profil"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "wartung_erinnerung" ADD CONSTRAINT "wartung_erinnerung_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE cascade ON UPDATE no action;

-- Profil gehört zu einem Supabase-Login
ALTER TABLE "profil" ADD CONSTRAINT "profil_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE cascade;
