'use strict';
/* ============================================================
   THE BLOOM — mobile/touch layer (12), v4
   Auto-detected on coarse-pointer devices (phones/tablets):
   • touch-and-hold anywhere → walk toward your finger
     (hold far from David to sprint; a marker shows the target)
   • quick tap → one attack toward that spot
   • hold + second finger → continuous attacks toward that spot
   • buttons: HEAVY / DODGE / PARRY / MED / NANCY / MAP / PAUSE
   Desktop keyboard/mouse are completely untouched.
   ============================================================ */(function(){
 if(typeof keys==='undefined'||typeof cv==='undefined'||typeof TOUCH==='undefined')return;
 const isTouch=('ontouchstart' in window||navigator.maxTouchPoints>0)&&window.matchMedia&&matchMedia('(pointer: coarse)').matches;
 if(!isTouch)return;
 document.body.classList.add('mobile');
 /* lighter default gfx on phones that never saved settings */
 try{if(!localStorage.getItem('bloomS2')){S.gfx='medium';}}catch(e){}
 /* unlock WebAudio on first touch (iOS) */
 addEventListener('touchstart',()=>{try{audioInit();}catch(e){}},{passive:true});

 const mk=(cls,txt)=>{const d=document.createElement('div');d.className=cls;if(txt)d.textContent=txt;return d;};

 /* ---------- single-touch movement + tap attack ---------- */
 let moveId=null,lastTX=0,lastTY=0,lastTT=0,tapped=false;
 function clearKeys(){keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=keys.ShiftLeft=false;}
 function worldAt(cx0,cy0){try{
  if(typeof s2w==='function')return s2w(cx0,cy0);
  const p=LV&&LV.player;
  if(p&&typeof isx==='function')return[p.x+(cx0-isx(p.x,p.y))*.08,p.y+(cy0-isy(p.x,p.y,0))*.08];
 }catch(e){}return null;}
 function aim(t){
  const w=worldAt(t.clientX,t.clientY),p=LV&&LV.player;
  if(!w||!p)return;
  const wx=Array.isArray(w)?w[0]:w.x,wy=Array.isArray(w)?w[1]:w.y;
  if(!Number.isFinite(wx)||!Number.isFinite(wy))return;
  const dx=wx-p.x,dy=wy-p.y,d=Math.hypot(dx,dy);
  if(d<.5){clearKeys();return;}
  const c=dx/d,s=dy/d;
  keys.KeyD=c>.45;keys.KeyA=c<-.45;keys.KeyS=s>.45;keys.KeyW=s<-.45;
  keys.ShiftLeft=d>5.5;
 }
 function drawMarker(){
  if(moveId===null||state!=='play')return;
  try{
   setScreen();const r=cv.getBoundingClientRect();
   const px=(lastTX-r.left)*(cv.width/r.width),py=(lastTY-r.top)*(cv.height/r.height);
   cx.save();cx.globalAlpha=.7;cx.strokeStyle='#4dffb0';cx.lineWidth=2.5;
   cx.beginPath();cx.arc(px,py,15+3*Math.sin(performance.now()/160),0,6.2832);cx.stroke();
   cx.beginPath();cx.moveTo(px-7,py);cx.lineTo(px+7,py);cx.moveTo(px,py-7);cx.lineTo(px,py+7);cx.stroke();
   cx.restore();cx.globalAlpha=1;
  }catch(e){}
 }
 try{
  const _mm=minimap;
  minimap=function(lv){const out=_mm.apply(this,arguments);try{drawMarker();}catch(e){}return out;};
 }catch(e){}

 /* Remove any legacy virtual joystick if an older cached UI injected one. */
 try{
  document.querySelectorAll('.joystick,.joystick-base,.joystick-stick,#joystick,[id*="joystick" i],[class*="joystick" i]').forEach(el=>el.remove());
 }catch(e){}

 cv.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(state!=='play')return;
  const t=e.changedTouches[0];
  if(!t)return;
  moveId=t.identifier;lastTX=t.clientX;lastTY=t.clientY;lastTT=performance.now();tapped=true;
  TOUCH.x=t.clientX;TOUCH.y=t.clientY;TOUCH.on=true;TOUCH.click=false;
  aim(t);
 },{passive:false});

 cv.addEventListener('touchmove',e=>{
  e.preventDefault();
  for(const t of e.changedTouches){
   if(t.identifier!==moveId)continue;
   if(Math.hypot(t.clientX-lastTX,t.clientY-lastTY)>12)tapped=false;
   lastTX=t.clientX;lastTY=t.clientY;
   TOUCH.x=t.clientX;TOUCH.y=t.clientY;TOUCH.on=true;
   aim(t);
  }
 },{passive:false});

 function endTouch(e){
  for(const t of e.changedTouches){
   if(t.identifier!==moveId)continue;
   const quick=tapped&&performance.now()-lastTT<280;
   TOUCH.x=t.clientX;TOUCH.y=t.clientY;TOUCH.on=false;
   clearKeys();moveId=null;
   /* short tap = attack at the tapped location; hold = movement only */
   if(quick)TOUCH.click=true;
  }
 }
 cv.addEventListener('touchend',endTouch,{passive:false});
 cv.addEventListener('touchcancel',endTouch,{passive:false});

 /* ---------- action buttons ---------- */
 function tapBtn(cls,label,fn){
  const b=mk('m-btn '+cls,label);document.body.appendChild(b);
  b.addEventListener('touchstart',e=>{e.preventDefault();try{fn();}catch(err){}},{passive:false});
  return b;
 }
 /* HEAVY aims at the last touch point (or forward if you never touched) */
 tapBtn('m-b-heavy','HEAVY',()=>{const p=LV&&LV.player;
  if(p){if(!TOUCH.on){TOUCH.x=p.aimX||mouse.x;TOUCH.y=p.aimY||mouse.y;}TOUCH.heavy=true;}});
 tapBtn('m-b-dodge','DODGE',()=>{hit.KeyF=true;});
 tapBtn('m-b-parry','PARRY',()=>{hit.KeyR=true;});
 tapBtn('m-b-med','MED',()=>{hit.KeyQ=true;});
 tapBtn('m-b-carry','NANCY',()=>{hit.KeyE=true;});
 /* pause */
 const pb=mk('m-btn m-pause','II');document.body.appendChild(pb);
 pb.addEventListener('touchstart',e=>{e.preventDefault();try{if(state==='play')showPause();else if(state==='pause')resume();}catch(err){}},{passive:false});
 /* map */
 const mb=mk('m-btn m-b-map','MAP');document.body.appendChild(mb);
 mb.addEventListener('touchstart',e=>{e.preventDefault();try{if(state==='play')mapBig=!mapBig;}catch(err){}},{passive:false});

 /* ---------- touch-friendly HOW TO PLAY ---------- */
 try{
 showControls=function(){showOv(`<div class="ttl" style="font-size:34px">HOW TO PLAY</div><div class="sub">PROTECT NANCY · SURVIVE THE BLOOM</div>
  <div class="kv"><b>TOUCH &amp; HOLD</b><span>Walk toward your finger. Hold far from David to sprint</span><b>QUICK TAP</b><span>Attack toward that spot</span><b>SECOND FINGER</b><span>Keep attacking where you tap while moving</span><b>HEAVY</b><span>Slow, powerful swing aimed at your last touch</span><b>DODGE</b><span>Dodge roll (brief invulnerability)</span><b>PARRY</b><span>Time it against an incoming swing</span><b>MED</b><span>Medkit — heals you, or Nancy if she\\'s hurt and close</span><b>NANCY</b><span>Carry / put down Nancy (she is safe, but you cannot attack)</span><b>MAP</b><span>Open / close the big map</span><b>II</b><span>Pause</span></div>
  <div class="txt" style="font-size:14px">Enemies notice noise and movement. Stand still to be harder to spot. Bloated infected explode when killed — back away. Glowing bloom patches raise infection; antidotes lower it. If it gets too high, the ending changes.</div>
  <div class="txt" style="font-size:13px;color:#7dffb0">Halo rings show who is who: <b style="color:#3aff70">green</b> healthy · <b style="color:#ffd34d">yellow</b>/<b style="color:#ff8a3a">orange</b> rising infection · <b style="color:#ff4040">red</b> infected · <b style="color:#c040ff">violet</b> Maya.</div>
  <div class="row"><button class="btn" onclick="showMenu()">← BACK</button></div>`,'menu');};
 }catch(e){}

 /* ---------- portrait rotate hint ---------- */
 const rh=mk('m-rotate','⟳ ROTATE FOR BEST EXPERIENCE');document.body.appendChild(rh);
})();
