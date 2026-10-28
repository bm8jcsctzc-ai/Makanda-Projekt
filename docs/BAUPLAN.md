# Technischer Bauplan: Ergänzungs-App zu TAIFUN

Stand: 28.10.2026 · Betrieb: SHK, Inhaber + 3 Monteure · TAIFUN lokal installiert

---

## 0. Wichtigste Erkenntnis vorab

Laut Herstellerangaben deckt TAIFUN mit zwei Zusatzmodulen bereits einen großen Teil der geplanten Funktionen ab:

- **TAIFUN Handwerker-App:** mobile Wartungs-, Störungs- und Projektaufträge, Fotos, frei konfigurierbare Formulare und Checklisten, Kundenunterschrift, Zeiterfassung, Offline-Nutzung und ein KI-Arbeitsbericht aus gesprochenem Text.
- **TAIFUN Wartung:** Verträge, Anlagen, Geräte, Messwerte, Typenbezeichnungen, Checklisten und automatische Wartungsrechnungen.

Diese Funktionen fließen ohne eine eigene Schnittstelle direkt in TAIFUN. Die Rückübertragung (Abschnitt 5) ist bei einer eigenen App dagegen der schwierigste und unsicherste Teil.

**Deshalb ist Schritt 1 keine Programmierung, sondern eine Klärung** (Abschnitt 8, Phase 0):

1. Welche dieser Module sind schon lizenziert?
2. Was würden fehlende Module kosten?
3. Wie gut decken sie den Alltag im Betrieb ab?

Eine eigene App lohnt sich vor allem in drei Fällen:
- Die TAIFUN-Module fehlen und sind zu teuer.
- Sie passen nicht zu den Abläufen im Betrieb.
- Es geht um Dinge, die TAIFUN nicht abdeckt: Urlaubsplaner, Kostenübersicht, Warnung bei Wartungshäufung, wöchentliche Excel-Mail (siehe Abschnitt 9).

Der folgende Bauplan geht davon aus, dass die eigene App gebaut wird. Er ist so aufgebaut, dass sie auch dann funktioniert, wenn TAIFUN keine automatische Schnittstelle bietet.

---

## 1. TAIFUN: bestätigt vs. noch zu prüfen

Quellen: Herstellerseiten, App-Store-Beschreibungen und Drittanbieter-Dokumentationen (Recherche Oktober 2026). „Laut Hersteller“ heißt: öffentlich beschrieben, aber noch **nicht in eurer Installation und Lizenz geprüft**.

### 1a. Laut Hersteller vorhanden

| Funktion | Bedeutung für unsere App |
|---|---|
| Lokale Installation (Windows-Server, Zugriff per Remote Desktop) | Unsere Cloud-App kann TAIFUN nicht direkt erreichen. Wir brauchen einen Datei-Weg oder einen Agenten im Büro. |
| Menü *Module › Datenaustausch › XML* mit Export- und Import-Vorlagen und Importprotokoll | Wahrscheinlichster Weg für einen automatisierten Austausch. Belegt ist er bisher nur für **Artikel** (siehe 1c). |
| Excel-Export von Kundendaten (genutzt z. B. von MeinHandwerker-App und Noovi) | Kundenstamm lässt sich sicher übernehmen (Phase 2). |
| DATEV-Export (CSV, XML), ZUGFeRD-Eingangsrechnungen, DATANORM, IDS, OCI, UGL, GAEB | Für Buchhaltung und Großhandel. Für Aufträge und Berichte nicht relevant. |
| Partner-Schnittstelle immo-office/Mareon (Modul ImmoConnect): Aufträge und Rechnungen synchronisieren | Zeigt, dass TAIFUN Auftragsdaten mit Fremdsystemen austauschen kann. Diese Schnittstelle ist aber nur für diese Portale gedacht. |
| TAIFUN Handwerker-App (iOS/Android) | Siehe Abschnitt 0. Direkte Konkurrenz zu unseren Funktionen 2 bis 5. |
| TAIFUN Wartung + Terminplaner | Anlagen und Geräte gibt es in TAIFUN schon. Wir müssen festlegen, welches System die Anlagendaten **führt**. |

### 1b. Nicht gefunden

- **Keine öffentlich dokumentierte API**, also kein Webservice und keine REST-Schnittstelle.
- **Kein dokumentierter Import** von Arbeitsberichten, Stunden oder Material in bestehende Aufträge aus Fremdsystemen.
- Die Partner-Schnittstellen von MeinHandwerker-App und Noovi importieren **nur Kunden**, und zwar manuell per Excel-Datei.

### 1c. Noch zu prüfen (Fragen an TAIFUN-Support oder Fachhändler)

| # | Frage | Davon hängt ab |
|---|---|---|
| P1 | Welches Produkt und welche Version (TAIFUN Handwerk, openBusiness, TAIFUN+)? Welche Module sind lizenziert? | alles |
| P2 | Ist die **Handwerker-App** lizenziert oder was kostet sie? Ist der KI-Sprachbericht enthalten? | ob wir überhaupt bauen |
| P3 | Ist **TAIFUN Wartung** lizenziert? | wer die Anlagendaten führt |
| P4 | Gibt es XML-Export-Vorlagen für **Aufträge, Termine (Terminplaner), Adressen und Auftragsstatus**? Welche Felder? | Phase 2 und 9 |
| P5 | Lässt sich ein Export **zeitgesteuert oder per Kommandozeile** auslösen, ohne dass jemand klickt? | ob ein Sync-Agent automatisch arbeiten kann |
| P6 | Gibt es eine XML-**Import**-Vorlage, die **Stunden, Material und Berichtstext** in einen **bestehenden** Auftrag schreibt? | Rückübertragung Stufe B |
| P7 | Gibt es eine offizielle API, ein Partnerprogramm oder eine Entwickler-Dokumentation? | Rückübertragung Stufe C |
| P8 | Ist **lesender** Datenbankzugriff (z. B. ODBC) erlaubt und dokumentiert, ohne die Gewährleistung zu verlieren? | Alternative zu P4 und P5 |
| P9 | Lassen sich Dokumente (PDF, Fotos) einem Auftrag in TAIFUN zuordnen, z. B. über einen Dokumentenordner? | Rückübertragung Stufe A |
| P10 | Liste der Auftragsstatus-Werte, Zeichensatz der Exporte (UTF-8 oder Windows-1252), Format der Auftragsnummern | Import-Parser |

**Grundregel:** Wir schreiben **niemals direkt in die TAIFUN-Datenbank.** Daten kommen nur über Wege in TAIFUN, die TAIFUN selbst anbietet. So bleiben Datenkonsistenz, Updates und Gewährleistung sicher.

---

## 2. Architektur

```
 Büro (lokal)                                Cloud (EU, Frankfurt)                  Unterwegs
┌──────────────────────┐   HTTPS, nur        ┌───────────────────────────┐        ┌───────────────┐
│ TAIFUN (Windows-Srv.)│   ausgehend         │ Web-App (GitHub Pages)    │◄──────►│ Handy/Tablet  │
│   │ Export (XML/XLSX)│ ──────────────────► │  - Büro-Oberfläche        │        │ PWA, offline- │
│   ▼                  │                     │  - Monteur-Oberfläche     │        │ fähig         │
│ Austauschordner      │ ◄────────────────── │  - Import / Export        │        └───────────────┘
│   ▲ Import (XML/PDF) │   Rückübertragung   │ Supabase                  │
│ Sync-Agent (Phase 9) │                     │  - Postgres-Datenbank     │
└──────────────────────┘                     │  - Login, Rollen          │
                                             │  - Dateispeicher (Fotos)  │
                                             │ Sprachdienst + KI (Ph. 8) │
                                             └───────────────────────────┘
```

| Baustein | Technik | Warum |
|---|---|---|
| Web-App | Next.js (TypeScript), als **PWA** installierbar | Eine Codebasis für Büro-PC und Handy, keine App-Store-Pflicht |
| Datenbank, Login, Dateien | Supabase (Postgres, Auth, Storage), Region EU | Rollen und Zugriffsrechte direkt in der Datenbank (Row Level Security) |
| Hosting | GitHub Pages (App) + Supabase Frankfurt (Daten) | kostenlos; zeitgesteuerte Aufgaben über GitHub Actions |
| Offline-Speicher | IndexedDB (über Dexie.js) + Service Worker | Heizungskeller haben oft kein Netz |
| Sprache → Text | Speech-to-Text-Dienst mit EU-Verarbeitung (Anbieter in Phase 8 auswählen) | Transkription |
| Text → Bericht | Claude API (z. B. Claude Sonnet 5.5) mit festem Ausgabeschema | strukturiert den Text in Tätigkeiten, Zeiten und Material |
| Sync-Agent | kleines Node.js-Programm als Windows-Dienst auf dem Büro-Server | überwacht den Austauschordner und verbindet sich nur **ausgehend**, also keine Portfreigabe im Router |
| E-Mails | Resend (später, Abschnitt 9) | Erinnerungen und Wochen-Excel |

---

## 3. Benutzerrollen

| Recht | Inhaber (Admin) | Büro | Monteur |
|---|:-:|:-:|:-:|
| Eigene heutigen Einsätze sehen | ✓ | ✓ | ✓ |
| Alle Aufträge und Termine sehen | ✓ | ✓ | – (nur zugewiesene + Anlagenhistorie seiner Kunden) |
| Anlagenakte lesen | ✓ | ✓ | ✓ (Anlagen seiner Aufträge) |
| Anlagendaten ändern, Typenschild erfassen | ✓ | ✓ | ✓ (wird protokolliert) |
| Bericht, Fotos, Checkliste erstellen | ✓ | – | ✓ (eigene Einsätze) |
| Bericht nach Einreichen ändern | ✓ | ✓ (mit Protokoll) | nur nach Rückweisung |
| Bericht freigeben oder zurückweisen | ✓ | ✓ | – |
| TAIFUN-Import / Rückübertragung auslösen | ✓ | ✓ | – |
| Checklisten-Vorlagen pflegen | ✓ | ✓ | – |
| Benutzer und Rollen verwalten | ✓ | – | – |
| (später) Kosten, Gehälter | ✓ | Kosten ja, Gehälter nein | – |

Hinweise:
- Der Inhaber arbeitet selbst als Monteur. Er hat deshalb Admin-Rechte **und** eine Monteur-Ansicht.
- Jeder Mensch bekommt ein eigenes Login, keine geteilten Zugänge. Nur so ist protokollierbar, wer was gemacht hat.
- Eine Ortung oder GPS-Verfolgung der Monteure gibt es nicht (Datenschutz).

---

## 4. Seitenstruktur

### 4a. Monteur (Handy, mobil zuerst)

| Pfad | Inhalt |
|---|---|
| `/login` | Anmeldung, auf dem Gerät gespeichert |
| `/heute` | **Startseite:** heutige Einsätze nach Uhrzeit. Pro Einsatz: Kunde, Adresse (Navi-Link), Auftragsart, Kurzbeschreibung, **Kundenhinweise** (z. B. „Schlüssel beim Nachbarn“, „Hund“). Anzeige des Sync-Status. |
| `/woche` | Einsätze der nächsten Tage (nur lesen) |
| `/auftrag/[id]` | Auftragsdetails: Nummer, Beschreibung aus TAIFUN, Kontakt (Anruf-Button), Anlage(n), letzte Berichte zu dieser Anlage |
| `/auftrag/[id]/bericht` | Bericht erfassen: **Mikrofon-Button**, Tätigkeiten, Arbeitszeiten, Material, Bemerkung intern/extern |
| `/auftrag/[id]/fotos` | Kamera; jedes Foto bekommt eine Kategorie (Typenschild, vorher, nachher, Messwert, Schaden) |
| `/auftrag/[id]/checkliste` | passende Checkliste zum Anlagentyp, mit Pflichtfeldern und Messwerten |
| `/auftrag/[id]/abschluss` | Zusammenfassung, optional Kundenunterschrift, „Bericht einreichen“ |
| `/anlage/[id]` | Anlagenakte (wie 4b, für Monteur gekürzt) |
| `/sync` | wartende Änderungen und Fotos, letzter Abgleich, „Jetzt synchronisieren“ |

### 4b. Büro und Inhaber (PC)

| Pfad | Inhalt |
|---|---|
| `/dashboard` | heutige Einsätze aller Monteure, Berichte zur Prüfung, letzter TAIFUN-Abgleich, Fehler |
| `/auftraege` | Liste mit Filter (Status, Monteur, Datum, Art); Monteur zuweisen, falls TAIFUN das nicht liefert |
| `/auftraege/[id]` | Detail mit allen Berichten, Fotos und Checklisten |
| `/kunden`, `/kunden/[id]` | Kundenstamm (aus TAIFUN, nur lesen), interne Hinweise, Standorte, Anlagen |
| `/anlagen/[id]` | **Digitale Anlagenakte:** Stammdaten, technische Daten, Typenschild-Foto, alle Fotos, Messwert-Verlauf, frühere Arbeiten (Zeitleiste) |
| `/berichte/pruefen` | Warteschlange eingereichter Berichte |
| `/berichte/[id]` | Bericht prüfen, korrigieren, **freigeben** oder **mit Kommentar zurückweisen**; Originaltranskript sichtbar |
| `/taifun/import` | Exportdatei hochladen (Phase 2), Vorschau der Änderungen, Import bestätigen, Importprotokolle |
| `/taifun/export` | freigegebene Berichte zur Übertragung, Export erzeugen, „in TAIFUN erfasst“ bestätigen, Exportprotokolle |
| `/einstellungen/checklisten` | Checklisten-Vorlagen je Anlagentyp (versioniert) |
| `/einstellungen/benutzer` | Benutzer, Rollen, Zuordnung zum TAIFUN-Mitarbeiterkürzel |
| `/einstellungen/protokoll` | Änderungs- und Fehlerprotokoll |

---

## 5. Datenmodell (Postgres)

**Feldhoheit:** Jedes Feld gehört genau einem System.

- **TAIFUN-Felder** sind in der App schreibgeschützt und werden bei jedem Import aktualisiert.
- **App-Felder** überschreibt der Import nie.

```
benutzer            id (= Supabase-Auth), name, rolle [admin|buero|monteur],
                    taifun_kuerzel, aktiv

kunde               id, taifun_kundennr (UNIQUE)                     ┐ TAIFUN
                    name, strasse, plz, ort, telefon, email          ┘
                    hinweise_intern                                    App
                    import_hash, zuletzt_importiert_am, in_taifun_vorhanden

standort            id, kunde_id → kunde, strasse, plz, ort,
                    zugangshinweise (Schlüssel, Hund, Etage)           App
                    (ein Kunde kann mehrere Objekte haben)

anlage              id, standort_id → standort, taifun_anlagen_id (falls TAIFUN Wartung)
                    anlagentyp [gastherme|oelkessel|waermepumpe|klima|solar|...]
                    hersteller, modell, seriennummer, baujahr, einbaudatum,
                    leistung_kw, brennstoff, kaeltemittel, kaeltemittel_menge_kg,
                    technische_daten (JSONB, frei je Typ),
                    typenschild_foto_id → foto, wartungsintervall_monate,
                    letzte_wartung_am, naechste_wartung_am

auftrag             id, taifun_auftragsnr (UNIQUE)                    ┐
                    kunde_id, standort_id, art [wartung|stoerung|projekt],│ TAIFUN
                    titel, beschreibung, taifun_status                 ┘
                    app_status [offen|in_arbeit|bericht_eingereicht|
                                freigegeben|uebertragen]              App
                    import_hash, zuletzt_importiert_am, in_taifun_vorhanden

auftrag_anlage      auftrag_id, anlage_id          (n:m)

termin              id, auftrag_id, monteur_id → benutzer,
                    beginn, ende, taifun_termin_id     (ein Auftrag kann mehrere Termine haben)

bericht             id (UUID, auf dem Handy erzeugt → Offline + Duplikatschutz)
                    auftrag_id, termin_id, monteur_id,
                    status [entwurf|eingereicht|zurueckgewiesen|freigegeben|
                            uebertragen|uebertragung_fehler],
                    taetigkeiten_text, bemerkung_kunde, bemerkung_intern,
                    transkript_roh, audio_datei_pfad, ki_vorschlag (JSONB),
                    kundenunterschrift_pfad, unterschrieben_von,
                    zurueckweisung_kommentar, freigegeben_von, freigegeben_am,
                    version (für Konflikterkennung), erstellt_am, geaendert_am

bericht_zeit        id, bericht_id, mitarbeiter_id, beginn, ende, pause_min, taetigkeit
bericht_material    id, bericht_id, artikelnummer (optional, TAIFUN), bezeichnung,
                    menge, einheit

foto                id (UUID vom Gerät), auftrag_id, anlage_id, bericht_id (optional),
                    kategorie [typenschild|vorher|nachher|messwert|schaden|sonstiges],
                    speicher_pfad, aufgenommen_am, aufgenommen_von, sha256, groesse

checkliste_vorlage  id, name, anlagentyp, version, aktiv,
                    punkte (JSONB: [{id, text, typ: ja_nein|zahl|text|foto,
                                     einheit, pflicht, grenzwerte}])
checkliste_ergebnis id (UUID), vorlage_id, vorlage_version, bericht_id, anlage_id,
                    antworten (JSONB), vollstaendig (bool)

import_lauf         id, quelle [upload|agent], dateiname, datei_sha256, typ
                    [kunden|auftraege|termine], gestartet, beendet,
                    status [ok|teilweise|fehler], neu, geaendert, unveraendert,
                    fehlerhaft, fehler (JSONB: Zeile, Feld, Meldung)

export_lauf         id, bericht_ids[], stufe [A|B|C], dateien[], erstellt_von,
                    status [erzeugt|abgeholt|bestaetigt|fehler],
                    bestaetigt_von, bestaetigt_am, fehlermeldung, versuche

protokoll           id, benutzer_id, tabelle, datensatz_id, aktion, vorher, nachher, zeitpunkt
```

Offene Entscheidung (abhängig von P3): Wenn TAIFUN Wartung genutzt wird, ist TAIFUN das führende System für Anlagenstammdaten. Unsere App ergänzt dann nur Fotos, Messwerte und Historie. Ohne TAIFUN Wartung führt unsere App die Anlagen.

---

## 6. Synchronisierung

### 6a. TAIFUN → App (Aufträge, Termine, Kunden, Status einlesen)

TAIFUN ist für diese Daten das **führende System**. Der Weg wird in drei Ausbaustufen gebaut:

| Stufe | Ablauf | Voraussetzung |
|---|---|---|
| **A: manuell** (Phase 2) | Das Büro exportiert in TAIFUN (Excel oder XML) und lädt die Datei unter `/taifun/import` hoch. | bestätigt für Kunden; für Aufträge und Termine **P4 klären** |
| **B: Ordner + Agent** (Phase 9) | TAIFUN exportiert in einen Austauschordner. Der Sync-Agent erkennt neue Dateien und lädt sie hoch. Derselbe Parser wie in Stufe A. | P4 + P5 |
| **C: direkt** (Phase 9) | Der Agent liest über eine offizielle API oder eine erlaubte lesende Datenbank-Verbindung. | P7 oder P8, **nur mit schriftlicher Freigabe von TAIFUN** |

**Ablauf eines Imports, für alle Stufen gleich:**
1. Datei prüfen: Format, Pflichtspalten, Zeichensatz. Ist die Datei schon importiert (gleicher SHA-256)? Dann abbrechen mit Hinweis.
2. Jede Zeile einzeln prüfen. Fehlerhafte Zeilen kommen in die Fehlerliste, die anderen laufen weiter.
3. Pro Datensatz einen Hash über die TAIFUN-Felder bilden und mit dem gespeicherten Hash vergleichen. So entsteht die Einteilung *neu / geändert / unverändert*.
4. **Vorschau** anzeigen, nur in Stufe A: „12 neue Aufträge, 3 geänderte Termine, 1 Fehler“.
5. Speichern per Upsert über den TAIFUN-Schlüssel, in **einer Transaktion**. Nur TAIFUN-Felder werden geschrieben.
6. Datensätze, die in einem **Komplett**-Export fehlen, werden **nicht gelöscht**. Sie bekommen `in_taifun_vorhanden = false` und werden im Büro angezeigt.
7. Bei geändertem Termin oder Auftragsstatus, wenn schon ein Bericht in Arbeit ist: Hinweis an den Monteur.
8. Import-Lauf protokollieren.

### 6b. App ↔ Handy (offline zuerst)

- **Vorab laden:** Beim Öffnen und alle 15 Minuten (wenn online) lädt das Gerät die Einsätze von heute und den nächsten 2 Tagen. Dazu kommen die passenden Kunden, Standorte, Anlagen, die letzten 5 Berichte je Anlage und die aktiven Checklisten-Vorlagen. Alles landet in IndexedDB.
- **Erfassen:** Alles wird zuerst lokal gespeichert und landet dann in einem **Ausgangskorb** (Outbox). IDs entstehen auf dem Gerät als UUID. Ein doppelt gesendeter Datensatz erzeugt deshalb kein Duplikat (idempotentes Upsert).
- **Hochladen:** Der Korb wird in Reihenfolge abgearbeitet, sobald Netz da ist. Fotos werden vorher auf ca. 2000 px und 80 % JPEG verkleinert und einzeln mit Wiederholung hochgeladen. Der Server bestätigt jede Datei per SHA-256. Erst nach der Bestätigung wird die lokale Kopie als „synchronisiert“ markiert.
- **Konflikte:**
  - TAIFUN-Felder: Der Server gewinnt immer.
  - Bericht: gehört einem Monteur. Konflikte gibt es praktisch nur zwischen Monteur und Büro. Die Prüfung läuft über das Feld `version`. Ist der Bericht schon freigegeben, wird die Änderung abgelehnt und der Monteur sieht einen Hinweis.
  - Anlagendaten: Änderungen pro Feld zusammenführen. Bei echtem Konflikt (gleiches Feld, verschiedene Werte) bekommt das Büro einen Klärungsfall.

### 6c. App → TAIFUN (Freigabe und Rückübertragung)

Der Ablauf eines Berichts:

```
Entwurf ─► eingereicht ─► (Büro prüft) ─► freigegeben ─► übertragen
               ▲                │                │
               └── zurückgewiesen ◄┘                └─► Übertragungsfehler ─► erneut versuchen
```

| Stufe | Rückweg | Status |
|---|---|---|
| **A** (Phase 6) | Pro Bericht wird ein **PDF** erzeugt (Bericht, Zeiten, Material, Checkliste, Fotos, Unterschrift). Zusätzlich eine **Erfassungsübersicht** mit Stunden und Material, zum Abtippen oder Kopieren in den TAIFUN-Auftrag. Das PDF wird dem Auftrag als Dokument angehängt (**P9 klären**). Danach klickt das Büro „in TAIFUN erfasst“. | funktioniert ohne Schnittstelle; bestätigte Grundlage ist nur der manuelle Weg |
| **B** (Phase 9) | Der Agent legt eine **XML-Datei im Format der TAIFUN-Import-Vorlage** in den Austauschordner. Das Büro importiert sie in TAIFUN, oder TAIFUN liest sie automatisch ein (falls P5 das hergibt). Das Importprotokoll von TAIFUN wird zurückgemeldet. | **zu prüfen: P6** |
| **C** | über eine offizielle API | **zu prüfen: P7** |

Den Status *übertragen* setzt die App **erst nach einer Bestätigung**, also durch einen Klick oder durch ein erfolgreiches TAIFUN-Importprotokoll. Jede Exportdatei enthält die Bericht-ID. So kann ein Bericht nicht doppelt übertragen werden.

---

## 7. Fehlerbehandlung

| Situation | Verhalten |
|---|---|
| Importdatei kaputt, falsches Format, falscher Zeichensatz | Nichts wird gespeichert. Klare Meldung mit Zeile und Spalte. |
| Einzelne Zeilen fehlerhaft | Rest wird importiert. Die Fehlerliste steht im Importprotokoll und auf dem Dashboard. |
| Unbekannter Kunde im Auftrag | Auftrag wird mit Platzhalter-Kunde importiert und markiert. Hinweis: „zuerst Kundenexport einlesen“. |
| Agent schreibt in eine halb fertige Datei (Stufe B) | Datei wird erst verarbeitet, wenn ihre Größe 10 Sekunden lang gleich bleibt. Danach wird sie in `verarbeitet/` oder `fehler/` verschoben. |
| Agent oder Büro-PC ist aus | Der Agent meldet sich alle 5 Minuten („Herzschlag“). Ab 2 Stunden ohne Meldung erscheint eine Warnung auf dem Dashboard, ab 24 Stunden eine E-Mail an den Admin. |
| Daten veraltet | Jede Seite zeigt „TAIFUN-Stand: heute 07:12“. Ab mehr als einem Arbeitstag Alter wird die Anzeige gelb bzw. rot. |
| Handy offline | Alles läuft lokal weiter. Ein Zähler zeigt „3 Änderungen, 7 Fotos warten“. Abmelden mit nicht synchronisierten Daten wird verhindert, mit Warnung. |
| Upload bricht ab | Neuer Versuch mit wachsender Wartezeit (2 s, 4 s, 8 s … bis 5 min). Die lokale Kopie bleibt bis zur Bestätigung durch den Server. |
| Handyspeicher voll | Bereits synchronisierte Fotos werden lokal gelöscht, die ältesten zuerst. Erscheint eine Warnung vor dem nächsten Foto. |
| Spracherkennung fehlgeschlagen | Die Audiodatei bleibt gespeichert und wird später erneut verarbeitet. Der Monteur kann jederzeit tippen. |
| KI-Auswertung unsicher oder falsch | Die KI liefert **nur einen Vorschlag**. Der Monteur muss vor dem Einreichen bestätigen. Felder, die die KI nicht sicher erkannt hat, werden markiert. Die KI darf nichts erfinden, was nicht gesagt wurde. Das Originaltranskript bleibt gespeichert und ist für das Büro sichtbar. |
| Checkliste unvollständig | Einreichen ist erst möglich, wenn die Pflichtpunkte ausgefüllt sind. Ausnahme: eine Begründung („Anlage nicht zugänglich“). |
| Rückübertragung fehlgeschlagen | Status *Übertragungsfehler* mit Meldung und Button „erneut versuchen“. Der Bericht bleibt unverändert. |
| Programmfehler | Fehler werden zentral erfasst (z. B. mit Sentry), die Nutzer sehen eine verständliche Meldung. |
| Datenverlust | Tägliche Datenbank-Sicherung. Die Fotos liegen im Speicher mit Versionierung. **Ob der kostenlose Supabase-Tarif Sicherungen enthält, noch prüfen;** sonst ist der bezahlte Tarif nötig. |

**Datenschutz (DSGVO):**
- Auftragsverarbeitungsverträge mit Supabase, GitHub, dem Sprachdienst und dem KI-Dienst abschließen.
- Alle Daten in der EU speichern.
- Löschfristen für Audiodateien festlegen, z. B. 30 Tage nach der Freigabe.
- Keine Standortverfolgung der Mitarbeiter.

---

## 8. Entwicklungsreihenfolge

Jede Phase endet mit einem Stand, den der Betrieb **wirklich benutzen** kann.

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0: Klärung** | Fragen P1 bis P10 an TAIFUN klären. Je einen **Beispiel-Export** für Kunden, Aufträge und Termine besorgen. Mit dem Inhaber 3 typische Einsätze durchgehen. **Entscheidung:** eigene App bauen oder TAIFUN-Module nutzen? | Klarheit, keine verschwendete Arbeit |
| **1: Fundament** | Projekt anlegen, Supabase (EU), Login, Rollen, Datenbanktabellen mit Zugriffsregeln, Veröffentlichung auf GitHub Pages | leere App mit Login |
| **2: Import Stufe A** | Datei-Upload, Parser für die Beispiel-Exporte, Vorschau, Protokoll; Büroseiten `/auftraege` und `/kunden` | TAIFUN-Daten in der App |
| **3: Mobile Übersicht** | `/heute`, `/woche`, Auftragsdetail, Kundenhinweise (online) | Monteure sehen ihren Tag |
| **4: Anlagenakte** | Anlagen anlegen und bearbeiten, Typenschild-Foto, technische Daten, Zeitleiste | Digitale Anlagenakte |
| **5: Bericht, Fotos, Checklisten** | Bericht per Tastatur, Fotos mit Kategorie, Checklisten-Vorlagen, Unterschrift | Einsatz vollständig digital dokumentiert |
| **6: Freigabe + Rückweg Stufe A** | Prüf-Warteschlange, zurückweisen und freigeben, PDF und Erfassungsübersicht, „in TAIFUN erfasst“ | **Erster kompletter Kreislauf** |
| **7: Offline** | PWA, IndexedDB, Ausgangskorb, Foto-Warteschlange, Sync-Anzeige | funktioniert im Keller |
| **8: Spracheingabe** | Aufnahme, Transkription, KI-Strukturierung, Bestätigung durch den Monteur | weniger Tipparbeit |
| **9: Automatisierung** | Sync-Agent; Stufe B und C, falls P4 bis P8 das erlauben | weniger Klicks im Büro |
| **10: Frühere Wünsche** | siehe Abschnitt 9 | |

Warum diese Reihenfolge:
- Der Import kommt zuerst, weil alles andere auf echten TAIFUN-Daten aufbaut.
- Der Rückweg kommt vor Offline und Sprache. Erst dann ist der Kreislauf einmal geschlossen und im Alltag testbar.
- Offline und Sprache sind Verbesserungen einer Funktion, die dann schon läuft.

---

## 9. Frühere Wünsche: Einordnung

| Wunsch | Einordnung |
|---|---|
| Wartungskunden mit Geräten (Marke, Baujahr), nächste Wartung | in Phase 4 enthalten (`anlage.naechste_wartung_am`). Überschneidung mit TAIFUN Wartung (P3) |
| Erinnerungsmail 3 Monate vor der Wartung an Büro und Kunde | tägliche Cron-Aufgabe + Resend. Eigene Absender-Domain nötig. Prüfen, ob TAIFUN Wartung das schon kann |
| Wöchentliche Excel-Mail aller Wartungskunden | Cron-Aufgabe, Excel-Datei (z. B. mit ExcelJS), Mail mit Anhang |
| Warnung bei Monaten mit vielen Wartungen | Auswertung über `naechste_wartung_am` je Monat; Hinweis in der Wochen-Mail |
| Urlaubsplaner | eigenes kleines Modul (Antrag → Freigabe durch den Inhaber → Kalender). Abwesenheiten blenden Einsätze aus |
| Kostenübersicht, Rechnungen hochladen, Fixkosten | eigenes Modul. TAIFUN erfasst Eingangsrechnungen (ZUGFeRD) und gibt sie an DATEV weiter. Die App wäre eher eine **Übersicht**, keine zweite Buchhaltung |
| Gehälter im Überblick | nur Anzeige, nur für den Admin. Die Lohnabrechnung bleibt beim Steuerberater |

Offen aus der ersten Fragerunde: F1 bis F8 (Nutzer, Absender-Domain, vorhandene Kundenliste, Wartungsintervall, Gehälter, Rechnungen, Reihenfolge, Grenzwert für „auffälliger Monat“). F1 und F7 sind durch diesen Bauplan teilweise beantwortet.

---

## Quellen

- [TAIFUN Handwerker-App (Hersteller)](https://taifun-software.de/module/taifun-handwerker-app/)
- [TAIFUN Handwerker-App im App Store](https://apps.apple.com/us/app/taifun-handwerker-app/id608686712) · [Google Play](https://play.google.com/store/apps/details?id=de.taifun_software&hl=en_IN)
- [TAIFUN Wartung](https://taifun-software.de/module/taifun-wartung/) · [TAIFUN Terminplaner](https://taifun-software.de/module/taifun-terminplaner/)
- [TAIFUN Handwerk](https://taifun-software.de/produkte/taifun-handwerk/) · [TAIFUN+](https://taifun-software.de/produkte/taifunplus/) · [SHK-Seite](https://taifun-software.de/gewerke/sanitaerheizung/)
- [TAIFUN ImmoConnect (immo-office/Mareon)](https://taifun-software.de/module/taifun-immoconnect/)
- [TAIFUN DATEV-Datenaustausch](https://taifun-software.de/module/taifun-datev-datenaustausch/)
- [XML-Export von Artikeln (Elektriker-Wissen)](https://elektriker-wissen.de/theorie/meistervorbereitung-teil-1/taifun-software/taifun-artikel-in-xml-datei-exportieren)
- [Noovi: Taifun-Schnittstelle](https://doku.noovi.ch/support/solutions/articles/103000329103-taifun-schnittstelle) · [MeinHandwerker-App: Taifun-Schnittstelle](https://doku.mein-handwerker-app.de/support/solutions/articles/103000271995-taifun-schnittstelle)
- [Vergleich TAIFUN vs. Meisterwerk (Wettbewerber, mit Vorsicht)](https://blog.meisterwerk.app/vergleich/taifun-vs-meisterwerk)
- [Förster Digital: Handwerkersoftware mit Schnittstelle](https://foerster-digital.de/insights/handwerkersoftware-schnittstelle-automatisieren)
