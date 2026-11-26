// playwright-cli -s=hologram run-code --filename="<absolute path>/browser.test.cjs"
async page => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const results = [];
  const url = 'http://localhost:5500/%C3%A6fingar%20fyrir%20%C3%B6ll%20verkefni/Gesture%20recognition/test%201%20-%20ai%20hj%C3%A1lp/index.html';
  await page.goto('about:blank');
  const p = await page.context().newPage();
  await p.bringToFront();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('**/index.html', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body:(await response.text()).replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/, '')});
  });
  await p.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Test: no camera', 'NotFoundError'); };
  });
  try {
    await p.goto(url);
    await p.waitForFunction(() => window.__kerfi?.hlutir.length === 3);
    await p.waitForTimeout(1000);
    check((await p.locator('#stada').textContent()).includes('Myndavél ekki tiltæk'), 'camera failure status');
    check(await p.evaluate(()=>!document.getElementById('leidbeiningar').open && document.getElementById('hud').getBoundingClientRect().bottom<innerHeight/2),'instructions leave objects reachable');
    await p.locator('summary').focus();await p.keyboard.press('Enter');
    check(await p.evaluate(()=>document.getElementById('leidbeiningar').open),'keyboard expands instructions');
    await p.keyboard.press('Enter');
    const center = async () => p.evaluate(() => {
      const pos = window.__kerfi.hlutir[0].group.position.clone().project(window.__kerfi.camera);
      return {x:(pos.x+1)*innerWidth/2,y:(1-pos.y)*innerHeight/2};
    });
    const c = await center();
    await p.mouse.move(c.x, c.y); await p.mouse.down();
    check(await p.evaluate(() => !!window.__kerfi.hlutir[0].heldur), 'mouse grab');
    const dragging = await p.locator('#afkost').textContent();
    for(let i=1;i<=12;i++){await p.mouse.move(c.x+i*7,c.y-i*2);await p.waitForTimeout(16);}
    await p.mouse.up();
    const thrown=await p.evaluate(() => ({speed:window.__kerfi.hlutir[0].hradi.length(),held:!!window.__kerfi.hlutir[0].heldur}));
    check(thrown.speed>0.2 && !thrown.held, 'mouse throw: '+JSON.stringify(thrown));
    results.push({test:'drag and throw',dragging});

    await p.keyboard.press('r'); await p.waitForTimeout(1800);
    const w = await center();
    const before = await p.evaluate(() => window.__kerfi.hlutir[0].staerdMark);
    await p.mouse.move(w.x,w.y); await p.mouse.wheel(0,-120);
    await p.waitForTimeout(50);
    check(await p.evaluate(s=>window.__kerfi.hlutir[0].staerdMark>s,before), 'wheel resize');
    const size = await p.evaluate(()=>window.__kerfi.hlutir[0].staerdMark);
    const viewport=p.viewportSize();
    await p.dispatchEvent('#sena','wheel',{clientX:viewport.width-5,clientY:viewport.height-5,deltaY:-120});
    check(await p.evaluate(s=>window.__kerfi.hlutir[0].staerdMark===s,size), 'wheel outside object must not resize stale hover');
    await p.keyboard.press('x');
    check(await p.evaluate(()=>window.__kerfi.virkur.xray), 'xray');
    await p.mouse.move(w.x,w.y);await p.mouse.down();await p.keyboard.press('r');
    check(await p.evaluate(()=>window.__kerfi.hlutir.every(o=>!o.heldur && o.staerdMark===1 && !o.xray)), 'reset releases held object');
    await p.mouse.up();
    await p.locator('#nullstilla').click();await p.keyboard.press('n');
    check(await p.evaluate(()=>window.__kerfi.hlutir.length===4), 'N works after reset button focus');
    results.push({test:'resize, xray, reset while held, keyboard after button focus',passed:true});

    await p.evaluate(() => {
      const o=window.__kerfi.hlutir.at(-1);
      window.__disposed=0;
      o.slod.geometry.addEventListener('dispose',()=>window.__disposed++);
      o.holoEfni.addEventListener('dispose',()=>window.__disposed++);
      window.__kerfi.eyda(o);
    });
    await p.waitForTimeout(600);
    check(await p.evaluate(()=>window.__disposed===2 && window.__kerfi.hlutir.length===3), 'deleted GPU resources released');
    check(errors.length===0, `page errors: ${errors.join(', ')}`);
    results.push({test:'deletion frees GPU resources',passed:true});
    await p.waitForTimeout(1600);
    check(await p.evaluate(()=>window.__kerfi.hlutir[0].group.parent.children.filter(o=>o.type==='Points').every(o=>!o.visible)),'expired particles stop consuming GPU draw calls');

    await p.setViewportSize({width:390,height:844});
    await p.emulateMedia({reducedMotion:'reduce'});
    const mobile = await p.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,button:document.getElementById('nullstilla').getBoundingClientRect().bottom<innerHeight,animation:getComputedStyle(document.getElementById('hud')).animationName}));
    check(mobile.fits && mobile.button && mobile.animation==='none','narrow layout and reduced motion');
    check(await p.evaluate(()=>window.__kerfi.hlutir.every(o=>Math.abs(o.group.position.clone().project(window.__kerfi.camera).x)<1)),'all three objects remain on screen in portrait');
    await p.keyboard.press('Tab');
    results.push({test:'390px layout and reduced motion',passed:true});
    await p.screenshot({path:'C:/Users/solvi/Documents/Codex/2026-11-26/use-your-computer-browser-tool-to/work/ui-mobile.png'});
    await p.setViewportSize({width:320,height:568});
    await p.locator('summary').click();
    await p.locator('#nullstilla').focus();
    check(await p.evaluate(()=>document.getElementById('nullstilla').getBoundingClientRect().bottom<=innerHeight && document.documentElement.scrollWidth<=innerWidth),'expanded 320px instructions remain keyboard reachable');
    await p.locator('summary').click();
    await p.setViewportSize({width:1920,height:1080});
    await p.waitForTimeout(1500);
    results.push({test:'1920px render',afkost:await p.locator('#afkost').textContent()});
    await p.screenshot({path:'C:/Users/solvi/Documents/Codex/2026-11-26/use-your-computer-browser-tool-to/work/ui-wide.png'});

    // Worker failure fixture: a failed tracking thread must release grabs and preserve mouse controls.
    await p.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const c=document.createElement('canvas');c.width=640;c.height=360;
        const x=c.getContext('2d');setInterval(()=>x.fillRect(0,0,640,360),33);
        return c.captureStream(30);
      };
    });
    await p.route('**/greinir-worker.js',route=>route.fulfill({contentType:'application/javascript',body:"onmessage=e=>{if(e.data.init)postMessage({tilbuinn:'CPU'});else throw new Error('fixture tracking failure')}"}));
    await p.reload();
    await p.waitForFunction(()=>document.getElementById('stada').textContent.includes('Handarakning stöðvaðist'));
    await p.waitForTimeout(1200);
    check(await p.evaluate(()=>window.__kerfi.handir.size===0 && window.__kerfi.gripir.length===0),'tracking failure clears controls');
    await p.keyboard.press('n');
    check(await p.evaluate(()=>window.__kerfi.hlutir.length===4),'keyboard survives tracking failure');
    results.push({test:'worker failure recovery',status:await p.locator('#stada').textContent()});
    await p.unroute('**/greinir-worker.js');
    await p.route('**/greinir-worker.js',route=>route.fulfill({contentType:'application/javascript',body:"throw new Error('fixture startup failure')"}));
    await p.reload();
    await p.waitForFunction(()=>document.getElementById('stada').textContent.includes('Handarakning stöðvaðist'));
    results.push({test:'startup failure remains responsive without main-thread inference',passed:true});
    await p.unroute('**/greinir-worker.js');
    await p.route('**/greinir-worker.js',route=>route.fulfill({contentType:'application/javascript',body:"let n=0;onmessage=e=>{const d=e.data;if(d.init)postMessage({tilbuinn:'CPU'});else{d.bmp.close();if(n++===0)postMessage({t:d.t,ms:1,r:{landmarks:[],gestures:[]}})}}"}));
    await p.reload();
    await p.waitForFunction(()=>document.getElementById('stada').textContent.includes('greining svaraði ekki'),null,{timeout:6000});
    results.push({test:'stalled worker times out instead of freezing controls',passed:true});
    await p.unroute('**/greinir-worker.js');
    await p.route('**/greinir-worker.js',route=>route.fulfill({contentType:'application/javascript',body:"onmessage=e=>{const d=e.data;if(d.init)postMessage({tilbuinn:'CPU'});else{d.bmp.close();postMessage({t:d.t,ms:1,r:{landmarks:[],gestures:[]}})}}"}));
    await p.reload();
    await p.waitForFunction(()=>document.getElementById('stada').textContent.includes('Kerfi virkt'));
    await p.evaluate(()=>{
      window.__previousStream=document.getElementById('video').srcObject;
      dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
      window.__cameraStopped=window.__previousStream.getTracks().every(t=>t.readyState==='ended');
      dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    });
    await p.waitForFunction(()=>window.__cameraStopped && document.getElementById('video').srcObject!==window.__previousStream && document.getElementById('stada').textContent.includes('Kerfi virkt'));
    results.push({test:'page cache restore restarts camera and worker',passed:true});
    return results;
  } finally { await p.close(); }
}
