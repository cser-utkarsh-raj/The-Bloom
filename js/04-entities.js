/* ---------- touch aim / click state (written by 12-mobile.js, read by Player) ---------- */
const TOUCH={x:0,y:0,on:false,click:false,heavy:false};
window.TOUCH=TOUCH;/* expose to later scripts; desktop keeps its own mouse path */
let TRIG={mClick:false,mHeavy:false};/* one-shot click triggers, owned by 10-combat.js */
window.TRIG=TRIG;

/* ---------- player ---------- */
class Player{
 constructor(lv,x,y){Object.assign(this,{lv,x,y,r:.3,f:Math.PI/4,ph:0,stam:100,sd:0,exh:false,atkT:0,swT:0,swA:0,dodT:0,dodCd:0,inv:0,hurtT:0,carry:false,sprint:false,still:true,healCd:0,stepT:0,dx:0,dy:0});}
 update(dt){
  const lv=this.lv;this.atkT-=dt;this.swT-=dt;this.dodT-=dt;this.dodCd-=dt;this.inv-=dt;this.hurtT-=dt;this.healCd-=dt;
  let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
  const mv=Math.hypot(mx,my);let wx=0,wy=0;if(mv){mx/=mv;my/=mv;wx=(mx+my)*.7071;wy=(-mx+my)*.7071;}
  this.still=!mv;this.sprint=!!((keys.ShiftLeft||keys.ShiftRight)&&mv&&this.stam>0&&!this.exh&&!this.carry);
  if(this.sprint){this.stam-=26*dt;this.sd=.7;if(this.stam<=0){this.stam=0;this.exh=true;}}else{this.sd-=dt;if(this.sd<=0)this.stam=Math.min(100,this.stam+24*dt);if(this.exh&&this.stam>30)this.exh=false;}
  if((took('KeyF')||took('KeyC'))&&this.dodCd<=0&&this.stam>=18&&!this.carry&&this.dodT<=0){this.dodT=.28;this.dodCd=.9;this.stam-=18;this.sd=.5;this.inv=Math.max(this.inv,.3);if(mv){this.dx=wx;this.dy=wy;}else{this.dx=Math.cos(this.f);this.dy=Math.sin(this.f);}SFX.swing();for(let i=0;i<6;i++)lv.part(this.x,this.y,.2,rnd(-1,1),rnd(-1,1),.5,.35,'#9ac8ff',2,false);}
  let sp=4.1;if(this.sprint)sp*=1.6;if(this.carry)sp*=.85;
  if(this.dodT>0)lv.moveEnt(this,this.dx*10*dt,this.dy*10*dt);
  else if(mv){lv.moveEnt(this,wx*sp*dt,wy*sp*dt);if(this.swT<=0)this.f+=angD(Math.atan2(wy,wx),this.f)*Math.min(1,dt*14);this.ph+=dt*sp*2.4;this.stepT-=dt;if(this.stepT<=0){this.stepT=this.sprint?.28:.5;if(this.sprint)lv.noise(this.x,this.y,5.5);}}
  /* aim point: mouse on desktop, last touch point on mobile (set by 12-mobile) */
  this.aimX=mouse.x;this.aimY=mouse.y;
  if(typeof TOUCH!=='undefined'&&TOUCH.on){this.aimX=TOUCH.x;this.aimY=TOUCH.y;}
  const clickA=(TRIG.mClick||mouse.click||mouse.down)||(typeof TOUCH!=='undefined'&&TOUCH.click);
  /* TRIG flags are consumed by the combat layer (it retries taps during cooldowns),
     so don't clear them here or queued attacks would be dropped */
  mouse.click=false;if(typeof TOUCH!=='undefined')TOUCH.click=false;
  const kAtk=keys.Space||keys.KeyJ;
  if((kAtk||clickA)&&this.atkT<=0&&!this.carry&&this.dodT<=0)this.attack(!kAtk&&clickA);
  if(took('KeyQ'))this.useMed();
  if(took('KeyE'))this.toggleCarry();
 }
 attack(useMouse){
  const lv=this.lv;let ang=this.f;if(useMouse){const w=s2w(this.aimX,this.aimY);ang=Math.atan2(w.y-this.y,w.x-this.x);}
  if(S.assist){let best=null,bd=3.4;for(const e of lv.enemies){if(e.dead||e.dying||(e.type==='boss'&&!e.awake))continue;const d=dst(this.x,this.y,e.x,e.y),a=Math.atan2(e.y-this.y,e.x-this.x);if(d<bd&&(Math.abs(angD(a,ang))<1.3||d<2.2)){bd=d;best=a;}}if(best!==null)ang=best;}
  this.f=ang;this.swA=ang;this.atkT=.4;this.swT=.2;SFX.swing();lv.noise(this.x,this.y,7);
  const dmg=(30+rnd(-6,8))*(1+G.dmgUp*.15);let hits=0;
  for(const e of lv.enemies){if(e.dead||e.dying)continue;const d=dst(this.x,this.y,e.x,e.y)-e.r;if(d<1.9&&Math.abs(angD(Math.atan2(e.y-this.y,e.x-this.x),ang))<1.2){e.hurt(dmg,ang);hits++;}}
  if(hits){shake(3);}
 }
 useMed(){
  const lv=this.lv,dd=lv.daughter;if(this.healCd>0)return;if(G.meds<=0){say('No medkits left.',1800);return;}
  const near=dd.carried||dst(this.x,this.y,dd.x,dd.y)<3.8,pf=G.hp/G.maxHp,df=dd.hp/dd.max;
  if(near&&df<pf&&df<.95){dd.hp=Math.min(dd.max,dd.hp+35);dd.trust=Math.min(100,dd.trust+8);lv.fl(dd.x,dd.y,'+35 NANCY','#ffd34d');}
  else if(G.hp<G.maxHp){G.hp=Math.min(G.maxHp,G.hp+35);lv.fl(this.x,this.y,'+35 HP','#7dffb0');}
  else{say('Already at full health.',1500);return;}
  G.meds--;this.healCd=1;SFX.heal();for(let i=0;i<10;i++)lv.part(this.x,this.y,.5,rnd(-1,1),rnd(-1,1),rnd(1,2),.7,'#7dffb0',3,false);
 }
 toggleCarry(){const lv=this.lv,dd=lv.daughter;
  if(this.carry){this.carry=false;dd.carried=false;dd.x=this.x-Math.cos(this.f)*.8;dd.y=this.y-Math.sin(this.f)*.8;if(lv.hitSolid(dd.x,dd.y,.25)){dd.x=this.x;dd.y=this.y;}}
  else if(dst(this.x,this.y,dd.x,dd.y)<2.6){this.carry=true;dd.carried=true;say('"I\'ve got you, Nancy. Don\'t look back."',2000);}
  else say('Nancy is too far away.',1500);}
 hurt(d,ang){const lv=this.lv;if(this.inv>0||lv.over)return;if(!Number.isFinite(d)||d<=0)d=1;G.hp-=d;this.inv=.55;this.hurtT=.25;G.infect=Math.min(100,G.infect+1.5);SFX.hurt();shake(7);
  const h=$('hurt');h.style.opacity=1;setTimeout(()=>h.style.opacity=0,220);
  for(let i=0;i<8;i++)lv.part(this.x,this.y,.9,rnd(-2,2),rnd(-2,2),rnd(1,3),.5,'#a01010',2.5);lv.moveEnt(this,Math.cos(ang||0)*.3,Math.sin(ang||0)*.3);
  if(G.hp<=0){G.hp=0;lv.fail('David has fallen.');}}
}
class Daughter{
 constructor(lv,x,y){Object.assign(this,{lv,x,y,r:.25,max:Math.round(100*(S.difficulty==='story'?1.3:1)),carried:false,trust:G.trust,ph:0,scared:0,f:0,hT:0});this.hp=this.max;}
 update(dt){const lv=this.lv,p=lv.player;this.hT-=dt;if(this.carried){this.x=p.x;this.y=p.y;this.trust=Math.min(100,this.trust+dt*2);return;}
  const d=dst(this.x,this.y,p.x,p.y);let near=false;for(const e of lv.enemies)if(!e.dead&&e.state==='chase'&&dst(e.x,e.y,this.x,this.y)<5){near=true;break;}
  this.scared=near?Math.min(1,this.scared+dt*2):Math.max(0,this.scared-dt);
  if(d<3)this.trust=Math.min(100,this.trust+dt*1.2);else if(d>9)this.trust=Math.max(0,this.trust-dt*3);
  const stay=this.scared>.5?1.4:2.3;
  if(d>stay){const k=.55+.45*this.trust/100;let sp=Math.min(5.4,2+d*.9)*k*(this.scared>.5&&this.trust<35?.45:1),tx=p.x,ty=p.y;
   if(!lv.clear(this.x,this.y,tx,ty,.22)){const n=lv.flowStep(lv.fP,this.x,this.y);if(n){tx=n[0];ty=n[1];}}
   const a=Math.atan2(ty-this.y,tx-this.x);this.f=a;lv.moveEnt(this,Math.cos(a)*sp*dt,Math.sin(a)*sp*dt);this.ph+=dt*sp*2.4;}
  else if(d<.8){const a=Math.atan2(this.y-p.y,this.x-p.x);lv.moveEnt(this,Math.cos(a)*dt*2,Math.sin(a)*dt*2);}
  if(this.trust<30&&near&&Math.random<dt*.2)say('"Papa… I\'m scared…"',2200,'#ffd34d');}
 hurt(d){if(this.carried||this.lv.over)return;if(!Number.isFinite(d)||d<=0)d=1;this.hp-=d;this.hT=2;this.trust=Math.max(0,this.trust-6);SFX.hurt();this.lv.fl(this.x,this.y,'-'+Math.round(d),'#ffd34d');if(this.hp<=0){this.hp=0;this.lv.fail('Nancy is gone.');}}
}

/* ---------- enemies ---------- */
const ET={
 drifter:{hp:55,spd:1.7,dmg:8,r:.3,sense:7,reach:.5,windT:.38,cd:1.1,sc:1},
 stalker:{hp:38,spd:2.7,dmg:11,r:.3,sense:9,reach:.5,windT:.24,cd:1,sc:1.05},
 bloated:{hp:95,spd:1.05,dmg:14,r:.5,sense:6,reach:.6,windT:.5,cd:1.4,sc:1.3},
 boss:{hp:430,spd:2.2,dmg:20,r:.55,sense:99,reach:.9,windT:.5,cd:1.2,sc:1.4}};
const BOSSLINES=['"David… it hurts…"','"Where is my little girl?"','"I can hear the ocean…"','"Don\'t look at me…"','"Please… stop me…"','"I was only trying to feed them…"'];
class Enemy{
 constructor(lv,type,x,y,o){o=o||{};const T0=ET[type],D=DIFFS[S.difficulty];
  Object.assign(this,{lv,type,x,y,r:T0.r,hp:T0.hp*D.hp,spd:T0.spd*D.spd,dmg:T0.dmg*D.dmg,sense:T0.sense,reach:T0.reach,windT:T0.windT,cdMax:T0.cd,sc:T0.sc,state:'patrol',f:rnd(0,6.28),ph:rnd(0,6),cd:rnd(0,.8),wind:0,hurtT:0,stun:0,dead:false,dying:false,fuse:0,hx:x,hy:y,pr:o.pr||3.5,pauseT:rnd(0,2),wp:null,wpT:0,hunt:!!o.hunt,zone:o.zone||0,tgt:'p',lostT:0,ax:x,ay:y,searchT:0,lunge:0,lungeCd:rnd(1,3),seed:Math.random*10,shirt:pick(['#6b4a3a','#4a5a6b','#5a4a5a','#6b6b4a','#3f5f4f','#7a5a3a'])});
  this.max=this.hp;if(type==='boss'){Object.assign(this,{bs:'idle',bt:0,phase:1,abT:4,awake:false,dirx:0,diry:1,lineT:9,hitDone:false});}}
 goto(x,y,sp,dt){const a=Math.atan2(y-this.y,x-this.x);this.f+=angD(a,this.f)*Math.min(1,dt*10);this.lv.moveEnt(this,Math.cos(a)*sp*dt,Math.sin(a)*sp*dt);this.ph+=dt*sp*2.2;}
 steer(tx,ty,sp,dt,field){const lv=this.lv;if(!lv.clear(this.x,this.y,tx,ty,this.r*.9)){const n=lv.flowStep(field,this.x,this.y);if(n){tx=n[0];ty=n[1];}}this.goto(tx,ty,sp,dt);}
 update(dt){
  if(this.dead)return;const lv=this.lv;this.hurtT-=dt;this.cd-=dt;
  if(this.dying){this.fuse-=dt;if(this.fuse<=0){this.dead=true;lv.explosion(this.x,this.y,2.9,this.dmg*2.2);}return;}
  if(this.type==='boss'){this.updBoss(dt);return;}
  if(this.stun>0){this.stun-=dt;return;}
  const p=lv.player,d=lv.daughter,D=DIFFS[S.difficulty];
  const tp=dst(this.x,this.y,p.x,p.y),td=d.carried?1e9:dst(this.x,this.y,d.x,d.y);
  let sense=this.sense*D.aware*(p.sprint?1.5:1)*(p.still?.65:1);if(this.hunt)sense=70;
  const seeP=tp<sense&&(this.hunt||tp<2.5||lv.clear(this.x,this.y,p.x,p.y,.25));
  const seeD=!d.carried&&td<sense*.8&&(this.hunt||td<2.2||lv.clear(this.x,this.y,d.x,d.y,.25));
  if(seeP||seeD){this.lostT=0;this.tgt=(seeP&&(!seeD||tp<=td))?'p':'d';if(this.state!=='chase'){this.state='chase';lv.alertNear(this.x,this.y,6,this);lv.onSpotted();}}
  else if(this.state==='chase'){this.lostT+=dt;if(this.lostT>3.5){this.state='alert';this.ax=p.x;this.ay=p.y;this.searchT=5;}}
  if(this.state==='chase'){
   const t=this.tgt==='p'?p:d,dd=dst(this.x,this.y,t.x,t.y),reach=this.r+t.r+this.reach;
   if(this.lunge>0){this.lunge-=dt;lv.moveEnt(this,Math.cos(this.f)*7*dt,Math.sin(this.f)*7*dt);}
   else if(this.wind>0){this.wind-=dt;if(this.wind<=0){if(dst(this.x,this.y,t.x,t.y)<reach+.45)t.hurt(this.dmg,Math.atan2(t.y-this.y,t.x-this.x));this.cd=this.cdMax;}}
   else if(dd<reach){if(this.cd<=0)this.wind=this.windT;}
   else{this.lungeCd-=dt;if(this.type==='stalker'&&this.lungeCd<=0&&dd<4&&lv.clear(this.x,this.y,t.x,t.y,.3)){this.lungeCd=3.2;this.lunge=.22;this.f=Math.atan2(t.y-this.y,t.x-this.x);}else this.steer(t.x,t.y,this.spd,dt,this.tgt==='p'?lv.fP:lv.fD);}
  }else if(this.state==='alert'){
   if(dst(this.x,this.y,this.ax,this.ay)>.9)this.steer(this.ax,this.ay,this.spd*.7,dt,lv.fP);else{this.searchT-=dt;this.f+=dt*1.5;if(this.searchT<=0){this.state='patrol';this.hx=this.x;this.hy=this.y;}}
  }else{
   if(this.pauseT>0)this.pauseT-=dt;else{this.wpT-=dt;if(!this.wp||this.wpT<=0||dst(this.x,this.y,this.wp[0],this.wp[1])<.5){this.wp=lv.freeSpot(this.hx-this.pr,this.hx+this.pr,this.hy-this.pr,this.hy+this.pr,.5);this.pauseT=rnd(1,4);this.wpT=6;}else this.goto(this.wp[0],this.wp[1],this.spd*.3,dt);}
  }
 }
 updBoss(dt){
  const lv=this.lv,p=lv.player;if(!this.awake){this.ph+=dt*.4;return;}
  const fr=this.hp/this.max,ph=fr>.6?1:fr>.3?2:3;if(ph!==this.phase){this.phase=ph;lv.bossPhase(ph);}
  this.bt-=dt;this.lineT-=dt;if(this.lineT<=0){this.lineT=rnd(9,14);say(pick(BOSSLINES),3200,'#d68cff');}
  const dp=dst(this.x,this.y,p.x,p.y),face=Math.atan2(p.y-this.y,p.x-this.x);
  switch(this.bs){
   case'idle':this.bs='walk';break;
   case'walk':{this.f+=angD(face,this.f)*Math.min(1,dt*6);const sp=this.spd*(ph===1?1:ph===2?1.2:1.4);
    if(this.wind>0){this.wind-=dt;if(this.wind<=0){if(dst(this.x,this.y,p.x,p.y)<this.r+p.r+1.2)p.hurt(this.dmg,face);this.cd=1.3-ph*.1;SFX.hit();}}
    else if(dp>this.r+p.r+.7)this.steer(p.x,p.y,sp,dt,lv.fP);else if(this.cd<=0)this.wind=.5;
    this.abT-=dt;if(ph>=2&&this.abT<=0&&dp>3&&this.wind<=0){if(ph===3&&Math.random<.5){this.bs='scream';this.bt=1;lv.tele.push({t:'ring',x:this.x,y:this.y,r:4.2,age:0,max:1});SFX.roar();}else{this.bs='aim';this.bt=1;this.dirx=Math.cos(face);this.diry=Math.sin(face);}this.abT=ph===3?3.2:4.5;}
    break;}
   case'aim':{if(this.bt>.25){const a=Math.atan2(p.y-this.y,p.x-this.x);this.dirx=Math.cos(a);this.diry=Math.sin(a);this.f=a;}if(this.bt<=0){this.bs='charge';this.bt=.55;this.hitDone=false;SFX.roar();}break;}
   case'charge':{const ox=this.x,oy=this.y;lv.moveEnt(this,this.dirx*11*dt,this.diry*11*dt);this.ph+=dt*14;
    if(!this.hitDone&&dst(this.x,this.y,p.x,p.y)<this.r+p.r+.35){this.hitDone=true;p.hurt(this.dmg*1.4,Math.atan2(this.diry,this.dirx));}
    if(Math.hypot(this.x-ox,this.y-oy)<11*dt*.3){this.bs='stun';this.bt=1.4;shake(12);lv.fl(this.x,this.y,'STUNNED','#ffd34d');}else if(this.bt<=0){this.bs='recover';this.bt=.7;}break;}
   case'stun':case'recover':if(this.bt<=0)this.bs='walk';break;
   case'scream':if(this.bt<=0){shake(10);if(dp<4.2)p.hurt(this.dmg*.7,face);for(let i=0;i<20;i++)lv.part(this.x,this.y,.8,rnd(-6,6),rnd(-6,6),rnd(0,2),.6,'#e060ff',3,false);this.bs='recover';this.bt=.8;}break;}
 }
 hurt(d,ang,nokb){
  if(this.dead||this.dying)return;if(!Number.isFinite(d)||d<=0)d=1;/* NaN/undefined damage used to silently softlock fights */
  if(this.type==='boss'&&!this.awake)return;const lv=this.lv;if(this.bs==='stun')d*=1.5;
  this.hp-=d;this.hurtT=.14;SFX.hit();lv.fl(this.x,this.y,'-'+Math.round(d),'#ff8a5a');
  for(let i=0;i<5;i++)lv.part(this.x,this.y,.9,Math.cos(ang||0)*rnd(1,3)+rnd(-1,1),Math.sin(ang||0)*rnd(1,3)+rnd(-1,1),rnd(1,3),.5,this.type==='bloated'?'#7ac03a':'#8a1010',2.5);
  if(!nokb&&this.type!=='boss'){this.stun=.22;lv.moveEnt(this,Math.cos(ang)*.35,Math.sin(ang)*.35);}
  if(this.state!=='chase'&&this.type!=='boss'){this.state='chase';this.lostT=0;this.tgt='p';}
  lv.noise(this.x,this.y,5);if(this.hp<=0&&!this.dying&&!this.dead)this.die();
 }
 die(){const lv=this.lv;lv.kills++;G.kills=(G.kills||0)+1;/* per-chapter kill count (resets each level) */G.runKills=(G.runKills||0)+1;
  const mult=G.maxCombo>=2?(1+Math.min(G.maxCombo,5)*.1):1;/* finisher streak boosts score up to +50% */
  const pts=Math.round(100*mult);G.score+=pts;lv.fl(this.x,this.y,'+'+pts+(mult>1?' ×'+mult.toFixed(1):''),'#ffd34d');lv.stain(this.x,this.y,rnd(.8,1.3),this.type==='bloated'?'#2f5a14':'#5a0a0a');SFX.kill();
  for(let i=0;i<14;i++)lv.part(this.x,this.y,.6,rnd(-3,3),rnd(-3,3),rnd(1,4),.8,'#8a1010',rnd(2,4));
  if(this.type==='bloated'){this.dying=true;this.fuse=.95;this.hp=1;say('The bloated one is about to burst — run!',1800,'#c8ff7a');return;}
  this.dead=true;if(this.type==='boss')lv.onBossDead(this);}
}
