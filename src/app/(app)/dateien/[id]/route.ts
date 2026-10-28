import { aktuellerBenutzer, DARF_FINANZEN } from "@/lib/auth";
import { ladeDatei } from "@/lib/dateien";

// Liefert eine hochgeladene Datei aus. Belege (Finanzen) nur für Inhaber und Büro, Technik-Fotos für alle Angemeldeten.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = await aktuellerBenutzer();
  if (!b) return new Response("Kein Zugriff", { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Nicht gefunden", { status: 404 });
  const datei = await ladeDatei(id).catch(() => null);
  if (!datei) return new Response("Nicht gefunden", { status: 404 });
  if (datei.eintrag.bereich !== "technik" && !DARF_FINANZEN.includes(b.rolle)) {
    return new Response("Kein Zugriff", { status: 403 });
  }
  return new Response(new Uint8Array(datei.inhalt), {
    headers: {
      "Content-Type": datei.eintrag.mimeType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(datei.eintrag.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
