'use strict';
const $ = s => document.querySelector(s);
const canvas = $('#sky'), ctx = canvas.getContext('2d');
const keys = new Set();
const G = 9.81, RUNWAY_SPACING = 1700, RUNWAY_LENGTH = 440;
let W, H, mode = 'intro', paused = false, last = 0, t = 0;
let elapsed = 0, height = 0, distance = 0, speed = 0, pitch = 0, vertical = 0;
let screenX = .20;
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
  airLift = 0; stalled = false; screenX = .20; keys.clear();
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
    phase = 'glide'; pitch = -.04;
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
addEventListener('blur', () => { keys.clear(); if (mode === 'flying' && !paused) togglePause(); });
for (const [id, key] of [['left', 'ArrowDown'], ['right', 'ArrowUp']]) {
  const b = $('#' + id);
  b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); keys.add(key); };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => keys.delete(key);
}
function formatTime(n) { return `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`; }
function runwayAt(x) {
  const index = Math.floor((x + 80) / RUNWAY_SPACING);
  const start = index * RUNWAY_SPACING - 80;
  return { start, end: start + RUNWAY_LENGTH, index };
}
function onRunway(x) { const r = runwayAt(x); return x >= r.start && x <= r.end; }
function thermalAt(x) {
  // Broad, persistent lift columns separated by stretches of sinking air.
  const index = Math.floor(x / RUNWAY_SPACING);
  let lift = 0;
  for (let i = index - 1; i <= index + 1; i++) {
    for (const offset of [720, 1210]) {
      const d = Math.abs(x - (i * RUNWAY_SPACING + offset));
      if (d < 180) lift = Math.max(lift, 5.8 * Math.cos(d / 180 * Math.PI / 2));
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
  const pull = keys.has('ArrowDown') || keys.has('ArrowLeft') || keys.has('KeyS') || keys.has('KeyA');
  const push = keys.has('ArrowUp') || keys.has('ArrowRight') || keys.has('KeyW') || keys.has('KeyD');
  const elevator = Number(pull) - Number(push);
  if (phase === 'winch') {
    phaseTime += dt;
    speed = Math.min(29, speed + 7 * dt);
    pitch += ((speed > 19 ? .55 : 0) - pitch) * Math.min(1, dt * 2);
    vertical = speed > 19 ? 21 : 0;
    height += vertical * dt;
    distance += speed * Math.cos(pitch) * dt;
    if (height >= 230) release();
  } else if (phase === 'rollout') {
    vertical = 0; pitch *= Math.exp(-dt * 3); speed = Math.max(0, speed - dt * 6);
    distance += speed * dt;
    if (speed <= 0) finish(true);
    else if (!onRunway(distance)) { landingMessage = 'Die Landebahn war zu kurz. Setze beim nächsten Mal früher auf.'; finish(false); }
  } else {
    // Nose-up exchanges airspeed for height; nose-down restores airspeed.
    pitch = Math.max(-.48, Math.min(.48, pitch + elevator * dt * .42));
    speed = Math.max(7, Math.min(65, speed + (-G * Math.sin(pitch) - .00065 * speed * speed) * dt));
    stalled = speed < 16;
    if (stalled) pitch = Math.max(-.48, pitch - dt * .18);
    airLift = height > 8 ? thermalAt(distance) : 0;
    const stallSink = Math.max(0, 16 - speed) * 1.1;
    vertical = speed * Math.sin(pitch) - .7 - stallSink + airLift;
    height += vertical * dt;
    distance += speed * Math.cos(pitch) * dt;
    if (height <= 0) {
      const safe = onRunway(distance) && vertical >= -3 && speed >= 14 && speed <= 31 && pitch > -.12 && pitch < .22;
      height = 0;
      if (safe) { phase = 'rollout'; vertical = 0; }
      else {
        landingMessage = !onRunway(distance) ? 'Außenlandung im Feld. Suche beim nächsten Mal eine markierte Landebahn.' : 'Zu hart oder zu schnell aufgesetzt. Ziel: 55–110 km/h, unter 3 m/s Sinken und eine fast waagerechte Nase.';
        finish(false);
      }
    }
  }
  // Faster flight moves the aircraft right; the camera follows with a gentle lag.
  const targetX = .20 + .38 * Math.min(1, Math.max(0, speed / 50));
  screenX += (targetX - screenX) * (1 - Math.exp(-dt * 2));
  instruments();
}
function instruments() {
  $('#altitude').innerHTML = `${Math.round(height)} <small>m</small>`;
  $('#heightBar').style.width = `${Math.min(100, height / 10)}%`;
  $('#speed').innerHTML = `${Math.round(speed * 3.6)} <small>km/h</small>`;
  $('#pitch').textContent = `Nase ${pitch >= 0 ? '+' : '−'}${Math.round(Math.abs(pitch) * 180 / Math.PI)}°`;
  $('#time').textContent = formatTime(elapsed);
  $('#vario').innerHTML = `${vertical >= 0 ? '+' : '−'}${Math.abs(vertical).toFixed(1)} <small>m/s</small>`;
  $('#vario').style.color = vertical > 0 ? '#9b792c' : '';
  let status = vertical > .5 ? 'Fahrt wird zu Höhe' : 'Ruhig gleiten';
  if (phase === 'winch') status = height < 10 ? 'Winde zieht an …' : 'Windenstart · Leertaste löst';
  else if (phase === 'rollout') status = 'Landung · Ausrollen';
  else if (stalled) status = 'Zu langsam! Nase runter ↑';
  else if (airLift > 1) status = 'Thermik · langsam durchfliegen';
  else if (height < 70) status = onRunway(distance) ? 'Landebahn unter dir' : 'Flugplatz suchen';
  $('#status').textContent = status;
  const r = runwayAt(distance);
  const next = distance <= r.end ? Math.max(0, r.start - distance) : r.start + RUNWAY_SPACING - distance;
  $('#bottomHint').textContent = paused ? 'Pause · P zum Weiterfliegen' : phase === 'winch' ? 'Windenstart · Seil löst automatisch · Leertaste: früher lösen' : `Flug ${formatTime(elapsed)} · Landebahn: ${Math.round(next)} m · ↓ Ziehen · ↑ Drücken`;
  $('#thermalNote').textContent = stalled ? '⚠ Zu langsam — Nase senken und Fahrt aufnehmen ↑' : '↑ Thermik! Weniger Fahrt hält dich länger im Aufwind.';
  $('#thermalNote').style.opacity = mode === 'flying' && phase === 'glide' && (airLift > 1 || stalled) ? 1 : 0;
}
function view() {
  const scale = Math.min(1.1, W / 650), base = H * .82;
  const h = mode === 'intro' ? 135 : height;
  // The aircraft keeps moving vertically, while the camera eases upward at altitude.
  const rise = H * .57 * (1 - Math.exp(-h / 290));
  const ground = base + h * scale - rise;
  return { scale, ground, planeY: base - rise, planeX: W * (mode === 'intro' ? .66 : screenX) };
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
function draw() {
  const v = view(), { scale, ground, planeX, planeY } = v;
  const sx = x => planeX + (x - distance) * scale;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#b9dce3'); sky.addColorStop(.65, '#e9edcf'); sky.addColorStop(1, '#f4e8b7');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff7db'; ctx.beginPath(); ctx.arc(W * .76, H * .23, 32, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .6;
  for (let i = -1; i < 6; i++) cloud(((i * 310 - distance * .12) % (W + 450) + W + 450) % (W + 450) - 150, H * (.22 + (i % 2) * .1), .7);
  ctx.globalAlpha = 1;
  const cameraShift = ground - H * .82;
  hills(H * .69 + cameraShift * .12, 35, '#b1c09c', distance * .0003);
  hills(H * .78 + cameraShift * .3, 30, '#8fab83', 2 + distance * .0007);
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
      const cx = sx(i * RUNWAY_SPACING + offset), r = 180 * scale;
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
  if (mode === 'flying' && phase === 'winch') {
    ctx.strokeStyle = '#6d776777'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(planeX + 25, planeY); ctx.lineTo(sx(500), ground); ctx.stroke();
    ctx.fillStyle = '#526751'; ctx.fillRect(sx(500) - 10, ground - 10, 20, 10);
  }
  const airplaneScale = W < 700 ? .7 : 1;
  plane(planeX, planeY - 5 * airplaneScale, mode === 'intro' ? .04 : pitch, airplaneScale);
  if (mode === 'flying' && phase === 'winch') {
    ctx.fillStyle = '#3b6356'; ctx.font = '11px sans-serif'; ctx.fillText('WINDENSTART', planeX - 45, planeY - 65);
  }
}
function plane(x, y, angle, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-angle); ctx.scale(s, s);
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
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, .05); last = now;
  // Small fixed substeps keep launch, stalls and ground contact stable.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  for (let i = 0; i < steps; i++) update(dt / steps);
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
