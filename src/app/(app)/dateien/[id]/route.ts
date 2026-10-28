import { aktuellerBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { ladeDatei } from "@/lib/dateien";

// Liefert eine hochgeladene Datei aus, nur für angemeldete Benutzer mit Zugriff auf die Finanzen.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = await aktuellerBenutzer();
  if (!b || !DARF_FINANZEN.includes(b.rolle)) return new Response("Kein Zugriff", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Nicht gefunden", { status: 404 });
  const datei = await ladeDatei(id).catch(() => null);
  if (!datei) return new Response("Nicht gefunden", { status: 404 });
  return new Response(new Uint8Array(datei.inhalt), {
    headers: {
      "Content-Type": datei.eintrag.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(datei.eintrag.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
