CREATE TYPE "public"."intervall" AS ENUM('monatlich', 'vierteljaehrlich', 'halbjaehrlich', 'jaehrlich');--> statement-breakpoint
CREATE TYPE "public"."rolle" AS ENUM('inhaber', 'buero', 'monteur');--> statement-breakpoint
CREATE TABLE "benutzer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwort_hash" text NOT NULL,
	"rolle" "rolle" NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benutzer_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "datei" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"groesse" integer NOT NULL,
	"speicher_pfad" text NOT NULL,
	"hochgeladen_von" uuid,
	"hochgeladen_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "datei" ADD CONSTRAINT "datei_hochgeladen_von_benutzer_id_fk" FOREIGN KEY ("hochgeladen_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_datei_id_datei_id_fk" FOREIGN KEY ("datei_id") REFERENCES "public"."datei"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_erstellt_von_benutzer_id_fk" FOREIGN KEY ("erstellt_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;