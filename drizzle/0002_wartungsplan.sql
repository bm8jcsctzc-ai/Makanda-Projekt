CREATE TYPE "public"."mailstatus" AS ENUM('gesendet', 'testmodus', 'fehler');--> statement-breakpoint
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
	"haeufung_grenze" integer
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "wartung_erinnerung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anlage_id" uuid NOT NULL,
	"faellig_am" date NOT NULL,
	"an_kunde" text,
	"gesendet_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wartung_erinnerung_einmalig" UNIQUE("anlage_id","faellig_am")
);
--> statement-breakpoint
ALTER TABLE "kunde" ADD COLUMN "erinnerungen" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "wartung_erinnerung" ADD CONSTRAINT "wartung_erinnerung_anlage_id_anlage_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlage"("id") ON DELETE cascade ON UPDATE no action;