'use strict';
/* ============================================================
   THE BLOOM — combat depth layer (10)
   Adds: 3-hit combo finisher, heavy attack, parry + riposte,
   enemy windup telegraphs, stalker dodge-bait stumble,
   boss sweep AoE. Purely additive: if anything is missing,
   this layer silently disables itself and the base game boots.
   ============================================================ */
(function(){
 if(typeof Player==='undefined'||typeof Enemy==='undefined'||typeof cv==='undefined'||typeof took!=='function')return;
 /* one-shot aim triggers consumed by Player.update each frame
    (mouse = desktop, TOUCH = mobile two-finger tap / HEAVY button) */
 const TRIG=window.TRIG;
 try{window.TOUCH=window.TOUCH||{x:0,y:0,on:false,click:false,heavy:false};}catch(e){}
 try{
  /* right-click = heavy attack trigger */
  cv.addEventListener('mousedown',e=>{if(e.button===2){TRIG.mClick=true;TRIG.mHeavy=true;}else if(e.button===0){TRIG.mClick=true;}});
 }catch(e){return;}


 /* ---------- combo counter + finisher on 3rd hit ---------- */
 try{
  const atkP=Player.prototype.attack;
  Player.prototype.attack=function(useMouse){
   this.comboN=(this.comboN||0)+1;this.comboT=1.15;
   const fin=this.comboN>=3;if(fin)this.comboN=0;
   const lv=this.lv;
   if(fin){G.maxCombo=(G.maxCombo||0)+1;lv.fl&&lv.fl(this.x,this.y-1,'FINISHER','#ff9a5a');}
   atkP.call(this,useMouse);
   if(fin){
    let n=0;
    for(const e of lv.enemies){
     if(e.dead||e.dying||e.hurtT<.05)continue;
     const d=dst(this.x,this.y,e.x,e.y)-e.r;
     if(d<2.6){
      e.hurt(18*(1+G.dmgUp*.15),this.swA,true);
      if(e.type!=='boss'){e.stun=Math.max(e.stun||0,.5);lv.moveEnt(e,Math.cos(this.swA),Math.sin(this.swA));}
      n++;
     }
    }
    if(n){shake(6);tone(180,.18,'square',.2,-80);lv.fl(this.x,this.y,'FINISHER','#ffd34d');}
   }
  };
 }catch(e){}

 /* ---------- heavy attack (K / right-click) ---------- */
 try{
  Player.prototype.heavy=function(useMouse){
   const lv=this.lv;let ang=this.f;
   if(useMouse){const A=(typeof TOUCH!=='undefined'&&TOUCH.on)?TOUCH:mouse;/* aim at last touch on mobile */
    const w=s2w(A.x,A.y);ang=Math.atan2(w.y-this.y,w.x-this.x);}
   if(S.assist){let best=null,bd=3.6;for(const e of lv.enemies){if(e.dead||e.dying||(e.type==='boss'&&!e.awake))continue;const d=dst(this.x,this.y,e.x,e.y),a=Math.atan2(e.y-this.y,e.x-this.x);if(d<bd&&(Math.abs(angD(a,ang))<1.5||d<2.4)){bd=d;best=a;}}if(best!==null)ang=best;}
   this.f=ang;this.swA=ang;this.atkT=.85;this.swT=.3;this.stam-=25;this.sd=.6;
   SFX.swing();tone(95,.3,'sawtooth',.22,-40);shake(2);lv.noise(this.x,this.y,9);
   const dmg=(30+rnd(-6,8))*(1+G.dmgUp*.15)*2.1;let hits=0;
   for(const e of lv.enemies){
    if(e.dead||e.dying)continue;
    const d=dst(this.x,this.y,e.x,e.y)-e.r;
    if(d<2.3&&Math.abs(angD(Math.atan2(e.y-this.y,e.x-this.x),ang))<1.55){
     e.hurt(dmg,ang);hits++;
     if(e.type!=='boss'){e.stun=Math.max(e.stun||0,.55);lv.moveEnt(e,Math.cos(ang)*1.3,Math.sin(ang)*1.3);}
    }
   }
   if(hits){shake(8);SFX.hit();}
  };
 }catch(e){}

 /* ---------- parry (R) + riposte ---------- */
 try{
  const updP=Player.prototype.update;
  Player.prototype.update=function(dt){
   const P=this;
   /* timers must not run while paused/intro/game-over (dt is otherwise frozen for the world) */
   if(state!=='play'){updP.call(P,dt);return;}
   P.parryT=(P.parryT||0)-dt;P.parryCd=(P.parryCd||0)-dt;
   P.comboT=(P.comboT||0)-dt;if(P.comboT<=0)P.comboN=0;
   const keyH=took('KeyK');
   /* one-shot aim triggers: consumed here (before Player.update reads them) */
   const tM=TRIG.mClick,tH=TRIG.mHeavy;TRIG.mClick=TRIG.mHeavy=false;
   let tT=false,tTH=false;if(typeof TOUCH!=='undefined'){tT=TOUCH.click;tTH=TOUCH.heavy;}
   const hReq=keyH||tH||tTH;
   const hMouse=!keyH&&(tH||tTH);
   const pReq=took('KeyR');
   if(pReq&&P.parryCd<=0&&P.stam>=15&&!P.carry&&P.dodT<=0){
    P.parryT=.28;P.parryCd=1.1;P.stam-=15;P.sd=.6;
    tone(660,.1,'triangle',.18,120);
    for(let i=0;i<8;i++)P.lv.part(P.x,P.y,.9,Math.cos(i/8*6.283)*2,Math.sin(i/8*6.283)*2,rnd(.5,1.5),.35,'#9ac8ff',2,false);
   }
   if(hReq&&P.atkT<=0&&!P.carry&&P.dodT<=0&&P.stam>=25&&P.parryT<=0){P._heavyGo=true;P._heavyMouse=hMouse;TOUCH&&TOUCH.heavy&&(TOUCH.heavy=false);}
   updP.call(P,dt);
   /* tap/click swallowed by the attack cooldown: remember it and retry when ready */
   if(!P._heavyGo&&(tT||tM)&&(P.swT<=0||P.atkT>0)){P._aimGo=true;P._aimSrc=(typeof TOUCH!=='undefined'&&TOUCH.on)?'t':'m';}
   if(P._aimGo&&P.swT<=0&&P.atkT<=0&&!P.carry&&P.dodT<=0){
    P._aimGo=false;const A=(P._aimSrc==='t'&&typeof TOUCH!=='undefined')?TOUCH:mouse;
    P.aimX=A.x;P.aimY=A.y;try{P.attack(true);}catch(e){}}
   if(P._heavyGo){P._heavyGo=false;try{P.heavy(P._heavyMouse);}catch(e){}}
  };
 }catch(e){}

 try{
  const hurtP=Player.prototype.hurt;
  Player.prototype.hurt=function(d,ang){
   const P=this,lv=P.lv;
   if((P.parryT||0)>0&&state==='play'){
    const fa=ang==null?P.f:ang;let best=null,bd=3;
    for(const e of lv.enemies){
     if(e.dead||e.dying)continue;
     const dd=dst(P.x,P.y,e.x,e.y)-e.r,a2=Math.atan2(e.y-P.y,e.x-P.x);
     if(dd<bd&&Math.abs(angD(a2,fa))<1.5){bd=dd;best=e;}
    }
    P.parryT=0;P.inv=Math.max(P.inv,.45);
    tone(920,.15,'square',.22,300);shake(5);
    lv.fl(P.x,P.y,'PARRY!','#6ad8ff');
    for(let i=0;i<12;i++)lv.part(P.x,P.y,.9,Math.cos(i/12*6.283)*rnd(2,5),Math.sin(i/12*6.283)*rnd(2,5),rnd(1,2),.4,'#9ac8ff',2,false);
    if(best&&best.type==='boss'){
     if(best.bs==='charge'){best.bs='stun';best.bt=1.6;shake(10);lv.fl(best.x,best.y,'STUNNED','#ffd34d');}
    }else if(best){best.stun=1.6;best.riposte=1.4;lv.fl(best.x,best.y,'RIPOSTE!','#ffd34d');}
    return;
   }
   hurtP.call(P,d,ang);
  };
 }catch(e){}

 /* ---------- enemy telegraphs, stalker stumble, riposte decay ---------- */
 try{
  const updE=Enemy.prototype.update;
  Enemy.prototype.update=function(dt){
   const e=this,lv=e.lv;
   e.riposte=(e.riposte||0)-dt;
   const wasWind=e.wind>0,wasLunge=e.lunge>0;
   updE.call(e,dt);
   if(e.dead||e.dying)return;
   /* red ground ring when a melee windup starts */
   if(!wasWind&&e.wind>0&&e.state==='chase'&&e.type!=='boss')
    lv.tele.push({t:'ring',x:e.x,y:e.y,r:e.r+e.reach+1.1,age:0,max:e.windT});
   /* stalker that lunges and misses stumbles — punish window */
   if(e.type==='stalker'&&wasLunge&&e.lunge<=0){
    const p=lv.player,d=dst(e.x,e.y,p.x,p.y);
    if(p.dodT>0||p.inv>0||d>e.r+p.r+.9){e.stun=.7;lv.fl(e.x,e.y,'STUMBLED','#ffd34d');}
   }
  };
 }catch(e){}

 try{
  const hurtE=Enemy.prototype.hurt;
  Enemy.prototype.hurt=function(d,ang,nokb){
   if((this.riposte||0)>0){d*=2;this.lv.fl(this.x,this.y,'RIPOSTE ×2','#ffd34d');}
   hurtE.call(this,d,ang,nokb);
  };
 }catch(e){}

 /* ---------- boss phase 2+ sweep AoE with telegraph ---------- */
 try{
  const bossU=Enemy.prototype.updBoss;
  Enemy.prototype.updBoss=function(dt){
   const e=this,lv=e.lv,p=lv.player;
   e.swCd=(e.swCd||5)-dt;
   bossU.call(e,dt);
   if(e.awake&&!e.dead&&!e.dying){
    if(e.phase>=2&&e.bs==='walk'&&e.swCd<=0&&dst(e.x,e.y,p.x,p.y)<3){
     e.swCd=6;e._sweep=.8;
     lv.tele.push({t:'ring',x:e.x,y:e.y,r:3.4,age:0,max:.8});
     tone(140,.5,'sawtooth',.2,-60);
    }
    if(e._sweep>0){
     e._sweep-=dt;
     if(e._sweep<=0){
      shake(9);SFX.boom();
      for(let i=0;i<24;i++)lv.part(e.x,e.y,.3,Math.cos(i/24*6.283)*rnd(4,7),Math.sin(i/24*6.283)*rnd(4,7),rnd(0,2),.6,'#e060ff',2,false);
      if(dst(e.x,e.y,p.x,p.y)<3.4)p.hurt(e.dmg*.75,Math.atan2(p.y-e.y,p.x-e.x));
     }
    }
   }
  };
 }catch(e){}

 /* ---------- help text ---------- */
 try{
  const _start=startLevel;
  startLevel=function(i){
   _start(i);
   const h=$('help');
   if(h)h.innerHTML+='<br><b>R</b> parry &nbsp; <b>K / right-click</b> heavy swing &nbsp; every 3rd hit = <b>FINISHER</b>';
  };
 }catch(e){}
})();
