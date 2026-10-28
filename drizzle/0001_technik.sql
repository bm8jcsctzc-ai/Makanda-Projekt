CREATE TYPE "public"."anlagentyp" AS ENUM('gas', 'oel', 'waermepumpe', 'klima', 'sonstige');--> statement-breakpoint
CREATE TYPE "public"."einsatzart" AS ENUM('wartung', 'stoerung', 'montage', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."einsatzstatus" AS ENUM('geplant', 'in_arbeit', 'abgeschlossen');--> statement-breakpoint
CREATE TYPE "public"."fotokategorie" AS ENUM('typenschild', 'vorher', 'nachher', 'messwert', 'schaden', 'sonstiges');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
	"taifun_kundennr" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "datei" ADD COLUMN "bereich" text DEFAULT 'finanzen' NOT NULL;--> statement-breakpoint
ALTER TABLE "anlage" ADD CONSTRAINT "anlage_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_einsatz_id_einsatz_id_fk" FOREIGN KEY ("einsatz_id") REFERENCES "public"."einsatz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_vorlage_id_checkliste_vorlage_id_fk" FOREIGN KEY ("vorlage_id") REFERENCES "public"."checkliste_vorlage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkliste_ergebnis" ADD CONSTRAINT "checkliste_ergebnis_ausgefuellt_von_benutzer_id_fk" FOREIGN KEY ("ausgefuellt_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einsatz" ADD CONSTRAINT "einsatz_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einsatz" ADD CONSTRAINT "einsatz_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einsatz" ADD CONSTRAINT "einsatz_monteur_id_benutzer_id_fk" FOREIGN KEY ("monteur_id") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_datei_id_datei_id_fk" FOREIGN KEY ("datei_id") REFERENCES "public"."datei"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_einsatz_id_einsatz_id_fk" FOREIGN KEY ("einsatz_id") REFERENCES "public"."einsatz"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foto" ADD CONSTRAINT "foto_aufgenommen_von_benutzer_id_fk" FOREIGN KEY ("aufgenommen_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;