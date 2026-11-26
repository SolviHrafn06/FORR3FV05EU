// Run with playwright-cli run-code --filename=<this file>. Uses a public Google test image, no webcam.
async page => {
  await page.goto('about:blank');
  const p=await page.context().newPage();await p.bringToFront();
  await p.setViewportSize({width:1280,height:720});
  await p.addInitScript(()=>{
    navigator.mediaDevices.getUserMedia=async()=>{
      const img=new Image();img.src=location.origin+'/__test-hand.webp';
      await img.decode();
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      const ctx=c.getContext('2d');setInterval(()=>ctx.drawImage(img,0,0,c.width,c.height),1000/30);
      return c.captureStream(30);
    };
  });
  await p.route('**/__test-hand.webp',async route=>route.fulfill({response:await route.fetch({url:'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/thumbs_up.jpg'})}));
  await p.route('**/index.html',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/,'')});
  });
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
    await p.goto('http://localhost:5500/%C3%A6fingar%20fyrir%20%C3%B6ll%20verkefni/Gesture%20recognition/test%201%20-%20ai%20hj%C3%A1lp/index.html');
    await p.waitForFunction(()=>/Kerfi virkt|ekki tiltæk|stöðvaðist/.test(document.getElementById('stada').textContent),null,{timeout:45000});
    const status=await p.locator('#stada').textContent();
    if(!status.includes('Kerfi virkt'))throw new Error(status);
    await p.waitForTimeout(10000);
    const samples=[];
    for(let i=0;i<3;i++){
      samples.push(await p.evaluate(()=>({text:document.getElementById('afkost').textContent,performance:window.__kerfi.afkost,hands:[...window.__kerfi.handir.values()].map(h=>h.bending)})));
      if(i<2)await p.waitForTimeout(5000);
    }
    if(errors.length || samples.some(s=>!s.hands.includes('Thumb_Up')))throw new Error('The real model must recognize the test hand without page errors: '+JSON.stringify({samples,errors}));
    return {fixture:'Public Google thumbs_up.jpg image painted into a 30 fps canvas stream; real model inference, not a webcam',samples,errors};
  }finally{await p.close();}
}
