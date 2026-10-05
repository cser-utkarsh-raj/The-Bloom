'use strict';
/* ============================================================
   THE BLOOM — mobile/touch layer (12), v5
   Phone controls:
   • BGMI-style fixed circular movement pad, bottom-left
   • Push the pad in any direction to walk
   • Push near the outer ring to sprint
   • Release the pad to stop
   • Tap anywhere outside the pad to attack that spot
   • No mobile action buttons / no second-finger control
   Desktop keyboard/mouse are completely untouched.
   ============================================================ */
(function(){
 if(typeof keys==='undefined'||typeof cv==='undefined'||typeof TOUCH==='undefined')return;
 const isTouch=('ontouchstart' in window||navigator.maxTouchPoints>0)&&window.matchMedia&&matchMedia('(pointer: coarse)').matches;
 if(!isTouch)return;
 document.body.classList.add('mobile');

 try{if(!localStorage.getItem('bloomS2')){S.gfx='medium';}}catch(e){}
 addEventListener('touchstart',()=>{try{audioInit();}catch(e){}},{passive:true});

 const mk=(cls,txt)=>{
  const d=document.createElement('div');
  d.className=cls;
  if(txt)d.textContent=txt;
  return d;
 };

 /* Remove every legacy mobile button/joystick from older versions. */
 try{
  document.querySelectorAll('.m-btn,.m-stick,.m-knob,.joystick,.joystick-base,.joystick-stick,#joystick,[id*="joystick" i],[class*="joystick" i]').forEach(el=>el.remove());
 }catch(e){}

 /* ---------- BGMI-style movement pad ---------- */
 const joy=mk('m-joy');
 const ring=mk('m-joy-ring');
 const knob=mk('m-joy-knob');
 const dot=mk('m-joy-dot');
 ring.appendChild(dot);
 joy.appendChild(ring);
 joy.appendChild(knob);
 document.body.appendChild(joy);

 let joyId=null;
 let joyX=0,joyY=0;
 const JOY_R=46;

 function clearMove(){
  keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=keys.ShiftLeft=false;
 }

 function setMoveFromTouch(t){
  const r=joy.getBoundingClientRect();
  const cx=r.left+r.width/2;
  const cy=r.top+r.height/2;
  let dx=t.clientX-cx;
  let dy=t.clientY-cy;
  const len=Math.hypot(dx,dy);
  const max=JOY_R;
  const used=Math.min(len,max);
  if(len>0.001){
   dx=dx/len*used;
   dy=dy/len*used;
  }else{
   dx=dy=0;
  }

  joyX=dx;
  joyY=dy;
  knob.style.transform='translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';

  const nx=dx/max;
  const ny=dy/max;
  const dead=.16;

  keys.KeyD=nx>dead;
  keys.KeyA=nx<-dead;
  keys.KeyS=ny>dead;
  keys.KeyW=ny<-dead;
  /* BGMI-like sprint: push the thumb toward the outer edge. */
  keys.ShiftLeft=(Math.hypot(nx,ny)>=.78);

  /* Keep David's aim aligned with the current touch point. */
  try{
   TOUCH.x=t.clientX;
   TOUCH.y=t.clientY;
  }catch(e){}
 }

 function releaseJoy(){
  joyId=null;
  joyX=joyY=0;
  knob.style.transform='translate(0,0)';
  clearMove();
 }

 joy.addEventListener('touchstart',e=>{
  e.preventDefault();
  e.stopPropagation();
  if(state!=='play')return;
  const t=e.changedTouches[0];
  if(!t)return;
  joyId=t.identifier;
  setMoveFromTouch(t);
 },{passive:false});

 joy.addEventListener('touchmove',e=>{
  e.preventDefault();
  e.stopPropagation();
  if(joyId===null)return;
  for(const t of e.changedTouches){
   if(t.identifier===joyId){
    setMoveFromTouch(t);
    break;
   }
  }
 },{passive:false});

 function endJoy(e){
  e.preventDefault();
  e.stopPropagation();
  if(joyId===null)return;
  for(const t of e.changedTouches){
   if(t.identifier===joyId){
    releaseJoy();
    break;
   }
  }
 }
 joy.addEventListener('touchend',endJoy,{passive:false});
 joy.addEventListener('touchcancel',endJoy,{passive:false});

 /* ---------- tap anywhere else = attack ---------- */
 let attackId=null;
 let attackX=0,attackY=0,attackT=0,attackMoved=false;

 function setAttackTouch(t){
  attackX=t.clientX;
  attackY=t.clientY;
  attackT=performance.now();
  attackMoved=false;
  TOUCH.x=attackX;
  TOUCH.y=attackY;
  TOUCH.on=true;
  TOUCH.click=false;
 }

 cv.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(state!=='play')return;

  for(const t of e.changedTouches){
   if(attackId!==null)continue;
   attackId=t.identifier;
   setAttackTouch(t);
   break;
  }
 },{passive:false});

 cv.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(attackId===null)return;

  for(const t of e.changedTouches){
   if(t.identifier!==attackId)continue;
   if(Math.hypot(t.clientX-attackX,t.clientY-attackY)>12)attackMoved=true;
   attackX=t.clientX;
   attackY=t.clientY;
   TOUCH.x=attackX;
   TOUCH.y=attackY;
   break;
  }
 },{passive:false});

 function endAttack(e){
  e.preventDefault();
  if(attackId===null)return;

  for(const t of e.changedTouches){
   if(t.identifier!==attackId)continue;
   const quick=!attackMoved&&performance.now()-attackT<300;
   TOUCH.x=t.clientX;
   TOUCH.y=t.clientY;
   TOUCH.on=false;
   attackId=null;
   if(quick)TOUCH.click=true;
   break;
  }
 }
 cv.addEventListener('touchend',endAttack,{passive:false});
 cv.addEventListener('touchcancel',endAttack,{passive:false});

 /* ---------- touch-friendly HOW TO PLAY ---------- */
 try{
  showControls=function(){showOv(`<div class="ttl" style="font-size:34px">HOW TO PLAY</div><div class="sub">PROTECT NANCY · SURVIVE THE BLOOM</div>
  <div class="kv"><b>MOVE PAD</b><span>Drag the circular pad to walk in any direction</span><b>SPRINT</b><span>Push the pad toward the outer edge to run</span><b>TAP</b><span>Tap anywhere outside the pad to attack that spot</span><b>RELEASE</b><span>Let go of the pad to stop moving</span></div>
  <div class="txt" style="font-size:14px">Enemies notice noise and movement. Stand still to be harder to spot. Bloated infected explode when killed — back away. Glowing bloom patches raise infection; antidotes lower it. If it gets too high, the ending changes.</div>
  <div class="txt" style="font-size:13px;color:#7dffb0">Halo rings show who is who: <b style="color:#3aff70">green</b> healthy · <b style="color:#ffd34d">yellow</b>/<b style="color:#ff8a3a">orange</b> rising infection · <b style="color:#ff4040">red</b> infected · <b style="color:#c040ff">violet</b> Maya.</div>
  <div class="row"><button class="btn" onclick="showMenu()">← BACK</button></div>`,'menu');};
 }catch(e){}

 const rh=mk('m-rotate','⟳ ROTATE FOR BEST EXPERIENCE');
 document.body.appendChild(rh);
})();