// Synthetic landmarks at 10 tracking fps test control latency independently of webcam/model accuracy.
async page => {
  const check = (v,m) => { if(!v)throw new Error(m); };
  const p=await page.context().newPage();await p.bringToFront();
  await p.setViewportSize({width:1280,height:720});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
    const NativeWorker=Worker;
    window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.__fixtureWorker=this;}};
    navigator.mediaDevices.getUserMedia=async()=>{
      const c=document.createElement('canvas');c.width=1280;c.height=720;
      const x=c.getContext('2d');setInterval(()=>x.fillRect(0,0,1280,720),33);
      return c.captureStream(30);
    };
  });
  await p.route('**/index.html',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text()).replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/,'')});
  });
  await p.route('**/greinir-worker.js',route=>route.fulfill({contentType:'application/javascript',body:`
    let r={landmarks:[],gestures:[]};
    onmessage=e=>{const d=e.data;if(d.init)postMessage({tilbuinn:'CPU'});
      else if(d.fixture)r=d.fixture;
      else {d.bmp.close();setTimeout(()=>postMessage({t:d.t,ms:100,r}),100);}};`}));
  const hand=(closed=[false,false,false,false],thumb={x:.36,y:.58})=>{
    const lm=Array.from({length:21},()=>({x:.5,y:.5,z:0}));
    lm[0]={x:.5,y:.85,z:0};lm[4]={...thumb,z:0};
    [[5,.44],[9,.48],[13,.52],[17,.56]].forEach(([i,x],k)=>{
      lm[i]={x,y:.6,z:0};lm[i+1]={x,y:.5,z:0};lm[i+3]={x,y:closed[k]?.64:.4,z:0};
    });
    return lm.map(v=>({...v,y:v.y-.15}));
  };
  const send=async lm=>p.evaluate(lm=>window.__fixtureWorker.postMessage({fixture:{landmarks:lm?[lm]:[],gestures:lm?[[{categoryName:'None',score:1}]]:[]}}),lm);
  try{
    await p.goto('http://localhost:5500/%C3%A6fingar%20fyrir%20%C3%B6ll%20verkefni/Gesture%20recognition/test%201%20-%20ai%20hj%C3%A1lp/index.html');
    await p.waitForFunction(()=>window.__kerfi?.hlutir.length===3);await p.waitForTimeout(1200);
    await send(hand());await p.waitForFunction(()=>window.__kerfi.handir.size===1);
    const fist=hand([true,true,true,true],{x:.45,y:.62});
    const start=Date.now();await send(fist);
    await p.waitForFunction(()=>!!window.__kerfi.hlutir[0].heldur,null,{timeout:700});
    const grabMs=Date.now()-start;
    const before=await p.evaluate(()=>window.__kerfi.hlutir[0].group.position.x);
    await send(fist.map(v=>({...v,x:v.x+.08})));await p.waitForTimeout(250);
    check(await p.evaluate(x=>window.__kerfi.hlutir[0].group.position.x<x-.05,before),'hand movement reaches object');
    // fast swipe (0.8 frame-widths/s), ~150 ms dropout (motion blur; fixture adds up to 100 ms), hand reappears 0.38 away: must keep id and grip
    const shift=dx=>fist.map(v=>({...v,x:v.x+dx}));
    const id0=await p.evaluate(()=>[...window.__kerfi.handir.keys()][0]);
    for(const dx of [0,-.08])(await send(shift(dx)),await p.waitForTimeout(110));
    await send(null);await p.waitForTimeout(150);
    await send(shift(-.46));await p.waitForTimeout(150);
    check(await p.evaluate(id=>window.__kerfi.handir.has(id)&&window.__kerfi.handir.size===1&&!!window.__kerfi.hlutir[0].heldur,id0),'fast hand after dropout keeps identity and grip');
    for(let dx=-.38;dx<.08+1e-9;dx+=.08)(await send(shift(dx)),await p.waitForTimeout(110));
    await send(shift(.08));await p.waitForTimeout(150);
    check(await p.evaluate(id=>window.__kerfi.handir.has(id)&&!!window.__kerfi.hlutir[0].heldur,id0),'hand moving back keeps grip');
    const activeHand=await p.evaluate(()=>window.__kerfi.afkost);
    const initialRotation=await p.evaluate(()=>window.__kerfi.hlutir[0].group.quaternion.toArray());
    const angle=Math.PI*.6, aspect=1280/720;
    await send(fist.map(v=>{
      const x=(v.x-.5)*aspect,y=v.y-.5;
      return {...v,x:.5+(x*Math.cos(angle)-y*Math.sin(angle))/aspect,y:.5+x*Math.sin(angle)+y*Math.cos(angle)};
    }));
    await p.waitForTimeout(650);
    check(await p.evaluate(q=>{
      const current=window.__kerfi.hlutir[0].group.quaternion;
      return current.angleTo(current.clone().fromArray(q))>1;
    },initialRotation),'large wrist turn must not permanently freeze rotation');
    const opened=Date.now();await send(hand());
    await p.waitForFunction(()=>!window.__kerfi.hlutir[0].heldur,null,{timeout:700});
    const releaseMs=Date.now()-opened;
    await p.evaluate(()=>window.__kerfi.nullstilla());await p.waitForTimeout(800);
    await send(hand([false,true,true,true]));
    await p.waitForFunction(()=>[...window.__kerfi.handir.values()][0]?.zoom,null,{timeout:700});
    const size=await p.evaluate(()=>window.__kerfi.hlutir[0].staerdMark);
    await send(hand([false,true,true,true],{x:.44,y:.41}));await p.waitForTimeout(400);
    check(await p.evaluate(s=>window.__kerfi.hlutir[0].staerdMark<s-.05,size),'pinch shrinks object');
    await send(hand());await p.waitForTimeout(400);
    const bunched=hand();[4,8,12,16,20].forEach((i,k)=>{bunched[i]={x:.49+k*.005,y:.23,z:0};});
    await send(bunched);
    await p.waitForFunction(()=>[...window.__kerfi.handir.values()][0]?.thensla,null,{timeout:700});
    const small=await p.evaluate(()=>window.__kerfi.hlutir[0].staerdMark);
    const spread=hand(undefined,{x:.2,y:.55});[8,12,16,20].forEach((i,k)=>{spread[i]={x:.3+k*.13,y:.21,z:0};});
    await send(spread);await p.waitForTimeout(250);
    check(await p.evaluate(s=>window.__kerfi.hlutir[0].staerdMark>s+.1,small),'final spread frame enlarges object');
    await send(null);await p.waitForTimeout(1000);
    check(await p.evaluate(()=>window.__kerfi.handir.size===0 && window.__kerfi.gripir.length===0),'lost hand releases state');
    check(errors.length===0,'page errors: '+errors.join(', '));
    return {trackingFixtureFps:10,grabMs,releaseMs,activeHand,wristRotation:'passed',pinch:'passed',enlarge:'passed',lostHand:'passed',fastDropout:'passed'};
  }finally{await p.close();}
}
