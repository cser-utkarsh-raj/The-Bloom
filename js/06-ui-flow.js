/* ---------- overlays ---------- */
function showOv(html,scene){state=state==='play'?'pause':state;const o=$('ov');o.style.display='flex';$('pn').innerHTML=html;$('pn').scrollTop=0;
 if(scene){o.style.background='rgba(0,0,0,0)';$('oc').style.display='block';const g=$('oc').getContext('2d');ovAnim=t=>{drawScene(g,$('oc').width,$('oc').height,scene,t);};}
 else{o.style.background='rgba(0,0,0,.62)';$('oc').style.display='none';ovAnim=null;}}

/* ============================================================
   PIXEL-ART LEVEL SCENES - Story-driven visuals with Live Effects
   ============================================================ */
const SCENE_IMGS = {};
const SCENE_SRCS = {
  menu: 'assets/art/home_bg.png',
  home: 'assets/art/chapter1.jpg',
  wife: 'assets/art/chapter2.jpg',
  road: 'assets/art/chapter3.jpg',
  school: 'assets/art/chapter4.jpg',
  bunker: 'assets/art/chapter5.jpg',
  end: 'assets/art/chapter5.jpg',
  dead: 'assets/art/chapter2.jpg',
  shop: 'assets/art/home_bg.png'
};

function getSceneImg(type) {
  const src = SCENE_SRCS[type] || SCENE_SRCS.menu;
  if (!SCENE_IMGS[src]) {
    const img = new Image();
    img.loaded = false;
    img._bloomAssetFallbackTried = false;
    img.onload = () => { img.loaded = true; };
    img.onerror = () => {
      // Vite serves public/assets/* as /assets/*; direct-root hosting keeps
      // the files under /public/assets/*. Retry the alternate valid location.
      if (!img._bloomAssetFallbackTried && src.startsWith('assets/')) {
        img._bloomAssetFallbackTried = true;
        img.src = 'public/' + src;
      }
    };
    img.src = src;
    SCENE_IMGS[src] = img;
  }
  return SCENE_IMGS[src];
}

function drawLiveSceneEffects(g, w, h, type, t, r) {
  g.save();

  // 1. Scene-specific dynamic lighting & flares
  if (type === 'wife' || type === 'dead') {
    // Bioluminescent floral aura centered around Maya
    const mx = w * 0.5, my = h * 0.48;
    const pulse = 0.35 + 0.22 * Math.sin(t * 3);
    const rad = g.createRadialGradient(mx, my, 10, mx, my, h * 0.48);
    rad.addColorStop(0, `rgba(195,90,255,${pulse * 0.45})`);
    rad.addColorStop(0.5, `rgba(77,255,200,${pulse * 0.25})`);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.beginPath(); g.arc(mx, my, h * 0.48, 0, 6.28); g.fill();

    // Weeping glowing teal tear stream
    const tearAlpha = 0.55 + 0.35 * Math.sin(t * 4);
    g.strokeStyle = `rgba(77,255,220,${tearAlpha})`;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(mx - 8, my - 24);
    g.lineTo(mx - 8 + Math.sin(t * 2) * 2, my + 15);
    g.stroke();

    // Swirling floral petals
    for (let i = 0; i < 35; i++) {
      const px = (mx + Math.cos(t * 0.8 + i * 1.1) * (120 + i * 6)) % w;
      const py = (my + Math.sin(t * 1.2 + i * 1.5) * (80 + i * 4) + t * 18) % h;
      const a = 0.2 + 0.3 * Math.sin(t * 2 + i);
      g.fillStyle = i % 2 ? `rgba(215,110,255,${a})` : `rgba(80,255,180,${a})`;
      g.beginPath();
      g.ellipse(px, py, 3 + i % 3, 1.5, t + i, 0, 6.28);
      g.fill();
    }
  } else if (type === 'road') {
    // Hazard flare reflection
    const fx = w * 0.14, fy = h * 0.75;
    const flk = 0.5 + 0.5 * Math.sin(t * 14 + Math.sin(t * 29));
    const rad = g.createRadialGradient(fx, fy, 5, fx, fy, 140);
    rad.addColorStop(0, `rgba(255,160,40,${0.45 + 0.25 * flk})`);
    rad.addColorStop(0.6, `rgba(255,80,20,${0.15 + 0.1 * flk})`);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.beginPath(); g.arc(fx, fy, 140, 0, 6.28); g.fill();
  } else if (type === 'home' || type === 'menu') {
    // Warm lantern pulse in window
    const wx = w * (type === 'menu' ? 0.52 : 0.25), wy = h * (type === 'menu' ? 0.52 : 0.55);
    const rad = g.createRadialGradient(wx, wy, 4, wx, wy, 90);
    const flk = 0.4 + 0.2 * Math.sin(t * 3.7);
    rad.addColorStop(0, `rgba(255,200,90,${flk})`);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.beginPath(); g.arc(wx, wy, 90, 0, 6.28); g.fill();
  } else if (type === 'school') {
    // Rotating red beacon sweep
    const bx = w * 0.5, by = h * 0.38;
    const sweepAng = t * 4;
    g.fillStyle = `rgba(255,40,40,${0.35 + 0.2 * Math.sin(t * 5)})`;
    g.beginPath();
    g.moveTo(bx, by);
    g.arc(bx, by, w * 0.35, sweepAng - 0.3, sweepAng + 0.3);
    g.closePath();
    g.fill();
  } else if (type === 'bunker' || type === 'end') {
    // Dawn artillery smoke and rising fire embers
    for (let i = 0; i < 30; i++) {
      const ex = (w * 0.2 + (i * 73 + t * 22) % w) % w;
      const ey = h * 0.9 - ((t * 45 + i * 47) % (h * 0.75));
      const a = 0.3 + 0.35 * Math.sin(t * 3 + i);
      g.fillStyle = `rgba(255,${120 + (i % 5) * 25},40,${a})`;
      g.beginPath();
      g.arc(ex + Math.sin(t * 2 + i) * 8, ey, 1.5 + i % 2, 0, 6.28);
      g.fill();
    }
  }

  // 2. Volumetric rolling fog on lower half (outdoor scenes)
  if (type !== 'wife' && type !== 'dead') {
    for (let k = 0; k < 3; k++) {
      g.fillStyle = `rgba(15,25,35,${0.12 + k * 0.06})`;
      g.beginPath();
      const baseY = h * (0.62 + k * 0.11);
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 24) {
        const y = baseY + Math.sin(x * 0.007 + t * (0.4 + k * 0.25) + k * 2) * (16 + k * 5);
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }
  }

  // 3. Live rain streaks on rainy scenes
  if (type === 'menu' || type === 'home' || type === 'road' || type === 'school') {
    g.strokeStyle = 'rgba(190,225,255,0.4)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 75; i++) {
      const rx = ((i * 53 + t * 520) % (w + 80)) - 40;
      const ry = (i * 97 + t * 940) % h;
      const len = 15 + (i % 6) * 3;
      g.beginPath();
      g.moveTo(rx, ry);
      g.lineTo(rx - 4, ry + len);
      g.stroke();
      if (ry + len > h * 0.82 && (i % 3 === 0)) {
        g.fillStyle = 'rgba(190,225,255,0.25)';
        g.beginPath();
        g.ellipse(rx - 4, h * 0.84 + (i % 16), 4, 1.5, 0, 0, 6.28);
        g.fill();
      }
    }
    // Distant lightning flash
    if (Math.sin(t * 0.5) > 0.985 && Math.sin(t * 25) > 0.2) {
      g.fillStyle = 'rgba(200,230,255,0.18)';
      g.fillRect(0, 0, w, h);
    }
  }

  // 4. Bioluminescent spores drifting across screen
  for (let i = 0; i < 35; i++) {
    const sx = (w * 0.05 + (i * 59 + t * 26) % (w * 0.9));
    const sy = h * 0.95 - ((t * (26 + (i % 4) * 7) + i * 61) % (h * 0.9));
    const sway = Math.sin(t * 1.6 + i * 1.4) * 14;
    const a = 0.2 + 0.35 * Math.sin(t * 2.8 + i);
    const r = 1.2 + (i % 3) * 0.6;
    const col = i % 2 === 0 ? `rgba(77,255,160,${a})` : `rgba(215,110,255,${a})`;
    g.fillStyle = col;
    g.beginPath();
    g.arc(sx + sway, sy, r, 0, 6.28);
    g.fill();
  }

  // 5. Cinematic radial vignette & CRT scanlines
  const vig = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,5,8,0.65)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);

  // Subtle CRT scanlines
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 0; y < h; y += 4) {
    g.fillRect(0, y, w, 1.5);
  }
  g.restore();
}

function drawScene(g, w, h, type, t) {
  const r = seeded(getSeed() + type.length * 100);
  const img = getSceneImg(type);
  let hasImage = false;
  if (img && img.loaded && img.naturalWidth > 0) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, dx, dy, dw, dh);
    hasImage = true;
  }
  if (!hasImage) {
    drawProceduralFallback(g, w, h, type, t, r);
  }
  drawLiveSceneEffects(g, w, h, type, t, r);
}

function drawProceduralFallback(g, w, h, type, t, r) {
 
 // Clear with theme-appropriate background
 const bgCols={
   menu:['#050709','#17191a'],
   home:['#050914','#1d2e42'],
   wife:['#0b0510','#33123f'],
   road:['#10080a','#4a2418'],
   school:['#050a14','#1a2e4a'],
   bunker:['#140606','#4a1a0c'],
   end:['#02080a','#0e3030'],
   dead:['#0a0000','#2a0606'],
   shop:['#04090a','#0e2220']
 }[type]||['#000','#123'];
 
 const gr=g.createLinearGradient(0,0,0,h);
 gr.addColorStop(0,bgCols[0]);
 gr.addColorStop(1,bgCols[1]);
 g.fillStyle=gr;
 g.fillRect(0,0,w,h);
 
 // Ambient stars/particles
 g.fillStyle='#fff';
 for(let i=0;i<90;i++){
   g.globalAlpha=.15+.5*Math.abs(Math.sin(t*.8+i));
   g.fillRect(r()*w,r()*h*.6,1.5,1.5);
 }
 g.globalAlpha=1;
 
 // Moon (visible in most scenes)
 g.fillStyle='rgba(215,232,255,.9)';
 g.beginPath();
 g.arc(w*.8,h*.2,h*.05,0,6.3);
 g.fill();
 g.fillStyle='rgba(215,232,255,.07)';
 g.beginPath();
 g.arc(w*.8,h*.2,h*.12,0,6.3);
 g.fill();
 
 const hz=h*.66;
 
 // ===== MENU SCENE - The House at Night =====
 if(type==='menu'){
   // Ground
   g.fillStyle='#04141a';
   g.fillRect(0,hz,w,h-hz);
   
   // Ocean waves
   for(let k=0;k<6;k++){
     g.strokeStyle=`rgba(77,255,200,${.05+k*.02})`;
     g.beginPath();
     for(let x=0;x<=w;x+=12){
       const y=hz+k*18+8+Math.sin(x*.02+t*.8+k)*5;
       x?g.lineTo(x,y):g.moveTo(x,y);
     }
     g.stroke();
   }
   g.strokeStyle='rgba(77,255,170,.5)';
   g.lineWidth=2;
   g.beginPath();
   for(let x=0;x<=w;x+=10){
     const y=hz+Math.sin(x*.015+t)*3;
     x?g.lineTo(x,y):g.moveTo(x,y);
   }
   g.stroke();
   g.lineWidth=1;
   
   // Stars
   g.strokeStyle='rgba(90,255,200,.35)';
   g.lineWidth=3;
   for(let k=0;k<9;k++){
     g.beginPath();
     let x=w*(.1+k*.1),y=h;
     g.moveTo(x,y);
     for(let s=0;s<8;s++){
       x+=Math.sin(t*.6+k+s)*16;
       y-=h*.07;
       g.lineTo(x,y);
     }
     g.stroke();
   }
   g.lineWidth=1;
   
   // The House - Pixel art style
   const houseX=w*.5,houseY=hz-80,houseW=200,houseH=120;
   
   // House base
   g.fillStyle='#0b0d0f';
   g.fillRect(houseX-houseW/2,houseY,houseW,houseH);
   
   // Roof
   g.fillStyle='#2a2d2f';
   g.beginPath();
   g.moveTo(houseX-houseW/2-20,houseY);
   g.lineTo(houseX,houseY-40);
   g.lineTo(houseX+houseW/2+20,houseY);
   g.closePath();
   g.fill();
   
   // Windows with light
   g.fillStyle='#c7b88e';
   const winW=24,winH=24;
   g.fillRect(houseX-40,houseY+20,winW,winH);
   g.fillRect(houseX+20,houseY+20,winW,winH);
   g.fillRect(houseX-40,houseY+60,winW,winH);
   g.fillRect(houseX+20,houseY+60,winW,winH);
   
   // Window flicker animation
   if(Math.sin(t*2)%1>.5){
     g.fillStyle='rgba(200,180,140,.4)';
     g.fillRect(houseX-40,houseY+20,winW,winH);
   }
   if(Math.sin(t*2+1)%1>.5){
     g.fillStyle='rgba(200,180,140,.4)';
     g.fillRect(houseX+20,houseY+60,winW,winH);
   }
   
   // Door
   g.fillStyle='#57503f';
   g.fillRect(houseX-10,houseY+houseH-30,20,30);
   
   // Chimney
   g.fillStyle='#3a3d3f';
   g.fillRect(houseX+50,houseY-50,16,30);
   
   // Tree silhouette
   g.fillStyle='#1a2622';
   g.beginPath();
   g.moveTo(houseX-100,houseY+houseH);
   g.lineTo(houseX-80,houseY-20);
   g.lineTo(houseX-60,houseY+houseH);
   g.closePath();
   g.fill();
   
   // Fence
   for(let x=0;x<w;x+=15){
     g.fillStyle='#5d574d';
     g.fillRect(x,houseY+houseH+10,3,20);
   }
   
   // Bloom spores floating in air
   for(let i=0;i<20;i++){
     const px=(t*100+i*37)%w;
     const py=hz-50+Math.sin(t*2+i)*30;
     g.fillStyle=`rgba(77,255,160,${.2+.3*Math.sin(t+i)})`;
     g.beginPath();
     g.arc(px,py,2+Math.sin(t+i)*1,0,6.3);
     g.fill();
   }
 }
 
 // ===== HOME DEFENSE - Chapter 1 =====
 else if(type==='home'){
   g.fillStyle='#050608';
   g.fillRect(0,hz,w,h-hz);
   
   // Road
   g.beginPath();
   g.moveTo(w*.2-12,hz-90);
   g.lineTo(w*.2+75,hz-150);
   g.lineTo(w*.2+162,hz-90);
   g.fillStyle='#2a2d2f';
   g.fill();
   
   // House
   g.fillStyle='#0b0d0f';
   g.fillRect(w*.2,hz-90,150,90);
   
   // Windows with warm light
   g.fillStyle='#e8b84a';
   g.fillRect(w*.2+30,hz-60,24,24);
   g.fillRect(w*.2+90,hz-60,24,24);
   
   // Broken window effect
   g.fillStyle='#000';
   g.fillRect(w*.2+35,hz-55,8,8);
   g.fillRect(w*.2+95,hz-50,10,10);
   
   // Car in driveway
   g.fillStyle='#8a2a2a';
   g.fillRect(w*.2+50,hz-10,40,20);
   g.fillStyle='#5a1a10';
   g.fillRect(w*.2+55,hz-5,30,10);
   
   // Trees
   for(let x of [w*.1,w*.8]){
     g.fillStyle='#1a2622';
     g.beginPath();
     g.moveTo(x-20,hz-90);
     g.lineTo(x,hz-130);
     g.lineTo(x+20,hz-90);
     g.closePath();
     g.fill();
   }
   
   // Bloom spores on ground
   g.fillStyle='rgba(77,255,160,.15)';
   g.beginPath();
   g.arc(w*.2+75,hz-20,40,0,6.3);
   g.fill();
   
   // Flickering candle in window
   if(Math.sin(t*3)%1>.3){
     g.fillStyle='#ffd34d';
     g.beginPath();
     g.arc(w*.2+35,hz-50,4,0,6.3);
     g.fill();
   }
 }
 
 // ===== THE BLOOM-WIFE - Chapter 2 =====
 else if(type==='wife'){
   g.fillStyle='#07040a';
   g.fillRect(0,hz,w,h-hz);
   
   // Dark silhouette of house interior
   g.fillStyle='#0a0710';
   g.beginPath();
   g.ellipse(w*.5,hz-40,48,80,0,0,6.3);
   g.fill();
   
   // Circular window with eerie light
   g.beginPath();
   g.arc(w*.5,hz-150,34,0,6.3);
   g.fill();
   
   // Maya's eyes in the darkness
   g.fillStyle='#e060ff';
   g.globalAlpha=.7+.3*Math.sin(t*3);
   g.fillRect(w*.5-16,hz-156,9,5);
   g.fillRect(w*.5+8,hz-156,9,5);
   g.globalAlpha=1;
   
   // Bloom tendrils
   g.strokeStyle='rgba(140,60,255,.4)';
   g.lineWidth=3;
   for(let i=0;i<5;i++){
     const a=i*1.5;
     g.beginPath();
     g.moveTo(w*.5,hz-150);
     g.quadraticCurveTo(w*.5+Math.cos(a)*100,hz-100+Math.sin(a)*50,w*.5+Math.cos(a)*150,hz-50);
     g.stroke();
   }
   g.lineWidth=1;
   
   // Floating bloom particles
   for(let i=0;i<30;i++){
     const px=(t*50+i*23)%w;
     const py=hz-100+Math.sin(t+i)*40;
     g.fillStyle=`rgba(140,60,255,${.15+.2*Math.sin(t*2+i)})`;
     g.beginPath();
     g.arc(px,py,1+Math.sin(t*3+i)*0.5,0,6.3);
     g.fill();
   }
   
   // Broken furniture
   g.fillStyle='#3a2a20';
   g.fillRect(w*.3,hz-20,40,15);
   g.fillRect(w*.6,hz-30,35,12);
 }
 
 // ===== THE ROAD - Chapter 3 =====
 else if(type==='road'){
   g.fillStyle='#0a0a0c';
   g.fillRect(0,hz,w,h-hz);
   
   // Highway
   g.fillStyle='#16171a';
   g.beginPath();
   g.moveTo(w*.45,hz);
   g.lineTo(w*.55,hz);
   g.lineTo(w*.95,h);
   g.lineTo(w*.05,h);
   g.closePath();
   g.fill();
   
   // Road markings
   g.fillStyle='#caa24a';
   for(let k=0;k<8;k++){
     const y=hz+Math.pow(k/8,2)*(h-hz)+((t*30)%12);
     const s=1+k*.5;
     g.fillRect(w*.5-s,y,s*2,s*3);
   }
   
   // Abandoned cars
   for(const[x,s]of[[.3,1],[.62,1.4],[.72,.8]]){
     g.fillStyle='#050505';
     g.fillRect(w*x,hz+30*s,60*s,22*s);
     // Car windows
     g.fillStyle='#2a2d2f';
     g.fillRect(w*x+10*s,hz+35*s,20*s,10*s);
     g.fillRect(w*x+35*s,hz+35*s,15*s,10*s);
   }
   
   // Street lights
   for(let x of [w*.2,w*.4,w*.6,w*.8]){
     g.fillStyle='#3a3d3f';
     g.fillRect(x-2,hz-100,4,80);
     g.fillStyle='#c7b88e';
     g.beginPath();
     g.arc(x,hz-110,8,0,6.3);
     g.fill();
   }
   
   // Rain effect
   if(S.weather){for(let i=0;i<40;i++){
     const rx=(t*100+i*17)%w;
     const ry=hz+Math.sin(t*5+i)*20+i*3;
     g.strokeStyle='rgba(170,200,230,.4)';
     g.beginPath();
     g.moveTo(rx,ry);
     g.lineTo(rx-2,ry+8);
     g.stroke();
   }}
   
   // Bloom patches on road
   g.fillStyle='rgba(77,255,160,.1)';
   g.beginPath();
   g.arc(w*.5,hz+50,30,0,6.3);
   g.fill();
   g.beginPath();
   g.arc(w*.3,hz+100,20,0,6.3);
   g.fill();
 }
 
 // ===== SCHOOL SHELTER - Chapter 4 =====
 else if(type==='school'){
   g.fillStyle='#050608';
   g.fillRect(0,hz,w,h-hz);
   
   // School building
   g.fillStyle='#050608';
   g.fillRect(w*.25,hz-120,w*.5,120);
   
   // Windows with lights
   g.fillStyle='#e8c860';
   for(let a=0;a<6;a++){
     for(let b=0;b<2;b++){
       if((a*3+b*5+Math.floor(t*.5))%4){
         g.fillRect(w*.27+a*w*.08,hz-100+b*45,22,26);
       }
     }
   }
   
   // Door
   g.fillStyle='#050608';
   g.fillRect(w*.5-3,hz-170,3,52);
   
   // HELP sign on roof
   g.fillStyle='#ff5a5a';
   g.font='bold 24px monospace';
   g.textAlign='center';
   g.fillText('HELP',w*.5,hz-130);
   g.textAlign='left';
   
   // Bus
   g.fillStyle='#d8a81c';
   g.fillRect(w*.15,hz-30,80,25);
   g.fillStyle='#162226';
   g.fillRect(w*.18,hz-25,70,15);
   
   // People silhouettes
   for(let x of [w*.3,w*.4,w*.6,w*.7]){
     g.fillStyle='#1a2622';
     g.beginPath();
     g.moveTo(x-5,hz-50);
     g.lineTo(x,hz-70);
     g.lineTo(x+5,hz-50);
     g.closePath();
     g.fill();
   }
   
   // Bloom spores
   g.fillStyle='rgba(77,255,160,.12)';
   g.beginPath();
   g.arc(w*.8,hz-40,25,0,6.3);
   g.fill();
 }
 
 // ===== FINAL ESCAPE - Chapter 5 =====
 else if(type==='bunker'){
   g.fillStyle='#0a0504';
   g.fillRect(0,hz,w,h-hz);
   
   // Bunker entrance
   g.fillStyle='#2a2e30';
   g.fillRect(w*.4,hz-70,w*.2,70);
   
   // Bunker door
   g.fillStyle='#0c2a1a';
   g.fillRect(w*.47,hz-50,w*.06,50);
   
   // Warning lights
   g.fillStyle=`rgba(255,80,40,${.6+.4*Math.sin(t*6)})`;
   for(let k=0;k<3;k++){
     g.fillRect(((t*60+k*w*.35)%w),h*.15+k*20,8,3);
   }
   
   // Ruined buildings
   for(let x of [w*.1,w*.9]){
     g.fillStyle='#3a2a20';
     g.fillRect(x-20,hz-100,40,60);
     g.fillStyle='#1a1008';
     g.beginPath();
     g.moveTo(x-25,hz-100);
     g.lineTo(x,hz-120);
     g.lineTo(x+25,hz-100);
     g.closePath();
     g.fill();
   }
   
   // Burning car
   g.fillStyle='#5a2a22';
   g.fillRect(w*.25,hz-40,60,20);
   g.fillStyle='#ff9a30';
   g.beginPath();
   g.arc(w*.28,hz-35,8,0,6.3);
   g.fill();
   g.beginPath();
   g.arc(w*.45,hz-35,6,0,6.3);
   g.fill();
   
   // Smoke
   for(let i=0;i<15;i++){
     const px=w*.25+Math.sin(t+i)*10;
     const py=hz-50-i*3;
     g.fillStyle=`rgba(100,80,60,${.2-.01*i})`;
     g.beginPath();
     g.arc(px,py,8+i%3,0,6.3);
     g.fill();
   }
   
   // Military vehicle
   g.fillStyle='#3a4a3a';
   g.fillRect(w*.6,hz-35,50,25);
   g.fillStyle='#1a2a1a';
   g.fillRect(w*.62,hz-30,40,15);
   
   // Bombing warning lights
   g.fillStyle='rgba(255,50,50,.5)';
   for(let x of [w*.1,w*.9]){
     g.beginPath();
     g.arc(x,h*.15,5,0,6.3);
     g.fill();
   }
 }
 
 // ===== ENDING SCENE =====
 else if(type==='end'){
   g.fillStyle='#02080a';
   g.fillRect(0,hz,w,h-hz);
   
   // Ocean
   for(let k=0;k<6;k++){
     g.strokeStyle=`rgba(77,255,200,${.05+k*.02})`;
     g.beginPath();
     for(let x=0;x<=w;x+=12){
       const y=hz+k*18+8+Math.sin(x*.02+t*.8+k)*5;
       x?g.lineTo(x,y):g.moveTo(x,y);
     }
     g.stroke();
   }
   g.strokeStyle='rgba(77,255,170,.5)';
   g.lineWidth=2;
   g.beginPath();
   for(let x=0;x<=w;x+=10){
     const y=hz+Math.sin(x*.015+t)*3;
     x?g.lineTo(x,y):g.moveTo(x,y);
   }
   g.stroke();
   g.lineWidth=1;
   
   // Stars
   g.strokeStyle='rgba(90,255,200,.35)';
   g.lineWidth=3;
   for(let k=0;k<9;k++){
     g.beginPath();
     let x=w*(.1+k*.1),y=h;
     g.moveTo(x,y);
     for(let s=0;s<8;s++){
       x+=Math.sin(t*.6+k+s)*16;
       y-=h*.07;
       g.lineTo(x,y);
     }
     g.stroke();
   }
   g.lineWidth=1;
   
   // Bunker silhouette
   g.fillStyle='#0a0c0a';
   g.fillRect(w*.4,hz-50,w*.2,50);
   g.fillStyle='#1a1c1a';
   g.beginPath();
   g.moveTo(w*.4-5,hz-50);
   g.lineTo(w*.45,hz-60);
   g.lineTo(w*.55,hz-60);
   g.lineTo(w*.6+5,hz-50);
   g.closePath();
   g.fill();
   
   // Sunrise/sunset
   g.fillStyle='rgba(255,180,100,.1)';
   g.beginPath();
   g.arc(w*.1,h*.2,40,0,6.3);
   g.fill();
   
   // Hopeful bloom particles
   for(let i=0;i<25;i++){
     const px=(t*80+i*27)%w;
     const py=h*.3+Math.sin(t*2+i)*30;
     g.fillStyle=`rgba(77,255,160,${.2+.3*Math.sin(t*3+i)})`;
     g.beginPath();
     g.arc(px,py,2,0,6.3);
     g.fill();
   }
 }
 
 // ===== DEAD SCENE =====
 else if(type==='dead'){
   g.fillStyle='#0a0000';
   g.fillRect(0,hz,w,h-hz);
   
   // Blood red atmosphere
   g.fillStyle='#2a0606';
   g.beginPath();
   g.ellipse(w*.5,hz-40,48,80,0,0,6.3);
   g.fill();
   
   // Maya's eyes
   g.fillStyle='#e060ff';
   g.globalAlpha=.7+.3*Math.sin(t*3);
   g.fillRect(w*.5-16,hz-156,9,5);
   g.fillRect(w*.5+8,hz-156,9,5);
   g.globalAlpha=1;
   
   // Bloom tendrils
   g.strokeStyle='rgba(140,60,255,.3)';
   g.lineWidth=4;
   for(let i=0;i<6;i++){
     const a=i*1.05;
     g.beginPath();
     g.moveTo(w*.5,hz-150);
     g.quadraticCurveTo(w*.5+Math.cos(a)*120,hz-80+Math.sin(a)*60,w*.5+Math.cos(a)*180,hz-30);
     g.stroke();
   }
   g.lineWidth=1;
   
   // Floating spores
   for(let i=0;i<40;i++){
     const px=(t*60+i*23)%w;
     const py=hz-120+Math.sin(t*2+i)*50;
     g.fillStyle=`rgba(140,60,255,${.1+.2*Math.sin(t+i)})`;
     g.beginPath();
     g.arc(px,py,1+Math.sin(t*3+i)*0.8,0,6.3);
     g.fill();
   }
   
   // Broken house
   g.fillStyle='#1a1008';
   g.fillRect(w*.3,hz-60,80,40);
   g.fillStyle='#3a2a20';
   g.beginPath();
   g.moveTo(w*.28,hz-60);
   g.lineTo(w*.35,hz-80);
   g.lineTo(w*.55,hz-70);
   g.lineTo(w*.58,hz-60);
   g.closePath();
   g.fill();
 }
 
 // ===== SHOP SCENE =====
 else if(type==='shop'){
   g.fillStyle='#04090a';
   g.fillRect(0,hz,w,h-hz);
   
   // Shelves
   g.fillStyle='#3a4560';
   for(let x of [w*.2,w*.5,w*.8]){
     g.fillRect(x-20,hz-80,40,60);
     // Items on shelves
     for(let i=0;i<4;i++){
       g.fillStyle=`rgba(200,180,140,${.3+.2*Math.sin(t+i)})`;
       g.fillRect(x-15+i*8,hz-60+i*10,6,8);
     }
   }
   
   // Counter
   g.fillStyle='#5a4a3a';
   g.fillRect(w*.3,hz-40,w*.4,30);
   
   // Light above counter
   g.fillStyle='rgba(255,230,180,.15)';
   g.beginPath();
   g.arc(w*.5,hz-50,30,0,6.3);
   g.fill();
   
   // Supplies on counter
   for(let x of [w*.35,w*.45,w*.55]){
     g.fillStyle='#8a6a3a';
     g.fillRect(x-5,hz-45,10,10);
     g.fillStyle='#c7b88e';
     g.fillRect(x-3,hz-43,6,6);
   }
   
   // Bloom spores in corner
   g.fillStyle='rgba(77,255,160,.1)';
   g.beginPath();
   g.arc(w*.15,hz-20,15,0,6.3);
   g.fill();
 }
 
 // Stars for all scenes
 for(let i=0;i<46;i++){
   const x=(r()*w+t*(8+i%5*4))%w;
   const y=h-((r()*h+t*(12+i%7*3))%h);
   g.fillStyle=`rgba(77,255,160,${.12+.2*Math.sin(t+i)})`;
   g.beginPath();
   g.arc(x,y,1+i%3,0,6.3);
   g.fill();
 }
}

function seg(key,opts){return cfgSeg(key,opts);}
function onoff(key){return cfgOnOff(key);}
function cfgSeg(key,opts){return`<div class="cfg-options">${opts.map(([v,l])=>`<button class="cfg-opt ${S[key]===v?'active':''}" onclick="setS('${key}',${typeof v==='string'?`'${v}'`:v})">${l}</button>`).join('')}</div>`;}
function cfgOnOff(key){return cfgSeg(key,[[true,'ON'],[false,'OFF']]);}
function setS(k,v){S[k]=v;saveS();applyTheme();if(k==='volume'&&typeof setVol==='function')setVol();showSettings();}
let settingsBack='menu', settingsTab='diff';
function setTab(t){settingsTab=t;showSettings();}

function showSettings(){
 const th=THEMES,inGame=state==='play'||state==='pause';
 const zoomPct=S.zoom===.85?'85%':(S.zoom===1.2?'120%':'100%');
 const diffCards=['story','survivor','nightmare'].map(k=>{
  const d=DIFFS[k],sel=S.difficulty===k;
  return `<div class="diff-card ${k}${sel?' selected':''}" onclick="setS('difficulty','${k}')" style="${sel?`border-left-color:${d.col}`:''}">
   <div class="diff-card-hdr"><b style="color:${d.col}">${d.name}</b>${sel?'<span class="diff-card-active">ACTIVE</span>':''}</div>
   <div class="diff-card-desc">${d.desc}</div>
  </div>`;
 }).join('');

 let tabContent='';
 if(settingsTab==='diff'){
  tabContent=`<div class="cfg-panel">
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">PRESET SELECTION</span><span class="cfg-sub">Difficulty calibration</span></div>
    ${cfgSeg('difficulty',[['story','STORY'],['survivor','SURVIVOR'],['nightmare','NIGHTMARE']])}
   </div>
   <div class="diff-cards" style="margin:4px 0">${diffCards}</div>
   ${inGame?'<div style="font-size:11px;color:#ff6a6a;letter-spacing:1px;margin-top:2px">* Difficulty changes take effect on next deployment</div>':''}
  </div>`;
 } else if(settingsTab==='gfx'){
  tabContent=`<div class="cfg-panel">
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">PALETTE THEME</span><span class="cfg-sub">Atmospheric lighting tint</span></div>
    ${cfgSeg('theme',Object.keys(th).map(k=>[k,th[k].name]))}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">RENDER QUALITY</span><span class="cfg-sub">Lighting and shadow precision</span></div>
    ${cfgSeg('gfx',[['low','LOW'],['medium','MEDIUM'],['high','HIGH']])}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">BRIGHTNESS</span><span class="cfg-sub">Ambient exposure</span></div>
    ${cfgSeg('bright',[['dim','DIM'],['normal','NORMAL'],['bright','BRIGHT']])}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">CAMERA ZOOM (${zoomPct})</span><span class="cfg-sub">Isometric viewport scale</span></div>
    ${cfgSeg('zoom',[[.85,'FAR (85%)'],[1,'NORMAL (100%)'],[1.2,'CLOSE (120%)']])}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">DYNAMIC LIGHTING</span><span class="cfg-sub">Real-time point lights & flashlight</span></div>
    ${cfgOnOff('lighting')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">FILM GRAIN</span><span class="cfg-sub">Cinematic noise overlay</span></div>
    ${cfgOnOff('grain')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">WEATHER & ASH</span><span class="cfg-sub">Atmospheric rain and particulate</span></div>
    ${cfgOnOff('weather')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">SPORE PARTICLES</span><span class="cfg-sub">Bio-decay drifting motes</span></div>
    ${cfgOnOff('particles')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">SCREEN SHAKE</span><span class="cfg-sub">Impact & explosive camera kick</span></div>
    ${cfgOnOff('shake')}
   </div>
  </div>`;
 } else if(settingsTab==='audio'){
  tabContent=`<div class="cfg-panel">
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">MASTER AUDIO</span><span class="cfg-sub">Synthesized horror soundscapes</span></div>
    ${cfgSeg('volume',[[0,'MUTE'],[.3,'30%'],[.6,'60%'],[1,'100%']])}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">AUTO-AIM ASSIST</span><span class="cfg-sub">Locks onto nearby threats</span></div>
    ${cfgOnOff('assist')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">ENEMY VITALITY BARS</span><span class="cfg-sub">Tactical health indicators</span></div>
    ${cfgOnOff('bars')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">RADAR MINIMAP</span><span class="cfg-sub">Top-down biometric radar</span></div>
    ${cfgOnOff('minimap')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">CINEMATIC SUBTITLES</span><span class="cfg-sub">Dialogue and radio logs</span></div>
    ${cfgOnOff('subs')}
   </div>
  </div>`;
 } else {
  tabContent=`<div class="cfg-panel">
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">HIGH CONTRAST MODE</span><span class="cfg-sub">Enhanced visibility for floor tiles</span></div>
    ${cfgOnOff('accessibility')}
   </div>
   <div class="cfg-row">
    <div class="cfg-label"><span class="cfg-title">REDUCED MOTION</span><span class="cfg-sub">Suppresses screen tremors and rapid flashes</span></div>
    ${cfgOnOff('reducedMotion')}
   </div>
  </div>`;
 }

 showOv(`<div class="cfg-shell">
  <div class="ttl" style="font-size:36px;letter-spacing:6px">CONFIGURATION</div>
  <div class="sub">SURVIVAL PROTOCOLS &amp; HARDWARE</div>
  <div class="cfg-tabs">
   <button class="cfg-tab ${settingsTab==='diff'?'active':''}" onclick="setTab('diff')">01. DIFFICULTY</button>
   <button class="cfg-tab ${settingsTab==='gfx'?'active':''}" onclick="setTab('gfx')">02. GRAPHICS</button>
   <button class="cfg-tab ${settingsTab==='audio'?'active':''}" onclick="setTab('audio')">03. AUDIO &amp; HUD</button>
   <button class="cfg-tab ${settingsTab==='access'?'active':''}" onclick="setTab('access')">04. ACCESSIBILITY</button>
  </div>
  ${tabContent}
  <div class="row" style="margin-top:16px;gap:12px">
   <button class="btn reset-btn" onclick="Object.assign(S,DEF);saveS();applyTheme();if(typeof setVol==='function')setVol();showSettings()">\u21bb RESET TO DEFAULTS</button>
   <button class="btn" onclick="${settingsBack==='pause'?'showPause()':'showMenu()'}">\u2190 RETURN</button>
  </div>
 </div>`,'menu');
}
function showControls(){showOv(`<div class="ttl" style="font-size:34px">HOW TO PLAY</div><div class="sub">PROTECT NANCY \u2014 SURVIVE THE BLOOM</div>
 <div class="kv"><b>WASD / ARROWS</b><span>Move (screen-relative)</span><b>SPACE</b><span>Attack \u2014 auto-aims at nearby enemies (hold to keep swinging)</span><b>MOUSE CLICK</b><span>Attack toward the cursor</span><b>SHIFT</b><span>Sprint (uses stamina, makes noise)</span><b>F</b><span>Dodge roll (brief invulnerability)</span><b>R</b><span>Parry \u2014 time it against an incoming swing</span><b>Q</b><span>Use a medkit \u2014 heals you, or Nancy if she is hurt and close</span><b>E</b><span>Carry / put down Nancy (she is safe, but you cannot attack)</span><b>M</b><span>Big map</span><b>P / ESC</b><span>Pause</span></div>
 <div class="txt" style="font-size:14px">Enemies notice noise and movement. Stand still to be harder to spot. Bloated infected explode when killed \u2014 back away. Glowing bloom patches raise your infection; antidotes lower it. If it gets too high, the ending changes.</div>
 <div class="txt" style="font-size:13px;color:#7dffb0">Halo rings on the ground show who is who: <b style="color:#3aff70">green</b> is healthy, <b style="color:#ffd34d">yellow</b> to <b style="color:#ff8a3a">orange</b> is rising infection, <b style="color:#ff4040">red</b> is infected, <b style="color:#c040ff">violet</b> is Maya.</div>
 <div class="row"><button class="btn" onclick="showMenu()">\u2190 BACK</button></div>`,'menu');}
const CHAPTER_DESC=[
 'The power grid is dead. Hold the family home against three waves before the front door gives way.',
 'Maya is still somewhere inside the thing that has taken her body. Survive the encounter — and hear what remains of her.',
 'Cross the rain-lashed wreckage of Route 101 while infected stalkers hunt from the dark.',
 'Stand with the last defenders of St. Jude’s as the shelter is overrun.',
 'A military strike is minutes away. Reach Bunker 7 with Nancy or lose everything.'
];
function showChapters(){const n=['Home Defence','The Face I Loved','Miles of Silence','No Safe Haven','The Point Of No Return'];
 const cards=n.map((x,i)=>{
  const isUnlocked=i<=unlocked;
  const rawB=(typeof bloomScores!=='undefined'&&bloomScores)?bloomScores[i]:null;
  const best=(typeof rawB==='object'&&rawB!==null)?rawB.score:(rawB||(typeof bloomBst!=='undefined'?bloomBst[i]:null));
  const diffKey=(typeof rawB==='object'&&rawB!==null&&rawB.diff)?rawB.diff:((i<unlocked||best)?S.difficulty:null);
  return `<div class="chapter-card ${isUnlocked?'':'chapter-locked'}" ${isUnlocked?`onclick="chapter(${i})" role="button" tabindex="0"`:''}>
   <div class="chapter-card-inner">
    <div class="chapter-thumb" style="background-image:url('assets/art/chapter${i+1}.jpg'),url('public/assets/art/chapter${i+1}.jpg');background-size:cover,cover;background-position:center,center;">
     ${!isUnlocked?'<div class="chapter-thumb-lock">&#128274;</div>':''}
    </div>
    <div class="chapter-info">
     <div class="chapter-card-top">
      <div class="chapter-title"><span class="chapter-num">${i+1}.</span> ${x}</div>
      <div class="chapter-meta">
       ${!isUnlocked?'<span class="chapter-lock">&#128274; LOCKED</span>':`
        ${best?`<span class="chapter-score">&#9733; BEST: ${best}</span>`:''}
        ${diffKey?`<span class="diff-badge ${diffKey}">${DIFFS[diffKey]?.name||diffKey.toUpperCase()}</span>`:''}
       `}
      </div>
     </div>
     <div class="chapter-desc">${CHAPTER_DESC[i]}</div>
    </div>
   </div>
  </div>`;
 }).join('');
 showOv(`<div class="ttl" style="font-size:34px">CHAPTERS</div><div class="sub">SELECT A CHAPTER TO BEGIN</div><div class="chapter-list">${cards}</div><div class="row" style="margin-top:16px"><button class="btn" onclick="showMenu()">\u2190 BACK</button></div>`,'menu');}
function chapter(i){G=newGame();G.level=i;showIntro(i);}
function showMenu(){applyTheme();settingsBack='menu';state='menu';LV=null;$('hud').style.display='none';applyTheme();
 const contCh=Math.min(unlocked,4);
 showOv(`<div class="menu-shell">
  <img class="brand-logo" src="logo.svg" alt="THE BLOOM">
  <div class="menu-rule"></div>
  <div class="menu-tagline">"A father. A daughter. A world consumed."</div>
  <div class="menu-actions">
   ${unlocked>0?`<button class="btn continue-btn" onclick="chapter(${contCh})">CONTINUE</button>`:''}
   <button class="btn" onclick="newRun()">NEW GAME</button>
   <button class="btn" onclick="showChapters()">CHAPTERS</button>
   <button class="btn" onclick="settingsBack='menu';showSettings()">SETTINGS</button>
   <button class="btn" onclick="showControls()">CONTROLS</button>
  </div>
  <div class="txt menu-quote">"The horror is not the monsters.<br>It is watching the world decay while you try to keep one person safe."</div>
  <div class="menu-version">THE BLOOM \u2014 2000s SURVIVAL HORROR &nbsp;&bull;&nbsp; <span class="diff-badge ${S.difficulty}">${DIFFS[S.difficulty].name}</span></div>
 </div>`,'menu');}
function newRun(){G=newGame();showIntro(0);}
let introIdx=0;
function showIntro(i){introIdx=i;state='intro';const I=INTRO[i];$('hud').style.display='none';
 showOv(`<div class="sub" style="margin-top:0">CHAPTER ${i+1} OF 5</div><div class="ttl" style="font-size:54px">${I.t}</div>
 <div class="txt" id="typ"></div><div class="sub" style="color:#ffc46b">${I.tip}</div><button class="btn" onclick="introGo()">\u25b6 BEGIN</button>`,I.scene);
 let n=0;const el=$('typ');const iv=setInterval(()=>{if(state!=='intro'||!$('typ')){clearInterval(iv);return;}n+=2;el.textContent=I.txt.slice(0,n);if(n>=I.txt.length)clearInterval(iv);},28);}
function introGo(){if(state==='intro')startLevel(introIdx);}
function showPause(){if(state==='play')settingsBack='pause';state='pause';showOv(`<div class="ttl" style="font-size:54px">PAUSED</div><div class="sub">${INTRO[G.level].t}</div>
 <button class="btn" onclick="resume()">\u25b6 RESUME</button><button class="btn" onclick="settingsBack='pause';showSettings()">\u2699 SETTINGS</button><button class="btn" onclick="showMenu()">\u2302 QUIT TO MENU</button>`);state='pause';}
function resume(){if(state!=='pause'||!LV)return;$('ov').style.display='none';state='play';}
const SHOP=[{id:'med',n:'MEDKIT',d:'+1 medkit (heals 35)',c:250,max:9},{id:'dmg',n:'REINFORCED PIPE',d:'+15% melee damage',c:400,max:3},{id:'hp',n:'ADRENALINE',d:'+15 max health',c:350,max:3},{id:'anti',n:'ANTIVIRAL',d:'\u221230 infection',c:300,max:99},{id:'trust',n:'COMFORT NANCY',d:'+25 trust',c:200,max:99}];
function showShop(next){state='shop';$('hud').style.display='none';
 showOv(`<div class="sub" style="margin-top:0">SAFE ROOM</div><div class="ttl" style="font-size:42px">SUPPLIES</div>
 <div class="kv"><span>Points</span><b>${G.score}</b><span>Health</span><b>${Math.round(G.hp)}/${G.maxHp}</b><span>Medkits</span><b>${G.meds}</b><span>Infection</span><b>${Math.round(G.infect)}%</b><span>Honour</span><b>${Math.round(G.honour)}</b></div>
 ${SHOP.map(s=>{const n=G.bought[s.id]||0,ok=G.score>=s.c&&n<s.max;return`<div class="shop"><div>${s.n}<small>${s.d}</small></div><span>${s.c} pts</span><button class="btn ${ok?'':'off'}" onclick="buy('${s.id}',${next})">BUY</button></div>`;}).join('')}
 <div class="row" style="margin-top:12px"><button class="btn" onclick="showIntro(${next})">CONTINUE \u25b6</button></div>`,'shop');}
function buy(id,next){const s=SHOP.find(x=>x.id===id);if(!s||G.score<s.c)return;G.score-=s.c;G.bought[id]=(G.bought[id]||0)+1;
 if(id==='med')G.meds++;else if(id==='dmg')G.dmgUp++;else if(id==='hp'){G.maxHp+=15;G.hp+=15;}else if(id==='anti')G.infect=Math.max(0,G.infect-30);else G.trust=Math.min(100,G.trust+25);SFX.pick();showShop(next);}
function showEnding(){state='end';$('hud').style.display='none';
 const dark=G.infect>=85,good=!dark&&G.hp>30;let name,col,txt;
 if(dark){name='DARK ENDING';col='#9a7bff';txt='The fever broke inside the bunker, and it broke him too. Nancy watched her father\'s eyes turn the color of the sea.<br>He told her to run. She ran. She did not look back.<br><i>"I love you, Papa."</i>';}
 else if(good){name='GOOD ENDING';col='#4dffa0';txt='David and Nancy sealed the bunker door as the first bombs fell. The Bloom above them burned.<br>But spores were already drifting over the water, toward some other shore.<br><i>They survived the day. The Bloom was not finished.</i>';}
 else{name='SACRIFICE ENDING';col='#ff9a5a';txt='At the threshold, David held the last of them back alone. He pushed Nancy inside and sealed the door.<br>She pressed her hands against the cold steel until they went numb.<br><i>Every night she repeats what he told her. She will keep repeating it until the world remembers light.</i>';}
 showOv(`<div class="ttl" style="font-size:58px;color:${col}">${name}</div><div class="sub">THE BLOOM</div><div class="txt">${txt}</div>

 <div class="kv"><span>Score</span><b>${G.score}</b><span>Health</span><b>${Math.round(G.hp)}%</b><span>Infection</span><b>${Math.round(G.infect)}%</b><span>Difficulty</span><b>${DIFFS[S.difficulty].name}</b></div>
 <div class="row"><button class="btn" onclick="showMenu()">▶ PLAY AGAIN</button></div>`,'end');}