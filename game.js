'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#sky'), ctx = canvas.getContext('2d');
const keys = new Set();
const G = 9.81, RUNWAY_SPACING = 1700, RUNWAY_LENGTH = 440;
const STEP = 1 / 120, GAME_TEMPO = 1.8;
let accumulator = 0, hudClock = 0, previous = null;
let heading = 0, bank = 0, targetBank = 0, crossTrack = 0, circling = false, hasLifted = false;
const worldScale = () => Math.min(2, Math.max(.8, W / 550));
let W, H, mode = 'intro', paused = false, last = 0, t = 0;
let elapsed = 0, height = 0, distance = 0, speed = 0, pitch = 0, vertical = 0;
let airVX = 0, airVY = 0, cameraDistance = 0, cameraSpeed = 0;
let angleOfAttack = 0;
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
let phase = 'winch', phaseTime = 0, airLift = 0, stalled = false, landingMessage = '';
let best = 0;
try { best = Number(localStorage.getItem('thermik-best')) || 0; } catch {}
function resize() {
  W = innerWidth; H = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize); resize();
function start() {
  mode = 'flying'; paused = false; phase = 'winch'; phaseTime = 0;
  elapsed = 0; height = 0; distance = 0; speed = 0; pitch = 0; vertical = 0;
  airLift = 0; stalled = false; airVX = 0; airVY = 0;
  cameraDistance = 0; cameraSpeed = 0; angleOfAttack = 0; keys.clear();
  heading = 0; bank = 0; targetBank = 0; crossTrack = 0; circling = false; hasLifted = false;
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
  if (e.repeat && ['KeyP', 'Escape', 'Space', 'KeyC'].includes(e.code)) return;
  keys.add(e.code);
  if (e.code === 'KeyC') toggleCircle();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'Space') { if (mode !== 'flying') start(); else release(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (mode === 'flying' && !paused) togglePause(); });
for (const [id, key] of [['left', 'ArrowDown'], ['right', 'ArrowUp'], ['bankLeft', 'ArrowLeft'], ['bankRight', 'ArrowRight']]) {
  const b = $('#' + id);
  b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); keys.add(key); };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => keys.delete(key);
}
function toggleCircle() {
  if (mode !== 'flying' || paused || phase !== 'glide') return;
  circling = !circling;
  targetBank = circling ? .65 : 0;
  instruments();
}
$('#circle').onclick = toggleCircle;
$('#release').onclick = release;
function thermalCore(index, offset) {
  return { x: index * RUNWAY_SPACING + offset + Math.sin(t * .035 + index) * 22,
    z: Math.sin(index * 1.3 + offset) * 35 + Math.sin(t * .025) * 15 };
}
function formatTime(n) { return `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`; }
function runwayAt(x) {
  const index = Math.floor((x + 80) / RUNWAY_SPACING);
  const start = index * RUNWAY_SPACING - 80;
  return { start, end: start + RUNWAY_LENGTH, index };
}
function onRunway(x) { const r = runwayAt(x); return x >= r.start && x <= r.end; }
function thermalAt(x, z = crossTrack) {
  const index = Math.floor(x / RUNWAY_SPACING);
  let lift = 0;
  for (let i = index - 1; i <= index + 1; i++) {
    for (const offset of [720, 1210]) {
      const core = thermalCore(i, offset);
      const d = Math.hypot(x - core.x, z - core.z);
      if (d < 190) lift = Math.max(lift, 8.5 * Math.pow(Math.cos(d / 190 * Math.PI / 2), 1.3));
    }
  }
  return lift;
}
function finish(safe) {
  mode = 'ended'; keys.clear(); height = 0;
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
  const pull = keys.has('ArrowDown') || keys.has('KeyS');
  const push = keys.has('ArrowUp') || keys.has('KeyW');
  const elevator = Number(pull) - Number(push);
  const turning = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  if (phase === 'glide') {
    if (!circling) {
      const routeHeading = Math.atan2(-crossTrack, 350);
      targetBank = Math.max(-.55, Math.min(.55, wrapAngle(routeHeading - heading) * 1.4));
    }
    if (turning) { targetBank = Math.max(-.9, Math.min(.9, targetBank + turning * dt * .65)); circling = true; }
    bank += (targetBank - bank) * (1 - Math.exp(-dt * 5));
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
    speed = Math.hypot(airVX, airVY);
    const flightAngle = Math.atan2(airVY, airVX);
    const authority = Math.min(1.8, speed / 30);
    if (elevator) pitch += elevator * (towing ? .35 : .45) * authority * dt;
    else if (towing) {
      const launchTrim = Math.min(.72, flightAngle + (height < 2 ? .10 : .08));
      pitch += wrapAngle(launchTrim - pitch) * dt * 2.5;
    } else {
      const trim = (G * Math.cos(flightAngle) / Math.max(2, .02 * speed * speed * Math.cos(bank)) - .38) / 4.7;
      pitch += wrapAngle(flightAngle + Math.max(-.08, Math.min(.18, trim)) - pitch) * dt * .8;
    }
    pitch = wrapAngle(pitch);
    angleOfAttack = wrapAngle(pitch - flightAngle);
    if (!stalled && (speed < 12 || Math.abs(angleOfAttack) > .32)) stalled = true;
    else if (stalled && speed > 18 && Math.abs(angleOfAttack) < .18) stalled = false;
    airLift = height > 8 ? thermalAt(distance) : 0;
    if (stalled) {
      // Lift collapses immediately; even a strong thermal cannot suspend a stall.
      airVY = Math.min(airVY, -4 - airLift);
      pitch += wrapAngle(Math.atan2(airVY, airVX) - pitch) * dt * 1.8;
      pitch = wrapAngle(pitch);
    }
    const v = Math.max(1, Math.hypot(airVX, airVY));
    const ux = airVX / v, uy = airVY / v;
    const cl = Math.max(-1.5, Math.min(1.5, .38 + 4.7 * angleOfAttack)) * (stalled ? .08 : 1);
    const lift = .02 * v * v * cl * Math.cos(bank);
    const drag = .02 * v * v * (.025 + .045 * cl * cl + .025 * Math.sin(bank) ** 2 + (stalled ? .15 : 0));
    airVX += (-drag * ux - lift * uy) * dt;
    airVY += (-G - drag * uy + lift * ux) * dt;
    if (towing) {
      const ropeX = 900 - distance;
      const ropeLength = Math.max(1, Math.hypot(ropeX, height));
      const tension = Math.max(0, (36 - v) * 3 + .0009 * v * v);
      airVX += tension * ropeX / ropeLength * dt;
      airVY -= tension * height / ropeLength * dt;
    }
    speed = Math.hypot(airVX, airVY);
    vertical = airVY + airLift;
    height += vertical * dt;
    distance += airVX * Math.cos(heading) * dt;
    crossTrack += airVX * Math.sin(heading) * dt;
    if (height > 2) hasLifted = true;
    if (towing && (height >= 250 || distance >= 770 || phaseTime >= 24)) release();
    if (height <= 0 && towing && !hasLifted && distance < 340 && pitch > -.15) {
      height = 0; airVY = 0; vertical = 0; stalled = false;
    } else if (height <= 0) {
      const runwayContact = onRunway(distance) && Math.abs(crossTrack) < 28;
      const safe = runwayContact && vertical >= -3 && !stalled && Math.abs(bank) < .2 && Math.cos(heading) > .85 && airVX > 0 && speed >= 14 && speed <= 31 && pitch > -.12 && pitch < .22;
      height = 0;
      if (safe) { phase = 'rollout'; vertical = 0; }
      else {
        landingMessage = !runwayContact ? 'Außenlandung im Feld. Suche beim nächsten Mal eine markierte Landebahn.' : 'Zu hart oder zu schnell aufgesetzt. Ziel: 55–110 km/h, unter 3 m/s Sinken und eine fast waagerechte Nase.';
        finish(false);
      }
    }
  }
  // The aircraft moves first; the camera catches up over several seconds.
  // One world transform keeps aircraft, runways and scenery in sync.
  cameraSpeed += (airVX * Math.cos(heading) - cameraSpeed) * (1 - Math.exp(-dt / 1.6));
  cameraDistance += cameraSpeed * dt;
  const scale = worldScale();
  const offset = Math.max(-W * .16 / scale, Math.min(W * .34 / scale, distance - cameraDistance));
  cameraDistance = distance - offset;
}
function instruments() {
  $('#altitude').innerHTML = `${Math.round(height)} <small>m</small>`;
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
  else if (circling) status = `Kurbeln · ${Math.round(Math.abs(bank) * 180 / Math.PI)}° Schräglage`;
  else if (airLift > 1) status = 'Thermik · C zum Einkurbeln';
  else if (height < 70) status = onRunway(distance) ? 'Landebahn unter dir' : 'Flugplatz suchen';
  $('#status').textContent = status;
  const r = runwayAt(distance);
  const next = distance <= r.end ? Math.max(0, r.start - distance) : r.start + RUNWAY_SPACING - distance;
  $('#bottomHint').textContent = paused ? 'Pause · P zum Weiterfliegen' : phase === 'winch' ? 'Winde: ↓ ziehen / ↑ drücken · Leertaste: ausklinken' : `Flug ${formatTime(elapsed)} · Landebahn: ${Math.round(next)} m · ↓ Ziehen · ↑ Drücken`;
  $('#thermalNote').textContent = stalled ? '⚠ Strömungsabriss — Nase senken und Fahrt aufnehmen ↑' : circling ? 'Kern im Radar halten · ← / → Kreis enger oder weiter' : '↑ Thermik gefunden! C drücken und mit ← / → zentrieren';
  $('#circle').disabled = mode !== 'flying' || phase !== 'glide';
  $('#circle').setAttribute('aria-pressed', String(circling));
  $('#circle').textContent = circling ? 'C · Kreis verlassen' : 'C · Einkurbeln';
  $('#release').hidden = mode !== 'flying' || phase !== 'winch';
  $('#thermalNote').style.opacity = mode === 'flying' && phase === 'glide' && (airLift > 1 || stalled || circling) ? 1 : 0;
}
function renderState(alpha = 1) {
  const current = { height, distance, cameraDistance, pitch, heading, bank };
  if (!previous || alpha >= 1) return current;
  for (const key of ['height', 'distance', 'cameraDistance']) current[key] = previous[key] + (current[key] - previous[key]) * alpha;
  for (const key of ['pitch', 'heading', 'bank']) current[key] = previous[key] + wrapAngle(current[key] - previous[key]) * alpha;
  return current;
}
function view(alpha = 1) {
  const state = renderState(alpha);
  const scale = worldScale(), base = H * .82;
  const h = mode === 'intro' ? 135 : state.height;
  // The aircraft keeps moving vertically, while the camera eases upward at altitude.
  const rise = H * .57 * (1 - Math.exp(-h / 290));
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
  ctx.fillStyle = '#86a469'; ctx.fillRect(0, ground, W, Math.max(0, H - ground));
  ctx.fillStyle = '#648752'; ctx.fillRect(0, ground, W, 4);
  for (let i = Math.floor((distance - planeX / scale) / 150) - 1; i < Math.ceil((distance + W / scale) / 150) + 1; i++) {
    if (onRunway(i * 150)) continue;
    const tx = sx(i * 150);
    ctx.fillStyle = '#516f48'; ctx.fillRect(tx - 2, ground - 15, 4, 15);
    ctx.beginPath(); ctx.ellipse(tx, ground - 24, 12, 19, 0, 0, Math.PI * 2); ctx.fill();
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
  for (let i = nearest - 1; i <= nearest + Math.ceil(W / scale / RUNWAY_SPACING) + 1; i++) {
    for (const offset of [720, 1210]) {
      const core = thermalCore(i, offset);
      const cx = sx(core.x), r = 190 * scale;
      ctx.globalAlpha = Math.max(.15, 1 - Math.abs(crossTrack - core.z) / 260);
      if (cx + r < 0 || cx - r > W) continue;
      const glow = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
      glow.addColorStop(0, '#e7be4900'); glow.addColorStop(.5, '#e7be4925'); glow.addColorStop(1, '#e7be4900');
      ctx.fillStyle = glow; ctx.fillRect(cx - r, H * .22, r * 2, Math.max(0, ground - H * .22));
      ctx.strokeStyle = '#b88f4260'; ctx.lineWidth = 1;
      for (let j = 0; j < 6; j++) {
        const y = ground - ((t * 32 + j * 90) % Math.max(400, ground));
        ctx.beginPath(); ctx.ellipse(cx + Math.sin(t + j) * 12, y, r * .5, 10, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#a48139'; ctx.font = '10px sans-serif'; ctx.fillText('↑ THERMIK', cx - 27, H * .27);
    }
  }
  ctx.globalAlpha = 1;
  if (mode === 'flying' && phase === 'winch') {
    ctx.strokeStyle = '#6d776777'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(planeX + 25, planeY); ctx.lineTo(sx(900), ground); ctx.stroke();
    ctx.fillStyle = '#526751'; ctx.fillRect(sx(900) - 10, ground - 10, 20, 10);
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
  const size = W < 700 ? 120 : 160;
  const x = W < 700 ? W - size - 18 : 35, y = H - size - (W < 700 ? 145 : 75);
  const cx = x + size / 2, cy = y + size / 2, zoom = size / 650;
  ctx.save(); ctx.fillStyle = '#fffdf0f2'; ctx.fillRect(x, y, size, size);
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  const index = Math.floor(distance / RUNWAY_SPACING);
  for (let i = index - 1; i <= index + 1; i++) for (const offset of [720, 1210]) {
    const core = thermalCore(i, offset);
    const px = cx + (core.x - distance) * zoom, py = cy + (core.z - crossTrack) * zoom;
    for (const [radius, color] of [[190, '#e7be4920'], [100, '#d9ae3c45'], [35, '#bb8e3280']]) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, radius * zoom, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#916c23'; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
  }
  if (Math.abs(bank) > .12 && !stalled) {
    const radius = Math.max(14, Math.abs(airVX)) ** 2 / (G * Math.tan(bank));
    const ox = cx - Math.sin(heading) * radius * zoom, oy = cy + Math.cos(heading) * radius * zoom;
    ctx.strokeStyle = '#527e6c88'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(ox, oy, Math.abs(radius) * zoom, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.translate(cx, cy); ctx.rotate(heading); ctx.fillStyle = '#234e46';
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.fillStyle = '#385d4e'; ctx.font = '9px sans-serif';
  ctx.fillText(`THERMIKRADAR · ${airLift.toFixed(1)} m/s`, x, y - 9);
  ctx.fillText(circling ? '← / → Radius · C geradeaus' : 'C einkurbeln · ← / → lenken', x, y + size + 15);
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
