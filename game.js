'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#sky'), ctx = canvas.getContext('2d');
const keys = new Set();
const G = 9.81, RUNWAY_SPACING = 1700, RUNWAY_LENGTH = 440;
const STEP = 1 / 120, GAME_TEMPO = 1.8;
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
  mode = 'flying'; paused = false; phase = 'winch'; phaseTime = 0;
  elapsed = 0; height = 0; distance = 0; speed = 0; pitch = 0; vertical = 0;
  airLift = 0; stalled = false; airVX = 0; airVY = 0;
  cameraDistance = 0; cameraSpeed = 0; angleOfAttack = 0; keys.clear();
  heading = 0; bank = 0; targetBank = 0; crossTrack = 0; hasLifted = false;
  pitchRate = 0; stallBlend = 0; windReady = false;
  localWind = { x: 0, z: 0, up: 0 }; thermals.clear(); trail.length = 0; trailClock = 0;
  ensureThermals();
  previous = null; accumulator = 0; hudClock = 0;
  $('#end').classList.add('hidden'); document.body.classList.add('playing');
  $('#pause').textContent = 'Pause'; $('#pause').setAttribute('aria-label', 'Spiel pausieren');
  instruments();
}
$('#start').onclick = start; $('#restart').onclick = start;
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
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat && ['KeyP', 'Escape', 'Space'].includes(e.code)) return;
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'Space') { if (mode !== 'flying') start(); else release(); }
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
for (const [id, key] of [['left', 'ArrowDown'], ['right', 'ArrowUp'], ['bankLeft', 'ArrowLeft'], ['bankRight', 'ArrowRight']]) {
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
$('#release').onclick = release;
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
    targetBank = turning * .85 + rollGust;
    bank += (targetBank - bank) * (1 - Math.exp(-dt * 3.5));
    heading = wrapAngle(heading + G * Math.tan(bank) / Math.max(14, Math.abs(airVX)) * dt);
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
    const authority = Math.min(1.8, speed / 30);
    let commandedRate;
    if (elevator) commandedRate = elevator * (towing ? .35 : .45) * authority;
    else if (towing) {
      const launchTrim = Math.min(.72, flightAngle + (height < 2 ? .10 : .08));
      commandedRate = wrapAngle(launchTrim - pitch) * 2.5;
    } else {
      const trim = (G * Math.cos(flightAngle) / Math.max(2, .02 * speed * speed * Math.cos(bank)) - .38) / 4.7;
      commandedRate = wrapAngle(flightAngle + Math.max(-.08, Math.min(.18, trim)) - pitch) * .8;
    }
    commandedRate += .025 * Math.sin(t * 2.1 + distance * .013) + weather.ridge * .008;
    pitchRate += (commandedRate - pitchRate) * (1 - Math.exp(-dt * 4));
    angleOfAttack = wrapAngle(pitch - flightAngle);
    if (!stalled && (speed < 12 || Math.abs(angleOfAttack) > .32)) stalled = true;
    else if (stalled && speed > 18 && Math.abs(angleOfAttack) < .18) stalled = false;
    stallBlend += (Number(stalled) - stallBlend) * (1 - Math.exp(-dt * 5));
    pitchRate += wrapAngle(flightAngle - pitch) * stallBlend * dt * 2.5;
    pitch = wrapAngle(pitch + pitchRate * dt);
    angleOfAttack = wrapAngle(pitch - flightAngle);
    airLift = weather.up;
    const v = Math.max(1, Math.hypot(airVX, airVY));
    const ux = airVX / v, uy = airVY / v;
    const cl = Math.max(-1.5, Math.min(1.5, .38 + 4.7 * angleOfAttack)) * (1 - .92 * stallBlend);
    const lift = .02 * v * v * cl * Math.cos(bank);
    const drag = .02 * v * v * (.025 + .045 * cl * cl + .025 * Math.sin(bank) ** 2 + stallBlend * .15);
    airVX += (-drag * ux - lift * uy) * dt;
    airVY += (-G - drag * uy + lift * ux) * dt;
    if (towing) {
      const ropeX = 900 - distance;
      const ropeLength = Math.max(1, Math.hypot(ropeX, height));
      const tension = Math.max(0, (36 - v) * 3 + .0009 * v * v);
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
      const safe = runwayContact && vertical >= -3 && !stalled && Math.abs(bank) < .2 && Math.cos(heading) > .85 && airVX > 0 && speed >= 14 && speed <= 31 && pitch > -.12 && pitch < .22;
      height = groundHeight;
      if (safe) { phase = 'rollout'; vertical = 0; }
      else {
        landingMessage = !runwayContact ? 'Außenlandung im Feld. Suche beim nächsten Mal eine markierte Landebahn.' : 'Zu hart oder zu schnell aufgesetzt. Ziel: 55–110 km/h, unter 3 m/s Sinken und eine fast waagerechte Nase.';
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
  else if (airLift < -1) status = 'Abwind · Fahrt halten';
  else if (airLift > 1) status = 'Aufwind · manuell zentrieren';
  else if (height < 70) status = onRunway(distance) ? 'Landebahn unter dir' : 'Flugplatz suchen';
  $('#status').textContent = status;
  const r = runwayAt(distance);
  const next = distance <= r.end ? Math.max(0, r.start - distance) : r.start + RUNWAY_SPACING - distance;
  $('#bottomHint').textContent = paused ? 'Pause · P zum Weiterfliegen' : phase === 'winch' ? 'Winde: ↓ ziehen / ↑ drücken · Leertaste: ausklinken' : `Flug ${formatTime(elapsed)} · Landebahn: ${Math.round(next)} m · ↓ Ziehen · ↑ Drücken`;
  $('#wind').textContent = `Wind ${Math.round(Math.hypot(localWind.x, localWind.z) * 3.6)} km/h · ${localWind.x >= 0 ? '→' : '←'}`;
  $('#thermalNote').textContent = stalled ? 'Strömungsabriss · Nase senken, Fahrt aufnehmen' : airLift < -1 ? 'Abwind! Lee verlassen und Fahrt halten' : 'Aufwind · mit ← / → gegensteuern und rechtzeitig wenden';
  $('#release').hidden = mode !== 'flying' || phase !== 'winch';
  $('#thermalNote').style.opacity = mode === 'flying' && phase === 'glide' && (Math.abs(airLift) > 1 || stalled) ? 1 : 0;
}
function renderState(alpha = 1) {
  const current = { height, distance, cameraDistance, pitch, heading, bank };
  if (!previous || alpha >= 1) return current;
  for (const key of ['height', 'distance', 'cameraDistance']) current[key] = previous[key] + (current[key] - previous[key]) * alpha;
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
  const airplaneScale = W < 700 ? .7 : 1;
  plane(planeX, planeY - 5 * airplaneScale, mode === 'intro' ? .04 : state.pitch, airplaneScale, state.heading, state.bank);
  if (mode === 'flying' && phase === 'winch') {
    ctx.fillStyle = '#3b6356'; ctx.font = '11px sans-serif'; ctx.fillText('WINDENSTART', planeX - 45, planeY - 65);
  }
  if (mode === 'flying') drawRadar();
}
function plane(x, y, angle, s, yaw = 0, roll = 0) {
  ctx.save(); ctx.translate(x, y); const facing = Math.cos(yaw);
  ctx.scale(s * (facing < 0 ? -1 : 1) * Math.max(.28, Math.abs(facing)), s); ctx.rotate(-angle);
  ctx.globalAlpha = .85 + .15 * Math.abs(Math.cos(roll));
  ctx.fillStyle = '#fffdf2'; ctx.strokeStyle = '#6e8982'; ctx.lineWidth = 1;
  // Side silhouette: pointed nose, canopy, long fuselage, vertical tail and wheel.
  ctx.beginPath(); ctx.moveTo(60, 1); ctx.quadraticCurveTo(58, -5, 25, -7);
  ctx.quadraticCurveTo(11, -22, -5, -7); ctx.lineTo(-46, -3); ctx.lineTo(-58, -19);
  ctx.lineTo(-65, -19); ctx.lineTo(-61, 3); ctx.lineTo(-12, 6);
  ctx.quadraticCurveTo(27, 10, 60, 1); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#91b5b7'; ctx.beginPath(); ctx.moveTo(1, -8); ctx.quadraticCurveTo(13, -20, 25, -7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eae8cf'; ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(-33, 12); ctx.lineTo(-48, 11); ctx.lineTo(-4, -3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#b28a44'; ctx.beginPath(); ctx.moveTo(-64, 0); ctx.lineTo(-39, 0); ctx.stroke();
  ctx.fillStyle = '#43534c'; ctx.beginPath(); ctx.arc(0, 7, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
  for (const core of thermals.values()) {
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
  ctx.fillText(`${compact ? 'LUFT' : 'THERMIKRADAR'} · ${airLift.toFixed(1)} m/s`, x, y - 9);
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
