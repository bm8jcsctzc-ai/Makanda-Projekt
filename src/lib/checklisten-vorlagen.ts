import type { Anlagentyp, Pruefpunkt } from "@/db/schema";

// Start-Vorlagen, die beim ersten Start angelegt werden. Sie sind ein Vorschlag und lassen sich
// unter Einstellungen › Checklisten anpassen. Grenzwerte sind Richtwerte – maßgeblich sind die
// Herstellerangaben der jeweiligen Anlage.

type VorlagenEntwurf = { name: string; anlagentyp: Anlagentyp | null; istWartung: boolean; punkte: Pruefpunkt[] };

const p = (id: string, text: string, extra: Partial<Pruefpunkt> = {}): Pruefpunkt => ({
  id,
  text,
  typ: "pruefung",
  pflicht: true,
  ...extra,
});
const mess = (id: string, text: string, einheit: string, extra: Partial<Pruefpunkt> = {}): Pruefpunkt => ({
  id,
  text,
  typ: "messwert",
  einheit,
  pflicht: true,
  ...extra,
});
const frei = (id: string, text: string, extra: Partial<Pruefpunkt> = {}): Pruefpunkt => ({
  id,
  text,
  typ: "text",
  pflicht: false,
  ...extra,
});

export const START_VORLAGEN: VorlagenEntwurf[] = [
  {
    name: "Wartung Gas-Brennwertgerät",
    anlagentyp: "gas",
    istWartung: true,
    punkte: [
      p("sicht", "Sichtprüfung Gerät und Aufstellraum, Verbrennungsluftzufuhr frei"),
      p("abgas", "Abgasanlage dicht und fest, Revisionsöffnungen geprüft"),
      p("brenner", "Brenner ausgebaut, gereinigt und geprüft"),
      p("wt", "Wärmetauscher / Brennkammer gereinigt"),
      p("elektroden", "Zünd- und Ionisationselektrode geprüft, ggf. erneuert"),
      p("dichtungen", "Dichtungen geprüft, ggf. erneuert"),
      p("siphon", "Kondensatablauf und Siphon gereinigt und befüllt"),
      p("gasdicht", "Gasleitung und Armaturen auf Dichtheit geprüft"),
      mess("gasdruck", "Gas-Anschlussdruck (Fließdruck)", "mbar", { min: 18, max: 25, hilfe: "Richtwert Erdgas: 18–25 mbar" }),
      mess("co2", "CO₂ bei Volllast", "%", { hilfe: "Sollwert laut Hersteller" }),
      mess("co", "CO unverdünnt", "ppm", { max: 1000 }),
      mess("abgastemp", "Abgastemperatur", "°C", { pflicht: false }),
      mess("anlagendruck", "Anlagendruck Heizung", "bar", { min: 1, max: 2.5 }),
      mess("mag", "Vordruck Ausdehnungsgefäß", "bar", { pflicht: false }),
      p("sicherheit", "Sicherheitseinrichtungen geprüft (STB, Abgasüberwachung, Sicherheitsventil)"),
      p("funktion", "Probelauf und Funktionsprüfung durchgeführt"),
      frei("hinweise", "Hinweise / Empfehlungen an den Kunden"),
    ],
  },
  {
    name: "Wartung Öl-Heizung",
    anlagentyp: "oel",
    istWartung: true,
    punkte: [
      p("sicht", "Sichtprüfung Kessel, Brenner und Aufstellraum"),
      p("tank", "Öltank, Leitungen und Absperrungen sichtgeprüft"),
      p("filter", "Ölfilter gewechselt"),
      p("duese", "Düse gewechselt"),
      frei("duesentyp", "Eingesetzte Düse (Größe / Winkel)"),
      p("brenner", "Brenner gereinigt, Stauscheibe und Zündelektroden eingestellt"),
      p("kessel", "Kessel und Heizflächen gereinigt"),
      p("abgas", "Abgasweg dicht, Nebenluftvorrichtung geprüft"),
      mess("pumpendruck", "Ölpumpendruck", "bar"),
      mess("russ", "Rußzahl", "", { max: 1 }),
      mess("co2", "CO₂-Gehalt", "%"),
      mess("abgasverlust", "Abgasverlust", "%"),
      mess("abgastemp", "Abgastemperatur", "°C", { pflicht: false }),
      mess("anlagendruck", "Anlagendruck Heizung", "bar", { min: 1, max: 2.5 }),
      p("sicherheit", "Sicherheitseinrichtungen geprüft (STB, Flammenüberwachung, Sicherheitsventil)"),
      p("funktion", "Probelauf und Funktionsprüfung durchgeführt"),
      frei("hinweise", "Hinweise / Empfehlungen an den Kunden"),
    ],
  },
  {
    name: "Wartung Wärmepumpe",
    anlagentyp: "waermepumpe",
    istWartung: true,
    punkte: [
      p("sicht", "Sichtprüfung Innen- und Außeneinheit, Aufstellort frei"),
      p("verdampfer", "Verdampfer / Lamellen der Außeneinheit gereinigt"),
      p("kondensat", "Kondensatablauf frei, Heizband geprüft"),
      p("elektrik", "Elektrische Anschlüsse und Klemmen geprüft"),
      p("dichtheit", "Dichtheitskontrolle Kältekreis (falls nach F-Gase-Verordnung pflichtig)", { pflicht: false }),
      p("schmutz", "Schmutzfänger / Filter im Heizkreis gereinigt"),
      mess("anlagendruck", "Anlagendruck Heizung", "bar", { min: 1, max: 2.5 }),
      mess("vorlauf", "Vorlauftemperatur", "°C"),
      mess("ruecklauf", "Rücklauftemperatur", "°C"),
      mess("ww", "Warmwasser-Speichertemperatur", "°C", { pflicht: false }),
      p("legionellen", "Legionellenschaltung geprüft", { pflicht: false }),
      mess("betriebsstunden", "Betriebsstunden Verdichter", "h", { pflicht: false }),
      frei("fehlerspeicher", "Fehlerspeicher ausgelesen – Einträge"),
      p("funktion", "Probelauf und Funktionsprüfung durchgeführt"),
      frei("hinweise", "Hinweise / Empfehlungen an den Kunden"),
    ],
  },
  {
    name: "Wartung Klimaanlage (Split)",
    anlagentyp: "klima",
    istWartung: true,
    punkte: [
      p("sicht", "Sichtprüfung Innen- und Außengerät"),
      p("filter", "Luftfilter Innengerät gereinigt"),
      p("verdampfer", "Wärmetauscher Innengerät gereinigt und desinfiziert"),
      p("kondensat", "Kondensatwanne und -ablauf gereinigt, Kondensatpumpe geprüft"),
      p("aussen", "Lamellen Außengerät gereinigt"),
      p("dichtheit", "Dichtheitskontrolle Kältekreis (falls nach F-Gase-Verordnung pflichtig)", { pflicht: false }),
      p("elektrik", "Elektrische Anschlüsse geprüft"),
      mess("raumtemp", "Raumtemperatur", "°C"),
      mess("ausblastemp", "Ausblastemperatur Innengerät (Kühlbetrieb)", "°C"),
      p("bedienung", "Fernbedienung und Betriebsarten geprüft"),
      p("funktion", "Funktionsprüfung Kühlen / Heizen durchgeführt"),
      frei("hinweise", "Hinweise / Empfehlungen an den Kunden"),
    ],
  },
  {
    name: "Störung / Reparatur",
    anlagentyp: null,
    istWartung: false,
    punkte: [
      frei("fehler", "Fehlerbild vor Ort / Fehlercode", { pflicht: true }),
      frei("ursache", "Ursache"),
      frei("arbeiten", "Durchgeführte Arbeiten", { pflicht: true }),
      p("funktion", "Anlage nach den Arbeiten funktionsfähig"),
      frei("empfehlung", "Weitere Maßnahmen empfohlen"),
    ],
  },
];
