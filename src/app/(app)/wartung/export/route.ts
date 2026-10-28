import { aktuellerBenutzer } from "@/lib/auth";
import { ladeEinstellungen } from "@/lib/einstellungen";
import { wartungsExcel } from "@/lib/excel";
import { heute } from "@/lib/format";
import { DARF_PLANEN } from "@/lib/technik";
import { ladeWartungen } from "@/lib/wartung-daten";

export async function GET() {
  const b = await aktuellerBenutzer();
  if (!b || !DARF_PLANEN.includes(b.rolle)) return new Response("Kein Zugriff", { status: 403 });
  const stichtag = heute();
  const e = await ladeEinstellungen();
  const excel = await wartungsExcel(await ladeWartungen(stichtag), stichtag, e.erinnerungVorlaufMonate, e.haeufungGrenze);
  return new Response(new Uint8Array(excel), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Wartungskunden_${stichtag}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
