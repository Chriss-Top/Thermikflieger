# Thermikflieger

Ein 2D-Segelflugspiel in Seitenansicht: Windenstart, Höhenruder, Thermik und Landungen auf wiederkehrenden Flugplätzen. Ohne Installation im Browser spielbar. Die Flugphysik ist bewusst vereinfacht.

## Starten

`index.html` im Browser öffnen oder `python3 -m http.server 8000` im Projektverzeichnis starten. HTML, CSS und JavaScript müssen im selben Ordner liegen. Webfonts sind optional; Ersatzschriften funktionieren offline.

## Steuerung

- **↓ / S / ← / A**: Höhenruder ziehen, Nase hoch. Fahrt wird in Höhe umgesetzt.
- **↑ / W / → / D**: drücken, Nase runter. Das Flugzeug nimmt Fahrt auf.
- Loslassen hält die gewählte Nasenlage. Dauerhaftes Ziehen führt zu Fahrtverlust und Strömungsabriss; Nase senken, um sich zu erholen.
- **Leertaste**: starten / neu starten; während des Windenstarts Seil frühzeitig lösen (ab 12 m). Sonst löst es automatisch auf 230 m.
- **P / Escape** oder Pausentaste: Pause.
- Touchgeräte: **Ziehen** / **Drücken**.

Mit steigender Geschwindigkeit bewegt sich das Flugzeug weich nach rechts im Bildschirm; beim Langsamerwerden fällt es nach links zurück. Die Landschaft bleibt dabei an die tatsächliche Flugstrecke gekoppelt.

Die Nase ist der Lagewinkel gegenüber dem Horizont, kein separat simulierter aerodynamischer Anstellwinkel. Thermik verändert die vertikale Luftbewegung. Goldene Säulen markieren den Aufwind; mit weniger Fahrt bleibt man länger darin. Ohne Thermik sinkt das Flugzeug bei normaler Gleitlage.

## Landen

Alle 1,7 km liegt eine 440 m lange Landebahn. Am Boden sind Landebahn, Hangar und Windsack sichtbar; unten steht die Entfernung. Plane deinen Abstieg rechtzeitig. Setze auf der Bahn mit 55–110 km/h, höchstens 3 m/s Sinken und nahezu waagerechter Nase auf. Das Flugzeug rollt bis zum Stillstand aus; die verbleibende Bahn muss dafür lang genug sein. Außerhalb der Bahn oder bei einem harten Aufsetzen endet der Flug erfolglos. Flugzeitrekorde werden lokal im Browser gespeichert.

## Außerhalb von Codex spielen

### Auf dem eigenen Computer

Auf GitHub **Code → Download ZIP** wählen und das Archiv entpacken. Anschließend `index.html` im entpackten Ordner im Browser öffnen. `style.css` und `game.js` müssen neben der HTML-Datei bleiben.

### Mit GitHub Pages online spielen

In diesem Repository **Settings → Pages** öffnen. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen, den Branch mit den Spieldateien und den Ordner **/ (root)** auswählen und **Save** klicken. Die Datei `.nojekyll` aktiviert die unveränderte Auslieferung der statischen Dateien. Wenn der Branch nach `main` gemergt wurde, `main` auswählen.

GitHub zeigt nach erfolgreicher Bereitstellung die Spieladresse an. Änderungen am ausgewählten Branch werden anschließend automatisch bereitgestellt. Für Pages muss das Repository beziehungsweise der GitHub-Tarif die Veröffentlichung unterstützen.
