## Backend Setup/Anleitung (Google Sheet & Apps Script)

**1. Google Sheet einrichten:**

* Erstelle eine neue Google Tabelle.
* Benenne das erste Tabellenblatt (den Reiter unten) **exakt** `Spieldaten` (Groß-/Kleinschreibung beachten!).
* In Spalte A (ab Zeile 2): Trage die eindeutigen Kürzel der Teilnehmer ein (Überschrift in A1 z.B. "Kuerzel").
* In Spalte B (ab Zeile 2): Trage die zugehörigen Punktestände ein (Überschrift in B1 z.B. "Score"). **Wichtig:** Formatiere diese Spalte als **Zahl**.

**2. Google Apps Script erstellen und bereitstellen:**

* Öffne die Google Tabelle, gehe zu "Erweiterungen" (oder "Tools") -> "Apps Script".
* Kopiere den Code aus der Datei `GoogleAppsScript.gs` (oder wie auch immer du sie in Schritt 1 genannt hast) in diesem Repository und füge ihn in den Editor ein (ersetze den Standardinhalt).
* **Wichtig:** Überprüfe im Code die Zeile `const sheet = ss.getSheetByName("Spieldaten");` und passe `"Spieldaten"` ggf. an den exakten Namen deines Tabellenblatts an.
* Speichere das Skriptprojekt (gib ihm einen Namen).
* Stelle das Skript bereit: Klicke auf "Bereitstellen" -> "Neue Bereitstellung".
    * Wähle als Typ: **"Web-App"**.
    * Beschreibung: Optional (z.B. "Spielbrett Daten API").
    * Ausführen als: **"Ich"** (Dein Google-Konto).
    * Wer hat Zugriff: **"Jeder"** oder **"Jeder, auch anonym"**.
* Klicke auf "Bereitstellen" und autorisiere die notwendigen Zugriffsrechte für das Skript auf deine Tabelle.
* **Kopiere die angezeigte Web-App-URL** – diese wird im nächsten Schritt gebraucht.

**3. Frontend verbinden:**

* Öffne die Datei `script.js` des Frontend-Codes.
* Finde die Zeile `const G_SHEET_URL = "...";` am Anfang der Datei.
* Füge die **kopierte Web-App-URL** in die Anführungszeichen ein bzw. ersetze den bestehenden Link.
* *(Hinweis: Diese URL ist spezifisch für deine Bereitstellung.)
