import { timingSafeEqual } from "node:crypto";
import { erinnerungenVersenden, wochenberichtSenden } from "@/lib/aufgaben";
import { heute } from "@/lib/format";

// Wird vom Zeitplaner aufgerufen (Vercel Cron, siehe vercel.json). Geschützt mit CRON_SECRET:
// Vercel schickt automatisch "Authorization: Bearer <CRON_SECRET>".
const AUFGABEN = { taeglich: erinnerungenVersenden, woechentlich: wochenberichtSenden };

function berechtigt(kopf: string | null): boolean {
  const geheim = process.env.CRON_SECRET;
  if (!geheim || !kopf) return false;
  const a = Buffer.from(kopf);
  const b = Buffer.from(`Bearer ${geheim}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(anfrage: Request, { params }: { params: Promise<{ aufgabe: string }> }) {
  if (!berechtigt(anfrage.headers.get("authorization"))) return new Response("Kein Zugriff", { status: 401 });
  const { aufgabe } = await params;
  const ausfuehren = AUFGABEN[aufgabe as keyof typeof AUFGABEN];
  if (!ausfuehren) return new Response("Unbekannte Aufgabe", { status: 404 });
  const ergebnis = await ausfuehren(heute());
  return Response.json(ergebnis);
}
