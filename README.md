# Thermikflieger

Ein 2D-Segelflugspiel in Seitenansicht: Windenstart, Höhenruder, Thermik und Landungen auf wiederkehrenden Flugplätzen. Ohne Installation im Browser spielbar. Die Flugphysik ist bewusst vereinfacht.

## Starten

`index.html` im Browser öffnen oder `python3 -m http.server 8000` im Projektverzeichnis starten. HTML, CSS und JavaScript müssen im selben Ordner liegen. Webfonts sind optional; Ersatzschriften funktionieren offline.

## Steuerung

- **↓ / S / ← / A**: Höhenruder ziehen, Nase hoch. Fahrt wird in Höhe umgesetzt.
- **↑ / W / → / D**: drücken, Nase runter. Das Flugzeug nimmt Fahrt auf.
- Loslassen lässt das Flugzeug sich weich in die Strömung einpendeln. Dauerhaftes Ziehen verbraucht Fahrt und kann zum Strömungsabriss führen; Nase senken, Fahrt aufnehmen und erst dann vorsichtig abfangen.
- **Leertaste**: starten / neu starten; während des Windenstarts Seil frühzeitig lösen (ab 12 m). Sonst löst es automatisch auf 230 m.
- **P / Escape** oder Pausentaste: Pause.
- Touchgeräte: **Ziehen** / **Drücken**.

## Flugphysik und Kamera

Das Flugzeug hat eine eigene horizontale und vertikale Geschwindigkeit. Auftrieb wirkt quer zur Luftströmung, Widerstand bremst, und Schwerkraft wirkt immer nach unten. Nase und Flugbahn können auseinanderliegen; das Instrument zeigt den Anstellwinkel **α** zusätzlich zur Nasenlage an. Die Simulation ist ein vereinfachtes Spielmodell.

Bei einer Beschleunigung bewegt sich das Flugzeug zunächst nach rechts über den Bildschirm. Die Kamera übernimmt die neue horizontale Geschwindigkeit mit einigen Sekunden Verzögerung: Der Hintergrund zieht dann schneller vorbei. Beim Abbremsen fällt das Flugzeug zunächst nach links zurück, während die Landschaft allmählich langsamer wird. Im Rückwärtsabschnitt eines Loopings kehrt sich die horizontale Bewegung um. Flugzeug und Landschaft verwenden dieselben Weltkoordinaten.

Bei zu geringer Fahrt oder zu großem Anstellwinkel bricht der Auftrieb zusammen. Das Flugzeug fällt sofort sichtbar nach unten, auch in Thermik. Die Nase fällt nach; durch Senken der Nase und erneuten Fahrtaufbau lässt sich der Abriss ausleiten.

**Looping:** Zuerst ausreichend Höhe gewinnen, durch einen Abstieg Fahrt aufbauen und dann kontinuierlich **↓** ziehen. Ein kompletter Looping benötigt genug Energie; zu langsames oder zu starkes Ziehen führt zum Strömungsabriss. Es gibt keine Begrenzung auf einen kleinen Nickwinkel und keine kostenlose Drehung: Auch die tatsächliche Flugbahn muss der Nase folgen. Ein vollständiger Looping ist im automatisierten Test mit 234 km/h und 700 m Ausgangshöhe ohne Strömungsabriss nachgewiesen; das ist ein Testszenario, keine garantierte Mindestgeschwindigkeit.

Thermik verändert die vertikale Luftbewegung. Goldene Säulen markieren den Aufwind; mit weniger Fahrt bleibt man länger darin. Ohne Thermik sinkt das Flugzeug bei normaler Gleitlage.

## Prüfen

Mit Node.js: `node --test tests/flight.test.cjs`. Die Szenarien prüfen Windenstart, Thermik, Fahrt und Kameranachlauf, Strömungsabriss und Erholung, vollständige Loopings mit ausreichender und unzureichender Energie, Landungen sowie Pause und Neustart.

## Landen

Alle 1,7 km liegt eine 440 m lange Landebahn. Am Boden sind Landebahn, Hangar und Windsack sichtbar; unten steht die Entfernung. Plane deinen Abstieg rechtzeitig. Setze auf der Bahn mit 55–110 km/h, höchstens 3 m/s Sinken und nahezu waagerechter Nase auf. Das Flugzeug rollt bis zum Stillstand aus; die verbleibende Bahn muss dafür lang genug sein. Außerhalb der Bahn oder bei einem harten Aufsetzen endet der Flug erfolglos. Flugzeitrekorde werden lokal im Browser gespeichert.

## Außerhalb von Codex spielen

### Auf dem eigenen Computer

Auf GitHub **Code → Download ZIP** wählen und das Archiv entpacken. Anschließend `index.html` im entpackten Ordner im Browser öffnen. `style.css` und `game.js` müssen neben der HTML-Datei bleiben.

### Mit GitHub Pages online spielen

In diesem Repository **Settings → Pages** öffnen. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen, den Branch mit den Spieldateien und den Ordner **/ (root)** auswählen und **Save** klicken. Die Datei `.nojekyll` aktiviert die unveränderte Auslieferung der statischen Dateien. Wenn der Branch nach `main` gemergt wurde, `main` auswählen.

GitHub zeigt nach erfolgreicher Bereitstellung die Spieladresse an. Änderungen am ausgewählten Branch werden anschließend automatisch bereitgestellt. Für Pages muss das Repository beziehungsweise der GitHub-Tarif die Veröffentlichung unterstützen.
