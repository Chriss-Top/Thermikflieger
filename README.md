# Thermikflieger

Ein 2D-Segelflugspiel in Seitenansicht: Windenstart, Höhenruder, Thermik und Landungen auf wiederkehrenden Flugplätzen. Ohne Installation im Browser spielbar. Die Flugphysik ist bewusst vereinfacht.

## Starten

`index.html` im Browser öffnen oder `python3 -m http.server 8000` im Projektverzeichnis starten. HTML, CSS und JavaScript müssen im selben Ordner liegen. Webfonts sind optional; Ersatzschriften funktionieren offline.

## Steuerung

- **↓ / S**: Höhenruder ziehen, Nase hoch. Fahrt wird in Höhe umgesetzt.
- **↑ / W**: drücken, Nase runter. Das Flugzeug nimmt Fahrt auf.
- Loslassen lässt das Flugzeug sich weich in die Strömung einpendeln. Dauerhaftes Ziehen verbraucht Fahrt und kann zum Strömungsabriss führen; Nase senken, Fahrt aufnehmen und erst dann vorsichtig abfangen.
- **Leertaste**: starten / neu starten; während des Windenstarts Seil frühzeitig lösen (ab 12 m). Sonst löst es automatisch auf 250 m.
- **C** oder **Einkurbeln**: Kreisflug beginnen / verlassen.
- **← / A** und **→ / D**: Schräglage verändern, Kreisradius und Drehrichtung steuern.
- **P / Escape** oder Pausentaste: Pause.
- Touchgeräte: **Ziehen**, **Drücken**, **Links**, **Rechts** sowie die Schaltflächen zum Einkurbeln und Seillösen.

## Schneller und flüssiger

Das Spiel läuft mit 1,8-fachem Simulationstempo. Ein fester Physikschritt mit 120 Hz und interpolierte Flugzeug- und Kamerapositionen sorgen für gleichmäßige Bewegung. Instrumente werden mit 10 Hz aktualisiert, unabhängig von den Physikschritten. Die Landschaft zieht deutlicher vorbei, und die Kamera übernimmt Fahrtänderungen nach etwa 1,6 Simulationssekunden.

## Windenstart steuern

Die Winde zieht das Flugzeug zunächst auf Fahrt. **↓** hebt die Nase und macht den Steigflug steiler, **↑** senkt die Nase und nimmt Steigung heraus. Ohne Eingabe unterstützt eine sanfte Trimmung den Start. Übermäßiges Ziehen kann auch am Seil einen Strömungsabriss auslösen. **Leertaste** oder **Seil lösen** klinkt ab 12 m Höhe aus; Fahrt, Nasenlage und Steigbewegung bleiben dabei erhalten. Das Seil löst automatisch auf 250 m oder am Ende der Schleppstrecke.

## Thermik geschickt einkurbeln

Die Seitenansicht bleibt zweidimensional. Das **Thermikradar** ergänzt eine kleine Draufsicht auf deine horizontale Flugbahn: Der Pfeil zeigt Flugrichtung und Position, goldene Ringe den Aufwind und der dunkle Punkt den stärksten Kern. Die gestrichelte Linie zeigt den Kreis, den du mit aktueller Fahrt und Schräglage ungefähr fliegst.

1. In einen goldenen Aufwind einfliegen und **C** drücken.
2. Mit **← / →** die Schräglage verändern: stärkere Schräglage bedeutet einen engeren Kreis, ein Vorzeichenwechsel ändert die Drehrichtung.
3. Den Kreis im Radar um den Kern legen. Der Aufwind ist dort stärker als am Rand. Falls der Kreis aus dem Aufwind läuft, Radius und Drehrichtung korrigieren.
4. Mit dem Höhenruder die Fahrt kontrollieren: Langsamer ergibt einen kleineren Radius, zu langsam oder zu steil führt zum Abriss. Schräglage kostet Auftrieb.
5. Erneut **C** drücken, um den Kreis zu verlassen. Das Flugzeug kurvt dann sanft zur Flugplatzstrecke zurück; die Höhensteuerung bleibt bei dir.

Der Kreisflug verändert tatsächlich Position, Richtung und Höhe. Es gibt kein Festhalten am Thermikkern und keinen pauschalen Höhenbonus beim Drücken von C. Ein gut zentrierter Kreis kann länger im Aufwind bleiben als ein gerader Durchflug. Die Kerne driften langsam.

## Flugphysik

Das Flugzeug hat eine eigene horizontale und vertikale Geschwindigkeit. Auftrieb wirkt quer zur Luftströmung, Widerstand bremst, und Schwerkraft wirkt immer nach unten. Nase und Flugbahn können auseinanderliegen; das Instrument zeigt den Anstellwinkel **α** zusätzlich zur Nasenlage an. Die Simulation ist ein vereinfachtes Spielmodell.

Bei einer Beschleunigung bewegt sich das Flugzeug zunächst nach rechts über den Bildschirm. Die Kamera übernimmt die neue horizontale Geschwindigkeit verzögert: Der Hintergrund zieht dann schneller vorbei. Beim Abbremsen fällt das Flugzeug zunächst nach links zurück. Im Kreisflug ändern sich Flugrichtung und seitliche Projektion. Flugzeug und Landschaft verwenden dieselben Weltkoordinaten.

Bei zu geringer Fahrt oder zu großem Anstellwinkel bricht der Auftrieb zusammen. Das Flugzeug fällt sofort sichtbar nach unten, auch in Thermik. Die Nase fällt nach; durch Senken der Nase und erneuten Fahrtaufbau lässt sich der Abriss ausleiten.

**Looping:** Zuerst ausreichend Höhe gewinnen, durch einen Abstieg Fahrt aufbauen und dann kontinuierlich **↓** ziehen. Ein kompletter Looping benötigt genug Energie; zu langsames oder zu starkes Ziehen führt zum Strömungsabriss. Die tatsächliche Flugbahn folgt der Nase. Ein vollständiger Looping ist ohne Thermik im automatisierten Test mit 234 km/h und 700 m Ausgangshöhe nachgewiesen; das ist ein Testszenario, keine garantierte Mindestgeschwindigkeit.

## Prüfen

Mit Node.js: `node --test tests/flight.test.cjs`. Die Szenarien prüfen steuerbaren Windenstart, Ausklinken ohne Geschwindigkeitssprung, Thermik und Zentrierung, Kreisflug und Rückkehr zur Strecke, Fahrt und Kameranachlauf, Strömungsabriss und Erholung, Loopings, Landungen, Pause und Neustart.

## Landen

Alle 1,7 km liegt eine 440 m lange Landebahn. Am Boden sind Landebahn, Hangar und Windsack sichtbar; unten steht die Entfernung. Verlasse den Kreis frühzeitig und fliege zur Strecke zurück. Plane den Abstieg rechtzeitig. Setze auf der Bahn mit 55–110 km/h, höchstens 3 m/s Sinken und nahezu waagerechter Nase und Tragfläche auf. Das Flugzeug rollt bis zum Stillstand aus; die verbleibende Bahn muss dafür lang genug sein. Außerhalb der Bahn oder bei einem harten Aufsetzen endet der Flug erfolglos. Flugzeitrekorde werden lokal im Browser gespeichert.

## Außerhalb von Codex spielen

### Auf dem eigenen Computer

Auf GitHub **Code → Download ZIP** wählen und das Archiv entpacken. Anschließend `index.html` im entpackten Ordner im Browser öffnen. `style.css` und `game.js` müssen neben der HTML-Datei bleiben.

### Mit GitHub Pages online spielen

In diesem Repository **Settings → Pages** öffnen. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen, den Branch mit den Spieldateien und den Ordner **/ (root)** auswählen und **Save** klicken. Die Datei `.nojekyll` aktiviert die unveränderte Auslieferung der statischen Dateien. Wenn der Branch nach `main` gemergt wurde, `main` auswählen.

GitHub zeigt nach erfolgreicher Bereitstellung die Spieladresse an. Änderungen am ausgewählten Branch werden anschließend automatisch bereitgestellt. Für Pages muss das Repository beziehungsweise der GitHub-Tarif die Veröffentlichung unterstützen.
