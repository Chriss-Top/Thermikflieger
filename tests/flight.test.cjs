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
  start(); advance(16); assert.equal(phase,'winch'); assert.ok(height>220);
  assert.ok(speed>25 && !stalled); release(); assert.equal(phase,'glide');
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
test('stall sheds lift and pitches down continuously, with recoverable momentum', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});setup(8,500,.5);
  const beforeV=airVY, beforePitch=pitch;update(STEP);
  assert.ok(stalled);assert.ok(Math.abs(airVY-beforeV)<.2,'no instantaneous downward velocity jump');
  assert.ok(Math.abs(pitch-beforePitch)<.02,'no pitch teleport');
  const initial=height;advance(1.5);assert.ok(vertical<0);assert.ok(height<initial);
  keys.add('ArrowUp');advance(1);keys.clear();advance(6);
  assert.ok(!stalled);assert.ok(speed>18);assert.equal(mode,'flying');
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

test('elevator steers the winch launch and releasing preserves momentum', () => {
  const pull = game(), push = game();
  const up = pull(`start();advance(6);keys.add('ArrowDown');advance(.5);keys.clear();[pitch,height,airVX,airVY]`);
  const down = push(`start();advance(6);keys.add('ArrowUp');advance(.5);keys.clear();[pitch,height,airVX,airVY]`);
  assert.ok(up[0] > down[0] + .2);
  assert.ok(up[1] > down[1]);
  pull(`const momentum=JSON.stringify([airVX,airVY,pitch,height]);release();
    assert.equal(phase,'glide');assert.equal(JSON.stringify([airVX,airVY,pitch,height]),momentum);`);
});
test('turning is held-input only, reversals are manual and no route autopilot remains', () => game()(`
  setup(28,500);crossTrack=180;heading=1;
  const course=heading;advance(2);assert.ok(Math.abs(heading-course)<.1,'no automatic return to route');
  assert.ok(crossTrack>180);
  keys.add('ArrowLeft');advance(1);keys.clear();assert.ok(bank<-.6);
  keys.add('ArrowRight');advance(1);keys.clear();assert.ok(bank>.6);
  const held=bank;advance(1.5);assert.ok(Math.abs(bank)<.1,'released steering does not keep circling');
  assert.equal(typeof toggleCircle,'undefined');
`));
test('thermal strength fades with age, stops at cloud base, and expired cores never respawn', () => game()(`
  setup();const core=thermalCore(0,720);
  assert.ok(thermalAt(core.x,core.z,250)>thermalAt(core.x,core.z+130,250)+3);
  assert.equal(thermalAt(core.x,core.z,core.ceiling+5),0);
  const birth=core.born;t=birth+core.lifetime-7;const fading=thermalLife(core);
  assert.ok(fading>0 && fading<.6);t=birth+core.lifetime+1;
  assert.equal(thermalLife(core),0);assert.equal(thermalAt(core.x,core.z,250),0);
  ensureThermals();assert.equal(thermalCore(0,720).born,birth);
  distance=5000;ensureThermals();assert.ok(thermalLife(thermalCore(3,720))>0);
`));
test('wind advects the glider and thermal core and varies smoothly over time', () => {
  const withWind=game(),stillAir=game();
  const position=(run,x,z)=>run(`airAt=()=>({x:${x},z:${z},up:0,ridge:0});setup(28,500);advance(1);[distance,crossTrack];`);
  const windy=position(withWind,5,2),still=position(stillAir,0,0);
  assert.ok(windy[0]-still[0]>4.8);assert.ok(windy[1]-still[1]>1.8);
  game()(`setup();const core=thermalCore(0,720),oldX=core.x;advance(1);assert.ok(core.x>oldX+1);
    const a=windAt(500,200,3),b=windAt(500,200,3+STEP);
    assert.ok(Math.abs(a.up-b.up)<.03);assert.ok(Math.abs(a.x-b.x)<.03);`);
});
test('hills generate windward lift and leeward sink, with attenuation at height', () => game()(`
  const wind={x:4,z:0,up:0};
  assert.ok(terrainAt(990)>60);assert.equal(terrainAt(1800),0);
  assert.ok(ridgeLiftAt(870,100,wind)>1);
  assert.ok(ridgeLiftAt(1110,100,wind)<-1);
  assert.ok(Math.abs(ridgeLiftAt(1110,900,wind))<Math.abs(ridgeLiftAt(1110,100,wind))*.1);
  assert.ok(ridgeLiftAt(1110,100,{x:-4})>0,'wind reversal swaps lift side');
`));
test('physics and render interpolation remain independent of HUD writes', () => game()(`
  setup();let writes=0;const original=instruments;instruments=()=>writes++;
  advance(1);assert.equal(writes,0);instruments=original;
  previous=renderState();const oldX=view().planeX;update(STEP);
  assert.ok(Math.abs(view(0).planeX-oldX)<.001);
  assert.ok(Number.isFinite(view(.5).planeX));
`));
