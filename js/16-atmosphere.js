/* THE BLOOM — p5.js instance-mode atmosphere layer.
   It is a transparent presentation layer, not a second game engine.
   The existing game loop calls redraw(); p5 never runs its own continuous loop. */
(function(){
 'use strict';
 let sketch=null,clock=0,lastQuality='',fallbackWarned=false;
 const model={active:false,dt:0,quality:'high',weather:false,ash:false,infect:0,hp:1,theme:'#68d9a5',reduced:false};
 let motes=[],rain=[];
 const clamp01=v=>Math.max(0,Math.min(1,v));
 function seedParticles(p){
  const count=model.quality==='high'?96:model.quality==='medium'?48:0;
  motes=Array.from({length:count},()=>({
   x:p.random(p.width),y:p.random(p.height),r:p.random(1,2.8),
   vx:p.random(-7,7),vy:p.random(-20,-5),phase:p.random(Math.PI*2),
   a:p.random(38,104),spore:p.random()<.24
  }));
  rain=Array.from({length:model.quality==='high'?160:80},()=>({
   x:p.random(p.width),y:p.random(p.height),speed:p.random(520,980),lean:p.random(-180,-95),alpha:p.random(18,56)
  }));
 }
 function drawFallback(now,dt){
  if(!LV||!G||!cx||!['play','pause','over'].includes(state)||S.gfx==='low')return;
  const reduced=!!S.reducedMotion;
  const n=S.gfx==='high'?36:18;
  setScreen();cx.save();
  const fog=cx.createRadialGradient(W*.48,H*.72,0,W*.48,H*.72,H*.66);
  fog.addColorStop(0,'rgba(38,105,91,.13)');fog.addColorStop(1,'rgba(0,0,0,0)');
  cx.fillStyle=fog;cx.fillRect(0,0,W,H);
  for(let i=0;i<n;i++){
   const x=((i*97+now*.012*(i%3+1))% (W+30))-15;
   const y=(H-((i*71+now*.018*(i%5+1))%(H+20)));
   cx.fillStyle=i%5===0?'rgba(90,255,190,.42)':'rgba(205,224,211,.34)';
   cx.fillRect(x,y,1.6,1.6);
  }
  if(S.weather&&(LV.rain||LV.ash)){
   cx.strokeStyle=LV.ash?'rgba(190,190,170,.25)':'rgba(150,205,218,.38)';
   cx.lineWidth=1;cx.beginPath();
   const count=S.gfx==='high'?90:45;
   for(let i=0;i<count;i++){const x=(i*137+now*.17)%W,y=(i*83+now*.7)%H;cx.moveTo(x,y);cx.lineTo(x-3,y+12);}
   cx.stroke();
  }
  const hp=clamp01(G.hp/Math.max(1,G.maxHp));
  if(!reduced&&hp<.3){const a=(.025+.04*(.5+.5*Math.sin(now*.004)))*((.3-hp)/.3);const v=cx.createRadialGradient(W/2,H/2,H*.18,W/2,H/2,H*.8);v.addColorStop(0,'rgba(110,0,10,0)');v.addColorStop(1,'rgba(150,5,20,'+a+')');cx.fillStyle=v;cx.fillRect(0,0,W,H);}
  cx.restore();
 }
 function setupP5(){
  if(typeof window.p5!=='function')return false;
  try{
   sketch=new window.p5(function(p){
    let canvas;
    p.setup=function(){
     p.pixelDensity(1);
     canvas=p.createCanvas(window.innerWidth,window.innerHeight);
     canvas.id('bloom-p5-atmosphere');
     canvas.style('position','fixed');canvas.style('left','0');canvas.style('top','0');
     canvas.style('pointer-events','none');canvas.style('z-index','4');
     canvas.style('opacity','0.98');canvas.style('mix-blend-mode','screen');
     p.clear();p.noLoop();seedParticles(p);
    };
    p.windowResized=function(){p.resizeCanvas(window.innerWidth,window.innerHeight);seedParticles(p);};
    p.draw=function(){
     p.clear();
     if(!model.active||model.quality==='low')return;
     const d=model.reduced?0:Math.min(.05,Math.max(0,model.dt));
     const high=model.quality==='high',q=high?1:.64;
     const ctx=p.drawingContext;
     // Wide, soft teal haze gives the scene atmospheric depth without obscuring silhouettes.
     ctx.save();ctx.globalCompositeOperation='screen';ctx.filter=high?'blur(34px)':'blur(22px)';
     for(let i=0;i<4;i++){
      const drift=model.reduced?0:Math.sin(clock*.17+i*2.2)*p.width*.035;
      const x=p.width*(.18+i*.22)+drift;
      const y=p.height*(.58+(i%2)*.16)+Math.cos(clock*.12+i)*p.height*.025;
      const radius=p.height*(.18+(i%3)*.035);
      const g=ctx.createRadialGradient(x,y,2,x,y,radius);
      g.addColorStop(0,i%2?'rgba(42,155,125,.12)':'rgba(75,135,165,.085)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
     }
     ctx.restore();ctx.filter='none';ctx.globalCompositeOperation='source-over';
     // Spores are world-independent screen particles; counts are capped for mobile.
     p.noStroke();
     for(const m of motes){
      if(!model.reduced){m.x+=m.vx*d;m.y+=m.vy*d;}
      if(m.y<-6){m.y=p.height+6;m.x=p.random(p.width);}
      if(m.x<-6)m.x=p.width+6;else if(m.x>p.width+6)m.x=-6;
      const pulse=.55+.45*Math.sin(clock*1.5+m.phase);
      const a=m.a*pulse*q;
      if(m.spore&&model.infect>28)p.fill(100,255,188,a+24);
      else p.fill(205,224,218,a);
      p.circle(m.x,m.y,m.r*(m.spore?1.6:1));
      if(m.spore){p.fill(105,255,190,a*.18);p.circle(m.x,m.y,m.r*5);}
     }
     // Rain / drifting ash appears only on levels that already declare weather.
     if(model.weather){
      p.strokeWeight(high?1.15:.8);
      for(const r of rain){
       if(!model.reduced){r.y+=r.speed*d;r.x+=r.lean*d*.24;}
       if(r.y>p.height+18){r.y=-18;r.x=p.random(p.width);}
       if(r.x<-18)r.x=p.width+18;
       p.stroke(model.ash?205:145,model.ash?200:202,model.ash?178:216,r.alpha*q);
       p.line(r.x,r.y,r.x+(model.ash?2:-3),r.y+(model.ash?4:high?15:11));
      }
     }
     // Infection pressure builds at the frame edges, never over the center of the action.
     if(!model.reduced&&model.infect>42){
      const a=clamp01((model.infect-42)/58)*(.035+.025*Math.sin(clock*1.4));
      const v=ctx.createRadialGradient(p.width/2,p.height/2,p.height*.25,p.width/2,p.height/2,p.height*.82);
      v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(24,220,155,'+a+')');
      ctx.fillStyle=v;ctx.fillRect(0,0,p.width,p.height);
     }
     // Critical-health pressure is a separate restrained red edge vignette.
     const hp=clamp01(model.hp);
     if(!model.reduced&&hp<.3){
      const a=(.055+.045*(.5+.5*Math.sin(clock*4)))*((.3-hp)/.3);
      const v=ctx.createRadialGradient(p.width/2,p.height/2,p.height*.18,p.width/2,p.height/2,p.height*.82);
      v.addColorStop(0,'rgba(120,0,10,0)');v.addColorStop(1,'rgba(160,5,20,'+a+')');
      ctx.fillStyle=v;ctx.fillRect(0,0,p.width,p.height);
     }
    };
   },document.body);
   return true;
  }catch(err){
   try{console.warn('[THE BLOOM] p5 atmosphere unavailable; using Canvas fallback.',err);}catch(_){}
   return false;
  }
 }
 function drawAtmosphereOverlay(now,dt){
  model.active=['play','pause','over','menu','intro','shop','settings','chapters','end','dead'].includes(state);
  const overlay=$('ov');
  if(sketch&&sketch.canvas&&overlay){
   const inGame=!!LV&&['play','pause','over'].includes(state);
   const parent=inGame?document.body:overlay;
   if(sketch.canvas.parentNode!==parent)parent.appendChild(sketch.canvas);
   sketch.canvas.style.zIndex=inGame?'4':'2';
  }
  model.dt=dt||0;model.quality=S.gfx||'high';model.infect=G?G.infect||0:0;
  model.hp=G?G.hp/Math.max(1,G.maxHp):1;
  model.weather=!!(S.weather&&LV&&(LV.rain||LV.ash));model.ash=!!(LV&&LV.ash);
  model.reduced=!!S.reducedMotion||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  model.theme=(typeof THEMES!=='undefined'&&THEMES[S.theme]&&THEMES[S.theme].acc)||'#68d9a5';
  clock+=model.reduced?0:Math.min(.05,Math.max(0,dt||0));
  if(sketch&&typeof sketch.redraw==='function'){sketch.redraw();return;}
  if(!fallbackWarned){fallbackWarned=true;try{console.warn('[THE BLOOM] p5.js did not load; atmosphere fallback enabled.');}catch(_){}}
  drawFallback(now,dt);
 }
 window.drawAtmosphereOverlay=drawAtmosphereOverlay;
 // p5.js is optional: a CDN failure must never prevent the game from booting.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupP5,{once:true});
 else setupP5();
})();
