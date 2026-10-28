CREATE TYPE "public"."abwesenheitsart" AS ENUM('urlaub', 'krank', 'berufsschule', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."abwesenheitsstatus" AS ENUM('beantragt', 'genehmigt', 'abgelehnt');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "urlaubskonto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benutzer_id" uuid NOT NULL,
	"jahr" integer NOT NULL,
	"anspruch_tage" integer NOT NULL,
	"uebertrag_halbe_tage" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "urlaubskonto_einmalig" UNIQUE("benutzer_id","jahr")
);
--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "im_team" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "benutzer" ADD COLUMN "urlaubstage_pro_jahr" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "einstellungen" ADD COLUMN "bundesland" text;--> statement-breakpoint
ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_entschieden_von_benutzer_id_fk" FOREIGN KEY ("entschieden_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abwesenheit" ADD CONSTRAINT "abwesenheit_eingetragen_von_benutzer_id_fk" FOREIGN KEY ("eingetragen_von") REFERENCES "public"."benutzer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urlaubskonto" ADD CONSTRAINT "urlaubskonto_benutzer_id_benutzer_id_fk" FOREIGN KEY ("benutzer_id") REFERENCES "public"."benutzer"("id") ON DELETE cascade ON UPDATE no action;