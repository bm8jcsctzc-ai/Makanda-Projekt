const MAX_KANTE = 2000;

/** Verkleinert ein Foto im Browser auf max. 2000 px (JPEG). Spart mobile Daten und Speicher. Andere Dateien bleiben unverändert. */
export async function verkleinern(datei: File): Promise<File> {
  if (!datei.type.startsWith("image/")) return datei;
  try {
    const bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
    const faktor = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
    const leinwand = document.createElement("canvas");
    leinwand.width = Math.round(bild.width * faktor);
    leinwand.height = Math.round(bild.height * faktor);
    leinwand.getContext("2d")!.drawImage(bild, 0, 0, leinwand.width, leinwand.height);
    const blob = await new Promise<Blob | null>((ok) => leinwand.toBlob(ok, "image/jpeg", 0.8));
    if (!blob) return datei;
    return new File([blob], datei.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // Format kann der Browser nicht lesen (z. B. HEIC außerhalb von Safari) – Original hochladen
    return datei;
  }
}
