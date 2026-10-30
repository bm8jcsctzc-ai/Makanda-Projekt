/** Datei im Browser zum Herunterladen anbieten */
export function herunterladen(inhalt: Uint8Array, dateiname: string, typ = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
  const url = URL.createObjectURL(new Blob([inhalt as BlobPart], { type: typ }));
  const link = document.createElement("a");
  link.href = url;
  link.download = dateiname;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
