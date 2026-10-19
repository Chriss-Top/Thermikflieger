# Thermikflieger

Ein Segelflugspiel in Seitenansicht mit einfacher 3D-Fluggerätedarstellung: Windenstart, Höhenruder, Thermik und Landungen auf wiederkehrenden Flugplätzen. Ohne Installation im Browser spielbar. Die Flugphysik ist bewusst vereinfacht.

## Starten

`index.html` im Browser öffnen oder `python3 -m http.server 8000` im Projektverzeichnis starten. HTML, CSS und JavaScript müssen im selben Ordner liegen. Webfonts sind optional; Ersatzschriften funktionieren offline.

## Smartphone

Die Online-Version lässt sich in aktuellen Smartphone-Browsern wie Safari auf iPhone und Chrome auf Android öffnen. Hoch- und Querformat werden unterstützt. Die Bedienung erfolgt über vier große Schaltflächen: Mit einem Daumen **Ziehen / Drücken**, mit dem anderen **Links / Rechts**; beide Eingaben können gleichzeitig gehalten werden. Dazu kommen **Luftbremse** (halten) und **Seil lösen**. Auch Luftbremse, Höhenruder und Kurvensteuerung lassen sich gleichzeitig bedienen.

Aussparungen und der Home-Indikator werden über die sicheren Bildschirmränder berücksichtigt. Bei App-Wechsel, Bildschirmdrehung oder Fokusverlust pausiert das Spiel; mit **Weiter** geht es weiter. Die mobile Darstellung und Mehrfingereingaben wurden in Chromium mit Smartphone-Emulation geprüft. Ein Test auf echten iPhones und Android-Geräten steht noch aus.

## Steuerung

- **↓ / S**: Höhenruder ziehen, Nase hoch. Fahrt wird in Höhe umgesetzt.
- **↑ / W**: drücken, Nase runter. Das Flugzeug nimmt Fahrt auf.
- Loslassen lässt das Flugzeug sich weich in die Strömung einpendeln. Dauerhaftes Ziehen verbraucht Fahrt und kann zum Strömungsabriss führen; Nase senken, Fahrt aufnehmen und erst dann vorsichtig abfangen.
- **Leertaste halten**: Luftbremse ausfahren; Loslassen fährt sie wieder ein. Sie erhöht Widerstand und Sinken, auch am Windenseil. Beim Gleitschirm entspricht sie einem vereinfachten symmetrischen Bremszug.
- **R**: Windenseil frühzeitig lösen (ab 12 m). Sonst löst es automatisch auf 250 m, nach 24 Simulationssekunden oder am Ende der Schleppstrecke.
- **Windenstart / Noch einmal abheben**: starten bzw. neu starten. **Fluggerät / Modus wählen** führt nach dem Flug zurück zur Auswahl.
- **← / A** und **→ / D** gedrückt halten: manuell links oder rechts **aus Pilotensicht** wenden. Rechts senkt den rechten Flügel und dreht die Flugrichtung im Radar im Uhrzeigersinn, links entsprechend umgekehrt. Das gilt auch beim Flug nach links über den Bildschirm oder auf den Beobachter zu. Zum Gegensteuern rechtzeitig wechseln. Beim Loslassen richtet sich die Tragfläche mit etwas Trägheit wieder aus; die Flugrichtung bleibt bei dir.
- **P / Escape** oder Pausentaste: Pause.
- Touchgeräte: **Ziehen**, **Drücken**, **Links**, **Rechts**, **Luftbremse halten** sowie **Seil lösen**. Bei Fokusverlust werden alle gehaltenen Eingaben zurückgesetzt.

## Fluggeräte und Instrumente

Vor jedem Flug lassen sich Fluggerät und Thermikmodus wählen. Die Profile verwenden repräsentative, unballastierte Spielwerte; sie bilden kein Flughandbuch ab. Masse und Fläche beeinflussen den Auftrieb, die Gleitzahl die Widerstandspolare. Abrissfahrt, Rollträgheit, Höhenruderwirkung, Luftbremsen und Windenfahrt unterscheiden sich ebenfalls.

| Fluggerät | Spannweite | Flugmasse | Abrissfahrt | Bestes Gleiten | Fahrt dabei | Min. Sinken ca. | Max. Fahrt im Spiel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ka 8 | 15 m | 310 kg | 55 km/h | 27:1 | 75 km/h | 0,65 m/s | 190 km/h |
| ASK 21 | 17 m | 600 kg | 65 km/h | 34:1 | 95 km/h | 0,65 m/s | 280 km/h |
| LS4 | 15 m | 450 kg | 68 km/h | 40:1 | 100 km/h | 0,60 m/s | 270 km/h |
| LS8 | 15 m | 450 kg | 70 km/h | 43:1 | 105 km/h | 0,59 m/s | 280 km/h |
| Gleitschirm | 10 m | 110 kg | 22 km/h | 9:1 | 37 km/h | 1,1 m/s | 55 km/h |

Die Ka 8 ist leicht und langsam, die ASK 21 ein ruhiger Doppelsitzer. Die LS4 rollt schneller, die LS8 gleitet am besten. Der Gleitschirm reagiert weich, fliegt deutlich langsamer und wird stärker vom Wind versetzt. Seine Nicklage ist begrenzt; Loopings sind damit nicht möglich. Die maximale Fahrt löst eine Warnung und zusätzlichen Widerstand aus. Das minimale Sinken ist ein ungefährer Orientierungswert; Böen, Trimmung und Kurven beeinflussen das tatsächliche Sinken.

Höhen- und Querruderwirkung wachsen mit dem Quadrat der relativen Fahrt bis zu einer Begrenzung. Bei wenig Fahrt wird die Steuerung weich.

**Fahrtmesser, künstlicher Horizont und Variometer** sind runde analoge Instrumente mit dunklem Zifferblatt, Metallrand und gut sichtbaren Zeigern. Der Fahrtmesser zeigt km/h; seine Skala und farbigen Betriebsbereiche passen sich dem Fluggerät an (Gleitschirm bis 80, Ka 8 bis 220, die anderen Segler bis 300 km/h). Die Farbmarkierungen sind spielinterne Richtwerte. Das Vario hat Null links, Steigen auf der oberen und Sinken auf der unteren Skalenhälfte, mit ±5 m/s Vollausschlag. Die kleine Zusatzanzeige bleibt auch außerhalb dieses Bereichs numerisch ablesbar. Der künstliche Horizont hat eine Schräglagenskala und eine bewegte Himmel-/Erdscheibe; die feste gelbe Flugzeugmarke bleibt waagerecht. Alle Zeiger und der Horizont werden zwischen Physikschritten interpoliert.

Die stilisierten 3D-Modelle verwenden maßstäbliche Spannweiten und Rumpflängen: Ka 8 B 15/7 m, ASK 21 17/8,35 m, LS4 15/6,66 m, LS8 15/6,72 m. Die Ka 8 hat einen hoch angesetzten Flügel mit sichtbaren Rippen sowie ein konventionelles Leitwerk. Die ASK 21 hat eine lange, zweigeteilte Doppelsitzerhaube, mittig angesetzte Flügel und ein T-Leitwerk. LS4 und LS8 sind schlanker, ebenfalls mit T-Leitwerk; die LS8 hat zusätzlich Winglets. Die Modelle besitzen gerundete Rümpfe, eigene Flügelgrundrisse, Hauben und Räder; ausgefahrene Luftbremsen sind sichtbar. Der Gleitschirm hat eine gewölbte Zellkappe, Leinen, Pilot und Gurtzeug. Seitlicher Abstand zum Beobachter verkleinert das Fluggerät perspektivisch.

## Zwei Thermikmodi

**Einfach:** Goldene Aufwindsäulen, animierte Ringe, Restlebensdauer und Thermikradar machen Bärte sichtbar. Hangaufwind und Lee sind markiert.

**Fortgeschritten:** Aufwindsäulen, Kernpositionen, Restlebensdauer und genaue Aufwindwerte im Radar entfallen. Quellwolken über aktiven Bärten, sonnenwarme Bodenflächen, die beleuchtete Luvseite und verschattetes Lee geben Hinweise. Einige Hintergrundwolken liefern keine Thermik. Das Variometer zeigt das tatsächliche Steigen oder Sinken, einschließlich Höhengewinn durch Ziehen; anhaltendes Steigen bei gleichbleibender Fahrt spricht für Aufwind. Die Karte zeigt nur die eigene Flugspur, Strecke und Wind. Die Luftfelder und ihre Lebensdauer sind in beiden Modi gleich.

## Schneller und flüssiger

Das Spiel läuft mit 1,8-fachem Simulationstempo. Ein fester Physikschritt mit 120 Hz und interpolierte Flugzeug- und Kamerapositionen sorgen für gleichmäßige Bewegung. Instrumente werden mit 10 Hz aktualisiert, unabhängig von den Physikschritten. Die Landschaft zieht deutlicher vorbei, und die Kamera übernimmt Fahrtänderungen nach etwa 1,6 Simulationssekunden.

## Windenstart steuern

Die Winde zieht das Fluggerät zunächst auf eine zum Profil passende Fahrt. **↓** hebt die Nase und macht den Steigflug steiler, **↑** senkt die Nase und nimmt Steigung heraus. Ohne Eingabe unterstützt eine sanfte Trimmung den Start. Übermäßiges Ziehen kann auch am Seil einen Strömungsabriss auslösen. **R** oder **Seil lösen** klinkt ab 12 m Höhe aus; Fahrt, Nasenlage und Steigbewegung bleiben dabei erhalten. Das Seil löst automatisch auf 250 m, nach 24 Simulationssekunden oder am Ende der Schleppstrecke. Auch der Gleitschirm nutzt einen vereinfachten Windenstart.

## Thermik manuell ausfliegen

Die Landschaft bleibt in Seitenansicht, das Fluggerät wird räumlich projiziert. Das **Thermikradar** zeigt zusätzlich die horizontale Flugbahn: Der Pfeil zeigt deine Flugrichtung, im einfachen Modus zeigen goldene Ringe den Aufwind und ein dunkler Punkt den Kern. Die grüne Spur zeigt deinen bisherigen Weg. Die gestrichelte Linie markiert die Flugplatzstrecke; der blaue Strich zeigt den Wind.

1. In den Aufwind einfliegen und das Variometer beobachten.
2. **← / →** gedrückt halten, um selbst zu wenden. Beim passenden Moment gegensteuern oder die Richtung wechseln, bevor du aus dem Bart fliegst.
3. Windversatz und den wandernden Kern im Radar beobachten. Du musst deine Flugbahn laufend selbst korrigieren; das Spiel zentriert und hält keinen Kreis.
4. Mit **↑ / ↓** die Fahrt führen. Zu viel Ziehen kostet Fahrt und kann zum Abriss führen; enge Kurven kosten Auftrieb.
5. Zur Landung selbst zur gestrichelten Flugplatzstrecke und in Flugrichtung rechts zurückkehren. Es gibt keine automatische Rückkehr.

## Endliche Bärte und bewegte Luft

Thermikbärte leben etwa 75–110 Simulationssekunden, werden beim Annähern erzeugt, driften mit dem Wind und verblassen am Ende weich. Im einfachen Modus steht die Restdauer an der Säule. Derselbe ausgelaufene Bart wird nicht neu erzeugt. Jeder Bart hat zusätzlich eine begrenzte Obergrenze von etwa 640–900 m; nahe dieser Höhe lässt sein Aufwind nach. Neue Gebiete bieten neue Bärte.

Der Wind hat eine wechselnde horizontale und seitliche Komponente sowie stetige Böen. Er verändert die Geschwindigkeit über Grund und versetzt sowohl Flugzeug als auch Thermik. Der Thermikkern driftet etwas langsamer als die Luft: Ein einmal gewählter Kreis bleibt dadurch nicht automatisch zentriert.

Die sichtbaren Hügel erzeugen auf ihrer windzugewandten Seite **Hangaufwind** und auf der windabgewandten Seite **Lee-Abwind**. Diese Felder werden mit Abstand zum Boden schwächer. Im einfachen Modus helfen gelbe und blaue Markierungen beim Erkennen; im fortgeschrittenen Modus dienen Bodentönung und Windrichtung als Hinweise. Hügel gehören zur Kollisionsfläche; die angezeigte Höhe ist Höhe über Grund.

Die Luftbewegungen wirken auf Anstellwinkel, Auftrieb und Roll- und Nickbewegung. Dadurch wird der Flug unruhiger, während Geschwindigkeit, Höhe und Nasenlage kontinuierlich bleiben.

## Flugphysik

Das Flugzeug hat eine eigene horizontale und vertikale Geschwindigkeit. Auftrieb wirkt quer zur Luftströmung, Widerstand bremst, und Schwerkraft wirkt immer nach unten. Nase und Flugbahn können auseinanderliegen; das Instrument zeigt den Anstellwinkel **α** zusätzlich zur Nasenlage an. Die Simulation ist ein vereinfachtes Spielmodell.

Bei einer Beschleunigung bewegt sich das Flugzeug zunächst nach rechts über den Bildschirm. Die Kamera übernimmt die neue horizontale Geschwindigkeit verzögert: Der Hintergrund zieht dann schneller vorbei. Beim Abbremsen fällt das Flugzeug zunächst nach links zurück. Im Kreisflug ändern sich Flugrichtung und seitliche Projektion. Flugzeug und Landschaft verwenden dieselben Weltkoordinaten.

Bei zu geringer Fahrt oder zu großem Anstellwinkel nimmt der Auftrieb zügig ab. Die Schwerkraft krümmt die Flugbahn nach unten, die Nase kippt mit Drehträgheit nach. Vorhandener Schwung verschwindet dabei nicht schlagartig. Zum Ausleiten Nase senken, Fahrt aufnehmen und anschließend behutsam abfangen. Das Modell bleibt eine vereinfachte Spielphysik.

**Looping:** Zuerst ausreichend Höhe gewinnen, durch einen Abstieg Fahrt aufbauen und dann kontinuierlich **↓** ziehen. Ein kompletter Looping benötigt genug Energie; zu langsames oder zu starkes Ziehen führt zum Strömungsabriss. Die tatsächliche Flugbahn folgt der Nase. Ein vollständiger Looping ist ohne Thermik im automatisierten Test mit 234 km/h und 700 m Ausgangshöhe nachgewiesen; das ist ein Testszenario, keine garantierte Mindestgeschwindigkeit.

## Prüfen

Mit Node.js: `node --test tests/flight.test.cjs` (oder `node tests/flight.test.cjs` für die einzeln benannten Szenarien). 23 Szenarien prüfen steuerbaren Windenstart, Ausklinken ohne Geschwindigkeitssprung, manuelles Wenden ohne Kreis- oder Streckenautopilot, endliche und höhenbegrenzte Thermik, Windversatz, Hang- und Lee-Felder, Fahrt und Kameranachlauf, Strömungsabriss und Erholung, Loopings, Landungen, Pause und Neustart. Dazu kommen alle fünf Fluggeräte, ihre Polaren und Abrissfahrten, fahrtabhängige Nick- und Rollwirkung, Space/R, gleichzeitige Touch-Brems- und Steuereingaben, Entfernungsprojektion, Schräglage, Horizont-Interpolation und die Hinweise im fortgeschrittenen Modus. Zusätzliche Prüfungen sichern Pilotensicht-Steuerung in vier Flugrichtungen, die richtige Flügelbewegung, Zeigerrichtung und Messbereiche sowie maßstäbliche Flugzeugproportionen und Leitwerkstypen ab.

Chromium-Browserprüfung: 1440×900, 390×844, 844×390 und 360×640; Auswahl, Start, künstlicher Horizont, Tastatur, drei gleichzeitige Touchpunkte und überlappungsfreie Horizont-/Steuerflächen wurden geprüft. Diese Emulation ersetzt keinen Test auf echten Geräten.

## Landen

Alle 1,7 km liegt eine 440 m lange Landebahn. Am Boden sind Landebahn, Hangar und Windsack sichtbar; unten steht die Entfernung. Beende deine Wendemanöver frühzeitig und steuere selbst zur gestrichelten Strecke im Radar zurück. Plane den Abstieg rechtzeitig und nutze **Space / Luftbremse** zur Gleitwegkorrektur. Setze auf der Bahn oberhalb der profilspezifischen Abrissfahrt, höchstens mit deren 1,75-Fachem, höchstens 3 m/s Sinken und nahezu waagerechter Nase und Tragfläche auf. Beispiel ASK 21: 65–114 km/h; Gleitschirm: 22–39 km/h. Das Fluggerät rollt vereinfacht bis zum Stillstand aus; die verbleibende Bahn muss dafür lang genug sein. Außerhalb der Bahn oder bei einem harten Aufsetzen endet der Flug erfolglos. Flugzeitrekorde werden lokal im Browser gespeichert.

## Außerhalb von Codex spielen

### Auf dem eigenen Computer

Auf GitHub **Code → Download ZIP** wählen und das Archiv entpacken. Anschließend `index.html` im entpackten Ordner im Browser öffnen. `style.css` und `game.js` müssen neben der HTML-Datei bleiben.

### Mit GitHub Pages online spielen

In diesem Repository **Settings → Pages** öffnen. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen, den Branch mit den Spieldateien und den Ordner **/ (root)** auswählen und **Save** klicken. Die Datei `.nojekyll` aktiviert die unveränderte Auslieferung der statischen Dateien. Wenn der Branch nach `main` gemergt wurde, `main` auswählen.

GitHub zeigt nach erfolgreicher Bereitstellung die Spieladresse an. Änderungen am ausgewählten Branch werden anschließend automatisch bereitgestellt. Für Pages muss das Repository beziehungsweise der GitHub-Tarif die Veröffentlichung unterstützen.
