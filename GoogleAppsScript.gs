function doGet(e) {
  // Zugriff auf das aktuelle Google Sheet und das erste Tabellenblatt
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Spieldaten"); // WICHTIG: Passe "Tabelle1" an, falls dein Blatt anders heißt!

  // Daten auslesen (Alle Zeilen ab Zeile 2, Spalten A und B)
  // Nimmt an, dass in A1 "Kuerzel" und B1 "Score" steht
  const range = sheet.getRange("A2:B" + sheet.getLastRow());
  const values = range.getValues(); // Gibt ein Array von Arrays zurück, z.B. [ ["MM", 10], ["PS", 25] ]

  // Daten in ein Objekt umwandeln (leichter für Javascript)
  // Ergebnis z.B.: { "MM": 10, "PS": 25 }
  const scoreData = {};
  values.forEach(row => {
    if (row[0] && (typeof row[1] === 'number')) { // Nur wenn Kürzel existiert und Score eine Zahl ist
      scoreData[row[0]] = row[1];
    }
  });

  // Daten als JSON zurückgeben
  return ContentService
        .createTextOutput(JSON.stringify(scoreData))
        .setMimeType(ContentService.MimeType.JSON);
}
