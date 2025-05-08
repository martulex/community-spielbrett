// Bitte ersetze DIESE URL durch die Ausführbare URL deines Google Apps Scripts (Web-App Bereitstellung)
const G_SHEET_URL = "https://script.google.com/macros/s/AKfycbxcnPUlFvbh2e5muig3n54cCTVK-lBUyhVDxQ_4Y28OKV_mZdaHPuIDVjMmWE4LfjFcjQ/exec";

// Globale Variablen (bestehende und neue)
let scoreData = null; // Speichert die Spieler-Scores vom Sheet
let kuerzelPopulated = false; // Flag, ob Dropdown gefüllt wurde (wird nicht mehr streng benötigt mit neuer Logik)
let fieldToPlayersMap = {}; // Map: fieldId -> [kuerzel1, kuerzel2, ...] (Welche Spieler sind auf welchem Feld)
let currentSelectedKuerzel = ""; // Speichert das aktuell im Dropdown ausgewählte Kürzel

// --- NEUE Globale Variablen für Login & Scan ---
let loggedInPlayerKuerzel = null; // Das Kürzel des aktuell eingeloggten Spielers
let authSessionToken = null; // Das Authentifizierungs-Token vom Backend
const STORAGE_KEY_SESSION = 'spielbrett_session'; // Key für localStorage zum Speichern der Session

let videoStream = null; // Referenz auf den Kamerastream
let qrCodeScannerInterval = null; // Referenz auf das Interval für den Scanner-Loop
let pendingScanResult = null; // Speichert das Ergebnis eines Scans, falls ein Login nötig war

// NEUE Elemente aus dem HTML abrufen
const loginContainer = document.getElementById('login-container');
const loginKuerzelInput = document.getElementById('login-kuerzel');
const loginPinInput = document.getElementById('login-pin');
const loginBtn = document.getElementById('login-btn');
const loginMessage = document.getElementById('login-message'); // Für Fehlermeldungen beim Login

const gameControlsContainer = document.getElementById('game-controls'); // Der Container mit den alten Buttons
const startScanBtn = document.getElementById('start-scan-btn'); // Der neue Scan-Button
const logoutBtn = document.getElementById('logout-btn'); // Der neue Logout-Button

const scannerContainer = document.getElementById('scanner-container'); // Der Container für den Scanner-View
const cameraFeed = document.getElementById('camera-feed'); // Das Video-Element für den Kamerastream
const scanResultDiv = document.getElementById('scan-result'); // Zeigt Scan-Status/Ergebnis an
const stopScanBtn = document.getElementById('stop-scan-btn'); // Button zum Abbrechen des Scans

const notificationDiv = document.getElementById('notification'); // Element für Benachrichtigungen


// --- NEUE Funktionen für Login und Session Management ---

// Speichert die Session-Daten im Browser (localStorage)
function saveSession(kuerzel, token) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ kuerzel: kuerzel, token: token }));
    loggedInPlayerKuerzel = kuerzel;
    authSessionToken = token;
    console.log(`Session für ${kuerzel} gespeichert.`);
}

// Lädt die Session-Daten aus dem Browser (localStorage)
function loadSession() {
    const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            // Prüfe, ob die notwendigen Daten vorhanden sind
            if (sessionData && sessionData.kuerzel && sessionData.token) {
                loggedInPlayerKuerzel = sessionData.kuerzel;
                authSessionToken = sessionData.token;
                console.log(`Session für ${loggedInPlayerKuerzel} geladen.`);
                // Optional: Hier könnte man einen schnellen Backend-Check machen, ob das Token noch gültig ist
                return true; // Session-Daten gefunden
            }
        } catch (e) {
            console.error("Fehler beim Laden der Session:", e);
            clearSession(); // Ungültige/fehlerhafte Session löschen
        }
    }
    console.log("Keine gültige Session im localStorage gefunden.");
    return false; // Keine gültige Session gefunden oder Fehler beim Parsen
}

// Löscht die Session-Daten aus dem Browser (localStorage)
function clearSession() {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    loggedInPlayerKuerzel = null;
    authSessionToken = null;
    console.log("Session gelöscht.");
}

// Führt den Login-Prozess durch (sendet Daten an Apps Script)
async function performLogin(kuerzel, pin) {
    loginMessage.textContent = 'Melde an...';
    loginBtn.disabled = true; // Button während des Logins deaktivieren

    try {
        const response = await fetch(G_SHEET_URL, {
            method: 'POST',
            // Wichtig: Content-Type für Google Apps Script Web-Apps
            headers: {
                 'Content-Type': 'text/plain;charset=utf-8',
            },
            // Daten als JSON im Body senden
            body: JSON.stringify({ action: 'login', kuerzel: kuerzel, pin: pin })
        });

        if (!response.ok) {
            // Handle HTTP errors (z.B. 404, 500)
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }

        const result = await response.json(); // Antwort als JSON parsen
        console.log("Login Ergebnis vom Backend:", result);

        if (result.success) {
            // Login erfolgreich: Session speichern und UI wechseln
            saveSession(result.kuerzel, result.authToken);
            showGameUI(); // Zeige die Haupt-Spiel-UI
            loginMessage.textContent = ''; // Fehlermeldung löschen

            // Nach erfolgreichem Login: Scores neu laden und anzeigen
            await fetchScoresAndPopulateDropdown();
            // Optional: Spieler im Dropdown automatisch auswählen, wenn er existiert
            const selectElement = document.getElementById('kuerzel-select');
            if(selectElement && selectElement.querySelector(`option[value="${loggedInPlayerKuerzel}"]`)){
                 selectElement.value = loggedInPlayerKuerzel;
                 currentSelectedKuerzel = loggedInPlayerKuerzel; // Globalen Merker setzen
                 showSinglePlayerPosition(loggedInPlayerKuerzel); // Seine Position anzeigen
                 updateCopyLinkButtonVisibility(); // Copy Link Button aktualisieren
            }


            // Prüfe, ob ein Scan-Ergebnis wartet (z.B. wenn QR-Code gescannt wurde, bevor man eingeloggt war)
             if(pendingScanResult) {
                console.log("Wartendes Scan Ergebnis gefunden, verarbeite es jetzt.");
                const scannedUrl = pendingScanResult;
                pendingScanResult = null; // Ergebnis löschen, bevor es verarbeitet wird
                // Verarbeite den Code, der zum Login geführt hat (führt zum UpdatePosition Call)
                await processScannedUrl(scannedUrl);
             }


        } else {
            // Login fehlgeschlagen (falsche PIN etc.)
            loginMessage.textContent = result.error || 'Login fehlgeschlagen.';
            // Wenn das Backend einen authError Flag sendet, lösche die Session (falls eine alte da war)
             if(result.authError) {
                 clearSession();
             }
        }

    } catch (error) {
        console.error("Fehler beim Login:", error);
        loginMessage.textContent = `Fehler: ${error.message}`;
         clearSession(); // Bei einem Fehler die Session sicherheitshalber löschen
    } finally {
        loginBtn.disabled = false; // Button wieder aktivieren
    }
}

// --- UI Switching Funktionen ---

// Zeigt den Login-Bereich und versteckt andere Bereiche
function showLoginUI() {
    loginContainer.classList.remove('hidden');
    gameControlsContainer.classList.add('hidden');
    scannerContainer.classList.add('hidden');
    // Optional: Spielbrett ausblenden, wenn nicht eingeloggt?
    const spielbrettContainer = document.getElementById('spielbrett-container');
    if(spielbrettContainer) spielbrettContainer.classList.add('hidden'); // Oder andere Logik
}

// Zeigt die Haupt-Spiel-UI (Steuerungselemente und Spielbrett) und versteckt Login/Scanner
function showGameUI() {
     loginContainer.classList.add('hidden');
     gameControlsContainer.classList.remove('hidden');
     scannerContainer.classList.add('hidden');
     // Spielbrett wieder einblenden
     const spielbrettContainer = document.getElementById('spielbrett-container');
     if(spielbrettContainer) spielbrettContainer.classList.remove('hidden');
}

// Zeigt den Scanner-Bereich und versteckt andere Bereiche
function showScannerUI() {
    loginContainer.classList.add('hidden');
    gameControlsContainer.classList.add('hidden'); // Steuerung ausblenden, während gescannt wird
    scannerContainer.classList.remove('hidden');
    // Optional: Spielbrett ausblenden während des Scans?
    const spielbrettContainer = document.getElementById('spielbrett-container');
    if(spielbrettContainer) spielbrettContainer.classList.add('hidden');
}


// --- NEUE Funktionen für QR-Code Scan ---

// Startet den Kamerazugriff und den Scan-Loop
async function startScanner() {
    showScannerUI(); // Zeige den Scanner-Bereich
    scanResultDiv.textContent = 'Kamera wird gestartet...'; // Statusmeldung

    try {
        // Zugriff auf die Kamera anfordern (bevorzugt Rückkamera auf Mobilgeräten)
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        cameraFeed.srcObject = videoStream;
        cameraFeed.setAttribute("playsinline", true); // Wichtig für iOS, um im Browser abzuspielen

        // Warten, bis das Video geladen ist und bereit zum Abspielen
        await new Promise((resolve, reject) => {
            cameraFeed.onloadedmetadata = () => {
                cameraFeed.play().then(resolve).catch(reject); // Video abspielen und Promise auflösen
            };
             // Optional: Timeout hinzufügen, falls onloadedmetadata nie feuert
             setTimeout(() => reject(new Error("Kamera-Metadaten Timeout")), 10000); // 10 Sekunden Timeout
        });


        scanResultDiv.textContent = 'Positioniere den QR-Code im Bild...'; // Neue Statusmeldung

        // Starte den Scan-Interval: Versucht alle 100ms einen QR-Code zu finden
        qrCodeScannerInterval = setInterval(scanFromVideo, 100);

    } catch (err) {
        console.error("Fehler beim Starten der Kamera:", err);
        scanResultDiv.textContent = `Fehler beim Starten der Kamera: ${err.message}`;
        // Bei Fehler: Scanner stoppen und zurück zur Spiel-UI
         stopScanner();
         showGameUI();
         showNotification(`Kamerafehler: ${err.message}`, 'red');
    }
}

// Scannt einen Frame vom Video-Feed nach einem QR-Code
function scanFromVideo() {
    // Stelle sicher, dass das Video spielbereit ist und Dimensionen hat
    if (cameraFeed.readyState === cameraFeed.HAVE_PAGES && cameraFeed.videoWidth > 0 && cameraFeed.videoHeight > 0) {
        const canvas = document.createElement('canvas'); // Temporäres Canvas-Element
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;
        const ctx = canvas.getContext('2d');

        // Zeichne den aktuellen Video-Frame auf das Canvas
        ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

        // Hole die Bilddaten vom Canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Nutze die jsQR Bibliothek, um nach einem QR Code in den Bilddaten zu suchen
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert", // Kann helfen, invertierte Codes zu lesen
        });

        if (code) {
            console.log("QR Code gefunden:", code.data);
            scanResultDiv.textContent = 'QR Code gefunden!';
            stopScanner(); // Scanner stoppen, sobald ein Code gefunden wurde

             // Verarbeite den Inhalt des QR-Codes (sollte eine URL sein)
             processScannedUrl(code.data);

        }
        // Optional: Zeige eine kleine Box um den gefundenen Code an (für visuelles Feedback)
        // if (code && code.locations) {
        //     // Füge hier Code hinzu, um die Ecken des Codes zu zeichnen
        //     // Das erfordert ein Canvas-Overlay über dem Video oder ähnliches
        // }
    }
}

// Stoppt den Kamerastream und den Scan-Interval
function stopScanner() {
    if (qrCodeScannerInterval) {
        clearInterval(qrCodeScannerInterval);
        qrCodeScannerInterval = null;
    }
    if (videoStream) {
        // Stoppe alle Tracks (Video, Audio, falls vorhanden) im Stream
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    cameraFeed.srcObject = null; // Entferne den Stream vom Video-Element
    console.log("Scanner gestoppt.");
    // Die UI wird danach von processScannedUrl oder der aufrufenden Funktion umgeschaltet
}

// Verarbeitet die gescannte URL aus dem QR-Code
async function processScannedUrl(scannedData) {
    console.log("Verarbeite gescannte Daten (URL):", scannedData);

     let url;
     try {
         // Versuche, die gescannte Daten als URL zu parsen
         url = new URL(scannedData);
     } catch (e) {
         // Wenn es keine gültige URL ist
         console.warn("Gescannter Code ist keine gültige URL:", scannedData);
         showNotification("Ungültiger QR-Code gescannt.", 'red');
         showGameUI(); // Zurück zur Spiel-UI
         return;
     }

     // Prüfe, ob die gescannte URL auf diese Anwendung verweist
     // window.location.origin ist z.B. "https://martulex.github.io"
     // window.location.pathname ist z.B. "/community-spielbrett/"
     // Dies stellt sicher, dass nur Codes für DIESES Spielbrett verarbeitet werden
     if (url.origin !== window.location.origin || !url.pathname.startsWith(window.location.pathname)) {
         console.warn("Gescannte URL gehört nicht zu dieser Anwendung:", scannedData);
         showNotification("Gescannter QR-Code gehört nicht zum Spielbrett.", 'red');
         showGameUI(); // Zurück zur Spiel-UI
         return;
     }


     // Extrahiere den 'field' Parameter aus der URL
     const fieldId = url.searchParams.get('field');

    if (!fieldId) {
         console.warn("Gescannte URL enthält keinen 'field' Parameter:", scannedData);
         showNotification("QR-Code des Feldes unvollständig oder falsch.", 'orange');
          showGameUI(); // Zurück zur Spiel-UI
         return;
    }

     console.log("Gescannte Feld-ID:", fieldId);


    // Prüfe, ob der Nutzer eingeloggt ist
    if (!loggedInPlayerKuerzel || !authSessionToken) {
        console.log("Nutzer nicht eingeloggt. Leite zum Login weiter.");
         pendingScanResult = scannedData; // Speichere das Scan-Ergebnis für nach dem Login
        showLoginUI(); // Zeige Login-UI
        loginMessage.textContent = 'Bitte melde dich an, um deine Figur zu bewegen.'; // Hinweis für den Nutzer
         // Optional: Fokus auf das Kürzel-Input-Feld setzen
         // loginKuerzelInput.focus();
         return; // Verarbeitung stoppen, bis Login erfolgt ist
    }

    // Wenn eingeloggt: Sende das Update an das Backend
    console.log(`Logged in als ${loggedInPlayerKuerzel}. Sende Update für Feld ${fieldId}.`);
    await sendPositionUpdate(loggedInPlayerKuerzel, authSessionToken, fieldId);

    // Nach dem Update (erfolgreich oder nicht), zurück zur Spiel-UI
    showGameUI();
}

// Sendet die aktualisierte Position an das Google Apps Script Backend
async function sendPositionUpdate(kuerzel, token, fieldId) {
    // Zeige eine Benachrichtigung, dass das Update läuft
    showNotification('Position wird aktualisiert...', 'blue');

    try {
         const response = await fetch(G_SHEET_URL, {
             method: 'POST',
             headers: {
                 'Content-Type': 'text/plain;charset=utf-8', // Wichtig für Google Apps Script
             },
             // Sende die notwendigen Daten als JSON
             body: JSON.stringify({
                 action: 'updatePosition', // Aktion für das Backend
                 kuerzel: kuerzel,
                 authToken: token,
                 fieldId: fieldId // Die gescannte Feld-ID
             })
         });

         if (!response.ok) {
             throw new Error(`HTTP Fehler! Status: ${response.status}`);
         }

         const result = await response.json(); // Antwort parsen
         console.log("Update Ergebnis vom Backend:", result);

         if (result.success) {
             // Update erfolgreich: Erfolgsmeldung anzeigen
             showNotification(result.message || `Feld auf ${fieldId} aktualisiert!`, 'green');
              // Daten im Frontend neu laden, um die eigene Figur auf dem neuen Feld zu sehen
              await fetchScoresAndPopulateDropdown();
              // Stelle sicher, dass die Markierung des aktuellen Spielers aktualisiert wird
              showSinglePlayerPosition(loggedInPlayerKuerzel);

         } else {
             // Update fehlgeschlagen: Fehlermeldung anzeigen
             let errorMessage = result.error || 'Update fehlgeschlagen.';
             // Wenn das Backend einen Authentifizierungsfehler meldet
             if (result.authError) {
                 errorMessage += ' Bitte neu anmelden.';
                 clearSession(); // Sitzung löschen, wenn Authentifizierung fehlschlägt
                 showLoginUI(); // Zurück zum Login-Bildschirm
             }
             showNotification(errorMessage, 'red'); // Rote Fehlermeldung
         }

    } catch (error) {
        console.error("Fehler beim Senden des Updates:", error);
        showNotification(`Fehler beim Senden des Updates: ${error.message}`, 'red'); // Rote Fehlermeldung bei Netzwerk/Systemfehler
        // Bei einem Fehler, der nicht authError ist, die Session nicht löschen
    }
}

// Zeigt eine temporäre Benachrichtigung am unteren Bildschirmrand
function showNotification(message, color = 'green', duration = 3000) {
    notificationDiv.textContent = message; // Text setzen
    // Hintergrundfarbe basierend auf dem 'color' Parameter setzen
    notificationDiv.style.backgroundColor = color === 'green' ? 'rgba(0, 128, 0, 0.9)' : // Etwas deckender
                                          color === 'red' ? 'rgba(220, 53, 69, 0.9)' :
                                          color === 'blue' ? 'rgba(0, 123, 255, 0.9)' :
                                          'rgba(0, 0, 0, 0.8)'; // Default dunkelgrau

    notificationDiv.classList.add('visible'); // Klasse für Fade-In hinzufügen (siehe CSS)
    notificationDiv.style.display = 'block'; // Element anzeigen (wichtig für Transition)


    // Timer zum Ausblenden der Benachrichtigung
    setTimeout(() => {
         notificationDiv.classList.remove('visible'); // Klasse für Fade-Out entfernen
         // display: none erst NACHDEM die Transition (Fade-Out) abgeschlossen ist
         setTimeout(() => { notificationDiv.style.display = 'none'; }, 500); // Wartezeit = CSS transition-duration
    }, duration); // Dauer, wie lange die Benachrichtigung sichtbar ist
}


// --- Anpassungen an bestehenden Funktionen und Event Listenern ---

// Vorhandene Funktion generateBoard() bleibt gleich.
function generateBoard() {
    const spielbrettContainer = document.getElementById('spielbrett-container');
    if (!spielbrettContainer) {
        console.error("FEHLER: #spielbrett-container Element nicht gefunden!");
        return;
    }
    spielbrettContainer.innerHTML = '';
    const anzahlFelder = 100;
    const ereignisFelder = [14, 40, 56, 77, 93]; // Beispiel Ereignisfelder

    // Start-Feld
    const startFeld = document.createElement('div');
    startFeld.classList.add('spielbrett-feld', 'start-feld');
    startFeld.setAttribute('data-field-id', 'start');
    startFeld.textContent = 'Start';
    spielbrettContainer.appendChild(startFeld);

    // Felder 1 bis 100
    for (let i = 1; i <= anzahlFelder; i++) {
        const feld = document.createElement('div');
        feld.classList.add('spielbrett-feld');
        feld.setAttribute('data-field-id', i);

        if (i === 100) {
            feld.classList.add('ziel-feld');
            feld.textContent = i;
        } else if (ereignisFelder.includes(i)) {
            feld.classList.add('ereignis-feld');
            feld.textContent = '?';
        } else {
            feld.textContent = i;
        }
        spielbrettContainer.appendChild(feld);
    }
    console.log('Spielbrett-Felder (Start bis 100) generiert.');
}


// Vorhandene Funktion preprocessScoreData() bleibt gleich.
function preprocessScoreData(data) {
    const map = {};
    // Iteriere über die Spielerdaten (erwartet Format { "Kuerzel": Score, ... })
    for (const kuerzel in data) {
        let score = data[kuerzel];
        // Bestimme die Feld-ID basierend auf dem Score
        let fieldId = (typeof score === 'number' && score >= 1 && score <= 100) ? score.toString() : 'start';
         // Optional: Behandle Score 100 als 'ziel' Feld-ID, falls du das im HTML so benannt hast
         if (score === 100) fieldId = '100'; // Oder 'ziel', je nach data-field-id im HTML

        // Füge das Kürzel zur Liste der Spieler auf diesem Feld hinzu
        if (!map[fieldId]) {
            map[fieldId] = [];
        }
        map[fieldId].push(kuerzel);
    }
    console.log("Daten vorverarbeitet (Feld -> Spieler):", map);
    fieldToPlayersMap = map; // Global speichern
}


// Vorhandene Funktion updateCopyLinkButtonVisibility() bleibt gleich.
function updateCopyLinkButtonVisibility() {
    const selectElement = document.getElementById('kuerzel-select');
    const copyButton = document.getElementById('copy-link-btn');

    if (copyButton && selectElement) { // Sicherstellen, dass beide Elemente da sind
        // Button nur anzeigen, wenn ein Kürzel ausgewählt ist UND der Nutzer eingeloggt ist
        if (selectElement.value && loggedInPlayerKuerzel) {
            copyButton.classList.remove('hidden'); // Klasse entfernen -> Button sichtbar
        } else {
            copyButton.classList.add('hidden'); // Klasse hinzufügen -> Button versteckt
        }
    }
}


// Vorhandene Funktion showAllPositions() bleibt gleich.
function showAllPositions() {
    try {
        console.log("--- showAllPositions START ---");
        // console.log(`Aktuell ausgewähltes Kürzel: ${currentSelectedKuerzel}`); // Debug

        const alleFelder = document.querySelectorAll('.spielbrett-feld');
        if (!alleFelder || alleFelder.length === 0) {
             console.error("FEHLER: Keine '.spielbrett-feld' Elemente gefunden!");
             return;
        }
        // console.log(`Gefundene Felder insgesamt: ${alleFelder.length}`); // Debug

        // 1. Klassen und Titel zurücksetzen
        // let otherPlayerClassesRemoved = 0; // Debug
        alleFelder.forEach(f => {
            f.classList.remove('active-player', 'other-player'); // Entferne beide Markierungsklassen
            f.title = ''; // Tooltip zurücksetzen
        });
        // console.log(`${otherPlayerClassesRemoved} alte '.other-player' Klassen entfernt.`); // Debug

        // 2. Daten prüfen
        if (!fieldToPlayersMap || Object.keys(fieldToPlayersMap).length === 0) {
            console.warn("WARNUNG: fieldToPlayersMap ist leer oder nicht definiert. Keine Positionen zum Anzeigen.");
            console.log("--- showAllPositions END (keine Daten) ---");
            return;
        }
        // console.log("fieldToPlayersMap Daten:", JSON.parse(JSON.stringify(fieldToPlayersMap))); // Debug: Zeigt die Daten an

        // 3. Felder markieren
        // let fieldsProcessed = 0; // Debug
        // let otherPlayerClassesAdded = 0; // Debug
        // let activePlayerFieldsSkipped = 0; // Debug

        for (const fieldId in fieldToPlayersMap) {
            // fieldsProcessed++; // Debug
            const playersOnField = fieldToPlayersMap[fieldId];
            // Finde das DOM-Element für die aktuelle Feld-ID
            const targetField = document.querySelector(`.spielbrett-feld[data-field-id="${fieldId}"]`);

            if (targetField && playersOnField && playersOnField.length > 0) {
                // Setze den Tooltip mit den Spielerkürzeln auf diesem Feld
                targetField.title = `Spieler: ${playersOnField.join(', ')}`;

                // Prüfe, ob der aktuell eingeloggte Spieler auf diesem Feld ist
                const isCurrentLoggedInPlayer = loggedInPlayerKuerzel && playersOnField.includes(loggedInPlayerKuerzel);

                if (isCurrentLoggedInPlayer) {
                     // Markiere das Feld als das des eingeloggten Spielers
                    targetField.classList.add('active-player');
                     // console.log(`   -> '.active-player' zu Feld ${fieldId} hinzugefügt (eingeloggter Spieler).`); // Debug
                } else {
                     // Markiere das Feld als das eines anderen Spielers
                    targetField.classList.add('other-player');
                     // otherPlayerClassesAdded++; // Debug
                     // console.log(`   -> '.other-player' zu Feld ${fieldId} hinzugefügt.`); // Debug
                }
            } else if (!targetField) {
                 console.warn(`WARNUNG: Kein DOM-Element für Feld-ID '${fieldId}' gefunden.`);
            }
        }

        // Debug Ausgaben
        // console.log(`Verarbeitete Felder aus Map: ${fieldsProcessed}`);
        // console.log(`'.other-player' Klassen hinzugefügt: ${otherPlayerClassesAdded}`);
        // console.log(`Felder als '.active-player' markiert: ${alleFelder.length - otherPlayerClassesAdded - (alleFelder.length - fieldsProcessed)}`); // Grobe Schätzung
        // console.log(`Felder übersprungen (z.B. keine Spieler): ${alleFelder.length - fieldsProcessed}`); // Debug

        // 4. Button Sichtbarkeit aktualisieren (z.B. Copy Link Button)
        if (typeof updateCopyLinkButtonVisibility === 'function') {
            updateCopyLinkButtonVisibility();
            // console.log("updateCopyLinkButtonVisibility aufgerufen."); // Debug
        } else {
            // console.log("updateCopyLinkButtonVisibility nicht als Funktion gefunden."); // Debug
        }

        console.log("--- showAllPositions END ---");

     } catch (error) {
         console.error("FEHLER in showAllPositions:", error);
     }
}


// Vorhandene Funktion showSinglePlayerPosition() bleibt gleich, verwendet aber jetzt loggedInPlayerKuerzel
function showSinglePlayerPosition(selectedKuerzel) {
    const alleFelder = document.querySelectorAll('.spielbrett-feld');
    // 1. Alle alten Markierungen und Tooltips entfernen
    alleFelder.forEach(f => {
        f.classList.remove('active-player', 'other-player');
        f.title = '';
    });

    // 2. Wenn kein Kürzel gewählt, nichts tun
    if (!selectedKuerzel) {
         console.log("Kein Kürzel ausgewählt, keine Markierung.");
         return;
    }

    // 3. Score holen und Feld finden
    if (!scoreData) {
        console.warn("Score-Daten noch nicht verfügbar für showSinglePlayerPosition.");
        return; // Daten müssen da sein
    }
    const score = scoreData[selectedKuerzel];
    // Bestimme die Feld-ID basierend auf dem Score
    let targetFieldId = (typeof score === 'number' && score >= 1 && score <= 100) ? score.toString() : 'start';
     // Optional: Behandle Score 100 als 'ziel' Feld-ID, falls du das im HTML so benannt hast
     if (score === 100) targetFieldId = '100'; // Oder 'ziel'

    // Finde das DOM-Element für das Zielfeld
    const targetField = document.querySelector(`.spielbrett-feld[data-field-id="${targetFieldId}"]`);

    // 4. Neues Highlight setzen und SCROLLEN
    if (targetField) {
        targetField.classList.add('active-player'); // Markiere das Feld als aktiv
        console.log(`Feld ${targetFieldId} für ${selectedKuerzel} hervorgehoben.`);

        // Scrolle zum Feld
        targetField.scrollIntoView({
            behavior: 'smooth', // Sanftes Scrollen
            block: 'center',    // Vertikal zentrieren (oder 'start', 'end', 'nearest')
            inline: 'nearest'   // Horizontal nur wenn nötig
        });

    } else {
        console.warn(`Konnte Feld mit ID ${targetFieldId} nicht finden.`);
    }
}


// Vorhandene Funktion updatePlayerList() bleibt gleich.
function updatePlayerList(data) {
    console.log("Aktualisiere Spielerliste.");
    const listElement = document.getElementById('player-list');
    if (!listElement) {
        console.warn("Element #player-list nicht gefunden. Spielerliste wird nicht angezeigt.");
        return; // Beenden, wenn das Listenelement nicht existiert
    }

    // Einfache Implementierung: Liste löschen und neu aufbauen
    listElement.innerHTML = ''; // Alte Einträge entfernen

    if (!data || Object.keys(data).length === 0) {
        listElement.innerHTML = '<li>Keine Spielerdaten vorhanden.</li>';
        return;
    }

    // Spielerdaten in ein Array umwandeln und nach Score absteigend sortieren
    const sortedPlayers = Object.entries(data) // Ergibt [ [kuerzel, score], [kuerzel, score], ... ]
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA); // Nach Score absteigend sortieren

    // Listeneinträge erstellen
    sortedPlayers.forEach(([kuerzel, score]) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${kuerzel}: ${score}`;
        listElement.appendChild(listItem);
    });
     console.log(`Spielerliste mit ${sortedPlayers.length} Einträgen aktualisiert.`);
}


// Vorhandene Funktion fetchScoresAndPopulateDropdown() bleibt gleich.
async function fetchScoresAndPopulateDropdown() {
    const selectElement = document.getElementById('kuerzel-select');
    // Sicherstellen, dass das Select-Element existiert
    if (!selectElement) {
        console.error("FEHLER: #kuerzel-select Element nicht gefunden!");
        // Optional: Login-UI anzeigen, da das Spielbrett nicht richtig funktionieren kann
        // showLoginUI();
        return;
    }

    const initialOption = selectElement.options[0]; // Die erste Option (z.B. "-- Lädt Daten...")

    // Dropdown während des Ladens deaktivieren und Status anzeigen
    selectElement.disabled = true;
    if (initialOption) initialOption.textContent = '-- Lädt Daten... --'; // Text aktualisieren

    console.log("Versuche Scores abzurufen von:", G_SHEET_URL);
    try {
        const response = await fetch(G_SHEET_URL);
        if (!response.ok) {
            throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        scoreData = await response.json(); // Daten als JSON parsen
        console.log("Daten erfolgreich abgerufen:", scoreData);

        // Daten vorverarbeiten (Feld -> Spieler Map erstellen)
        preprocessScoreData(scoreData);
        // Spielerliste aktualisieren (falls das Element existiert)
        updatePlayerList(scoreData);

        if (scoreData) {
            // Dropdown mit den Spielerkürzeln füllen
            populateKuerzelDropdown(Object.keys(scoreData));
            // Nach erfolgreichem Füllen: Dropdown aktivieren
            selectElement.disabled = false;
            console.log("Dropdown mit Daten gefüllt und aktiviert.");
        } else {
             // Fall: Keine Daten zurückbekommen, aber kein Fehler?
             if (initialOption) initialOption.textContent = '-- Keine Daten --';
             selectElement.disabled = true; // Bleibt deaktiviert
             console.warn("Datenabruf war erfolgreich, aber keine Spielerdaten erhalten.");
        }

    } catch (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
        const listElement = document.getElementById('player-list');
        if(listElement) listElement.innerHTML = '<li>Fehler beim Laden!</li>'; // Fehlermeldung in der Liste
        alert("Fehler beim Laden der Punktestände. Bitte prüfe die URL und die Freigabe des Apps Scripts."); // Alert für den Nutzer

        // Wichtig: Fehler im Dropdown anzeigen und deaktiviert lassen
        if (initialOption) initialOption.textContent = '-- Fehler! --';
        selectElement.disabled = true;
    }
}


// Vorhandene Funktion populateKuerzelDropdown() bleibt gleich.
function populateKuerzelDropdown(kuerzelListe) {
    const selectElement = document.getElementById('kuerzel-select');
     if (!selectElement) return; // Beenden, wenn Element nicht da ist

    const currentVal = selectElement.value; // Merken, was gerade ausgewählt ist

    // --- Zuverlässige Logik zum Leeren: Entferne alle Optionen ab der zweiten (Index 1) ---
    while (selectElement.options.length > 1) {
        selectElement.remove(1); // Entfernt immer die Option an Index 1 (die nachfolgenden rutschen nach)
    }
    // Setze Text/Wert der ersten Option zurück (ist entweder "-- Lädt..." oder "-- Bitte wählen --")
    if (selectElement.options[0]) {
        selectElement.options[0].textContent = '-- Bitte wählen --';
        selectElement.options[0].value = '';
    }
    // -------------------------------------------

    // Kürzel sortieren (alphabetisch)
    kuerzelListe.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // Die eigentlichen Kürzel-Optionen hinzufügen
    kuerzelListe.forEach(kuerzel => {
        const option = document.createElement('option');
        option.value = kuerzel;
        option.textContent = kuerzel;
        selectElement.appendChild(option);
    });

    // Vorherige Auswahl wiederherstellen, falls das Kürzel noch existiert
    // Oder wähle automatisch das eingeloggte Kürzel aus, falls vorhanden
    if (loggedInPlayerKuerzel && selectElement.querySelector(`option[value="${loggedInPlayerKuerzel}"]`)) {
         selectElement.value = loggedInPlayerKuerzel;
         currentSelectedKuerzel = loggedInPlayerKuerzel; // Globalen Merker setzen
         showSinglePlayerPosition(loggedInPlayerKuerzel); // Seine Position anzeigen
    } else if (selectElement.querySelector(`option[value="${currentVal}"]`)) {
         // Ansonsten versuche, die vorherige Auswahl wiederherzustellen
         selectElement.value = currentVal;
         currentSelectedKuerzel = currentVal; // Globalen Merker setzen
         showSinglePlayerPosition(currentVal);
    } else {
         // Wenn der alte Wert nicht mehr da ist (z.B. Kürzel gelöscht), auf Default zurücksetzen
         selectElement.value = "";
         currentSelectedKuerzel = "";
         clearBoardDisplay(); // Anzeige zurücksetzen, wenn kein Kürzel gewählt
    }

    console.log("Dropdown mit Kürzeln gefüllt (Refresh-sicher).");
    // Das Aktivieren (selectElement.disabled = false;) passiert in fetchScoresAndPopulateDropdown
}


// Vorhandene Funktion clearBoardDisplay() bleibt gleich.
function clearBoardDisplay() {
    console.log("Lösche Brett-Anzeige und setze Auswahl zurück.");
    const alleFelder = document.querySelectorAll('.spielbrett-feld');

    // 1. Alle Markierungen (.active-player, .other-player) und Tooltips entfernen
    alleFelder.forEach(f => {
        f.classList.remove('active-player', 'other-player');
        f.title = '';
    });

    // 2. Dropdown auf "--Bitte wählen--" zurücksetzen
    const selectElement = document.getElementById('kuerzel-select');
    if (selectElement) selectElement.value = "";

    // 3. Globalen Merker für die Auswahl zurücksetzen
    currentSelectedKuerzel = "";

    // 4. Den Text des "Alle anzeigen"/"Vergleichen"-Buttons zurücksetzen
    const showAllButton = document.getElementById('show-all-btn');
     if (showAllButton) {
         showAllButton.textContent = 'Alle Positionen anzeigen';
         updateCopyLinkButtonVisibility(); // Copy Link Button verstecken
     }
     console.log("Brett-Anzeige zurückgesetzt.");
}


// Bestehender DOMContentLoaded Listener - Hier startet die Anwendung
document.addEventListener('DOMContentLoaded', async function() {
    generateBoard(); // Spielbrett-HTML generieren

    // NEU: Initialer Login Check beim Laden der Seite
    if (loadSession()) {
        // Session gefunden: Zeige Spiel-UI und lade Daten
        showGameUI();
        // Daten laden und Dropdown/Anzeige aktualisieren
        await fetchScoresAndPopulateDropdown();
        // Die populateKuerzelDropdown Funktion wählt automatisch das eingeloggte Kürzel aus, falls vorhanden.
        // showSinglePlayerPosition(loggedInPlayerKuerzel) wird ebenfalls dort aufgerufen.
        updateCopyLinkButtonVisibility(); // Copy Link Button korrekt anzeigen/verstecken
    } else {
        // Keine Session gefunden: Zeige Login-UI
        showLoginUI();
        // Lade trotzdem die Scores im Hintergrund, damit die "Alle anzeigen" Funktion funktioniert
        // Das Dropdown bleibt disabled, bis ein Login erfolgt.
        await fetchScoresAndPopulateDropdown();
    }


    // Bestehendes URL Parameter Handling (z.B. für persönliche Links)
    // Dieses Handling zeigt die Position, erzwingt aber KEINEN Login.
    // Wenn du willst, dass persönliche Links einen Login erfordern, muss diese Logik angepasst werden.
    // Aktuell wird nur die Position angezeigt, unabhängig vom Login-Status.
    const urlParams = new URLSearchParams(window.location.search);
    const playerKuerzelFromUrl = urlParams.get('player');
    // Prüfe, ob ein Spieler-Kürzel in der URL ist UND ob es in den geladenen Daten existiert
    if (playerKuerzelFromUrl && scoreData && scoreData[playerKuerzelFromUrl] !== undefined) {
         // Zeige die Position dieses Spielers an, ABER nur wenn er NICHT bereits eingeloggt ist
         // oder wenn er eingeloggt ist, aber gerade einen Link für einen ANDEREN Spieler öffnet
        if(!loggedInPlayerKuerzel || loggedInPlayerKuerzel !== playerKuerzelFromUrl) {
             const selectElement = document.getElementById('kuerzel-select');
             if (selectElement) {
                 selectElement.value = playerKuerzelFromUrl;
                 currentSelectedKuerzel = playerKuerzelFromUrl; // Global setzen
                 showSinglePlayerPosition(playerKuerzelFromUrl); // Zeigt nur diesen Spieler
                 console.log(`Kürzel ${playerKuerzelFromUrl} aus URL Parameter ausgewählt (nur Anzeige).`);
                 updateCopyLinkButtonVisibility(); // Copy Link Button korrekt anzeigen/verstecken
             }
        }
         // Wenn der Nutzer eingeloggt ist UND der Link sein eigenes Kürzel enthält,
         // wird die Anzeige bereits durch den Login-Prozess (populateKuerzelDropdown) korrekt gesetzt.
    }


    // --- NEUE Event Listener ---

    // Event Listener für den Login Button
    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            const kuerzel = loginKuerzelInput.value.trim(); // Leerzeichen entfernen
            const pin = loginPinInput.value.trim(); // Leerzeichen entfernen
            if (kuerzel && pin) {
                await performLogin(kuerzel, pin); // Login-Funktion aufrufen
            } else {
                loginMessage.textContent = 'Bitte Kürzel und PIN eingeben.'; // Fehlermeldung, wenn Felder leer sind
            }
        });
    } else { console.error("Element #login-btn nicht gefunden!"); }

    // NEU: Login auch bei Enter-Taste im PIN-Feld auslösen
     if (loginPinInput) {
         loginPinInput.addEventListener('keypress', function(event) {
             if (event.key === 'Enter') {
                 event.preventDefault(); // Verhindert Standard-Formular-Submit
                 loginBtn.click(); // Simuliere Klick auf den Login-Button
             }
         });
     } else { console.error("Element #login-pin nicht gefunden!"); }


    // Event Listener für den "Figur bewegen (QR-Code scannen)" Button
    if (startScanBtn) {
        startScanBtn.addEventListener('click', startScanner); // Startet den Scanner
    } else { console.error("Element #start-scan-btn nicht gefunden!"); }

    // Event Listener für den "Scan abbrechen" Button
    if (stopScanBtn) {
        stopScanBtn.addEventListener('click', function() {
             stopScanner(); // Stoppt den Scanner
             showGameUI(); // Geht zurück zur Haupt-Spiel-UI
        });
    } else { console.error("Element #stop-scan-btn nicht gefunden!"); }

     // Event Listener für den Logout Button
     if (logoutBtn) {
         logoutBtn.addEventListener('click', function() {
             clearSession(); // Session löschen
             showLoginUI(); // Zurück zum Login-Bildschirm
             clearBoardDisplay(); // Brett-Anzeige zurücksetzen
             // Optional: Reload der Seite könnte hier auch sinnvoll sein, um den Zustand komplett zurückzusetzen
             // window.location.reload();
         });
     } else { console.error("Element #logout-btn nicht gefunden!"); }


    // --- Bestehende Event Listener (ggf. Anpassungen, um sicher mit Login umzugehen) ---

    // Event Listener für das Dropdown-Menü (Select)
    // Bleibt gleich. showSinglePlayerPosition wird aufgerufen.
    const selectElement = document.getElementById('kuerzel-select');
    if (selectElement) {
        selectElement.addEventListener('change', function() {
             currentSelectedKuerzel = this.value;
             // Diese Funktion wird aufgerufen, wenn der Nutzer manuell im Dropdown wählt.
             // Sie sollte nur die Anzeige ändern, nicht den eingeloggten Spieler beeinflussen.
             showSinglePlayerPosition(this.value);


             const showAllButton = document.getElementById('show-all-btn');
             if (showAllButton) {
                 // Text des Buttons anpassen: "Vergleichen" wenn ein Kürzel gewählt ist, sonst "Alle anzeigen"
                 showAllButton.textContent = currentSelectedKuerzel ? 'Vergleichen' : 'Alle Positionen anzeigen';
             }

             updateCopyLinkButtonVisibility(); // Sichtbarkeit Copy-Button anpassen
        });
    } else { console.error("Element #kuerzel-select nicht gefunden!"); }


    // Event Listener für den "Daten aktualisieren" Button
    const refreshButton = document.getElementById('refresh-data-btn');
     if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            console.log("Aktualisiere Daten...");
            refreshButton.textContent = "Lade...";
            refreshButton.disabled = true; // Button während des Ladens deaktivieren

            const selectElement = document.getElementById('kuerzel-select');
            // Merke das aktuell ausgewählte Kürzel VOR dem Laden
            const previouslySelectedKuerzel = selectElement ? selectElement.value : "";

            // Daten holen, vorverarbeiten, Liste updaten, Dropdown updaten
            await fetchScoresAndPopulateDropdown();

            // Versuche, die vorherige Auswahl im Dropdown wiederherzustellen
            if (selectElement && previouslySelectedKuerzel && selectElement.querySelector(`option[value="${previouslySelectedKuerzel}"]`)) {
                 selectElement.value = previouslySelectedKuerzel;
            }
             // Aktualisiere den globalen Merker mit dem Wert, der JETZT im Dropdown ausgewählt ist
             currentSelectedKuerzel = selectElement ? selectElement.value : "";

            updateCopyLinkButtonVisibility(); // Sichtbarkeit Copy-Button anpassen

            // Zeige die Position des aktuell ausgewählten Kürzels an (oder lösche die Anzeige)
            if (currentSelectedKuerzel) {
                showSinglePlayerPosition(currentSelectedKuerzel);
            } else {
                 clearBoardDisplay(); // Alles löschen, wenn nichts oder "--Bitte wählen--" ausgewählt ist
            }


            refreshButton.textContent = "Daten aktualisieren"; // Button-Text zurücksetzen
            refreshButton.disabled = false; // Button wieder aktivieren
            console.log("Daten aktualisiert.");
        });
     } else { console.error("Element #refresh-data-btn nicht gefunden!"); }


    // Event Listener für den "Alle Positionen anzeigen" Button
     const showAllButton = document.getElementById('show-all-btn');
     if (showAllButton) {
         showAllButton.addEventListener('click', showAllPositions); // Ruft showAllPositions auf
     } else { console.error("Element #show-all-btn nicht gefunden!"); }


   // Klick-Listener für Felder hinzufügen (zeigt Spieler auf Feld an)
   // Bleibt gleich. Zeigt nur Infos an.
   const spielbrettContainer = document.getElementById('spielbrett-container');
    if (spielbrettContainer) {
        spielbrettContainer.addEventListener('click', function(event) {
            // Finde das nächstgelegene Element mit der Klasse 'spielbrett-feld', das angeklickt wurde
            const targetField = event.target.closest('.spielbrett-feld');

            if (targetField) { // Nur wenn auf ein Feld geklickt wurde
                const fieldId = targetField.getAttribute('data-field-id'); // Die ID des Feldes

                // Prüfe, ob für dieses Feld Spieler in unserer Map existieren
                if (fieldId && fieldToPlayersMap[fieldId] && fieldToPlayersMap[fieldId].length > 0) {
                    const playersOnField = fieldToPlayersMap[fieldId];
                     // Zeige die Spieler in einer Alert-Box an (könnte durch Modal ersetzt werden)
                    alert(`Spieler auf Feld ${fieldId === 'start' ? 'Start' : fieldId}: ${playersOnField.join(', ')}`);
                } else if (fieldId) {
                    // Optional: Meldung für leere Felder anzeigen
                    // alert(`Feld ${fieldId === 'start' ? 'Start' : fieldId} ist leer.`);
                    console.log(`Feld ${fieldId} geklickt, aber keine Spieler darauf.`);
                }
            }
        });
    } else { console.error("Element #spielbrett-container nicht gefunden!"); }


    // Event Listener für den "Persönlichen Link kopieren" Button
    // Bleibt gleich. Erstellt einen Link zur Ansicht.
    const copyButton = document.getElementById('copy-link-btn');
     if (copyButton) {
        copyButton.addEventListener('click', function() {
            const selectElement = document.getElementById('kuerzel-select'); // Dieses Element sollte existieren, wenn der Button sichtbar ist

            const selectedKuerzel = selectElement.value; // Aktuellen Wert aus dem Dropdown nehmen

            if (!selectedKuerzel) {
                alert("Bitte wähle zuerst dein Kürzel aus, um einen Link zu kopieren.");
                return;
            }
            // Erstelle die Basis-URL der aktuellen Seite
            const baseUrl = window.location.origin + window.location.pathname;
            // Füge den Spieler-Parameter hinzu
            const personalUrl = `${baseUrl}?player=${selectedKuerzel}`;

            // Nutze die Clipboard API, um den Link zu kopieren
            navigator.clipboard.writeText(personalUrl).then(function() {
                console.log('Link erfolgreich kopiert:', personalUrl);
                copyButton.textContent = 'Kopiert!'; // Button-Text ändern
                copyButton.disabled = true; // Button deaktivieren
                // Setze Text und Zustand nach kurzer Zeit zurück
                setTimeout(() => {
                    copyButton.textContent = 'Persönlichen Link kopieren';
                    copyButton.disabled = false;
                }, 2000); // 2 Sekunden
            }).catch(function(err) {
                console.error('Fehler beim Kopieren des Links: ', err);
                alert('Konnte den Link leider nicht kopieren. Bitte manuell kopieren.');
                // Optional: Link in einem Textfeld anzeigen, falls Kopieren fehlschlägt
            });
        });
     } else { console.error("Element #copy-link-btn nicht gefunden!"); }


    // Event Listener für den "Anzeige löschen" Button
    // Bleibt gleich. Ruft clearBoardDisplay auf.
    const clearButton = document.getElementById('clear-board-btn');
     if (clearButton) {
        clearButton.addEventListener('click', clearBoardDisplay); // Ruft clearBoardDisplay auf
     } else { console.error("Element #clear-board-btn nicht gefunden!"); }


    // Initialer Aufruf, um die Sichtbarkeit des Copy Link Buttons beim Laden zu setzen
    // (wird auch nach Login/Datenaktualisierung aufgerufen)
    updateCopyLinkButtonVisibility();


}); // Ende von DOMContentLoaded
