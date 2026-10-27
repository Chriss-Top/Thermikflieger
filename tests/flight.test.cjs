// Run with: node --test tests/flight.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function game() {
  const elements = new Map();
  const listeners = new Map();
  const noop = () => {};
  const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop: noop }) }, {
    get: (o, k) => o[k] || noop, set: (o, k, v) => (o[k] = v, true)
  });
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      style: {}, attrs: {}, classList: { add: noop, remove: noop }, getContext: () => ctx,
      setAttribute(key,value) { this.attrs[key]=value; }, setPointerCapture: noop, textContent: ''
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    document: { querySelector: element, body: { classList: { add: noop } } },
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1,
    addEventListener: (name,callback) => listeners.set(name,callback), requestAnimationFrame: noop,
    dispatch: (name,event) => listeners.get(name)(event),
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
  start(); advance(16); assert.ok(height>220);
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
test('rolling has inertia, release damps roll and countersteering reverses manually', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});
  setup(28,500);crossTrack=180;heading=1;
  const course=heading;advance(2);assert.ok(Math.abs(heading-course)<.1,'no automatic return to route');
  assert.ok(crossTrack>180);
  keys.add('ArrowLeft');advance(2);keys.clear();assert.ok(bank<-.5);
  keys.add('ArrowRight');advance(4);keys.clear();assert.ok(bank>.5);
  const releasedRate=rollRate;advance(.6);const coastingBank=bank;
  assert.ok(Math.abs(rollRate)<Math.abs(releasedRate),'release brakes the rolling motion');
  advance(1.5);
  assert.ok(bank>.35&&bank<coastingBank,'after coasting the circle gradually opens without snapping level');
  keys.add('ArrowLeft');advance(1.8);keys.clear();advance(.3);
  assert.ok(bank<.2,'opposite input actively rolls out');
  assert.equal(typeof toggleCircle,'undefined');
`));
test('responsive roll reaches thermal banks quickly with bounded inertia on every aircraft', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});
  for(const id of Object.keys(AIRCRAFT)) for(const side of [-1,1]) {
    $('#aircraft').value=id;setup(AIRCRAFT[id].bestSpeed/3.6,2000,0);
    const key=side>0?'ArrowRight':'ArrowLeft';keys.add(key);update(STEP);
    assert.ok(Math.abs(bank)<.002,id+' rolls continuously without snapping');
    advance(2-STEP);
    assert.ok(bank*side>(id==='paraglider'?25:50)*Math.PI/180,id+' prompt roll-in at cruise speed');
    assert.ok(Math.abs(rollRate)<=.8,id+' bounded roll rate');
    advance(4);
    const limit=(id==='paraglider'?50:65)*Math.PI/180;
    assert.ok(Math.abs(bank-limit*side)<.001,id+' reaches the slightly steeper bank limit');
    assert.ok(!stalled,id+' safe roll-in without elevator input');
  }
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
test('touch steering supports independent fingers, pointer cancellation and focus loss', () => game()(`
  start();
  const event=id=>({pointerId:id,preventDefault(){}});
  $('#left').onpointerdown(event(1));$('#bankRight').onpointerdown(event(2));
  assert.ok(keys.has('ArrowDown')&&keys.has('ArrowRight'));
  $('#left').onpointerup(event(1));assert.ok(!keys.has('ArrowDown')&&keys.has('ArrowRight'));
  $('#bankRight').onpointercancel(event(2));assert.ok(!keys.has('ArrowRight'));
  $('#left').onpointerdown(event(3));$('#left').onpointerdown(event(4));
  $('#left').onpointerup(event(3));assert.ok(keys.has('ArrowDown'));
  $('#left').onlostpointercapture(event(4));assert.ok(!keys.has('ArrowDown'));
  $('#bankLeft').onpointerdown(event(5));suspend();
  assert.ok(paused&&keys.size===0);assert.ok(touchControls.every(control=>control.pointers.size===0));
`));
test('viewport changes preserve the flight while resetting render interpolation', () => game()(`
  setup();advance(.5);const state=JSON.stringify([distance,height,airVX,airVY]);previous=renderState();
  innerWidth=390;innerHeight=844;resize();assert.equal(W,390);assert.equal(H,844);assert.equal(previous,null);draw();
  innerWidth=844;innerHeight=390;resize();draw();
  assert.equal(JSON.stringify([distance,height,airVX,airVY]),state);
`));

test('all five profiles launch, glide, stall at their own limit and render distinct meshes', () => game()(`
  const shapes=new Set(), polar=[];
  for (const [id,profile] of Object.entries(AIRCRAFT)) {
    $('#aircraft').value=id;start();advance(16);
    assert.equal(aircraft,profile);assert.equal(mode,'flying',id);
    assert.ok(hasLifted && height>40,id+' must launch');assert.ok(!stalled,id+' launch stall');
    release();assert.equal(phase,'glide');advance(2);assert.equal(mode,'flying');
    const a=aeroProfile(),cl=G/(a.liftFactor*(profile.bestSpeed/3.6)**2);
    assert.ok(Math.abs(cl/(a.cd0+a.induced*cl*cl)-profile.glide)<.01);
    polar.push(profile.glide);shapes.add(JSON.stringify(aircraftMesh()));
    for (const yaw of [0,Math.PI/2,Math.PI]) plane(200,200,.1,.7,yaw,.6);
    setup(profile.stall/3.6-.1,400,0);update(STEP);assert.ok(stallWarning&&!stalled,id+' low-speed warning before stall');
    setup(profile.stall/3.6*.6,400,0);update(STEP);assert.ok(stalled,id+' deep stall');
  }
  assert.equal(shapes.size,5);assert.equal(polar.length,5);
`));
test('both pitch and roll respond more strongly with airspeed for every profile', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});
  for(const [id,p] of Object.entries(AIRCRAFT)) {
    $('#aircraft').value=id;setup(p.bestSpeed/3.6,500,0);
    const low=controlAuthority();keys.add('ArrowDown');keys.add('ArrowRight');advance(.12);
    const lowPitch=pitch,lowBank=bank;
    setup(p.bestSpeed/3.6*1.5,500,0);
    assert.ok(controlAuthority()>low);keys.add('ArrowDown');keys.add('ArrowRight');advance(.12);
    assert.ok(pitch>lowPitch*1.25,id+' pitch authority');assert.ok(bank>lowBank*1.25,id+' roll authority');
  }
`));
test('held Space brakes, R releases with continuous momentum, and buttons retain keyboard activation', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});setup(32,400,0);
  const event=code=>({code,preventDefault(){},repeat:false});
  dispatch('keydown',event('Space'));assert.ok(braking());advance(.5);const braked=speed;
  dispatch('keyup',event('Space'));assert.ok(!braking());
  setup(32,400,0);advance(.5);assert.ok(speed>braked+1);
  start();height=50;airVX=30;airVY=3;
  dispatch('keydown',event('Space'));assert.equal(phase,'winch');
  dispatch('keyup',event('Space'));const before=JSON.stringify([airVX,airVY,pitch,height]);
  dispatch('keydown',event('KeyR'));assert.equal(phase,'glide');
  assert.equal(JSON.stringify([airVX,airVY,pitch,height]),before);
  keys.clear();dispatch('keydown',{...event('Space'),target:{tagName:'BUTTON'}});assert.equal(keys.size,0);
`));
test('touch brake works together with both steering axes and releases safely', () => game()(`
  setup();const e=id=>({pointerId:id,preventDefault(){}});
  $('#brake').onpointerdown(e(1));$('#left').onpointerdown(e(2));$('#bankRight').onpointerdown(e(3));
  assert.ok(braking() && keys.has('ArrowDown') && keys.has('ArrowRight'));
  $('#brake').onpointercancel(e(1));assert.ok(!braking() && keys.has('ArrowDown'));
  $('#brake').onpointerdown(e(4));suspend();assert.ok(!braking() && keys.size===0);
  start();assert.ok(touchControls.every(c=>c.pointers.size===0));
`));
test('distance projection, true bank geometry, interpolated horizon and advanced mode conceal lift markers', () => game()(`
  setup();assert.ok(aircraftScale(300)<aircraftScale(0));assert.ok(aircraftScale(-100)>aircraftScale(0));
  const flat=projectAircraft([0,60,0],0,0,0),rolled=projectAircraft([0,60,0],0,0,.6);
  assert.ok(Math.abs(rolled.y-flat.y)>20);
  previous=renderState();bank=.8;pitch=.2;crossTrack=300;draw(.5);
  assert.ok($('#horizonWorld').attrs.transform.includes('rotate(-22.918'));
  assert.equal(renderState(.5).crossTrack,150);
  pitch=Math.PI;bank=0;draw();assert.ok($('#horizonWorld').attrs.transform.includes('rotate(-180)'));
  $('#thermalMode').value='advanced';start();phase='glide';airLift=7;height=400;vertical=-1;
  instruments();assert.equal(thermalMode,'advanced');assert.equal($('#thermalNote').style.opacity,0);
  assert.ok(!$('#status').textContent.includes('Aufwind'));draw();
  $('#thermalMode').value='easy';start();assert.equal(thermalMode,'easy');
`));

test('left and right commands turn from the pilot perspective in all four headings', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});
  for(const course of [0,Math.PI/2,Math.PI,-Math.PI/2]) for(const side of [-1,1]) {
    setup(28,500,0);heading=course;const x=distance,z=crossTrack;
    keys.add(side>0 ? 'ArrowRight' : 'ArrowLeft');advance(1.2);
    assert.ok(wrapAngle(heading-course)*side < -.025,'course turns toward commanded side');
    const rightward=(distance-x)*Math.sin(course)-(crossTrack-z)*Math.cos(course);
    assert.ok(rightward*side>.2,'motion is to the pilot side, independent of observer');
    assert.ok(bank*side>.25,'commanded wing is lowered smoothly');
  }
  for(const yaw of [0,Math.PI]) {
    const flatRight=projectAircraft([0,-60,0],0,yaw,0),right=projectAircraft([0,-60,0],0,yaw,.5);
    const flatLeft=projectAircraft([0,60,0],0,yaw,0),left=projectAircraft([0,60,0],0,yaw,.5);
    assert.ok(right.y>flatRight.y+20);assert.ok(left.y<flatLeft.y-20);
  }
`));
test('analog instruments follow flight data with correct sign, range and aircraft scale', () => game()(`
  setup();speed=100/3.6;vertical=2;draw();instruments();
  assert.equal($('#speed').textContent,'100');assert.equal($('#vario').textContent,'+2.0');
  assert.equal($('#speedNeedle').attrs.transform,'rotate(-50)');
  assert.equal($('#varioNeedle').attrs.transform,'rotate(-36)');
  vertical=-2;draw();assert.equal($('#varioNeedle').attrs.transform,'rotate(-144)');
  assert.equal(varioNeedleAngle(10),varioNeedleAngle(5));assert.equal(varioNeedleAngle(-10),varioNeedleAngle(-5));
  $('#aircraft').value='paraglider';start();assert.equal(gaugeSettings().maximum,80);
  speed=40/3.6;draw();assert.equal($('#speedNeedle').attrs.transform,'rotate(0)');
  assert.ok($('#speedScale').innerHTML.includes('#ed6d58'),'red maximum-speed line');
  assert.ok($('#speedScale').innerHTML.includes('#78b88a'),'normal operating arc');
`));
test('airframes preserve original span-length ratios, wing heights and tail types', () => game()(`
  for(const [id,length] of [['ka8',7],['ask21',8.35],['ls4',6.66],['ls8',6.72]]) {
    $('#aircraft').value=id;start();const mesh=aircraftMesh();
    const body=mesh.filter(f=>f.part==='fuselage').flatMap(f=>f.points);
    const wing=mesh.filter(f=>f.part==='wing').flatMap(f=>f.points);
    assert.ok(Math.abs((Math.max(...body.map(p=>p[0]))-Math.min(...body.map(p=>p[0])))/15-length)<.001);
    assert.ok(Math.abs((Math.max(...wing.map(p=>p[1]))-Math.min(...wing.map(p=>p[1])))/15-aircraft.span)<.001);
    const area=mesh.filter(f=>f.part==='wing').reduce((total,face)=>total+Math.abs(face.points.reduce((sum,p,i)=>{const q=face.points[(i+1)%face.points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2,0)/225;
    assert.ok(Math.abs(area-aircraft.area)<.001,'wing planform matches original wing area');
    const tail=mesh.filter(f=>f.part==='tailplane').flatMap(f=>f.points);
    assert.ok(id==='ka8' ? Math.max(...tail.map(p=>p[2]))<3 : Math.min(...tail.map(p=>p[2]))>15);
    assert.equal(mesh.some(f=>f.part==='winglet'),id==='ls8');
    assert.equal(mesh.some(f=>f.part==='fabric-rib'),id==='ka8');
    keys.add('Space');assert.ok(aircraftMesh().some(f=>f.part==='airbrake'));
  }
`));

test('every dial marks stall and best-glide speeds with a safe turn-dependent separation', () => game()(`
  for (const [id,p] of Object.entries(AIRCRAFT)) {
    $('#aircraft').value=id;start();
    assert.ok($('#speedScale').innerHTML.includes('data-speed="'+p.stall+'"'));
    assert.ok($('#speedScale').innerHTML.includes('data-speed="'+p.bestSpeed+'"'));
    assert.ok($('#speedScale').innerHTML.includes('Bestes Gleiten'));
    assert.equal(targetSpeed(0),p.bestSpeed);
    for(const angle of [0,maximumBank()]) assert.ok(targetSpeed(angle)>=stallSpeed(angle)*1.35,id+' margin');
    phase='glide';bank=maximumBank();draw();instruments();
    assert.equal($('#turnStallMarker').attrs.transform,'rotate('+speedNeedleAngle(stallSpeed())+')');
    assert.equal($('#targetMarker').attrs.transform,'rotate('+speedNeedleAngle(targetSpeed())+')');
    assert.ok($('#targetGuide').textContent.includes(String(Math.round(targetSpeed()))));
  }
`));

for (const id of ['ka8','ask21','ls4','ls8','paraglider']) {
  test(id+' speed assist settles on the target without stalls or added energy, straight and in steep circles', () => {
    for(const turn of [false,true]) game()(`
      $('#aircraft').value='${id}';airAt=()=>({x:0,z:0,up:0,ridge:0});
      const p=AIRCRAFT['${id}'];setup(p.bestSpeed/3.6*.9,1500,0);toggleSpeedAssist();
      const initialEnergy=G*height+speed*speed/2;
      ${turn ? "keys.add('ArrowRight');" : ''}
      let maxError=0,sumError=0,samples=0,maxAngle=0,headingTravel=0;
      for(let i=0;i<60*120;i++) {
        const oldHeading=heading;update(STEP);headingTravel+=Math.abs(wrapAngle(heading-oldHeading));
        assert.equal(mode,'flying');assert.ok(!stalled,'safe entry and sustained flight');
        assert.ok(speedHoldEnabled);
        if(i>30*120) {
          const error=Math.abs(speed*3.6-targetSpeed());maxError=Math.max(maxError,error);sumError+=error;samples++;
          maxAngle=Math.max(maxAngle,Math.abs(bank));
          assert.ok(speed*3.6>stallSpeed()*1.15,'usable stall reserve');
        }
      }
      assert.ok(maxError<( ${turn} ? p.bestSpeed*.09 : 1),'maximum tracking error '+maxError);
      assert.ok(sumError/samples<( ${turn} ? p.bestSpeed*.04 : .2),'mean tracking error');
      assert.ok(G*height+speed*speed/2<initialEnergy-10,'no motor or injected airspeed');
      if(${turn}) { assert.ok(maxAngle>maximumBank()-.03);assert.ok(headingTravel>Math.PI*2,'tight full circles'); }
      else { assert.ok(maxAngle<.08,'only gust roll without turn input');assert.ok(Math.abs(heading)<.3,'no circle autopilot'); }
    `);
  });
}

test('speed assist can be armed for launch, toggled by F and touch, paused and overridden manually', () => game()(`
  $('#speedAssist').checked=true;instruments();assert.ok($('#speedAssist').checked,'intro choice survives HUD refresh');
  start();assert.ok(speedHoldEnabled&&!speedAssistActive());
  advance(16);const momentum=JSON.stringify([airVX,airVY,pitch,height]);release();assert.ok(speedAssistActive());
  assert.equal(JSON.stringify([airVX,airVY,pitch,height]),momentum);
  const event=code=>({code,preventDefault(){},repeat:false});
  dispatch('keydown',event('KeyF'));assert.ok(!speedHoldEnabled);
  dispatch('keydown',{...event('KeyF'),repeat:true});assert.ok(!speedHoldEnabled);
  $('#autopilot').onclick();assert.ok(speedHoldEnabled);
  togglePause();const state=JSON.stringify([speed,pitch,height,t]);advance(2);
  assert.equal(JSON.stringify([speed,pitch,height,t]),state);assert.ok(speedHoldEnabled);
  togglePause();keys.add('ArrowDown');update(STEP);assert.ok(!speedHoldEnabled);
  keys.clear();toggleSpeedAssist();keys.add('Space');update(STEP);assert.ok(!speedHoldEnabled&&braking());
  keys.clear();toggleSpeedAssist();const e={pointerId:50,preventDefault(){}};
  $('#right').onpointerdown(e);update(STEP);assert.ok(!speedHoldEnabled);
  $('#right').onpointerup(e);instruments();assert.equal($('#autopilot').attrs['aria-pressed'],'false');
`));

test('speed assist handles winch-release attitude, wind and gusts without repeated stalls for all aircraft', () => {
  for(const id of ['ka8','ask21','ls4','ls8','paraglider']) game()(`
    $('#aircraft').value='${id}';$('#speedAssist').checked=true;start();advance(16);release();
    // Keep the actual launch momentum and attitude, with height for a long weather test.
    height=600;keys.add('ArrowRight');
    for(let i=0;i<50*120;i++) {
      update(STEP);assert.equal(mode,'flying','${id}');assert.ok(!stalled,'${id} safe release and circling');
      if(i>30*120) {
        assert.ok(speed*3.6>stallSpeed()*1.15,'${id} reserve in gusts');
        assert.ok(Math.abs(speed*3.6-targetSpeed())<targetSpeed()*.12,'${id} speed tracking in moving air');
      }
    }
  `);
});

for(const id of ['ka8','ask21','ls4','ls8','paraglider']) {
  test(id+' can enter and sustain maximum-bank turns manually, with gusts and small elevator corrections', () => {
    for(const side of [-1,1]) for(const correction of [false,true]) game()(`
      $('#aircraft').value='${id}';setup(AIRCRAFT['${id}'].bestSpeed/3.6,1500,0);
      keys.add(${side}>0 ? 'ArrowRight' : 'ArrowLeft');
      let travel=0,peakBank=0;
      for(let i=0;i<40*120;i++) {
        if(${correction} && i%600<60) keys.add('ArrowDown');else keys.delete('ArrowDown');
        const course=heading;update(STEP);travel+=Math.abs(wrapAngle(heading-course));
        peakBank=Math.max(peakBank,Math.abs(bank));
        assert.equal(mode,'flying');assert.ok(!stalled,'ordinary manual circling must not trigger a stall');
        assert.ok(!speedHoldEnabled,'manual trim is independent of optional speed assist');
      }
      assert.ok(peakBank>maximumBank()-.03);assert.ok(travel>Math.PI*2,'complete tight circles');
      assert.ok(height>900,'no uncontrolled dive');
    `);
  });
}

test('stall warning precedes an intentional sustained stall and both thermal modes show clear warnings', () => game()(`
  for(const selected of ['easy','advanced']) {
    $('#thermalMode').value=selected;setup(22,1200,0);keys.add('ArrowDown');
    let warnedAt=null,stalledAt=null;
    for(let i=0;i<8*120;i++) {
      update(STEP);
      if(stallWarning&&warnedAt===null) {
        warnedAt=elapsed;instruments();assert.ok(!stalled);
        assert.ok($('#status').textContent.includes('ABRISSWARNUNG'));
        assert.equal($('.airspeed').attrs['data-warning'],'warn');
        assert.equal($('#thermalNote').style.opacity,1);
        assert.ok($('#stallWarningBand').innerHTML.includes('#ffcc63'));
      }
      if(stalled) {stalledAt=elapsed;break;}
    }
    assert.notEqual(warnedAt,null);assert.notEqual(stalledAt,null);
    assert.ok(stalledAt-warnedAt>.6,'time to react before the actual stall');
    instruments();assert.equal($('.airspeed').attrs['data-warning'],'stall');
    keys.clear();keys.add('ArrowUp');advance(1.5);keys.clear();advance(5);
    assert.ok(!stalled,'intentional stall remains recoverable');
  }
`));

test('brief wind shear warns without entering a full stall and restart clears all warning history', () => game()(`
  let gust=0;airAt=()=>({x:0,z:0,up:gust,ridge:0});setup(28,800,0);update(STEP);
  gust=15;advance(.12);assert.ok(stallWarning);assert.ok(!stalled);
  assert.ok(stallExposure>0&&stallExposure<.2);
  gust=0;advance(.4);assert.ok(!stalled);assert.equal(stallExposure,0);
  start();assert.equal(stallExposure,0);assert.equal(stallWarning,false);
`));

test('uneven updrafts lift the correct wing and initiate pilot-relative turns in every heading', () => game()(`
  for(const course of [0,Math.PI/2,Math.PI,-Math.PI/2]) for(const strongerLeft of [-1,1]) {
    airAt=()=>({x:0,z:0,up:0,ridge:0});setup(28,1000,0);heading=course;
    const originX=distance,originZ=crossTrack;
    airAt=(x,h,z=crossTrack)=>({x:0,z:0,ridge:0,up:strongerLeft*.2*((z-originZ)*Math.cos(course)-(x-originX)*Math.sin(course))});
    const differential=wingAirDifference();assert.ok(differential*strongerLeft>2);
    const initialPitch=pitch;update(STEP);
    assert.ok(rollRate*strongerLeft>0,'left updraft rolls right, right updraft rolls left');
    assert.ok(Math.abs(bank)<.001,'no bank teleport');assert.ok(Math.abs(pitch-initialPitch)<.01);
    advance(.7);assert.ok(bank*strongerLeft>.01);
    assert.ok(wrapAngle(heading-course)*strongerLeft<-.0005,'turn follows the roll without key input');
    assert.equal(keys.size,0);
  }
`));

test('actual thermal gradients push the glider away from the lifted wing; uniform lift does not invent roll', () => game()(`
  setup(28,300,0);const core=thermalCore(0,720);
  distance=core.x;crossTrack=core.z-core.radius*.55;
  assert.ok(wingAirDifference()>.3);advance(.5);assert.ok(bank>0&&heading<0);
  start();phase='glide';speed=28;airVX=28;height=300;distance=720;
  const other=thermalCore(0,720);crossTrack=other.z+other.radius*.55;
  assert.ok(wingAirDifference()<-.3);advance(.5);assert.ok(bank<0&&heading>0);
  airAt=()=>({x:0,z:0,up:3,ridge:0});setup(28,1000,0);advance(2);
  assert.equal(wingLiftDifference,0);assert.equal(bank,0);assert.equal(rollRate,0);assert.equal(heading,0);
`));

test('well-timed pulses hold intermediate steep banks and releasing alone gradually opens the circle', () => game()(`
  for(const id of ['ka8','ask21','ls4','ls8','paraglider']) {
    $('#aircraft').value=id;$('#speedAssist').checked=true;
    airAt=()=>({x:0,z:0,up:0,ridge:0});setup(AIRCRAFT[id].bestSpeed/3.6,2000,0);
    const desired=(id==='paraglider'?35:45)*Math.PI/180;
    let switches=0,previousCommand=0,releaseCount=0,maxError=0;
    for(let i=0;i<25*120;i++) {
      if(i%18===0) {
        const predicted=bank+rollRate*.25;
        const command=predicted<desired-.035 ? 1 : predicted>desired+.035 ? -1 : 0;
        keys.delete('ArrowLeft');keys.delete('ArrowRight');
        if(command)keys.add(command>0?'ArrowRight':'ArrowLeft');else releaseCount++;
        if(command!==previousCommand)switches++;previousCommand=command;
      }
      update(STEP);assert.ok(!stalled&&mode==='flying',id);
      if(i>8*120)maxError=Math.max(maxError,Math.abs(bank-desired));
    }
    assert.ok(maxError<.15,id+' held bank with timed taps');
    assert.ok(switches>8&&releaseCount>8,id+' must pulse and release rather than latch a circle');
    keys.clear();const held=bank;advance(3);assert.ok(bank<held-.1&&bank>0,id+' natural rollout');
  }
`));

test('measured coordinated turn radii follow speed squared over gravity times tangent bank', () => game()(`
  for(const id of ['ka8','ask21','ls4','ls8','paraglider']) {
    $('#aircraft').value=id;$('#speedAssist').checked=true;
    airAt=()=>({x:0,z:0,up:0,ridge:0});setup(AIRCRAFT[id].bestSpeed/3.6,2500,0);keys.add('ArrowRight');
    let length=0,turn=0,referenceRadius=0,samples=0;
    for(let i=0;i<45*120;i++) {
      const x=distance,z=crossTrack,course=heading;update(STEP);
      assert.ok(!stalled&&mode==='flying');
      if(i>25*120){
        length+=Math.hypot(distance-x,crossTrack-z);turn+=Math.abs(wrapAngle(heading-course));
        referenceRadius+=airVX*airVX/(G*Math.tan(Math.abs(bank)));samples++;
      }
    }
    const expected=referenceRadius/samples;
    assert.ok(Math.abs(length/turn-expected)/expected<.06,id+' physical coordinated turn radius');
  }
`));

for(const id of ['ka8','ask21','ls4','ls8','paraglider']) {
  test(id+' naturally returns toward best glide from slow and fast entry without the autopilot', () => {
    for(const ratio of [.85,1.3]) game()(`
      $('#aircraft').value='${id}';airAt=()=>({x:0,z:0,up:0,ridge:0});
      const p=AIRCRAFT['${id}'];setup(p.bestSpeed/3.6*${ratio},2000,0);
      const initialEnergy=G*height+speed*speed/2;let maximumError=0;
      for(let i=0;i<90*120;i++) {
        update(STEP);assert.ok(!stalled&&mode==='flying');assert.ok(!speedHoldEnabled);
        if(i>60*120)maximumError=Math.max(maximumError,Math.abs(speed*3.6-p.bestSpeed));
      }
      assert.ok(maximumError<p.bestSpeed*.025,'damped convergence from both sides');
      assert.ok(G*height+speed*speed/2<initialEnergy,'gravity and drag, no injected energy');
    `);
  });
}

test('gravity accelerates all masses down at 9.81 and absent lift cannot bend the flight path', () => game()(`
  airAt=()=>({x:0,z:0,up:0,ridge:0});
  for(const id of ['ka8','ask21','ls4','ls8','paraglider']) {
    $('#aircraft').value=id;setup(20,500,0);bank=.6;keys.add('ArrowUp');
    aeroProfile=()=>({liftFactor:0,cd0:0,induced:0});
    const initialEnergy=G*height+speed*speed/2;advance(1);
    assert.ok(Math.abs(airVY+9.81)<.000001,'world gravity independent of mass and bank');
    assert.ok(Math.abs(height-(500-9.81/2))<.000001,'parabolic fall over one second');
    assert.ok(Math.abs(airVX-20)<.000001);assert.ok(Math.abs(heading)<.000001,'no fictitious gravity turn');
    assert.ok(Math.abs(G*height+speed*speed/2-initialEnergy)<.000001,'potential becomes kinetic energy');
  }
`));

test('default double tempo and selectable tempo advance the whole simulation consistently', () => game()(`
  assert.equal(gameTempo,2);
  for(const tempo of [1,2,3]) for(const fps of [30,60,120]) {
    gameTempo=tempo;mode='intro';paused=false;t=0;last=0;accumulator=0;
    for(let i=1;i<=fps;i++)frame(i*1000/fps);
    assert.ok(Math.abs(t-tempo)<=STEP*1.01,'tempo independent of rendering frequency');
  }
`));

test('tempo button cycles without changing flight state or clearing controls', () => game()(`
  setup();keys.add('ArrowRight');advance(.3);
  const before=JSON.stringify([height,speed,pitch,bank,heading,rollRate]);
  for(const tempo of [3,1,2]) {
    $('#tempo').onclick();assert.equal(gameTempo,tempo);
    assert.equal($('#tempo').textContent,'Tempo '+tempo+'×');
    assert.equal(JSON.stringify([height,speed,pitch,bank,heading,rollRate]),before);
    assert.ok(keys.has('ArrowRight'));
  }
  togglePause();last=0;accumulator=0;
  for(let i=1;i<=60;i++)frame(i*1000/60);
  assert.equal(JSON.stringify([height,speed,pitch,bank,heading,rollRate]),before);
`));

test('pause and restart preserve and reset roll momentum without stuck inputs', () => game()(`
  setup();keys.add('ArrowRight');advance(.4);assert.ok(rollRate>0);
  togglePause();const frozen=JSON.stringify([bank,heading,rollRate,wingLiftDifference]);advance(2);
  assert.equal(JSON.stringify([bank,heading,rollRate,wingLiftDifference]),frozen);
  start();assert.equal(rollRate,0);assert.equal(wingLiftDifference,0);assert.equal(bank,0);assert.equal(keys.size,0);
`));
