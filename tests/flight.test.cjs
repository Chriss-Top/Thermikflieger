// Run with: node --test tests/flight.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function game() {
  const elements = new Map();
  const noop = () => {};
  const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop: noop }) }, {
    get: (o, k) => o[k] || noop, set: (o, k, v) => (o[k] = v, true)
  });
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      style: {}, classList: { add: noop, remove: noop }, getContext: () => ctx,
      setAttribute: noop, setPointerCapture: noop, textContent: ''
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    document: { querySelector: element, body: { classList: { add: noop } } },
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    addEventListener: noop, requestAnimationFrame: noop,
    localStorage: { getItem: () => 0, setItem: noop }, assert
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), context);
  vm.runInContext(`
    function advance(seconds) { for (let i=0;i<seconds*120;i++) update(1/120); }
    function setup(v=25, h=500, angle=-.04) {
      start(); phase='glide'; height=h; pitch=angle; speed=v;
      airVX=v*Math.cos(angle); airVY=v*Math.sin(angle);
      distance=400; cameraDistance=distance; cameraSpeed=airVX;
    }
  `, context);
  return code => vm.runInContext(code, context);
}
test('winch launch, release, neutral glide, and thermal lift', () => game()(`
  start(); advance(15); assert.equal(phase,'glide'); assert.ok(height>200);
  assert.ok(speed>20 && !stalled);
  setup(); const initial=height; advance(1); assert.ok(height<initial);
  setup(); distance=720; advance(.1); assert.ok(vertical>0);
`));
test('aircraft responds first, background catches up, and deceleration moves left', () => game()(`
  setup(); const startX=view().planeX, initialCameraSpeed=cameraSpeed;
  airVX=45; airVY=-1; advance(.5);
  assert.ok(view().planeX>startX+5);
  assert.ok(cameraSpeed>initialCameraSpeed && cameraSpeed<airVX);
  const slowScroll=cameraSpeed; advance(3); assert.ok(cameraSpeed>slowScroll);
  const fastX=view().planeX; airVX=18; airVY=-1; pitch=0; advance(.5);
  assert.ok(view().planeX<fastX-5);
  W=390; assert.ok(view().planeX>=W*.14 && view().planeX<=W*.64);
`));
test('stall immediately loses height even in thermals, then can recover', () => game()(`
  setup(8,500,.5); distance=720; const h=height; advance(.1);
  assert.ok(stalled); assert.ok(vertical<-3); assert.ok(height<h);
  const stalledY=view().planeY; advance(.2); assert.ok(view().planeY>stalledY);
  keys.add('ArrowUp'); advance(1); keys.clear(); advance(5);
  assert.ok(!stalled); assert.ok(speed>18); assert.equal(mode,'flying');
`));
test('enough entry energy permits an actual full loop without a stall', () => game()(`
  thermalAt = () => 0; setup(65,700,0); keys.add('ArrowDown');
  let noseTurn=0, pathTurn=0, lastPitch=pitch, lastPath=Math.atan2(airVY,airVX);
  let flewLeft=false, inverted=false, maxHeight=height;
  for(let i=0;i<1800 && pathTurn<Math.PI*2;i++) {
    update(1/120);
    noseTurn+=wrapAngle(pitch-lastPitch); lastPitch=pitch;
    const path=Math.atan2(airVY,airVX); pathTurn+=wrapAngle(path-lastPath); lastPath=path;
    flewLeft ||= airVX<0; inverted ||= Math.cos(pitch)<0;
    maxHeight=Math.max(maxHeight,height);
    assert.ok(!stalled); assert.equal(mode,'flying');
  }
  assert.ok(noseTurn>Math.PI*2); assert.ok(pathTurn>=Math.PI*2);
  assert.ok(flewLeft && inverted); assert.ok(maxHeight>780);
  assert.ok(speed<65,'drag must consume energy');
`));
test('pulling a low-energy loop stalls instead of granting unlimited rotation', () => game()(`
  setup(22,500,0); keys.add('ArrowDown'); let didStall=false;
  for(let i=0;i<720;i++){update(1/120);didStall ||= stalled;}
  assert.ok(didStall); assert.ok(height<500);
`));
test('safe touchdown rolls out; hard and off-field touchdowns fail', () => game()(`
  setup(23,.1); distance=1800; advance(6);
  assert.equal(mode,'ended'); assert.equal($('#endTitle').textContent,'Sanft gelandet.');
  setup(23,.1); distance=500; advance(.2);
  assert.equal(mode,'ended'); assert.ok($('#result').textContent.includes('Außenlandung'));
  setup(40,.1); distance=1800; advance(.2);
  assert.equal(mode,'ended'); assert.ok($('#result').textContent.includes('Zu hart'));
`));
test('pause freezes physics and camera; restart and both canvas sizes work', () => game()(`
  setup(); togglePause(); const snapshot=JSON.stringify([height,distance,airVX,airVY,cameraDistance,cameraSpeed,t]);
  advance(2); assert.equal(JSON.stringify([height,distance,airVX,airVY,cameraDistance,cameraSpeed,t]),snapshot);
  start(); assert.equal(height,0); assert.equal(cameraSpeed,0); assert.equal(stalled,false);
  draw(); W=390;H=844;draw();
`));
