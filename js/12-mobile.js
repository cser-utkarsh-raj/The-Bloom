'use strict';
/* ============================================================
   THE BLOOM — mobile/touch layer (12), v6
   Phone controls:
   • BGMI-style fixed circular movement pad, bottom-left
   • Push the pad in any direction to walk
   • Push near the outer ring to sprint
   • Release the pad to stop
   • Tap anywhere outside the pad to attack that spot
   • Auto-attack nearest enemy within 3.0 range when standing still
   • Action buttons (bottom-right arc): DODGE, HEAL, CARRY
   • Pause button (top-right)
   • Haptic feedback for damage, kills, and dodge rolls
   Desktop keyboard/mouse are completely untouched.
   ============================================================ */
(function(){
 if(typeof keys==='undefined'||typeof cv==='undefined'||typeof TOUCH==='undefined')return;
 const isTouch=('ontouchstart' in window||navigator.maxTouchPoints>0)||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)||
  (window.matchMedia&&matchMedia('(pointer: coarse)').matches);
 window.IS_MOBILE=isTouch;
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
  document.querySelectorAll('.m-actions,.m-stick,.m-knob,.joystick,.joystick-base,.joystick-stick,#joystick,[id*="joystick" i]').forEach(el=>el.remove());
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
  const isSmall=(window.innerWidth<400||window.innerHeight<400);
  const dead=isSmall?0.24:0.16;

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
  if(typeof state!=='undefined'&&state!=='play')return;
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
  if(typeof state!=='undefined'&&state!=='play')return;

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

 /* ---------- Action Buttons (bottom-right arc + top-right pause) ---------- */
 const actions=mk('m-actions');

 /* [DODGE] button — triggers keys.KeyF = true (auto-release after 50ms) */
 const dodgeBtn=mk('m-btn m-btn-dodge');
 dodgeBtn.innerHTML='<span class="m-btn-ico">⚡</span><span class="m-btn-label">DODGE</span>';
 function onDodge(e){
  e.preventDefault();
  e.stopPropagation();
  if(typeof state!=='undefined'&&state!=='play')return;
  if(typeof hit!=='undefined')hit.KeyF=true;
  keys.KeyF=true;
  setTimeout(()=>{
   keys.KeyF=false;
   if(typeof hit!=='undefined')hit.KeyF=false;
  },50);
 }
 dodgeBtn.addEventListener('touchstart',onDodge,{passive:false});
 dodgeBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 dodgeBtn.addEventListener('touchcancel',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 dodgeBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});

 /* [HEAL] button — triggers hit.KeyQ = true; keys.KeyQ = true (auto-release after 50ms) */
 const healBtn=mk('m-btn m-btn-heal');
 healBtn.innerHTML='<span class="m-btn-ico">💊</span><span class="m-med-badge">0</span><span class="m-btn-label">HEAL (0)</span>';
 const healBadge=healBtn.querySelector('.m-med-badge');
 const healLabel=healBtn.querySelector('.m-btn-label');
 function onHeal(e){
  e.preventDefault();
  e.stopPropagation();
  if(typeof state!=='undefined'&&state!=='play')return;
  if(typeof hit!=='undefined')hit.KeyQ=true;
  keys.KeyQ=true;
  setTimeout(()=>{
   keys.KeyQ=false;
   if(typeof hit!=='undefined')hit.KeyQ=false;
  },50);
 }
 healBtn.addEventListener('touchstart',onHeal,{passive:false});
 healBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 healBtn.addEventListener('touchcancel',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 healBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});

 /* [CARRY] button — triggers hit.KeyE = true; keys.KeyE = true (auto-release after 50ms) */
 const carryBtn=mk('m-btn m-btn-carry');
 carryBtn.innerHTML='<span class="m-btn-ico">🤝</span><span class="m-btn-label">CARRY</span>';
 const carryLabel=carryBtn.querySelector('.m-btn-label');
 function onCarry(e){
  e.preventDefault();
  e.stopPropagation();
  if(typeof state!=='undefined'&&state!=='play')return;
  if(typeof hit!=='undefined')hit.KeyE=true;
  keys.KeyE=true;
  setTimeout(()=>{
   keys.KeyE=false;
   if(typeof hit!=='undefined')hit.KeyE=false;
  },50);
 }
 carryBtn.addEventListener('touchstart',onCarry,{passive:false});
 carryBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 carryBtn.addEventListener('touchcancel',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 carryBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});

 /* [PAUSE] button — triggers showPause() */
 const pauseBtn=mk('m-btn m-btn-pause');
 pauseBtn.innerHTML='<span class="m-btn-ico">⏸</span>';
 function onPause(e){
  e.preventDefault();
  e.stopPropagation();
  if(typeof showPause==='function')showPause();
 }
 pauseBtn.addEventListener('touchstart',onPause,{passive:false});
 pauseBtn.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 pauseBtn.addEventListener('touchcancel',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
 pauseBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});

 actions.appendChild(dodgeBtn);
 actions.appendChild(healBtn);
 actions.appendChild(carryBtn);
 actions.appendChild(pauseBtn);
 document.body.appendChild(actions);

 /* UI sync loop: medkit count, carry state, and visibility (only during state === 'play') */
 function syncMobileUI(){
  requestAnimationFrame(syncMobileUI);
  const isPlaying=(typeof state!=='undefined'&&state==='play');
  actions.style.display=isPlaying?'block':'none';
  joy.style.display=isPlaying?'block':'none';
  if(!isPlaying)return;

  const meds=(typeof G!=='undefined'&&G.meds!=null)?G.meds:0;
  if(healBadge)healBadge.textContent=meds;
  if(healLabel)healLabel.textContent='HEAL ('+meds+')';

  const carrying=!!(typeof LV!=='undefined'&&LV&&LV.player&&LV.player.carry);
  if(carryLabel)carryLabel.textContent=carrying?'PUT DOWN':'CARRY';
  carryBtn.style.borderColor=carrying?'var(--acc)':'';
  carryBtn.style.color=carrying?'var(--acc)':'';
 }
 requestAnimationFrame(syncMobileUI);

 /* ---------- Haptic Feedback helper ---------- */
 function vib(ms){
  try{
   if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(ms);
  }catch(e){}
 }

 /* ---------- Auto-Attack & Haptic Feedback integration ---------- */
 let autoAtkTimer=0;

 if(typeof Player!=='undefined'&&Player.prototype){
  const origAtk=Player.prototype.attack;
  Player.prototype.attack=function(useMouse){
   autoAtkTimer=0.45;
   return origAtk.call(this,useMouse);
  };

  const origUpd=Player.prototype.update;
  Player.prototype.update=function(dt){
   const prevDod=this.dodT;
   origUpd.call(this,dt);

   /* Haptic on dodge roll: 20ms */
   if(this.dodT>0&&prevDod<=0){
    vib(20);
   }

   /* Auto-Attack: stationary (joystick released) & within range 3.0 of enemy -> attack every 0.45s */
   if(state==='play'&&this.lv){
    const isStationary=this.still&&joyId===null;
    if(isStationary&&!this.carry&&this.dodT<=0){
     autoAtkTimer-=dt;
     let nearest=null;
     let minDist=3.0;
     const ens=this.lv.enemies||[];
     for(let i=0;i<ens.length;i++){
      const e=ens[i];
      if(!e||e.dead||e.dying||(e.type==='boss'&&!e.awake))continue;
      const d=dst(this.x,this.y,e.x,e.y);
      if(d<=minDist){
       minDist=d;
       nearest=e;
      }
     }
     if(nearest){
      if(autoAtkTimer<=0&&this.atkT<=0){
       const ang=Math.atan2(nearest.y-this.y,nearest.x-this.x);
       this.f=ang;
       this.attack(false);
       autoAtkTimer=0.45;
      }
     }else{
      if(autoAtkTimer>0.1)autoAtkTimer=0.1;
     }
    }else{
     autoAtkTimer=0;
    }
   }
  };

  const origHurt=Player.prototype.hurt;
  Player.prototype.hurt=function(d,ang){
   const prevHp=(typeof G!=='undefined')?G.hp:0;
   origHurt.call(this,d,ang);
   /* Haptic on taking damage: 80ms */
   if(typeof G!=='undefined'&&G.hp<prevHp){
    vib(80);
   }
  };
 }

 if(typeof Enemy!=='undefined'&&Enemy.prototype){
  const origDie=Enemy.prototype.die;
  Enemy.prototype.die=function(){
   /* Haptic on killing an enemy: 40ms */
   vib(40);
   return origDie.call(this);
  };
 }

 /* ---------- touch-friendly HOW TO PLAY ---------- */
 try{
  showControls=function(){showOv(`<div class="ttl" style="font-size:34px">HOW TO PLAY</div><div class="sub">PROTECT NANCY · SURVIVE THE BLOOM</div>
  <div class="kv"><b>MOVE PAD</b><span>Drag pad to walk, push outward to sprint</span>
  <b>TAP / AUTO</b><span>Tap to attack, or stop near enemies to auto-strike</span>
  <b>DODGE ⚡</b><span>Roll to evade attacks &amp; charges</span>
  <b>HEAL 💊</b><span>Use medkit on David or Nancy</span>
  <b>CARRY 🤝</b><span>Pick up Nancy or put her down</span>
  <b>PAUSE ⏸</b><span>Pause game (top-right corner)</span></div>
  <div class="txt" style="font-size:14px">Enemies notice noise and movement. Stand still to be harder to spot. Bloated infected explode when killed — back away. Glowing bloom patches raise infection; antidotes lower it. If it gets too high, the ending changes.</div>
  <div class="txt" style="font-size:13px;color:#7dffb0">Halo rings show who is who: <b style="color:#3aff70">green</b> healthy · <b style="color:#ffd34d">yellow</b>/<b style="color:#ff8a3a">orange</b> rising infection · <b style="color:#ff4040">red</b> infected · <b style="color:#c040ff">violet</b> Maya.</div>
  <div class="row"><button class="btn" onclick="showMenu()">← BACK</button></div>`,'menu');};
 }catch(e){}

 const rh=mk('m-rotate','⟳ ROTATE FOR BEST EXPERIENCE');
 document.body.appendChild(rh);
})();