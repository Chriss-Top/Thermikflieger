# Thermikflieger

Ein 2D-Segelflugspiel in Seitenansicht: Windenstart, Höhenruder, Thermik und Landungen auf wiederkehrenden Flugplätzen. Ohne Installation im Browser spielbar. Die Flugphysik ist bewusst vereinfacht.

## Starten

`index.html` im Browser öffnen oder `python3 -m http.server 8000` im Projektverzeichnis starten. HTML, CSS und JavaScript müssen im selben Ordner liegen. Webfonts sind optional; Ersatzschriften funktionieren offline.

## Steuerung

- **↓ / S**: Höhenruder ziehen, Nase hoch. Fahrt wird in Höhe umgesetzt.
- **↑ / W**: drücken, Nase runter. Das Flugzeug nimmt Fahrt auf.
- Loslassen lässt das Flugzeug sich weich in die Strömung einpendeln. Dauerhaftes Ziehen verbraucht Fahrt und kann zum Strömungsabriss führen; Nase senken, Fahrt aufnehmen und erst dann vorsichtig abfangen.
- **Leertaste**: starten / neu starten; während des Windenstarts Seil frühzeitig lösen (ab 12 m). Sonst löst es automatisch auf 250 m.
- **← / A** und **→ / D** gedrückt halten: manuell links oder rechts wenden. Zum Gegensteuern rechtzeitig wechseln. Beim Loslassen richtet sich die Tragfläche mit etwas Trägheit wieder aus; die Flugrichtung bleibt bei dir.
- **P / Escape** oder Pausentaste: Pause.
- Touchgeräte: **Ziehen**, **Drücken**, **Links**, **Rechts** sowie **Seil lösen**.

## Schneller und flüssiger

Das Spiel läuft mit 1,8-fachem Simulationstempo. Ein fester Physikschritt mit 120 Hz und interpolierte Flugzeug- und Kamerapositionen sorgen für gleichmäßige Bewegung. Instrumente werden mit 10 Hz aktualisiert, unabhängig von den Physikschritten. Die Landschaft zieht deutlicher vorbei, und die Kamera übernimmt Fahrtänderungen nach etwa 1,6 Simulationssekunden.

## Windenstart steuern

Die Winde zieht das Flugzeug zunächst auf Fahrt. **↓** hebt die Nase und macht den Steigflug steiler, **↑** senkt die Nase und nimmt Steigung heraus. Ohne Eingabe unterstützt eine sanfte Trimmung den Start. Übermäßiges Ziehen kann auch am Seil einen Strömungsabriss auslösen. **Leertaste** oder **Seil lösen** klinkt ab 12 m Höhe aus; Fahrt, Nasenlage und Steigbewegung bleiben dabei erhalten. Das Seil löst automatisch auf 250 m oder am Ende der Schleppstrecke.

## Thermik manuell ausfliegen

Die Seitenansicht bleibt zweidimensional. Das **Thermikradar** zeigt zusätzlich die horizontale Flugbahn: Der Pfeil zeigt deine Flugrichtung, goldene Ringe den Aufwind, der dunkle Punkt den Kern und die grüne Spur deinen bisherigen Weg. Die gestrichelte Linie markiert die Flugplatzstrecke; der blaue Strich zeigt den Wind.

1. In den Aufwind einfliegen und das Variometer beobachten.
2. **← / →** gedrückt halten, um selbst zu wenden. Beim passenden Moment gegensteuern oder die Richtung wechseln, bevor du aus dem Bart fliegst.
3. Windversatz und den wandernden Kern im Radar beobachten. Du musst deine Flugbahn laufend selbst korrigieren; das Spiel zentriert und hält keinen Kreis.
4. Mit **↑ / ↓** die Fahrt führen. Zu viel Ziehen kostet Fahrt und kann zum Abriss führen; enge Kurven kosten Auftrieb.
5. Zur Landung selbst zur gestrichelten Flugplatzstrecke und in Flugrichtung rechts zurückkehren. Es gibt keine automatische Rückkehr.

## Endliche Bärte und bewegte Luft

Thermikbärte leben etwa 75–110 Simulationssekunden, werden beim Annähern erzeugt, driften mit dem Wind und verblassen am Ende weich. Die Restdauer steht an der Säule. Derselbe ausgelaufene Bart wird nicht neu erzeugt. Jeder Bart hat zusätzlich eine begrenzte Obergrenze von etwa 640–900 m; nahe dieser Höhe lässt sein Aufwind nach. Neue Gebiete bieten neue Bärte.

Der Wind hat eine wechselnde horizontale und seitliche Komponente sowie stetige Böen. Er verändert die Geschwindigkeit über Grund und versetzt sowohl Flugzeug als auch Thermik. Der Thermikkern driftet etwas langsamer als die Luft: Ein einmal gewählter Kreis bleibt dadurch nicht automatisch zentriert.

Die sichtbaren Hügel erzeugen auf ihrer windzugewandten Seite **Hangaufwind** und auf der windabgewandten Seite **Lee-Abwind**. Diese Felder werden mit Abstand zum Boden schwächer. Gelbe und blaue Markierungen helfen beim Erkennen. Hügel gehören zur Kollisionsfläche; die angezeigte Höhe ist Höhe über Grund.

Die Luftbewegungen wirken auf Anstellwinkel, Auftrieb und Roll- und Nickbewegung. Dadurch wird der Flug unruhiger, während Geschwindigkeit, Höhe und Nasenlage kontinuierlich bleiben.

## Flugphysik

Das Flugzeug hat eine eigene horizontale und vertikale Geschwindigkeit. Auftrieb wirkt quer zur Luftströmung, Widerstand bremst, und Schwerkraft wirkt immer nach unten. Nase und Flugbahn können auseinanderliegen; das Instrument zeigt den Anstellwinkel **α** zusätzlich zur Nasenlage an. Die Simulation ist ein vereinfachtes Spielmodell.

Bei einer Beschleunigung bewegt sich das Flugzeug zunächst nach rechts über den Bildschirm. Die Kamera übernimmt die neue horizontale Geschwindigkeit verzögert: Der Hintergrund zieht dann schneller vorbei. Beim Abbremsen fällt das Flugzeug zunächst nach links zurück. Im Kreisflug ändern sich Flugrichtung und seitliche Projektion. Flugzeug und Landschaft verwenden dieselben Weltkoordinaten.

Bei zu geringer Fahrt oder zu großem Anstellwinkel nimmt der Auftrieb zügig ab. Die Schwerkraft krümmt die Flugbahn nach unten, die Nase kippt mit Drehträgheit nach. Vorhandener Schwung verschwindet dabei nicht schlagartig. Zum Ausleiten Nase senken, Fahrt aufnehmen und anschließend behutsam abfangen. Das Modell bleibt eine vereinfachte Spielphysik.

**Looping:** Zuerst ausreichend Höhe gewinnen, durch einen Abstieg Fahrt aufbauen und dann kontinuierlich **↓** ziehen. Ein kompletter Looping benötigt genug Energie; zu langsames oder zu starkes Ziehen führt zum Strömungsabriss. Die tatsächliche Flugbahn folgt der Nase. Ein vollständiger Looping ist ohne Thermik im automatisierten Test mit 234 km/h und 700 m Ausgangshöhe nachgewiesen; das ist ein Testszenario, keine garantierte Mindestgeschwindigkeit.

## Prüfen

Mit Node.js: `node --test tests/flight.test.cjs`. Die Szenarien prüfen steuerbaren Windenstart, Ausklinken ohne Geschwindigkeitssprung, manuelles Wenden ohne Kreis- oder Streckenautopilot, endliche und höhenbegrenzte Thermik, Windversatz, Hang- und Lee-Felder, Fahrt und Kameranachlauf, Strömungsabriss und Erholung, Loopings, Landungen, Pause und Neustart.

## Landen

Alle 1,7 km liegt eine 440 m lange Landebahn. Am Boden sind Landebahn, Hangar und Windsack sichtbar; unten steht die Entfernung. Beende deine Wendemanöver frühzeitig und steuere selbst zur gestrichelten Strecke im Radar zurück. Plane den Abstieg rechtzeitig. Setze auf der Bahn mit 55–110 km/h, höchstens 3 m/s Sinken und nahezu waagerechter Nase und Tragfläche auf. Das Flugzeug rollt bis zum Stillstand aus; die verbleibende Bahn muss dafür lang genug sein. Außerhalb der Bahn oder bei einem harten Aufsetzen endet der Flug erfolglos. Flugzeitrekorde werden lokal im Browser gespeichert.

## Außerhalb von Codex spielen

### Auf dem eigenen Computer

Auf GitHub **Code → Download ZIP** wählen und das Archiv entpacken. Anschließend `index.html` im entpackten Ordner im Browser öffnen. `style.css` und `game.js` müssen neben der HTML-Datei bleiben.

### Mit GitHub Pages online spielen

In diesem Repository **Settings → Pages** öffnen. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen, den Branch mit den Spieldateien und den Ordner **/ (root)** auswählen und **Save** klicken. Die Datei `.nojekyll` aktiviert die unveränderte Auslieferung der statischen Dateien. Wenn der Branch nach `main` gemergt wurde, `main` auswählen.

GitHub zeigt nach erfolgreicher Bereitstellung die Spieladresse an. Änderungen am ausgewählten Branch werden anschließend automatisch bereitgestellt. Für Pages muss das Repository beziehungsweise der GitHub-Tarif die Veröffentlichung unterstützen.
