'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#sky'), ctx = canvas.getContext('2d');
const keys = new Set();
const G = 9.81, RUNWAY_SPACING = 1700, RUNWAY_LENGTH = 440;
const STEP = 1 / 120, GAME_TEMPO = 1.8;
// Representative unballasted game profiles, not certified flight-manual data.
const AIRCRAFT = {
  ka8: { name: 'Ka 8', span: 15, area: 14.15, mass: 310, stall: 55, bestSpeed: 75, glide: 27, minSink: .65, maxSpeed: 190, roll: 2.7, elevator: .42, brake: .12, color: '#c76c45', shape: 'classic', description: 'Leicht und gutmütig · enge Thermikkreise, wenig Fahrtreserve' },
  ask21: { name: 'ASK 21', span: 17, area: 17.95, mass: 600, stall: 65, bestSpeed: 95, glide: 34, minSink: .65, maxSpeed: 280, roll: 3.5, elevator: .45, brake: .13, color: '#bd6e46', shape: 'twin', description: 'Ruhiger Doppelsitzer · träge, stabil und vielseitig' },
  ls4: { name: 'LS4', span: 15, area: 10.5, mass: 450, stall: 68, bestSpeed: 100, glide: 40, minSink: .60, maxSpeed: 270, roll: 4.4, elevator: .50, brake: .11, color: '#498c9e', shape: 'racer', description: 'Wendiger Einsitzer · schlanke Flügel und gute Gleitleistung' },
  ls8: { name: 'LS8', span: 15, area: 10.5, mass: 450, stall: 70, bestSpeed: 105, glide: 43, minSink: .59, maxSpeed: 280, roll: 4.0, elevator: .47, brake: .11, color: '#517a59', shape: 'winglet', description: 'Leistungssegler mit Winglets · beste Gleitleistung, vorausschauend landen' },
  paraglider: { name: 'Gleitschirm', span: 10, area: 26, mass: 110, stall: 22, bestSpeed: 37, glide: 9, minSink: 1.1, maxSpeed: 55, roll: 1.5, elevator: .18, brake: .22, color: '#e38a43', shape: 'canopy', description: 'Langsam und weich · Pendelbewegung, enge Kreise, windempfindlich' }
};
let aircraft = AIRCRAFT.ask21, thermalMode = 'easy', overspeed = false;
let speedHoldEnabled = false;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
function maximumBank() { return (aircraft.shape === 'canopy' ? 55 : 65) * Math.PI / 180; }
function turnFactor(angle = bank) { return 1 / Math.sqrt(Math.max(.25, Math.cos(angle))); }
function stallSpeed(angle = bank) { return aircraft.stall * turnFactor(angle); }
function targetSpeed(angle = bank) { return Math.min(aircraft.maxSpeed * .9, aircraft.bestSpeed * turnFactor(angle)); }
function speedAssistActive() { return speedHoldEnabled && mode === 'flying' && phase === 'glide'; }
function toggleSpeedAssist() {
  if (mode !== 'flying' || paused || phase === 'rollout') return;
  speedHoldEnabled = !speedHoldEnabled;
  $('#speedAssist').checked = speedHoldEnabled;
  canvas.focus?.({ preventScroll: true });
  instruments();
}
function gaugeSettings() {
  const maximum = aircraft.shape === 'canopy' ? 80 : aircraft.maxSpeed <= 220 ? 220 : 300;
  return { maximum, major: maximum === 80 ? 10 : maximum === 220 ? 20 : 50, minor: maximum === 80 ? 2 : 10 };
}
function speedNeedleAngle(kmh) { return -150 + Math.max(0, Math.min(gaugeSettings().maximum, kmh)) / gaugeSettings().maximum * 300; }
function varioNeedleAngle(ms) { return -90 + Math.max(-5, Math.min(5, ms)) * 27; }
function gaugePoint(angle, radius) {
  const a = angle * Math.PI / 180;
  return [Math.sin(a) * radius, -Math.cos(a) * radius];
}
function gaugeArc(from, to, radius, color, width = 3) {
  const a = gaugePoint(from, radius), b = gaugePoint(to, radius);
  return `<path d="M${a} A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${b}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
}
function gaugeTick(angle, major, label) {
  const a = gaugePoint(angle, major ? 39 : 43), b = gaugePoint(angle, 47), c = gaugePoint(angle, 31);
  return `<path d="M${a} L${b}" stroke="#f6f3df" stroke-width="${major ? 1.4 : .7}"/>` + (label === undefined ? '' : `<text x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central" fill="#f6f3df" font-size="7" font-family="sans-serif">${label}</text>`);
}
function buildDials() {
  const scale = gaugeSettings();
  let marks = gaugeArc(speedNeedleAngle(aircraft.stall * 1.1), speedNeedleAngle(aircraft.maxSpeed * .75), 50, '#78b88a');
  marks += gaugeArc(speedNeedleAngle(aircraft.maxSpeed * .75), speedNeedleAngle(aircraft.maxSpeed), 50, '#e6c76c');
  marks += gaugeArc(speedNeedleAngle(aircraft.stall), speedNeedleAngle(aircraft.stall * 1.5), 53, '#f4f0dd', 2);
  for (let n = 0; n <= scale.maximum; n += scale.minor) {
    const major = n % scale.major === 0;
    marks += gaugeTick(speedNeedleAngle(n), major, major ? n : undefined);
  }
  const a = gaugePoint(speedNeedleAngle(aircraft.maxSpeed), 44), b = gaugePoint(speedNeedleAngle(aircraft.maxSpeed), 55);
  marks += `<path d="M${a} L${b}" stroke="#ed6d58" stroke-width="2"/>`;
  // Distinct, labelled fixed references; the two outer bugs move with turn load.
  marks += `<g data-speed="${aircraft.stall}" transform="rotate(${speedNeedleAngle(aircraft.stall)})"><title>Abrissfahrt im Geradeausflug: ${aircraft.stall} km/h</title><path d="M-3-51L0-45 3-51Z" fill="#ff7864"/><text x="0" y="-36" text-anchor="middle" fill="#ff9989" font-size="5">VS</text></g>`;
  marks += `<g data-speed="${aircraft.bestSpeed}" transform="rotate(${speedNeedleAngle(aircraft.bestSpeed)})"><title>Bestes Gleiten: ${aircraft.bestSpeed} km/h</title><path d="M0-46L-3-50 0-54 3-50Z" fill="#62d5ed"/><text x="0" y="-36" text-anchor="middle" fill="#86e5f6" font-size="5">VG</text></g>`;
  $('#speedScale').innerHTML = marks;
  marks = '';
  for (let n = -25; n <= 25; n++) marks += gaugeTick(varioNeedleAngle(n / 5), n % 5 === 0, n % 5 === 0 ? Math.abs(n / 5) : undefined);
  $('#varioScale').innerHTML = marks;
  marks = '';
  for (const angle of [-65,-60,-45,-30,-20,-10,0,10,20,30,45,60,65]) {
    const a = gaugePoint(angle, 49), b = gaugePoint(angle, Math.abs(angle) % 30 === 0 ? 56 : 53);
    marks += `<path d="M${a} L${b}" stroke="#f5f0d8" stroke-width="1.2"/>`;
  }
  $('#bankScale').innerHTML = marks;
}
function aeroProfile() {
  const liftFactor = .02 * (aircraft.area / aircraft.mass) / (17.95 / 600);
  const optimalCL = G / (liftFactor * (aircraft.bestSpeed / 3.6) ** 2);
  return { liftFactor, cd0: optimalCL / (2 * aircraft.glide), induced: 1 / (2 * aircraft.glide * optimalCL) };
}
function speedAssistRate(flightAngle, aero) {
  // Elevator-only speed control: trade height for airspeed, without adding energy.
  const v = Math.max(1, speed), cosBank = Math.max(.25, Math.cos(bank));
  const levelCL = G * Math.cos(flightAngle) / (aero.liftFactor * v * v * cosBank);
  const drag = aero.liftFactor * v * v * (aero.cd0 + aero.induced * levelCL ** 2 + .025 * Math.sin(bank) ** 2);
  const desiredPath = Math.asin(clamp(((v - targetSpeed() / 3.6) * .45 - drag) / G, -.5, .4));
  const pathRate = wrapAngle(desiredPath - flightAngle) * 2.5;
  const requiredCL = (G * Math.cos(flightAngle) + v * pathRate) / (aero.liftFactor * v * v * cosBank);
  let alpha = clamp((requiredCL - .38) / 4.7, -.16, .25);
  if (stalled || v * 3.6 < stallSpeed() * 1.08) alpha = -.05;
  return clamp(wrapAngle(flightAngle + alpha - pitch) * 5 - pitchRate * .6, -1.4, 1.4) * clamp(controlAuthority(), .7, 1);
}
function controlAuthority(v = speed) {
  return Math.min(1.8, Math.max(0, (v / (aircraft.bestSpeed / 3.6)) ** 2));
}
const braking = () => mode === 'flying' && !paused && keys.has('Space');
function configure() {
  aircraft = AIRCRAFT[$('#aircraft').value] || AIRCRAFT.ask21;
  thermalMode = $('#thermalMode').value === 'advanced' ? 'advanced' : 'easy';
  $('#aircraftInfo').textContent = `${aircraft.description}. ${aircraft.span} m · ${aircraft.mass} kg · Abriss ${aircraft.stall} km/h · bestes Gleiten ${aircraft.glide}:1 bei ${aircraft.bestSpeed} km/h · min. Sinken ≈ ${aircraft.minSink} m/s`;
  $('#modeInfo').textContent = thermalMode === 'easy' ? 'Sichtbare Bärte und Thermikradar helfen beim Zentrieren.' : 'Bärte sind unsichtbar. Suche unter Quellwolken und am sonnenwarmen Hang; Wind, Vario und Flugspur helfen beim Zentrieren.';
  buildDials();
}
$('#aircraft').onchange = $('#thermalMode').onchange = configure;
configure();
let accumulator = 0, hudClock = 0, previous = null;
let heading = 0, bank = 0, targetBank = 0, crossTrack = 0, hasLifted = false;
const worldScale = () => Math.min(2, Math.max(.8, W / 550));
let radarRight = 24, radarBottom = 134;
let W, H, mode = 'intro', paused = false, last = 0, t = 0;
let elapsed = 0, height = 0, distance = 0, speed = 0, pitch = 0, vertical = 0;
let airVX = 0, airVY = 0, cameraDistance = 0, cameraSpeed = 0;
let angleOfAttack = 0, pitchRate = 0, stallBlend = 0;
let localWind = { x: 0, z: 0, up: 0 }, windReady = false;
const thermals = new Map(), trail = [];
let trailClock = 0;
const smooth = value => { const v = Math.max(0, Math.min(1, value)); return v * v * (3 - 2 * v); };
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
let phase = 'winch', phaseTime = 0, airLift = 0, stalled = false, landingMessage = '';
let best = 0;
try { best = Number(localStorage.getItem('thermik-best')) || 0; } catch {}
function resize() {
  W = innerWidth; H = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  previous = null;
  if (typeof getComputedStyle === 'function') {
    radarRight = Math.max(24, (parseFloat(getComputedStyle($('header')).paddingRight) || 0) + 6);
    radarBottom = Math.max(134, (parseFloat(getComputedStyle($('#touch')).bottom) || 0) + 120);
  }
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
if (typeof visualViewport !== 'undefined') visualViewport.addEventListener('resize', resize);
resize();
function start() {
  configure();
  speedHoldEnabled = !!$('#speedAssist').checked;
  mode = 'flying'; paused = false; phase = 'winch'; phaseTime = 0;
  elapsed = 0; height = 0; distance = 0; speed = 0; pitch = 0; vertical = 0;
  airLift = 0; stalled = false; airVX = 0; airVY = 0;
  cameraDistance = 0; cameraSpeed = 0; angleOfAttack = 0; keys.clear();
  heading = 0; bank = 0; targetBank = 0; crossTrack = 0; hasLifted = false;
  pitchRate = 0; stallBlend = 0; windReady = false; overspeed = false;
  for (const control of touchControls) { control.pointers.clear(); control.button.classList.remove('held'); }
  localWind = { x: 0, z: 0, up: 0 }; thermals.clear(); trail.length = 0; trailClock = 0;
  ensureThermals();
  previous = null; accumulator = 0; hudClock = 0;
  $('#end').classList.add('hidden'); document.body.classList.add('playing');
  $('#pause').textContent = 'Pause'; $('#pause').setAttribute('aria-label', 'Spiel pausieren');
  canvas.focus?.({ preventScroll: true });
  instruments();
}
$('#start').onclick = start; $('#restart').onclick = start;
$('#hangar').onclick = () => {
  mode = 'intro'; paused = false; keys.clear();
  $('#end').classList.add('hidden'); document.body.classList.remove('playing');
  $('#aircraft').focus?.();
};
function togglePause() {
  if (mode !== 'flying') return;
  paused = !paused; keys.clear();
  $('#pause').textContent = paused ? 'Weiter' : 'Pause';
  $('#pause').setAttribute('aria-label', paused ? 'Spiel fortsetzen' : 'Spiel pausieren');
  instruments();
}
$('#pause').onclick = togglePause;
$('#autopilot').onclick = toggleSpeedAssist;
function release() {
  if (mode === 'flying' && !paused && phase === 'winch' && height > 12) {
    phase = 'glide';
  }
}
addEventListener('keydown', e => {
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target?.tagName) || (e.target?.tagName === 'BUTTON' && ['Space', 'Enter'].includes(e.code))) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat && ['KeyP', 'Escape', 'KeyR', 'KeyF'].includes(e.code)) return;
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyR') release();
  if (e.code === 'KeyF') toggleSpeedAssist();
});
addEventListener('keyup', e => keys.delete(e.code));
function suspend() {
  keys.clear();
  for (const control of touchControls) { control.pointers.clear(); control.button.classList.remove('held'); }
  if (mode === 'flying' && !paused) togglePause();
}
addEventListener('blur', suspend);
addEventListener('orientationchange', () => { suspend(); resize(); });
if (typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
const touchControls = [];
for (const [id, key] of [['left', 'ArrowDown'], ['right', 'ArrowUp'], ['bankLeft', 'ArrowLeft'], ['bankRight', 'ArrowRight'], ['brake', 'Space']]) {
  const b = $('#' + id);
  const pointers = new Set();
  touchControls.push({ button: b, pointers });
  b.onpointerdown = e => {
    e.preventDefault(); pointers.add(e.pointerId); b.setPointerCapture(e.pointerId);
    keys.add(key); b.classList.add('held');
  };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = e => {
    pointers.delete(e.pointerId);
    if (!pointers.size) { keys.delete(key); b.classList.remove('held'); }
  };
  b.oncontextmenu = e => e.preventDefault();
}
$('#release').onclick = () => { release(); canvas.focus?.({ preventScroll: true }); };
function windAt(x, h, time = t) {
  const exposure = smooth(Math.max(0, h - terrainAt(x)) / 45);
  return {
    x: exposure * (3.4 + 1.5 * Math.sin(time * .16) + .65 * Math.sin(x * .009 + time * .83)),
    z: exposure * (1.5 * Math.sin(time * .11 + .5) + .8 * Math.sin(x * .006 - time * .47)),
    up: exposure * (.5 * Math.sin(x * .019 + time * 1.3) + .35 * Math.sin(time * 2.1 - x * .011))
  };
}
function terrainAt(x) {
  const local = ((x % RUNWAY_SPACING) + RUNWAY_SPACING) % RUNWAY_SPACING;
  const d = (local - 990) / 210;
  return Math.abs(d) < 1 ? 65 * Math.cos(d * Math.PI / 2) ** 2 : 0;
}
function ridgeLiftAt(x, h, wind) {
  const agl = Math.max(0, h - terrainAt(x));
  const slope = (terrainAt(x + 2) - terrainAt(x - 2)) / 4;
  const cell = Math.floor(x / RUNWAY_SPACING);
  const leeCenter = cell * RUNWAY_SPACING + 990 + Math.sign(wind.x || 1) * 230;
  const lee = -Math.min(3, Math.abs(wind.x) * .65) * Math.exp(-(((x - leeCenter) / 115) ** 2));
  return (wind.x * slope * 3.3 + lee) * Math.exp(-agl / 240);
}
function ensureThermals() {
  const index = Math.floor(distance / RUNWAY_SPACING);
  for (let i = index - 1; i <= index + 1; i++) for (const offset of [720, 1210]) {
    if (Math.abs(i * RUNWAY_SPACING + offset - distance) < 1000) thermalCore(i, offset);
  }
}
function thermalCore(index, offset) {
  const id = `${index}:${offset}`;
  if (!thermals.has(id)) {
    const variation = (Math.sin(index * 71.7 + offset * .17) + 1) / 2;
    thermals.set(id, { x: index * RUNWAY_SPACING + offset, z: Math.sin(index * 1.3 + offset) * 35,
      born: t - 8, lifetime: 75 + variation * 35, ceiling: 640 + variation * 260,
      radius: 150 + variation * 40, strength: 7 + variation * 2 });
  }
  return thermals.get(id);
}
function thermalLife(core, time = t) {
  const age = time - core.born;
  return smooth(age / 8) * smooth((core.lifetime - age) / 15);
}
function airAt(x, h, z = crossTrack) {
  const wind = windAt(x, h);
  const ridge = ridgeLiftAt(x, h, wind);
  return { x: wind.x, z: wind.z, up: wind.up + ridge + thermalAt(x, z, h), ridge };
}
function formatTime(n) { return `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`; }
function runwayAt(x) {
  const index = Math.floor((x + 80) / RUNWAY_SPACING);
  const start = index * RUNWAY_SPACING - 80;
  return { start, end: start + RUNWAY_LENGTH, index };
}
function onRunway(x) { const r = runwayAt(x); return x >= r.start && x <= r.end; }
function thermalAt(x, z = crossTrack, h = height) {
  let lift = 0;
  for (const core of thermals.values()) {
    const d = Math.hypot(x - core.x, z - core.z);
    const verticalEnvelope = smooth((h - terrainAt(x)) / 12) * smooth((core.ceiling - h) / 90);
    if (d < core.radius) lift = Math.max(lift, core.strength * thermalLife(core) * verticalEnvelope * Math.pow(Math.cos(d / core.radius * Math.PI / 2), 1.3));
  }
  return lift;
}
function finish(safe) {
  mode = 'ended'; keys.clear(); height = terrainAt(distance);
  best = Math.max(best, elapsed);
  try { localStorage.setItem('thermik-best', best); } catch {}
  $('#endTitle').textContent = safe ? 'Sanft gelandet.' : 'Der Flug ist zu Ende.';
  $('#result').textContent = safe ? `Nach ${formatTime(elapsed)} auf dem Flugplatz gelandet. Sehr schön!` : landingMessage;
  $('#record').textContent = `Flugzeit ${formatTime(elapsed)} · Strecke ${(distance / 1000).toFixed(1)} km · Rekord ${formatTime(best)}`;
  $('#end').classList.remove('hidden');
}
function update(dt) {
  if (paused || mode === 'ended') return;
  t += dt;
  if (mode !== 'flying') return;
  elapsed += dt;
  ensureThermals();
  for (const core of thermals.values()) {
    if (thermalLife(core) <= 0) continue;
    const drift = windAt(core.x, 250);
    core.x += drift.x * dt * .7; core.z += drift.z * dt * .7;
  }
  const pull = keys.has('ArrowDown') || keys.has('KeyS');
  const push = keys.has('ArrowUp') || keys.has('KeyW');
  const elevator = Number(pull) - Number(push);
  const turning = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  const weather = airAt(distance, height);
  if (phase === 'glide' && (elevator || braking())) {
    speedHoldEnabled = false;
  }
  if (phase === 'glide') {
    // Only held input commands a turn. No latched bank, circling mode or route autopilot.
    const rollGust = .035 * Math.sin(t * 1.7 + distance * .014) + .025 * Math.sin(t * 2.9);
    let bankLimit = maximumBank();
    if (speedAssistActive()) {
      // Gain the necessary speed before steepening, rather than forcing a stall.
      const available = stalled ? 0 : Math.acos(Math.min(1, (aircraft.stall * 1.22 / Math.max(1, speed * 3.6)) ** 2));
      bankLimit = Math.min(bankLimit, available);
    }
    targetBank = clamp(turning * maximumBank() + rollGust, -bankLimit, bankLimit);
    bank += (targetBank - bank) * (1 - Math.exp(-dt * aircraft.roll * controlAuthority()));
    // World z points away from the observer. Positive heading is a left turn;
    // positive bank lowers the pilot's right wing and turns clockwise in the map.
    heading = wrapAngle(heading - G * Math.tan(bank) / Math.max(aircraft.stall / 3.6, Math.abs(airVX)) * dt);
  }
  if (phase === 'rollout') {
    vertical = 0; pitch *= Math.exp(-dt * 3); speed = Math.max(0, speed - dt * 6);
    airVX = speed; airVY = 0; distance += airVX * dt;
    if (speed <= 0) finish(true);
    else if (!onRunway(distance)) { landingMessage = 'Die Landebahn war zu kurz. Setze beim nächsten Mal früher auf.'; finish(false); }
  } else {
    const towing = phase === 'winch';
    if (towing) phaseTime += dt;
    // Integrate air-relative momentum. Lift acts perpendicular to the airflow,
    // gravity always points down, including during inverted flight.
    if (windReady) {
      // Preserve ground momentum across wind shear; airspeed and angle of attack respond.
      airVX -= (weather.x - localWind.x) * Math.cos(heading) + (weather.z - localWind.z) * Math.sin(heading);
      airVY -= weather.up - localWind.up;
    }
    localWind = weather; windReady = true;
    speed = Math.hypot(airVX, airVY);
    const flightAngle = Math.atan2(airVY, airVX);
    const authority = controlAuthority();
    const aero = aeroProfile();
    let commandedRate;
    if (elevator) commandedRate = elevator * (towing ? Math.min(.35, aircraft.elevator) : aircraft.elevator) * authority;
    else if (towing) {
      const launchTrim = Math.min(.72, flightAngle + (height < 2 ? .10 : .08));
      commandedRate = wrapAngle(launchTrim - pitch) * 2.5;
    } else if (speedAssistActive()) {
      commandedRate = speedAssistRate(flightAngle, aero);
    } else {
      const trim = (G * Math.cos(flightAngle) / Math.max(2, aero.liftFactor * speed * speed * Math.cos(bank)) - .38) / 4.7;
      commandedRate = wrapAngle(flightAngle + clamp(trim, -.08, .26) - pitch) * .8;
    }
    commandedRate += .025 * Math.sin(t * 2.1 + distance * .013) + weather.ridge * .008;
    pitchRate += (commandedRate - pitchRate) * (1 - Math.exp(-dt * 4));
    angleOfAttack = wrapAngle(pitch - flightAngle);
    if (!stalled && (speed < stallSpeed() / 3.6 || Math.abs(angleOfAttack) > .32)) stalled = true;
    else if (stalled && speed > stallSpeed() / 3.6 * 1.12 && Math.abs(angleOfAttack) < .18) stalled = false;
    stallBlend += (Number(stalled) - stallBlend) * (1 - Math.exp(-dt * 5));
    pitchRate += wrapAngle(flightAngle - pitch) * stallBlend * dt * 2.5;
    pitch = wrapAngle(pitch + pitchRate * dt);
    if (aircraft.shape === 'canopy') pitch = Math.max(-.55, Math.min(.65, pitch));
    angleOfAttack = wrapAngle(pitch - flightAngle);
    airLift = weather.up;
    const v = Math.max(1, Math.hypot(airVX, airVY));
    const ux = airVX / v, uy = airVY / v;
    const maxCL = G / (aero.liftFactor * (aircraft.stall / 3.6) ** 2);
    const cl = Math.max(-maxCL, Math.min(maxCL, .38 + 4.7 * angleOfAttack)) * (1 - .92 * stallBlend);
    const lift = aero.liftFactor * v * v * cl * Math.cos(bank);
    overspeed = v * 3.6 > aircraft.maxSpeed;
    const drag = aero.liftFactor * v * v * (aero.cd0 + aero.induced * cl * cl + .025 * Math.sin(bank) ** 2 + stallBlend * .15 + (braking() ? aircraft.brake : 0) + (overspeed ? .08 : 0));
    airVX += (-drag * ux - lift * uy) * dt;
    airVY += (-G - drag * uy + lift * ux) * dt;
    if (towing) {
      const ropeX = 900 - distance;
      const ropeLength = Math.max(1, Math.hypot(ropeX, height));
      const towSpeed = aircraft.shape === 'canopy' ? 12 : Math.max(30, aircraft.bestSpeed / 3.6 * 1.35);
      const tension = Math.max(0, (towSpeed - v) * 3 + .0009 * v * v);
      airVX += tension * ropeX / ropeLength * dt;
      airVY -= tension * (height - terrainAt(900)) / ropeLength * dt;
    }
    speed = Math.hypot(airVX, airVY);
    vertical = airVY + weather.up;
    height += vertical * dt;
    distance += (airVX * Math.cos(heading) + weather.x) * dt;
    crossTrack += (airVX * Math.sin(heading) + weather.z) * dt;
    if (height - terrainAt(distance) > 2) hasLifted = true;
    if (towing && (height >= 250 || distance >= 770 || phaseTime >= 24)) release();
    const groundHeight = terrainAt(distance);
    if (height <= groundHeight && towing && !hasLifted && distance < 340 && pitch > -.15) {
      height = 0; airVY = 0; vertical = 0; stalled = false;
    } else if (height <= groundHeight) {
      const runwayContact = onRunway(distance) && Math.abs(crossTrack) < 28;
      const safe = runwayContact && vertical >= -3 && !stalled && Math.abs(bank) < .2 && Math.cos(heading) > .85 && airVX > 0 && speed >= aircraft.stall / 3.6 && speed <= aircraft.stall / 3.6 * 1.75 && pitch > -.12 && pitch < .22;
      height = groundHeight;
      if (safe) { phase = 'rollout'; vertical = 0; }
      else {
        landingMessage = !runwayContact ? 'Außenlandung im Feld. Suche beim nächsten Mal eine markierte Landebahn.' : `Zu hart oder zu schnell aufgesetzt. Ziel: ${aircraft.stall}–${Math.round(aircraft.stall * 1.75)} km/h, unter 3 m/s Sinken und eine fast waagerechte Nase.`;
        finish(false);
      }
    }
  }
  // The aircraft moves first; the camera catches up over several seconds.
  // One world transform keeps aircraft, runways and scenery in sync.
  cameraSpeed += ((phase === 'rollout' ? speed : airVX * Math.cos(heading) + localWind.x) - cameraSpeed) * (1 - Math.exp(-dt / 1.6));
  cameraDistance += cameraSpeed * dt;
  const scale = worldScale();
  const offset = Math.max(-W * .16 / scale, Math.min(W * .34 / scale, distance - cameraDistance));
  cameraDistance = distance - offset;
  trailClock += dt;
  if (trailClock > .25) { trail.push({ x: distance, z: crossTrack }); if (trail.length > 120) trail.shift(); trailClock = 0; }
}
function instruments() {
  $('#altitude').innerHTML = `${Math.round(Math.max(0, height - terrainAt(distance)))} <small>m</small>`;
  $('#heightBar').style.width = `${Math.min(100, height / 10)}%`;
  $('#speed').textContent = `${Math.round(speed * 3.6)}`;
  $('#pitch').textContent = `Nase ${Math.round(pitch * 180 / Math.PI)}° · α ${Math.round(angleOfAttack * 180 / Math.PI)}°`;
  $('#time').textContent = formatTime(elapsed);
  $('#vario').textContent = `${vertical >= 0 ? '+' : '−'}${Math.abs(vertical).toFixed(1)}`;
  $('#speedDial').setAttribute('aria-label', `Fahrt ${Math.round(speed * 3.6)}, Abriss ${Math.round(stallSpeed())}, Sollfahrt ${Math.round(targetSpeed())} Kilometer pro Stunde`);
  $('#stallGuide').textContent = `▲ Abriss ${Math.round(stallSpeed())}`;
  $('#targetGuide').textContent = `◆ Soll ${Math.round(targetSpeed())} km/h`;
  if (mode !== 'intro') $('#speedAssist').checked = speedHoldEnabled;
  $('#autopilot').setAttribute('aria-pressed', String(speedHoldEnabled));
  $('#autopilot').disabled = mode !== 'flying' || paused || phase === 'rollout';
  $('#autopilot').textContent = speedHoldEnabled ? 'Fahrt-Auto: Ein' : 'Fahrt-Auto · F';
  $('#varioDial').setAttribute('aria-label', `Variometer: ${vertical.toFixed(1)} Meter pro Sekunde`);
  let status = vertical > .5 ? 'Fahrt wird zu Höhe' : 'Ruhig gleiten';
  if (phase === 'winch') status = height < 10 ? 'Winde zieht an …' : 'Winde · ↓ ziehen / ↑ drücken';
  else if (phase === 'rollout') status = 'Landung · Ausrollen';
  else if (stalled) status = 'Strömungsabriss! Nase runter ↑';
  else if (overspeed) status = 'Zu schnell! Vorsichtig abbremsen';
  else if (braking()) status = 'Luftbremse ausgefahren';
  else if (speedAssistActive()) status = `Fahrt-Auto · ${Math.round(targetSpeed())} km/h halten · Kurven selbst steuern`;
  else if (speed * 3.6 < stallSpeed() * 1.15) status = 'Wenig Fahrtreserve · drücken oder Kurve öffnen';
  else if (thermalMode === 'easy' && airLift < -1) status = 'Abwind · Fahrt halten';
  else if (thermalMode === 'easy' && airLift > 1) status = 'Aufwind · manuell zentrieren';
  else if (height < 70) status = onRunway(distance) ? 'Landebahn unter dir' : 'Flugplatz suchen';
  $('#status').textContent = status;
  const r = runwayAt(distance);
  const next = distance <= r.end ? Math.max(0, r.start - distance) : r.start + RUNWAY_SPACING - distance;
  $('#bottomHint').textContent = paused ? 'Pause · P zum Weiterfliegen' : phase === 'winch' ? `${aircraft.name} · Winde: ↓ ziehen / ↑ drücken · R: ausklinken · Space: Luftbremse` : `${aircraft.name} · Landebahn: ${Math.round(next)} m · Space: Luftbremse · ${thermalMode === 'easy' ? 'Sichtbare Bärte' : 'Wolken, Hang und Vario beobachten'}`;
  $('#wind').textContent = `Wind ${Math.round(Math.hypot(localWind.x, localWind.z) * 3.6)} km/h · ${localWind.x >= 0 ? '→' : '←'}`;
  $('#thermalNote').textContent = stalled ? 'Strömungsabriss · Nase senken, Fahrt aufnehmen' : airLift < -1 ? 'Abwind! Lee verlassen und Fahrt halten' : 'Aufwind · mit ← / → gegensteuern und rechtzeitig wenden';
  $('#release').hidden = mode !== 'flying' || phase !== 'winch';
  $('#thermalNote').style.opacity = mode === 'flying' && phase === 'glide' && ((thermalMode === 'easy' && Math.abs(airLift) > 1) || stalled) ? 1 : 0;
  $('#brake').setAttribute('aria-pressed', String(braking()));
  $('#brake').classList[braking() ? 'add' : 'remove']('held');
  $('#bankReading').textContent = `${Math.abs(Math.round(bank * 180 / Math.PI))}° ${bank < -.02 ? 'links' : bank > .02 ? 'rechts' : 'gerade'}`;
}
function renderState(alpha = 1) {
  const current = { height, distance, cameraDistance, pitch, heading, bank, crossTrack, speed, vertical };
  if (!previous || alpha >= 1) return current;
  for (const key of ['height', 'distance', 'cameraDistance', 'crossTrack', 'speed', 'vertical']) current[key] = previous[key] + (current[key] - previous[key]) * alpha;
  for (const key of ['pitch', 'heading', 'bank']) current[key] = previous[key] + wrapAngle(current[key] - previous[key]) * alpha;
  return current;
}
function touchLayout() {
  return W <= 700 || (H <= 500 && W <= 1100) || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
}
function view(alpha = 1) {
  const state = renderState(alpha);
  const mobile = touchLayout();
  const scale = worldScale(), base = mobile ? H - Math.max(110, H * .18) : H * .82;
  const h = mode === 'intro' ? 135 : state.height;
  // The aircraft keeps moving vertically, while the camera eases upward at altitude.
  // In portrait, keep the aircraft below the three dials and flight-data strip.
  // The compact landscape panel sits on the right, clear of the aircraft.
  const minPlaneY = H <= 500 ? 128 : Math.min(H * .68, 266 + (W - 56) / 3);
  const maxRise = mobile ? Math.max(0, Math.min(H * .57, base - minPlaneY)) : H * .57;
  const rise = maxRise * (1 - Math.exp(-h / 290));
  const ground = base + h * Math.min(1.1, W / 650) - rise;
  return { scale, ground, planeY: base - rise, planeX: mode === 'intro' ? W * .66 : W * .30 + (state.distance - state.cameraDistance) * scale, state };
}
function cloud(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#fffdf2';
  ctx.beginPath(); ctx.moveTo(-70, 12); ctx.bezierCurveTo(-95, 6, -78, -20, -52, -15);
  ctx.bezierCurveTo(-60, -49, -12, -58, 3, -28); ctx.bezierCurveTo(25, -49, 58, -31, 55, -12);
  ctx.bezierCurveTo(96, -10, 89, 17, 65, 17); ctx.closePath(); ctx.fill(); ctx.restore();
}
function aircraftScale(z = crossTrack) {
  // Observer stands 450 m in front of the flight path; positive z is farther away.
  return Math.max(.35, Math.min(1.6, 450 / Math.max(1, 450 + z)));
}
function hills(base, amp, color, drift) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, base + Math.sin(x / 270 + drift) * amp + Math.cos(x / 130 + drift) * amp * .3);
  ctx.lineTo(W, H); ctx.fill();
}
function draw(alpha = 1) {
  const v = view(alpha), { scale, ground, planeX, planeY, state } = v;
  const sx = x => planeX + (x - state.distance) * scale;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#b9dce3'); sky.addColorStop(.65, '#e9edcf'); sky.addColorStop(1, '#f4e8b7');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff7db'; ctx.beginPath(); ctx.arc(W * .76, H * .23, 32, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .6;
  for (let i = -1; i < 6; i++) cloud(((i * 310 - state.cameraDistance * .12) % (W + 450) + W + 450) % (W + 450) - 150, H * (.22 + (i % 2) * .1), .7);
  ctx.globalAlpha = 1;
  const cameraShift = ground - H * .82;
  hills(H * .69 + cameraShift * .12, 35, '#b1c09c', state.cameraDistance * .0003);
  hills(H * .78 + cameraShift * .3, 30, '#8fab83', 2 + state.cameraDistance * .0007);
  const verticalScale = Math.min(1.1, W / 650);
  const groundY = x => ground - terrainAt(x) * verticalScale;
  const worldLeft = state.distance - planeX / scale;
  ctx.fillStyle = '#86a469'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, groundY(worldLeft + x / scale));
  ctx.lineTo(W, H); ctx.fill();
  ctx.strokeStyle = '#648752'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, groundY(worldLeft + x / scale));
  ctx.stroke();
  for (let i = Math.floor((distance - planeX / scale) / 150) - 1; i < Math.ceil((distance + W / scale) / 150) + 1; i++) {
    if (onRunway(i * 150)) continue;
    const tx = sx(i * 150);
    ctx.fillStyle = '#516f48'; ctx.fillRect(tx - 2, groundY(i * 150) - 15, 4, 15);
    ctx.beginPath(); ctx.ellipse(tx, groundY(i * 150) - 24, 12, 19, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Runways recur in world space: no teleporting to a landing screen.
  const nearest = Math.floor(distance / RUNWAY_SPACING);
  for (let i = nearest - 1; i <= nearest + Math.ceil(W / scale / RUNWAY_SPACING) + 1; i++) {
    const a = sx(i * RUNWAY_SPACING - 80), b = sx(i * RUNWAY_SPACING - 80 + RUNWAY_LENGTH);
    if (b < -100 || a > W + 100) continue;
    ctx.fillStyle = '#bcc28d'; ctx.fillRect(a, ground - 2, b - a, 12);
    ctx.strokeStyle = '#fff5d5'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(a, ground + 4); ctx.lineTo(b, ground + 4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#4d6b57'; ctx.font = '10px sans-serif'; ctx.fillText(`FLUGPLATZ ${i + 1} · ${RUNWAY_LENGTH} m`, a + 12, ground + 27);
    ctx.fillStyle = '#f4e9ca'; ctx.fillRect(b - 50, ground - 27, 35, 25);
    ctx.fillStyle = '#7f8e76'; ctx.beginPath(); ctx.moveTo(b - 55, ground - 27); ctx.lineTo(b - 33, ground - 40); ctx.lineTo(b - 10, ground - 27); ctx.fill();
    ctx.strokeStyle = '#63755e'; ctx.beginPath(); ctx.moveTo(a + 40, ground); ctx.lineTo(a + 40, ground - 45); ctx.stroke();
    ctx.fillStyle = '#d89161'; ctx.beginPath(); ctx.moveTo(a + 40, ground - 45); ctx.lineTo(a + 67, ground - 41); ctx.lineTo(a + 40, ground - 35); ctx.fill();
  }
  for (const core of thermals.values()) {
    const life = thermalLife(core);
    if (life <= 0) continue;
    const cx = sx(core.x), r = core.radius * scale;
    if (cx + r < 0 || cx - r > W) continue;
    ctx.globalAlpha = life * Math.max(.12, 1 - Math.abs(crossTrack - core.z) / 230);
    const top = Math.max(0, ground - core.ceiling * verticalScale);
    const bottom = groundY(core.x);
    // Clouds grow over active sources and fade with them. No exact core marker in advanced mode.
    cloud(cx, Math.max(60, top - 12), .55 + life * .45);
    if (thermalMode === 'advanced') {
      ctx.fillStyle = '#d2b06a55'; ctx.fillRect(cx - r * .8, bottom, r * 1.6, 12);
      continue;
    }
    const glow = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    glow.addColorStop(0, '#e7be4900'); glow.addColorStop(.5, '#e7be4925'); glow.addColorStop(1, '#e7be4900');
    ctx.fillStyle = glow; ctx.fillRect(cx - r, top, r * 2, Math.max(0, bottom - top));
    ctx.strokeStyle = '#b88f4260'; ctx.lineWidth = 1;
    for (let j = 0; j < 7; j++) {
      const y = bottom - ((t * 30 + j * core.ceiling / 7) % core.ceiling) * verticalScale;
      if (y < top || y > H) continue;
      ctx.beginPath(); ctx.ellipse(cx + Math.sin(t + j) * 7, y, r * .5, 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#a48139'; ctx.font = '10px sans-serif';
    ctx.fillText(`THERMIK · ${Math.max(0, Math.ceil(core.lifetime - (t - core.born)))} s`, cx - 45, Math.max(210, top + 22));
  }
  ctx.globalAlpha = 1;
  for (let i = nearest - 1; i <= nearest + Math.ceil(W / scale / RUNWAY_SPACING) + 1; i++) {
    for (const offset of [870, 1150]) {
      const wx = i * RUNWAY_SPACING + offset, px = sx(wx);
      const lift = ridgeLiftAt(wx, terrainAt(wx) + 30, windAt(wx, 100));
      if (Math.abs(lift) < .8 || px < -100 || px > W + 100) continue;
      if (thermalMode === 'advanced') {
        // A warm windward slope and shaded lee hint at terrain lift without revealing the field.
        ctx.fillStyle = lift > 0 ? '#e4cf8d66' : '#385c6d35';
        ctx.beginPath(); ctx.ellipse(px, groundY(wx) + 4, 75 * scale, 9, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.fillStyle = lift > 0 ? '#c3bd6570' : '#6a91aa45';
      ctx.fillRect(px - 65 * scale, groundY(wx) - 120, 130 * scale, 120);
      ctx.fillStyle = lift > 0 ? '#817c35' : '#4c7088'; ctx.font = '10px sans-serif';
      ctx.fillText(lift > 0 ? '↑ HANGAUFWIND' : '↓ LEE / ABWIND', px - 38, groundY(wx) - 128);
    }
  }
  ctx.globalAlpha = 1;
  if (mode === 'flying' && phase === 'winch') {
    ctx.strokeStyle = '#6d776777'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(planeX + 25, planeY); ctx.lineTo(sx(900), groundY(900)); ctx.stroke();
    ctx.fillStyle = '#526751'; ctx.fillRect(sx(900) - 10, groundY(900) - 10, 20, 10);
  }
  const airplaneScale = (W < 700 ? .7 : 1) * aircraftScale(state.crossTrack);
  plane(planeX, planeY - 5 * airplaneScale, mode === 'intro' ? .04 : state.pitch, airplaneScale, state.heading, state.bank);
  const horizonPitch = Math.asin(Math.sin(state.pitch));
  const horizonBank = state.bank + (Math.cos(state.pitch) < 0 ? Math.PI : 0);
  $('#horizonWorld').setAttribute('transform', `rotate(${-horizonBank * 180 / Math.PI}) translate(0 ${Math.max(-85, Math.min(85, horizonPitch * 65))})`);
  $('#speedNeedle').setAttribute('transform', `rotate(${speedNeedleAngle(state.speed * 3.6)})`);
  $('#varioNeedle').setAttribute('transform', `rotate(${varioNeedleAngle(state.vertical)})`);
  $('#turnStallMarker').setAttribute('transform', `rotate(${speedNeedleAngle(stallSpeed(state.bank))})`);
  $('#targetMarker').setAttribute('transform', `rotate(${speedNeedleAngle(targetSpeed(state.bank))})`);
  if (mode === 'flying' && phase === 'winch') {
    ctx.fillStyle = '#3b6356'; ctx.font = '11px sans-serif'; ctx.fillText('WINDENSTART', planeX - 45, planeY - 65);
  }
  if (mode === 'flying') drawRadar();
}
// Project a small mesh: roll, pitch and heading all change the silhouette.
function projectAircraft(point, angle, yaw, roll) {
  const [x, y, z] = point;
  // Local +y is the pilot's left wing. Right bank lifts it, in every heading.
  const ry = y * Math.cos(roll) - z * Math.sin(roll);
  const rz = y * Math.sin(roll) + z * Math.cos(roll);
  const px = x * Math.cos(angle) - rz * Math.sin(angle);
  const pz = x * Math.sin(angle) + rz * Math.cos(angle);
  const wx = px * Math.cos(yaw) - ry * Math.sin(yaw);
  const depth = px * Math.sin(yaw) + ry * Math.cos(yaw);
  const perspective = 650 / (650 + depth);
  return { x: (wx - depth * .16) * perspective, y: (-pz + depth * .24) * perspective, depth };
}
// Dimensions are in metres. +x is forward, +y is the pilot's left, +z is up.
// Ka 8 B: shoulder wing and conventional tail; the composite types have T-tails.
const AIRFRAMES = {
  classic: { nose: 2.45, tail: -4.55, width: .31, wingZ: .35, fin: 1.03, tailSpan: 1.25, tailZ: .10,
    wing: [[0,.55,-.83],[3.1,.51,-.81],[6.8,.15,-.57],[7.4,-.12,-.48],[7.5,-.3,-.4]],
    cockpit: [[.36,.12,.12],[.65,.30,.58],[1.2,.31,.67],[1.65,.27,.51],[2.03,.08,.12]] },
  twin: { nose: 3.05, tail: -5.30, width: .35, wingZ: .08, fin: 1.34, tailSpan: 1.35, tailZ: 1.34,
    wing: [[0,.56,-.94],[3.8,.33,-.80],[7.8,-.31,-.72],[8.42,-.50,-.65],[8.5,-.57,-.61]],
    cockpit: [[.0,.13,.15],[.25,.30,.43],[.85,.32,.53],[1.5,.33,.56],[2.05,.31,.49],[2.65,.08,.12]] },
  racer: { nose: 2.45, tail: -4.21, width: .29, wingZ: .04, fin: 1.18, tailSpan: 1.15, tailZ: 1.18,
    wing: [[0,.42,-.84],[3.1,.23,-.69],[6.9,-.18,-.48],[7.4,-.31,-.43],[7.5,-.37,-.40]],
    cockpit: [[.14,.10,.12],[.48,.27,.41],[1.15,.29,.47],[1.72,.24,.35],[2.05,.06,.1]] },
  winglet: { nose: 2.55, tail: -4.17, width: .28, wingZ: .04, fin: 1.22, tailSpan: 1.15, tailZ: 1.22,
    wing: [[0,.45,-.85],[3.25,.26,-.68],[6.9,-.15,-.46],[7.43,-.29,-.41],[7.5,-.34,-.39]],
    cockpit: [[.16,.10,.12],[.51,.26,.40],[1.2,.28,.45],[1.8,.23,.33],[2.15,.06,.1]] }
};
function aircraftMesh() {
  const faces = [];
  const face = (part, color, points) => faces.push({ part, color, points });
  const toPixels = () => faces.map(f => ({ ...f, points: f.points.map(p => p.map(v => v * 15)) }));
  if (aircraft.shape === 'canopy') {
    const rim = (v, row, underside = false) => {
      const z = 1.6 + Math.cos(v) * 1.65;
      const chord = 1.05 * (.55 + .45 * Math.cos(v));
      return [row * chord, Math.sin(v) * aircraft.span / 2, z + (row === 0 ? .16 : 0) - (underside ? .10 : 0)];
    };
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 20, b = a + Math.PI / 20;
      const color = i < 3 || i >= 17 ? '#285c73' : i % 5 === 0 ? '#f6eed5' : aircraft.color;
      for (const [front,back] of [[1,0],[0,-1]]) face('canopy',color,[rim(a,front),rim(b,front),rim(b,back),rim(a,back)]);
      face('canopy-bottom','#ead1a0',[rim(a,1,true),rim(a,-1,true),rim(b,-1,true),rim(b,1,true)]);
      face('cell-openings','#456273',[rim(a,1),rim(a,1,true),rim(b,1,true),rim(b,1)]);
    }
    face('harness','#293e4c',[[.1,-.17,-1.1],[.1,.17,-1.1],[-.52,.23,-1.87],[-.52,-.23,-1.87]]);
    face('pilot-legs','#3d5360',[[.03,-.12,-1.65],[.03,.12,-1.65],[.62,.12,-1.75],[.62,-.12,-1.75]]);
    return toPixels();
  }
  const g = AIRFRAMES[aircraft.shape], classic = aircraft.shape === 'classic';
  const white = classic ? '#f5edda' : '#fafaf4';
  const planformArea = g.wing.slice(1).reduce((sum, p, i) => sum + (p[0] - g.wing[i][0]) * (p[1] - p[2] + g.wing[i][1] - g.wing[i][2]), 0);
  const wingStations = g.wing.map(([y,le,te]) => {
    const quarter = le * .75 + te * .25, chord = (le - te) * aircraft.area / planformArea;
    return [y,quarter + chord * .25,quarter - chord * .75];
  });
  const stations = [
    [g.nose,0,0,-.02],[g.nose-.18,.12,.13,-.01],[g.nose-.65,g.width*.85,.26,0],
    [.8,g.width,.29,0],[0,g.width*.84,.26,0],[-1.1,.16,.17,.01],
    [g.tail+.9,.065,.085,.03],[g.tail,.035,.05,.04]
  ];
  const ring = (station, i) => {
    const [x,w,h,z] = station, angle = i * Math.PI / 4;
    return [x,Math.cos(angle)*w,z+Math.sin(angle)*h];
  };
  for (let j=0;j<stations.length-1;j++) for (let i=0;i<8;i++) {
    const paint = classic && j < 2 ? aircraft.color : i < 4 ? white : '#d4dcd7';
    face('fuselage',paint,[ring(stations[j],i),ring(stations[j],i+1),ring(stations[j+1],i+1),ring(stations[j+1],i)]);
  }
  // Actual planform, wing mounting height and modest dihedral distinguish the types.
  for (const side of [-1,1]) for (let i=0;i<wingStations.length-1;i++) {
    const [y1,le1,te1]=wingStations[i], [y2,le2,te2]=wingStations[i+1];
    const z1=g.wingZ+y1*.025, z2=g.wingZ+y2*.025;
    const top=[[le1,side*y1,z1],[le2,side*y2,z2],[te2,side*y2,z2],[te1,side*y1,z1]];
    face('wing',i===g.wing.length-2 ? aircraft.color : white,top);
    face('wing-bottom','#ced8d3',top.map(([x,y,z])=>[x,y,z-.06]).reverse());
    face('leading-edge','#e1e6de',[[le1,side*y1,z1],[le2,side*y2,z2],[le2,side*y2,z2-.06],[le1,side*y1,z1-.06]]);
    if (classic && i<3) for(let rib=y1+.4;rib<y2;rib+=.5) {
      const f=(rib-y1)/(y2-y1),le=le1+(le2-le1)*f,te=te1+(te2-te1)*f,z=g.wingZ+rib*.025+.008;
      face('fabric-rib','#dfd5bd',[[le,side*rib,z],[te,side*rib,z],[te,side*(rib+.012),z],[le,side*(rib+.012),z]]);
    }
  }
  const finX=g.tail+.12;
  const fin = classic ? [[g.tail+.95,0,.05],[g.tail+.71,0,.72],[g.tail+.37,0,1.03],[finX,0,1.0],[g.tail,0,.70],[g.tail,0,.06]] :
    [[g.tail+.97,0,.04],[g.tail+.64,0,g.fin-.06],[finX,0,g.fin],[g.tail,0,g.fin-.08],[g.tail,0,.03]];
  face('fin',aircraft.color,fin);
  for (const side of [-1,1]) face('tailplane',white,[[g.tail+.74,0,g.tailZ],[g.tail+.54,side*g.tailSpan*.75,g.tailZ],[g.tail+.35,side*g.tailSpan,g.tailZ],[g.tail+.07,side*g.tailSpan,g.tailZ],[g.tail+.02,0,g.tailZ]]);
  if (aircraft.shape === 'winglet') for (const side of [-1,1]) face('winglet',white,[[-.29,side*7.43,g.wingZ+.19],[-.41,side*7.60,.70],[-.62,side*7.60,.67],[-.39,side*7.50,g.wingZ+.19]]);
  // Rounded canopy; ASK 21 has two seats under two separately framed hoods.
  const glassRing = (station, i) => {
    const [x,w,h] = station,a=i*Math.PI/6;
    return [x,Math.cos(a)*w,.18+Math.sin(a)*h];
  };
  for (let j=0;j<g.cockpit.length-1;j++) for(let i=0;i<6;i++) {
    face('cockpit',i<3 ? '#789da9' : '#a6c2c6',[glassRing(g.cockpit[j],i),glassRing(g.cockpit[j+1],i),glassRing(g.cockpit[j+1],i+1),glassRing(g.cockpit[j],i+1)]);
  }
  for (const index of classic ? [0,4] : aircraft.shape==='twin' ? [0,3,5] : [0,4]) {
    const station=g.cockpit[index];
    for (let i=0;i<6;i++) {
      const a=glassRing(station,i),b=glassRing(station,i+1);
      face('canopy-frame',white,[a,b,[b[0]+.035,b[1],b[2]+.008],[a[0]+.035,a[1],a[2]+.008]]);
    }
  }
  // A small main wheel below the fuselage, and red spoiler plates when deployed.
  for (const side of [-1,1]) {
    const points=[];
    for(let i=0;i<12;i++){const a=i*Math.PI/6;points.push([-.15+Math.cos(a)*.18,side*.06,-.27+Math.sin(a)*.18]);}
    face('wheel','#303c3e',points);
    if (braking()) face('airbrake','#a94e3c',[[-.15,side*1.5,g.wingZ+.05],[-.15,side*3.2,g.wingZ+.1],[-.15,side*3.2,g.wingZ+.42],[-.15,side*1.5,g.wingZ+.37]]);
  }
  return toPixels();
}
function plane(x, y, angle, s, yaw = 0, roll = 0) {
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  const mesh = aircraftMesh().map(face => ({ ...face, points: face.points.map(p => projectAircraft(p,angle,yaw,roll)) }));
  mesh.sort((a,b) => b.points.reduce((n,p)=>n+p.depth,0)/b.points.length - a.points.reduce((n,p)=>n+p.depth,0)/a.points.length);
  for (const face of mesh) {
    ctx.fillStyle=face.color; ctx.strokeStyle='#647e77'; ctx.lineWidth=.55;
    ctx.beginPath(); face.points.forEach((p,i)=>i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.closePath(); ctx.fill();
    if (!['fuselage','cockpit','canopy-bottom','wheel'].includes(face.part)) ctx.stroke();
  }
  if (aircraft.shape === 'canopy') {
    ctx.strokeStyle='#4a666b88'; ctx.lineWidth=.7;
    for (const side of [-1,1]) for (const span of [.3,.6,.9]) {
      const a=projectAircraft([0,side*aircraft.span/2*span*15,(1.6+Math.sqrt(1-span*span)*1.65)*15],angle,yaw,roll);
      const b=projectAircraft([1,side*2,-17],angle,yaw,roll);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    const pilot=projectAircraft([2,0,-12],angle,yaw,roll);
    ctx.fillStyle='#34545d';ctx.beginPath();ctx.arc(pilot.x,pilot.y,4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawRadar() {
  const mobile = touchLayout();
  const compact = mobile && H <= 500;
  const size = compact ? 64 : mobile ? 108 : 160;
  const x = compact ? W - 276 - radarRight - size - 12 : mobile ? W - size - radarRight : 35;
  const y = compact ? H - size - 78 : mobile ? Math.max(320, H - size - radarBottom) : H - size - 75;
  const cx = x + size / 2, cy = y + size / 2, zoom = size / 650;
  ctx.save(); ctx.fillStyle = '#fffdf0f2'; ctx.fillRect(x, y, size, size);
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  for (const core of thermalMode === 'easy' ? thermals.values() : []) {
    const life = thermalLife(core); if (life <= 0) continue; ctx.globalAlpha = life;
    const px = cx + (core.x - distance) * zoom, py = cy - (core.z - crossTrack) * zoom;
    for (const [radius, color] of [[core.radius, '#e7be4920'], [100, '#d9ae3c45'], [35, '#bb8e3280']]) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, radius * zoom, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#916c23'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#527e6c80'; ctx.setLineDash([3, 4]); ctx.beginPath();
  ctx.moveTo(x, cy + crossTrack * zoom); ctx.lineTo(x + size, cy + crossTrack * zoom); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#315f4d99'; ctx.beginPath();
  for (let i = 0; i < trail.length; i++) {
    const px = cx + (trail[i].x - distance) * zoom, py = cy - (trail[i].z - crossTrack) * zoom;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = '#4c7088'; ctx.beginPath(); ctx.moveTo(x + 12, y + 12);
  ctx.lineTo(x + 12 + localWind.x * 4, y + 12 - localWind.z * 4); ctx.stroke();
  ctx.translate(cx, cy); ctx.rotate(-heading); ctx.fillStyle = '#234e46';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.fillStyle = '#385d4e'; ctx.font = mobile ? '8px sans-serif' : '9px sans-serif';
  ctx.fillText(thermalMode === 'advanced' ? 'FLUGSPUR · WIND' : `${compact ? 'LUFT' : 'THERMIKRADAR'} · ${airLift.toFixed(1)} m/s`, x, y - 9);
  ctx.fillText(compact ? '← / → Pilotensicht' : mobile ? '← / → Pilotensicht' : '← / → Pilotensicht · Wind beachten', x, y + size + (compact ? 11 : 15));
}
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, .1); last = now;
  accumulator += dt * GAME_TEMPO;
  while (accumulator >= STEP) {
    previous = renderState(); update(STEP); accumulator -= STEP;
  }
  draw(accumulator / STEP);
  hudClock += dt;
  if (hudClock >= .1) { instruments(); hudClock = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
