/* THE BLOOM — restrained screen-space atmosphere.
   Called by the existing frame loop; no p5 dependency and no second RAF loop. */
(function(){
 'use strict';
 let spores=[],lastW=0,lastH=0,clock=0,lastCount=-1,lastLevel=-1;
 const rand=(a,b)=>a+Math.random()*(b-a);
 function makeSpore(){
  return {x:rand(0,Math.max(1,W)),y:rand(0,Math.max(1,H)),s:rand(.8,2.1),v:rand(7,22),drift:rand(-5,5),phase:rand(0,6.283),alpha:rand(.12,.28),tone:Math.random()};
 }
 function rebuild(count){
  spores=Array.from({length:count},makeSpore);lastW=W;lastH=H;lastCount=count;lastLevel=LV?LV.id:-1;
 }
 function drawAtmosphereOverlay(now,dt){
  try{
   if(!LV||!G||!cx||!['play','pause','over'].includes(state))return;
   const quality=S.gfx==='high'?1:S.gfx==='medium'?.58:0;
   if(quality<=0)return;
   const reduced=!!S.reducedMotion||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   const count=S.particles===false||reduced?0:(S.gfx==='high'?34:18);
   if(lastW!==W||lastH!==H||lastCount!==count||lastLevel!==(LV?LV.id:-1))rebuild(count);
   const d=Math.min(.05,Math.max(0,dt||0));clock+=d;
   setScreen();cx.save();
   // A low-opacity lower-screen haze adds depth without washing out the pixel art.
   if(S.gfx==='high'){
    const fog=cx.createLinearGradient(0,H*.48,0,H);
    const fogA=.018+Math.min(.035,Math.max(0,LV.dark||0)*.035)+(G.infect>50?.012:0);
    fog.addColorStop(0,'rgba(5,10,13,0)');
    fog.addColorStop(1,'rgba(5,10,13,'+fogA+')');
    cx.fillStyle=fog;cx.fillRect(0,H*.48,W,H*.52);
   }
   if(count){
    const accent=(typeof THEMES!=='undefined'&&THEMES[S.theme]&&THEMES[S.theme].acc)||'#8de8c0';
    for(const p of spores){
     p.x+=Math.sin(clock*.65+p.phase)*p.drift*d;
     p.y-=p.v*d;
     if(p.y<-5){p.y=H+rand(0,24);p.x=rand(0,W);}
     if(p.x<-4)p.x=W+3;else if(p.x>W+4)p.x=-3;
     const wave=.68+.32*Math.sin(clock*1.4+p.phase);
     cx.globalAlpha=p.alpha*wave*quality;
     cx.fillStyle=p.tone>.76&&G.infect>35?'#65f5c1':p.tone>.93?accent:'#c6d4ce';
     cx.fillRect(p.x,p.y,p.s,p.s);
     if(p.s>1.65){cx.globalAlpha*=.28;cx.fillRect(p.x-1,p.y-1,p.s+2,p.s+2);}
    }
   }
   // Low-health pressure is subtle and follows the existing health state only.
   const hp=G.hp/Math.max(1,G.maxHp);
   if(!reduced&&hp<.32){
    const a=(.035+.045*(.5+.5*Math.sin(clock*4.2)))*clamp((.32-hp)/.32,0,1);
    const vg=cx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.78);
    vg.addColorStop(0,'rgba(70,0,8,0)');
    vg.addColorStop(1,'rgba(120,8,18,'+a+')');
    cx.fillStyle=vg;cx.fillRect(0,0,W,H);
   }
   cx.restore();
  }catch(e){try{console.warn('[THE BLOOM] atmosphere layer disabled:',e&&e.message||e);}catch(_){}}
 }
 window.drawAtmosphereOverlay=drawAtmosphereOverlay;
})();
