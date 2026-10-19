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
function aeroProfile() {
  const liftFactor = .02 * (aircraft.area / aircraft.mass) / (17.95 / 600);
  const optimalCL = G / (liftFactor * (aircraft.bestSpeed / 3.6) ** 2);
  return { liftFactor, cd0: optimalCL / (2 * aircraft.glide), induced: 1 / (2 * aircraft.glide * optimalCL) };
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
function release() {
  if (mode === 'flying' && !paused && phase === 'winch' && height > 12) {
    phase = 'glide';
  }
}
addEventListener('keydown', e => {
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target?.tagName) || (e.target?.tagName === 'BUTTON' && ['Space', 'Enter'].includes(e.code))) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat && ['KeyP', 'Escape', 'KeyR'].includes(e.code)) return;
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyR') release();
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
  if (phase === 'glide') {
    // Only held input commands a turn. No latched bank, circling mode or route autopilot.
    const rollGust = .035 * Math.sin(t * 1.7 + distance * .014) + .025 * Math.sin(t * 2.9);
    targetBank = turning * (aircraft.shape === 'canopy' ? .65 : .85) + rollGust;
    bank += (targetBank - bank) * (1 - Math.exp(-dt * aircraft.roll * controlAuthority()));
    heading = wrapAngle(heading + G * Math.tan(bank) / Math.max(aircraft.stall / 3.6, Math.abs(airVX)) * dt);
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
    } else {
      const trim = (G * Math.cos(flightAngle) / Math.max(2, aero.liftFactor * speed * speed * Math.cos(bank)) - .38) / 4.7;
      commandedRate = wrapAngle(flightAngle + Math.max(-.08, Math.min(.18, trim)) - pitch) * .8;
    }
    commandedRate += .025 * Math.sin(t * 2.1 + distance * .013) + weather.ridge * .008;
    pitchRate += (commandedRate - pitchRate) * (1 - Math.exp(-dt * 4));
    angleOfAttack = wrapAngle(pitch - flightAngle);
    if (!stalled && (speed < aircraft.stall / 3.6 || Math.abs(angleOfAttack) > .32)) stalled = true;
    else if (stalled && speed > aircraft.stall / 3.6 * 1.12 && Math.abs(angleOfAttack) < .18) stalled = false;
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
  $('#speed').innerHTML = `${Math.round(speed * 3.6)} <small>km/h</small>`;
  $('#pitch').textContent = `Nase ${Math.round(pitch * 180 / Math.PI)}° · α ${Math.round(angleOfAttack * 180 / Math.PI)}°`;
  $('#time').textContent = formatTime(elapsed);
  $('#vario').innerHTML = `${vertical >= 0 ? '+' : '−'}${Math.abs(vertical).toFixed(1)} <small>m/s</small>`;
  $('#vario').style.color = vertical > 0 ? '#9b792c' : '';
  let status = vertical > .5 ? 'Fahrt wird zu Höhe' : 'Ruhig gleiten';
  if (phase === 'winch') status = height < 10 ? 'Winde zieht an …' : 'Winde · ↓ ziehen / ↑ drücken';
  else if (phase === 'rollout') status = 'Landung · Ausrollen';
  else if (stalled) status = 'Strömungsabriss! Nase runter ↑';
  else if (overspeed) status = 'Zu schnell! Vorsichtig abbremsen';
  else if (braking()) status = 'Luftbremse ausgefahren';
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
  $('#bankReading').textContent = `${Math.round(bank * 180 / Math.PI)}° · Nase ${Math.round(pitch * 180 / Math.PI)}°`;
}
function renderState(alpha = 1) {
  const current = { height, distance, cameraDistance, pitch, heading, bank, crossTrack };
  if (!previous || alpha >= 1) return current;
  for (const key of ['height', 'distance', 'cameraDistance', 'crossTrack']) current[key] = previous[key] + (current[key] - previous[key]) * alpha;
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
  const maxRise = mobile ? Math.min(H * .57, base - (H <= 500 ? 128 : 190)) : H * .57;
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
  if (mode === 'flying' && phase === 'winch') {
    ctx.fillStyle = '#3b6356'; ctx.font = '11px sans-serif'; ctx.fillText('WINDENSTART', planeX - 45, planeY - 65);
  }
  if (mode === 'flying') drawRadar();
}
// Project a small mesh: roll, pitch and heading all change the silhouette.
function projectAircraft(point, angle, yaw, roll) {
  const [x, y, z] = point;
  const ry = y * Math.cos(roll) + z * Math.sin(roll);
  const rz = -y * Math.sin(roll) + z * Math.cos(roll);
  const px = x * Math.cos(angle) - rz * Math.sin(angle);
  const pz = x * Math.sin(angle) + rz * Math.cos(angle);
  const wx = px * Math.cos(yaw) - ry * Math.sin(yaw);
  const depth = px * Math.sin(yaw) + ry * Math.cos(yaw);
  const perspective = 650 / (650 + depth);
  return { x: (wx - depth * .16) * perspective, y: (-pz + depth * .24) * perspective, depth };
}
function aircraftMesh() {
  const span = aircraft.span * 5.5, classic = aircraft.shape === 'classic';
  if (aircraft.shape === 'canopy') {
    const faces = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 10, b = a + Math.PI / 10;
      const rim = (v, x) => [x, Math.sin(v) * span, 30 + Math.cos(v) * 27];
      faces.push({ points: [rim(a, 16), rim(b, 16), rim(b, -12), rim(a, -12)], color: i % 3 === 0 ? '#fff1cf' : aircraft.color });
    }
    faces.push({ points: [[4,-4,-12],[4,4,-12],[-12,5,-23],[-12,-5,-23]], color: '#344e5b' });
    return faces;
  }
  const length = aircraft.shape === 'twin' ? 1.15 : classic ? .92 : 1;
  const faces = [
    { points: [[-65,0,0],[-58,0,24],[-49,0,24],[-43,0,0]], color: aircraft.color },
    { points: [[-51,-23,3],[-58,-23,3],[-58,23,3],[-51,23,3],[-44,0,3]], color: '#e9e6d5' },
    { points: [[9,-3,4],[-3,-span,4],[-14,-span,4],[-11,0,4],[-14,span,4],[-3,span,4],[9,3,4]], color: classic ? '#f3dfaf' : '#fffdf2' },
    { points: [[60,0,1],[26,-5,7],[-5,-5,6],[-63,0,1],[-5,5,-5],[26,5,-4]], color: '#fffdf2' },
    { points: [[26,-4,7],[17,-4,16],[2,-4,15],[-3,-4,7],[-3,4,7],[17,4,16],[26,4,7]], color: '#88adb5' },
    { points: [[-7,-span,4],[-14,-span,4],[-12,-span*.7,4],[-5,-span*.7,4]], color: aircraft.color },
    { points: [[-7,span,4],[-14,span,4],[-12,span*.7,4],[-5,span*.7,4]], color: aircraft.color }
  ];
  if (aircraft.shape === 'winglet') for (const side of [-1,1]) faces.push({ points: [[-3,side*span,4],[-8,side*(span+3),19],[-14,side*span,4]], color: aircraft.color });
  if (braking()) for (const side of [-1,1]) faces.push({ points: [[-5,side*span*.2,4],[-5,side*span*.55,4],[-5,side*span*.55,12],[-5,side*span*.2,12]], color: '#b45340' });
  for (const face of faces) face.points = face.points.map(([x,y,z]) => [x*length,y,z]);
  return faces;
}
function plane(x, y, angle, s, yaw = 0, roll = 0) {
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  const mesh = aircraftMesh().map(face => ({ ...face, points: face.points.map(p => projectAircraft(p,angle,yaw,roll)) }));
  mesh.sort((a,b) => b.points.reduce((n,p)=>n+p.depth,0)/b.points.length - a.points.reduce((n,p)=>n+p.depth,0)/a.points.length);
  for (const face of mesh) {
    ctx.fillStyle=face.color; ctx.strokeStyle='#50746e'; ctx.lineWidth=.7;
    ctx.beginPath(); face.points.forEach((p,i)=>i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (aircraft.shape === 'canopy') {
    ctx.strokeStyle='#4a666b88'; ctx.lineWidth=.7;
    for (const side of [-1,1]) for (const span of [.35,.75]) {
      const a=projectAircraft([0,side*aircraft.span*5.5*span,44],angle,yaw,roll);
      const b=projectAircraft([0,0,-12],angle,yaw,roll);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    const pilot=projectAircraft([1,0,-9],angle,yaw,roll);
    ctx.fillStyle='#34545d';ctx.beginPath();ctx.arc(pilot.x,pilot.y,4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawRadar() {
  const mobile = touchLayout();
  const compact = mobile && H <= 500;
  const size = compact ? 82 : mobile ? 108 : 160;
  const x = mobile ? W - size - radarRight : 35;
  const y = mobile ? Math.max(compact ? 132 : 200, H - size - radarBottom) : H - size - 75;
  const cx = x + size / 2, cy = y + size / 2, zoom = size / 650;
  ctx.save(); ctx.fillStyle = '#fffdf0f2'; ctx.fillRect(x, y, size, size);
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  for (const core of thermalMode === 'easy' ? thermals.values() : []) {
    const life = thermalLife(core); if (life <= 0) continue; ctx.globalAlpha = life;
    const px = cx + (core.x - distance) * zoom, py = cy + (core.z - crossTrack) * zoom;
    for (const [radius, color] of [[core.radius, '#e7be4920'], [100, '#d9ae3c45'], [35, '#bb8e3280']]) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, radius * zoom, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#916c23'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#527e6c80'; ctx.setLineDash([3, 4]); ctx.beginPath();
  ctx.moveTo(x, cy - crossTrack * zoom); ctx.lineTo(x + size, cy - crossTrack * zoom); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = '#315f4d99'; ctx.beginPath();
  for (let i = 0; i < trail.length; i++) {
    const px = cx + (trail[i].x - distance) * zoom, py = cy + (trail[i].z - crossTrack) * zoom;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.strokeStyle = '#4c7088'; ctx.beginPath(); ctx.moveTo(x + 12, y + 12);
  ctx.lineTo(x + 12 + localWind.x * 4, y + 12 + localWind.z * 4); ctx.stroke();
  ctx.translate(cx, cy); ctx.rotate(heading); ctx.fillStyle = '#234e46';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.fillStyle = '#385d4e'; ctx.font = mobile ? '8px sans-serif' : '9px sans-serif';
  ctx.fillText(thermalMode === 'advanced' ? 'FLUGSPUR · WIND' : `${compact ? 'LUFT' : 'THERMIKRADAR'} · ${airLift.toFixed(1)} m/s`, x, y - 9);
  ctx.fillText(compact ? '← / → wenden' : mobile ? '← / → gegensteuern' : '← / → wenden · Wind beachten', x, y + size + 15);
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
