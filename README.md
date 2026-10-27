# Thermikflieger

Ein Segelflugspiel in Seitenansicht mit einfacher 3D-Fluggerätedarstellung: Windenstart, Höhenruder, Thermik und Landungen auf wiederkehrenden Flugplätzen. Ohne Installation im Browser spielbar. Die Flugphysik ist bewusst vereinfacht.

## Starten

`index.html` im Browser öffnen oder `python3 -m http.server 8000` im Projektverzeichnis starten. HTML, CSS und JavaScript müssen im selben Ordner liegen. Webfonts sind optional; Ersatzschriften funktionieren offline.

## Spieltempo

Standardmäßig läuft das Spiel mit **2× Tempo**: Windenstart, Streckenflug und Höhengewinn gehen schneller voran. Über **Tempo** oben im Bildschirm wechselst du jederzeit zwischen **1×, 2× und 3×**, auch auf dem Smartphone. Die gesamte Welt läuft gemeinsam schneller; kleine, feste Physikschritte erhalten die Kräfte, Kurvenradien, natürliche Fahrttrimmung und Abrissreserven. Instrumente zeigen weiterhin die simulierten km/h und m/s, Flugzeit und Thermikdauer zählen Simulationssekunden. Pause hält bei jedem Tempo den Flug an.

## Smartphone

Die drei runden Instrumente sitzen kompakt oben rechts. Im Hochformat sind sie rund 30 % kleiner als zuvor, im Querformat nochmals kompakt angeordnet. Eine schmalere Flugdatenanzeige und die angepasste Kamerahöhe lassen mehr vom Flugzeug und der Landschaft frei. Zahlenwerte, Abrisswarnungen und Sollfahrt bleiben sichtbar; die großen Touch-Tasten behalten ihre Bediengröße.

Die Online-Version lässt sich in aktuellen Smartphone-Browsern wie Safari auf iPhone und Chrome auf Android öffnen. Hoch- und Querformat werden unterstützt. Die Bedienung erfolgt über vier große Schaltflächen: Mit einem Daumen **Ziehen / Drücken**, mit dem anderen **Links / Rechts**; beide Eingaben können gleichzeitig gehalten werden. Dazu kommen **Luftbremse** (halten) und **Seil lösen**. Auch Luftbremse, Höhenruder und Kurvensteuerung lassen sich gleichzeitig bedienen.

Aussparungen und der Home-Indikator werden über die sicheren Bildschirmränder berücksichtigt. Bei App-Wechsel, Bildschirmdrehung oder Fokusverlust pausiert das Spiel; mit **Weiter** geht es weiter. Die mobile Darstellung und Mehrfingereingaben wurden in Chromium mit Smartphone-Emulation geprüft. Ein Test auf echten iPhones und Android-Geräten steht noch aus.

## Steuerung

- **↓ / S**: Höhenruder ziehen, Nase hoch. Fahrt wird in Höhe umgesetzt.
- **↑ / W**: drücken, Nase runter. Das Flugzeug nimmt Fahrt auf.
- Loslassen lässt das Flugzeug sich weich in die Strömung einpendeln. Dauerhaftes Ziehen verbraucht Fahrt und kann zum Strömungsabriss führen; Nase senken, Fahrt aufnehmen und erst dann vorsichtig abfangen.
- **Leertaste halten**: Luftbremse ausfahren; Loslassen fährt sie wieder ein. Sie erhöht Widerstand und Sinken, auch am Windenseil. Beim Gleitschirm entspricht sie einem vereinfachten symmetrischen Bremszug.
- **R**: Windenseil frühzeitig lösen (ab 12 m). Sonst löst es automatisch auf 250 m, nach 24 Simulationssekunden oder am Ende der Schleppstrecke.
- **F** oder **Fahrt-Auto**: Fahrt-Autopilot ein-/ausschalten. Eine Vorauswahl vor dem Start aktiviert ihn nach dem Ausklinken. Höhenrudereingaben oder Luftbremse schalten ihn aus, damit du sofort manuell übernehmen kannst.
- **Windenstart / Noch einmal abheben**: starten bzw. neu starten. **Fluggerät / Modus wählen** führt nach dem Flug zurück zur Auswahl.
- **← / A** und **→ / D**: mit kurzen Impulsen links oder rechts **aus Pilotensicht** einrollen. Rechts senkt den rechten Flügel und dreht die Flugrichtung im Radar im Uhrzeigersinn, links entsprechend umgekehrt. Das gilt auch beim Flug nach links über den Bildschirm oder auf den Beobachter zu. Die Tasten steuern die Rollbewegung: Loslassen bremst diese, während die erreichte Schräglage zunächst bestehen bleibt und dann langsam abnimmt. Früh loslassen und mit kleinen Folgeimpulsen halten; Gegensteuern rollt aktiv aus. Es gibt keine eingerastete Kreisautomatik.
- **P / Escape** oder Pausentaste: Pause.
- Touchgeräte: **Ziehen**, **Drücken**, **Links**, **Rechts**, **Fahrt-Auto**, **Luftbremse halten** sowie **Seil lösen**. Bei Fokusverlust werden alle gehaltenen Eingaben zurückgesetzt.

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

Höhen- und Querruderwirkung wachsen mit der relativen Fahrt bis zu einer Begrenzung. Ohne Höhenrudereingabe erzeugt die Trimmung gedämpfte Nickmomente zur optimalen Gleitgeschwindigkeit. Zu langsamer Flug senkt allmählich die Nase, zu schneller Flug hebt sie an; ein leichtes Pendeln klingt ab. Diese natürliche Fahrtstabilität funktioniert auch bei ausgeschaltetem Fahrt-Autopiloten. Geschwindigkeit wird ausschließlich durch Auftrieb, Widerstand und Schwerkraft verändert, niemals direkt auf den Sollwert gesetzt.

## Sollfahrt und Fahrt-Autopilot

Jeder Fahrtmesser hat zwei feste Bezugspunkte: ein **rotes Dreieck „VS“** für die Abrissfahrt im Geradeausflug und eine **blaue Raute „VG“** für bestes Gleiten. Die Sollfahrt liegt bei jedem Profil mindestens 35 % über der Abrissfahrt, beim Gleitschirm noch weiter darüber. Die Zahlen stehen zusätzlich farbig unter den Instrumenten. Die unten angegebenen Fluggerätedaten gelten für Geradeausflug.

In einer Kurve steigt die für einen höhenkonstanten Kreis notwendige Fahrt. Die beweglichen Referenz- und Sollmarken werden mit `1 / √cos(Schräglage)` angehoben; die künstlich langsamere Thermiktrimmung entfällt. Beispiel ASK 21: geradeaus Referenz 65 / Soll 95 km/h, bei 45° etwa 77 / 113 km/h und bei 60° etwa 92 / 134 km/h. Die schräglagenabhängige Referenz ist keine harte Abrissschwelle: Eine sinkende Kurve kann darunterliegen, während das Fluggerät beschleunigt.

Der **gelbe Abriss-Warnbereich** reicht von der roten Referenzmarke bis 22 % darüber und wandert mit der Schräglage. Die gelbe Zahl **„⚠ ab …“** nennt den Beginn der Vorwarnung. Beim Einflug in diesen Bereich oder bei hohem Anstellwinkel erscheinen ein gelber Instrumentenrand und **„ABRISSWARNUNG · Ziehen lösen, sanft drücken“**. Die Warnung gilt in beiden Thermikmodi. Sie geht erst mit etwas zusätzlicher Reserve zurück, damit sie an der Grenze nicht ständig flackert.

Die Spielphysik toleriert nun mehr Anstellwinkel und kurze Böen: Vorwarnung ab etwa 14°, kritischer Bereich erst oberhalb etwa 23°. Eine anhaltend kritische Lage bekommt rund 0,6 Simulationssekunden Übergangszeit, bevor der volle Abriss einsetzt. Tiefes Überziehen bleibt möglich; extrem wenig Fahrt oder extreme Anstellwinkel können sofort zum Abriss führen. Sehr langsamer Flug wird weiterhin gefährlich, und starkes Ziehen kann auch oberhalb der Referenzfahrt abreißen lassen. Der Gleitschirm kann zum Ausleiten ausreichend nach unten nicken, ohne dass vollständige Loopings möglich werden.

Der optionale **Fahrt-Autopilot** regelt über das Höhenruder auf diese Sollfahrt. Er kann vor dem Start vorgewählt oder im Flug mit **F / Fahrt-Auto** umgeschaltet werden. Nach dem Windenstart übernimmt er erst beim Ausklinken. Bei zu wenig Fahrt senkt er die Nase, bei zu viel Fahrt hebt er sie an. Dadurch wird Höhe gegen Fahrt getauscht; es gibt keinen künstlichen Antrieb und keine sprunghafte Geschwindigkeitskorrektur. Kurven und Thermikzentrierung steuerst du selbst. In Pause bleibt der Zustand erhalten. Zum manuellen Übernehmen genügt Ziehen, Drücken oder die Luftbremse; zum Landen schaltest du die Hilfe damit aus.

Die Rollsteuerung spricht beim Einrollen und Gegensteuern schneller an, behält aber Rollträgheit und Dämpfung beim Loslassen. Für Thermikkreise sind etwa **30–45°** Schräglage sinnvoll; für engere Kerne lässt sich weiter einrollen. Die Steuergrenze liegt bei **65°** für Segelflugzeuge und **50°** für den Gleitschirm. Es gibt keinen zusätzlichen Wendefaktor. Der seitliche Auftrieb krümmt die Flugbahn; in einer ausgeglichenen Kurve ergibt sich daraus `Drehrate ≈ g · tan(Schräglage) / Fahrt` und `Radius ≈ Fahrt² / (g · tan(Schräglage))`. Bei Abriss und nachlassendem Auftrieb nimmt auch die Kurvenwirkung ab. Größere Schräglage erfordert mehr Auftrieb und Fahrt und erhöht das Sinken. Sanft einrollen, loslassen und bei Bedarf gegensteuern.

**Fahrtmesser, künstlicher Horizont und Variometer** sind runde analoge Instrumente mit dunklem Zifferblatt, Metallrand und gut sichtbaren Zeigern. Der Fahrtmesser zeigt km/h; seine Skala und farbigen Betriebsbereiche passen sich dem Fluggerät an (Gleitschirm bis 80, Ka 8 bis 220, die anderen Segler bis 300 km/h). Die Farbmarkierungen sind spielinterne Richtwerte. Das Vario hat Null links, Steigen auf der oberen und Sinken auf der unteren Skalenhälfte, mit ±5 m/s Vollausschlag. Die kleine Zusatzanzeige bleibt auch außerhalb dieses Bereichs numerisch ablesbar. Der künstliche Horizont hat eine Schräglagenskala und eine bewegte Himmel-/Erdscheibe; die feste gelbe Flugzeugmarke bleibt waagerecht. Alle Zeiger und der Horizont werden zwischen Physikschritten interpoliert.

Die stilisierten 3D-Modelle verwenden maßstäbliche Spannweiten und Rumpflängen: Ka 8 B 15/7 m, ASK 21 17/8,35 m, LS4 15/6,66 m, LS8 15/6,72 m. Die Ka 8 hat einen hoch angesetzten Flügel mit sichtbaren Rippen sowie ein konventionelles Leitwerk. Die ASK 21 hat eine lange, zweigeteilte Doppelsitzerhaube, mittig angesetzte Flügel und ein T-Leitwerk. LS4 und LS8 sind schlanker, ebenfalls mit T-Leitwerk; die LS8 hat zusätzlich Winglets. Die Modelle besitzen gerundete Rümpfe, eigene Flügelgrundrisse, Hauben und Räder; ausgefahrene Luftbremsen sind sichtbar. Der Gleitschirm hat eine gewölbte Zellkappe, Leinen, Pilot und Gurtzeug. Seitlicher Abstand zum Beobachter verkleinert das Fluggerät perspektivisch.

## Zwei Thermikmodi

**Einfach:** Goldene Aufwindsäulen, animierte Ringe, Restlebensdauer und Thermikradar machen Bärte sichtbar. Hangaufwind und Lee sind markiert.

**Fortgeschritten:** Aufwindsäulen, Kernpositionen, Restlebensdauer und genaue Aufwindwerte im Radar entfallen. Quellwolken über aktiven Bärten, sonnenwarme Bodenflächen, die beleuchtete Luvseite und verschattetes Lee geben Hinweise. Einige Hintergrundwolken liefern keine Thermik. Das Variometer zeigt das tatsächliche Steigen oder Sinken, einschließlich Höhengewinn durch Ziehen; anhaltendes Steigen bei gleichbleibender Fahrt spricht für Aufwind. Die Karte zeigt nur die eigene Flugspur, Strecke und Wind. Die Luftfelder und ihre Lebensdauer sind in beiden Modi gleich.

## Flüssige Darstellung

Die Simulation läuft standardmäßig doppelt so schnell und lässt sich jederzeit auf 1× oder 3× umstellen. Ein fester Physikschritt mit 120 Hz Simulationszeit und interpolierte Flugzeug- und Kamerapositionen sorgen auch im Zeitraffer für gleichmäßige Bewegung. Zahlenanzeigen werden mit 10 Hz aktualisiert; die Kamera übernimmt Fahrtänderungen verzögert.

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

Aufwind und Böen werden getrennt an beiden Flügeln abgetastet, unter Berücksichtigung von Spannweite, Flugrichtung und Schräglage. Hebt stärkere Thermik den linken Flügel, rollt das Fluggerät nach rechts und beginnt eine kleine Rechtskurve; beim rechten Flügel gilt das umgekehrt. Gleichmäßiger Aufwind auf beiden Seiten erzeugt keine künstliche Rollbewegung. Unterschiedliche Rollträgheit der Fluggeräte und die bestehenden Ruderkräfte bestimmen, wie schnell du diese Störungen ausgleichen kannst.

## Flugphysik

Das Flugzeug hat eine eigene horizontale und vertikale Geschwindigkeit. Die Luftkräfte verwenden dynamischen Druck mit 1,225 kg/m³ Luftdichte, Flügelfläche, Masse und Widerstandspolare. Der zusätzliche pauschale Kurvenwiderstand entfällt; der erhöhte induzierte Widerstand ergibt sich aus dem benötigten Auftrieb. Die Schwerkraft wirkt unabhängig von Fluglage und Masse mit 9,81 m/s² in Weltkoordinaten nach unten. Die Höhenintegration mittelt alte und neue Vertikalgeschwindigkeit, sodass ein freier Fall die korrekte parabelförmige Bahn ergibt. Auftrieb wirkt quer zur Luftströmung, Widerstand bremst, und Schwerkraft wirkt immer nach unten. Nase und Flugbahn können auseinanderliegen; das Instrument zeigt den Anstellwinkel **α** zusätzlich zur Nasenlage an. Die Simulation ist ein vereinfachtes Spielmodell.

Bei einer Beschleunigung bewegt sich das Flugzeug zunächst nach rechts über den Bildschirm. Die Kamera übernimmt die neue horizontale Geschwindigkeit verzögert: Der Hintergrund zieht dann schneller vorbei. Beim Abbremsen fällt das Flugzeug zunächst nach links zurück. Im Kreisflug ändern sich Flugrichtung und seitliche Projektion. Flugzeug und Landschaft verwenden dieselben Weltkoordinaten.

Bei zu geringer Fahrt oder zu großem Anstellwinkel nimmt der Auftrieb zügig ab. Die Schwerkraft krümmt die Flugbahn nach unten, die Nase kippt mit Drehträgheit nach. Vorhandener Schwung verschwindet dabei nicht schlagartig. Zum Ausleiten Nase senken, Fahrt aufnehmen und anschließend behutsam abfangen. Das Modell bleibt eine vereinfachte Spielphysik.

**Looping:** Zuerst ausreichend Höhe gewinnen, durch einen Abstieg Fahrt aufbauen und dann kontinuierlich **↓** ziehen. Ein kompletter Looping benötigt genug Energie; zu langsames oder zu starkes Ziehen führt zum Strömungsabriss. Die tatsächliche Flugbahn folgt der Nase. Ein vollständiger Looping ist ohne Thermik im automatisierten Test mit 234 km/h und 700 m Ausgangshöhe nachgewiesen; das ist ein Testszenario, keine garantierte Mindestgeschwindigkeit.

## Prüfen

Mit Node.js: `node --test tests/flight.test.cjs` (oder `node tests/flight.test.cjs` für die einzeln benannten Szenarien). 52 Szenarien prüfen steuerbaren Windenstart, Ausklinken ohne Geschwindigkeitssprung, manuelles Wenden ohne Kreis- oder Streckenautopilot, endliche und höhenbegrenzte Thermik, Windversatz, Hang- und Lee-Felder, Fahrt und Kameranachlauf, Strömungsabriss und Erholung, Loopings, Landungen, Pause und Neustart. Dazu kommen alle fünf Fluggeräte, ihre Polaren und Abrissfahrten, fahrtabhängige Nick- und Rollwirkung, Space/R, gleichzeitige Touch-Brems- und Steuereingaben, Entfernungsprojektion, Schräglage, Horizont-Interpolation und die Hinweise im fortgeschrittenen Modus. Zusätzliche Prüfungen sichern Pilotensicht-Steuerung in vier Flugrichtungen, die richtige Flügelbewegung, Zeigerrichtung und Messbereiche sowie maßstäbliche Flugzeugproportionen und Leitwerkstypen ab. Die Fahrt-Autopilot-Szenarien prüfen alle fünf Fluggeräte über jeweils 60 Simulationssekunden geradeaus und im Steilkreis, ausreichende Abrissreserve, konstante Fahrt ohne Energiezufuhr, Einschalten per Taste/Touch, Vorauswahl, Pause und manuelles Übernehmen. Weitere 50 Sekunden pro Fluggerät sichern den Übergang aus dem Windenstart und Steilkreise in Wind und Böen ab.

Chromium-Browserprüfung: 1440×900, 390×844, 844×390 und 360×640; Auswahl, Start, künstlicher Horizont, Tastatur, drei gleichzeitige Touchpunkte und überlappungsfreie Horizont-/Steuerflächen wurden geprüft. Diese Emulation ersetzt keinen Test auf echten Geräten.

Die neuen manuellen Kurventests prüfen alle fünf Fluggeräte jeweils in beiden Richtungen und mit/ohne kurze Höhenruderkorrekturen über 40 Simulationssekunden in Böen, bei voller Schräglage und ausgeschaltetem Fahrt-Autopiloten. Zusätzlich werden die Vorwarnzeit vor einem absichtlich herbeigeführten Abriss, Warnungen in beiden Thermikmodi, Erholung und kurze Windscherung geprüft.

Weitere Prüfungen sichern die Richtung der Flügelanhebung bei vier Flugrichtungen, den Einfluss echter Thermikgradienten, die Ruhe bei gleichmäßigem Aufwind, dosierte Rollimpulse, Ausrollen nach Loslassen und Rollträgheit bei Pause und Neustart. Die Kreisradien werden anhand der physikalischen Beziehung aus Fahrt, Schräglage und Schwerkraft geprüft. Für alle fünf Fluggeräte wird die natürliche Rückkehr zur optimalen Gleitgeschwindigkeit aus langsamer und schneller Ausgangslage ohne Autopilot über 90 Sekunden getestet. Zusätzliche Tests prüfen den massenunabhängigen Fall mit 9,81 m/s², Energieerhaltung im freien Fall, fehlende Kurvenwirkung ohne Auftrieb sowie den gleichmäßigen Ablauf bei 1×, 2× und 3×, Tempo-Wechsel ohne Sprünge und Pause bei erhöhtem Tempo.

## Landen

Alle 1,7 km liegt eine 440 m lange Landebahn. Am Boden sind Landebahn, Hangar und Windsack sichtbar; unten steht die Entfernung. Beende deine Wendemanöver frühzeitig und steuere selbst zur gestrichelten Strecke im Radar zurück. Plane den Abstieg rechtzeitig und nutze **Space / Luftbremse** zur Gleitwegkorrektur. Setze auf der Bahn oberhalb der profilspezifischen Abrissfahrt, höchstens mit deren 1,75-Fachem, höchstens 3 m/s Sinken und nahezu waagerechter Nase und Tragfläche auf. Beispiel ASK 21: 65–114 km/h; Gleitschirm: 22–39 km/h. Das Fluggerät rollt vereinfacht bis zum Stillstand aus; die verbleibende Bahn muss dafür lang genug sein. Außerhalb der Bahn oder bei einem harten Aufsetzen endet der Flug erfolglos. Flugzeitrekorde werden lokal im Browser gespeichert.

## Außerhalb von Codex spielen

### Auf dem eigenen Computer

Auf GitHub **Code → Download ZIP** wählen und das Archiv entpacken. Anschließend `index.html` im entpackten Ordner im Browser öffnen. `style.css` und `game.js` müssen neben der HTML-Datei bleiben.

### Mit GitHub Pages online spielen

In diesem Repository **Settings → Pages** öffnen. Unter **Build and deployment** die Quelle **Deploy from a branch** wählen, den Branch mit den Spieldateien und den Ordner **/ (root)** auswählen und **Save** klicken. Die Datei `.nojekyll` aktiviert die unveränderte Auslieferung der statischen Dateien. Wenn der Branch nach `main` gemergt wurde, `main` auswählen.

GitHub zeigt nach erfolgreicher Bereitstellung die Spieladresse an. Änderungen am ausgewählten Branch werden anschließend automatisch bereitgestellt. Für Pages muss das Repository beziehungsweise der GitHub-Tarif die Veröffentlichung unterstützen.
