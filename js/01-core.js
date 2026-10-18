'use strict';
/* ============================================================
   THE BLOOM  isometric survival horror   (single file)
   ============================================================ */
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a), rint=(a,b)=>Math.floor(rnd(a,b+1));
const dst=(a,b,c,d)=>Math.hypot(a-c,b-d), pick=a=>a[Math.floor(Math.random()*a.length)];
const angD=(a,b)=>{let d=a-b;while(d>Math.PI)d-=6.2832;while(d<-Math.PI)d+=6.2832;return d;};
const $=id=>document.getElementById(id);
const hx=(r,g,b)=>'#'+((1<<24)|((clamp(r,0,255)|0)<<16)|((clamp(g,0,255)|0)<<8)|(clamp(b,0,255)|0)).toString(16).slice(1);
const mixc=(h,k)=>{const n=parseInt(h.slice(1),16);return hx((n>>16)*k,((n>>8)&255)*k,(n&255)*k);};
const rgba=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16},${(n>>8)&255},${n&255},${a})`};
let GLOBAL_SEED=null;
const seeded=s=>()=>(s=(s*16807)%2147483647)/2147483647;
function getSeed(){if(GLOBAL_SEED!==null)return GLOBAL_SEED;const urlParams=new URLSearchParams(window.location.search);const seed=urlParams.get('seed');if(seed!==null){GLOBAL_SEED=parseInt(seed)||Date.now();return GLOBAL_SEED;}return Date.now();}

/* ---------- canvas ---------- */
const cv=$('c'),cx=cv.getContext('2d');
const lc=document.createElement('canvas'),lx=lc.getContext('2d');
let W=innerWidth,H=innerHeight,DPR=1,Z=1;
function resize(){const isMob=Boolean(window.IS_MOBILE||(typeof innerWidth!=='undefined'&&innerWidth<=820&&('ontouchstart' in window||navigator.maxTouchPoints>0)));DPR=Math.min(isMob?1.35:2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';lc.width=Math.max(2,W>>1);lc.height=Math.max(2,H>>1);const oc=$('oc');oc.width=W;oc.height=H;}addEventListener('resize',resize);

/* ---------- settings ---------- */
const DEF={difficulty:'survivor',theme:'bloom',gfx:'high',bright:'normal',zoom:1,particles:true,shake:true,grain:true,lighting:true,weather:true,minimap:true,subs:true,assist:true,bars:true,volume:.6,accessibility:false,reducedMotion:false};
let S=Object.assign({},DEF);
try{const j=localStorage.getItem('bloomS2');if(j)Object.assign(S,JSON.parse(j));}catch(e){}
let bloomScores={};try{const bs=localStorage.getItem('bloomScores');if(bs)bloomScores=JSON.parse(bs);}catch(e){bloomScores={};}
const saveS=()=>{try{localStorage.setItem('bloomS2',JSON.stringify(S));}catch(e){}};
function saveScores(){try{localStorage.setItem('bloomScores',JSON.stringify(bloomScores));}catch(e){}}
function updateScore(chapter,score){if(!bloomScores[chapter]||score>bloomScores[chapter]){bloomScores[chapter]=score;saveScores();}}
let unlocked=0;try{unlocked=+localStorage.getItem('bloomU2')||0;}catch(e){}
const DIFFS={
 story:{name:'STORY',col:'#5dffa0',hp:1.3,dmg:.55,spd:.82,med:4,aware:.8,gap:2.7,timer:1.4,desc:'More health, weaker enemies, more medkits. Focus on the story.'},
 survivor:{name:'SURVIVOR',col:'#ffd34d',hp:1,dmg:1,spd:1,med:2,aware:1,gap:1.9,timer:1,desc:'The intended experience. Balanced and tense.'},
 nightmare:{name:'NIGHTMARE',col:'#ff5a6a',hp:1.25,dmg:1.5,spd:1.2,med:1,aware:1.4,gap:1.2,timer:.8,desc:'Scarce resources. Sharper senses. No mercy.'}};
const THEMES={
 bloom:{name:'BLOOM',acc:'#4dffa0',tint:[190,236,206],amb:[3,14,12]},
 ash:{name:'ASH',acc:'#ffc46b',tint:[240,222,186],amb:[16,12,6]},
 blood:{name:'BLOOM',acc:'#ff5a6a',tint:[240,176,176],amb:[18,4,6]},
 void:{name:'VOID',acc:'#9a7bff',tint:[196,184,248],amb:[8,5,22]}};
function applyTheme(){document.documentElement.style.setProperty('--acc',THEMES[S.theme].acc);}
function brighten(col,factor){const n=parseInt(col.slice(1),16);const r=(n>>16),g=(n>>8)&255,b=n&255;return`#${((Math.min(255,r*factor)|0).toString(16).padStart(2,'0'))}${((Math.min(255,g*factor)|0).toString(16).padStart(2,'0'))}${((Math.min(255,b*factor)|0).toString(16).padStart(2,'0'))}`;}

/* ---------- audio ---------- */
let AC=null,MG=null,NB=null;
function audioInit(){
 if(AC){if(AC.state==='suspended')AC.resume();return;}
 try{const A=window.AudioContext||window.webkitAudioContext;if(!A||S.volume<=0)return;AC=new A();MG=AC.createGain();MG.gain.value=S.volume;MG.connect(AC.destination);
  NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 }catch(e){AC=null;}
}
function setVol(){if(MG)MG.gain.value=S.volume;if(FOLEY&&FOLEY.level>=0)updateFoleyForLevel(FOLEY.level);}
function tone(f,dur,type,vol,slide){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);g.gain.setValueAtTime(vol||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(MG);o.start(t);o.stop(t+dur+.02);}
function nz(dur,vol,fq){if(!AC)return;const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NB;f.type='bandpass';f.frequency.value=fq||1000;g.gain.setValueAtTime(vol||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(MG);s.start(t,Math.random()*.5,dur);}
const SFX={swing:()=>nz(.12,.1,2500),hit:()=>{tone(130,.14,'square',.1,-70);nz(.1,.12,700);},hurt:()=>tone(95,.28,'sawtooth',.18,-45),kill:()=>nz(.2,.12,400),heal:()=>tone(520,.2,'sine',.12,260),pick:()=>tone(760,.12,'triangle',.1,300),boom:()=>{nz(.8,.35,150);tone(60,.8,'sine',.3,-30);},roar:()=>tone(110,.9,'sawtooth',.16,-60),shell:()=>tone(900,.8,'sine',.05,-700),shot:()=>{nz(.12,.2,1800);tone(300,.1,'square',.08,-200);},parry:()=>{tone(880,.12,'triangle',.18);tone(1320,.14,'sine',.14);nz(.08,.15,3200);},stoneCrunch:()=>{nz(.65,.4,220);tone(70,.5,'triangle',.28,-35);}};

/* ---------- CHAPTER ENVIRONMENTAL FOLEY AUDIO BEDS ---------- */
const FOLEY={source:null,filter:null,gain:null,subOsc:null,subGain:null,level:-1,timer:null};
function updateFoleyForLevel(lvl){
 audioInit();if(!AC||!MG)return;
 FOLEY.level=lvl;
 if(!FOLEY.gain){
  FOLEY.gain=AC.createGain();FOLEY.gain.gain.value=0.0001;FOLEY.gain.connect(MG);
  FOLEY.filter=AC.createBiquadFilter();FOLEY.filter.connect(FOLEY.gain);
  FOLEY.source=AC.createBufferSource();FOLEY.source.buffer=NB;FOLEY.source.loop=true;
  FOLEY.source.connect(FOLEY.filter);try{FOLEY.source.start();}catch(e){}
  FOLEY.subOsc=AC.createOscillator();FOLEY.subGain=AC.createGain();
  FOLEY.subGain.gain.value=0.0001;FOLEY.subOsc.type='sine';FOLEY.subOsc.frequency.value=45;
  FOLEY.subOsc.connect(FOLEY.subGain);FOLEY.subGain.connect(MG);try{FOLEY.subOsc.start();}catch(e){}
  if(!FOLEY.timer){
   FOLEY.timer=setInterval(()=>{
    if(!AC||!MG||state!=='play'||S.volume<=0.001)return;
    const now=AC.currentTime;
    if(FOLEY.level===2&&Math.random()<0.45){
     FOLEY.subGain.gain.setValueAtTime(S.volume*0.09,now);
     FOLEY.subGain.gain.exponentialRampToValueAtTime(0.0001,now+3.2);
    }else if(FOLEY.level===4&&Math.random()<0.5){
     FOLEY.subGain.gain.setValueAtTime(S.volume*0.14,now);
     FOLEY.subGain.gain.exponentialRampToValueAtTime(0.0001,now+1.8);
    }
   },4500);
  }
 }
 const now=AC.currentTime,vol=S.volume*0.06;
 if(state!=='play'||S.volume<=0.001){
  FOLEY.gain.gain.setTargetAtTime(0.0001,now,0.5);
  FOLEY.subGain.gain.setTargetAtTime(0.0001,now,0.5);
  return;
 }
 if(lvl===0){
  FOLEY.filter.type='bandpass';FOLEY.filter.frequency.setTargetAtTime(1600,now,0.8);FOLEY.filter.Q.value=1.5;
  FOLEY.gain.gain.setTargetAtTime(vol*0.8,now,0.8);FOLEY.subGain.gain.setTargetAtTime(0.0001,now,0.5);
 }else if(lvl===1){
  FOLEY.filter.type='lowpass';FOLEY.filter.frequency.setTargetAtTime(320,now,1.0);FOLEY.filter.Q.value=2.4;
  FOLEY.gain.gain.setTargetAtTime(vol*0.7,now,0.8);FOLEY.subGain.gain.setTargetAtTime(0.0001,now,0.5);
 }else if(lvl===2){
  FOLEY.filter.type='bandpass';FOLEY.filter.frequency.setTargetAtTime(450,now,0.8);FOLEY.filter.Q.value=1.2;
  FOLEY.gain.gain.setTargetAtTime(vol*1.1,now,0.8);FOLEY.subOsc.frequency.setValueAtTime(42,now);
  FOLEY.subGain.gain.setTargetAtTime(vol*0.4,now,0.8);
 }else if(lvl===3){
  FOLEY.filter.type='bandpass';FOLEY.filter.frequency.setTargetAtTime(120,now,0.5);FOLEY.filter.Q.value=8.0;
  FOLEY.gain.gain.setTargetAtTime(vol*0.9,now,0.8);FOLEY.subOsc.frequency.setValueAtTime(60,now);
  FOLEY.subGain.gain.setTargetAtTime(vol*0.35,now,0.8);
 }else{
  FOLEY.filter.type='lowpass';FOLEY.filter.frequency.setTargetAtTime(220,now,0.8);FOLEY.filter.Q.value=1.2;
  FOLEY.gain.gain.setTargetAtTime(vol*0.95,now,0.8);FOLEY.subOsc.frequency.setValueAtTime(36,now);
  FOLEY.subGain.gain.setTargetAtTime(vol*0.5,now,0.8);
 }
}

/* ---------- MINIMALIST SURVIVAL-HORROR THEME MUSIC (Santaolalla / Akira Yamaoka Style) ---------- */
const MUSIC={level:-1,step:0,dronePads:[],timer:null,nextPluckT:0};

function acousticPluck(freq, vol, decayTime){
 if(!AC||!MG||S.volume<=0.001)return;
 try{
  const now=AC.currentTime;
  const o1=AC.createOscillator(),o2=AC.createOscillator();
  const bp=AC.createBiquadFilter(),g=AC.createGain();
  o1.type='triangle';o1.frequency.setValueAtTime(freq,now);o1.detune.setValueAtTime(-3,now);
  o2.type='sine';o2.frequency.setValueAtTime(freq*2,now);o2.detune.setValueAtTime(4,now);
  bp.type='bandpass';bp.frequency.setValueAtTime(Math.min(1800,freq*2.2),now);bp.Q.setValueAtTime(2.2,now);
  const v=(vol||0.045)*Math.min(1,S.volume*1.4);
  g.gain.setValueAtTime(0.0001,now);
  g.gain.linearRampToValueAtTime(v,now+0.006);
  g.gain.exponentialRampToValueAtTime(v*0.35,now+0.12);
  g.gain.exponentialRampToValueAtTime(0.0001,now+(decayTime||3.2));
  o1.connect(bp);o2.connect(bp);bp.connect(g);g.connect(MG);
  o1.start(now);o2.start(now);
  o1.stop(now+(decayTime||3.2)+0.05);o2.stop(now+(decayTime||3.2)+0.05);
 }catch(e){}
}

function startMusicForLevel(level){
 audioInit();if(!AC||!MG)return;
 MUSIC.level=clamp(level|0,0,4);MUSIC.step=0;
 const roots=[73.41, 55.0, 43.65, 41.2, 36.71], root=roots[MUSIC.level];

 if(!MUSIC.dronePads.length){
  for(const[ratio,type,gain,det] of [[1,'sine',.062,-3],[1.002,'triangle',.032,4],[0.5,'sine',.048,0]]){
   const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
   o.type=type;o.frequency.value=root*ratio;o.detune.value=det;
   f.type='lowpass';f.frequency.value=180;f.Q.value=0.9;
   g.gain.value=0.0001;
   o.connect(f);f.connect(g);g.connect(MG);o.start();
   MUSIC.dronePads.push({o,g,f,ratio,maxGain:gain});
  }

  const MOTIFS=[
   [73.41, 110.0, 146.83, 174.61, 220.0, 174.61, 146.83, 110.0],
   [55.0, 82.41, 110.0, 130.81, 164.81, 130.81, 110.0, 82.41],
   [43.65, 65.41, 87.31, 130.81, 174.61, 130.81, 87.31, 65.41],
   [41.2, 61.74, 82.41, 123.47, 164.81, 123.47, 82.41, 61.74],
   [36.71, 55.0, 73.41, 110.0, 146.83, 110.0, 73.41, 55.0]
  ];

  MUSIC.timer=setInterval(()=>{
   if(!AC||!MG)return;
   const playing=state==='play',base=roots[clamp(MUSIC.level,0,4)];
   const infect=(typeof G!=='undefined'&&G)?clamp(G.infect||0,0,100):0;

   for(const p of MUSIC.dronePads){
    p.o.frequency.setTargetAtTime(base*p.ratio,AC.currentTime,1.2);
    p.f.frequency.setTargetAtTime(playing?(140+infect*1.8):120,AC.currentTime,2.0);
    p.g.gain.setTargetAtTime(playing?p.maxGain*S.volume:0.0001,AC.currentTime,playing?1.4:0.5);
   }

   if(playing&&S.volume>0.001){
    const now=AC.currentTime;
    if(now>=MUSIC.nextPluckT){
     const notes=MOTIFS[clamp(MUSIC.level,0,4)];
     const n=notes[MUSIC.step%notes.length];
     const vol=0.038+(Math.random()*0.02);
     const decay=2.8+(Math.random()*0.8);
     acousticPluck(n,vol,decay);
     if(MUSIC.step%4===2&&Math.random()<0.45){
      setTimeout(()=>{acousticPluck(n*1.5,vol*0.6,2.2);},280);
     }
     MUSIC.step++;
     MUSIC.nextPluckT=now+3.2+Math.random()*2.2;
    }
   }
  },800);
 }

 for(const p of MUSIC.dronePads){
  p.o.frequency.setTargetAtTime(root*p.ratio,AC.currentTime,0.8);
  p.g.gain.setTargetAtTime(state==='play'?p.maxGain*S.volume:0.0001,AC.currentTime,0.6);
 }
 updateFoleyForLevel(MUSIC.level);
}
/* ---------- input ---------- */
const keys={},hit={},mouse={x:0,y:0,down:false,click:false};
const took=c=>{const v=hit[c];hit[c]=false;return !!v;};addEventListener('keydown',e=>{if(!e.repeat)hit[e.code]=true;keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();audioInit();
 if(state==='play'){if(e.code==='Escape'||e.code==='KeyP')showPause();if(e.code==='KeyM')mapBig=!mapBig;if(e.code==='KeyH')toggleHelp();}
 else if(state==='pause'&&(e.code==='Escape'||e.code==='KeyP'))resume();
 else if(state==='intro'&&(e.code==='Space'||e.code===
'Enter'))introGo();});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});cv.addEventListener('mousedown',e=>{if(e.button===0){mouse.down=true;mouse.click=true;}mouse.x=e.clientX;mouse.y=e.clientY;audioInit();});addEventListener('mouseup',()=>mouse.down=false);addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;});addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- isometric math ---------- */
const TW=64,ZH=32;
let CX=0,CY=0,camX=0,camY=0,shk=0;
const isx=(x,y)=>(x-y)*32, isy=(x,y,z)=>(x+y)*16-(z||0)*ZH;
const w2s=(x,y,z)=>[(isx(x,y)-CX)*Z+W/2,(isy(x,y,z)-CY)*Z+H/2];
function s2w(px,py){const sx=(px-W/2)/Z+CX,sy=(py-H/2)/Z+CY,a=sx/32,b=sy/16;return{x:(a+b)/2,y:(b-a)/2};}
const setWorld=()=>cx.setTransform(DPR*Z,0,0,DPR*Z,DPR*(W/2-CX*Z),DPR*(H/2-CY*Z));
const setScreen=()=>cx.setTransform(DPR,0,0,DPR,0,0);
const shake=a=>{if(S.shake&&!S.reducedMotion)shk=Math.max(shk,a);};

/* ---------- textures (procedural images) ---------- */
const TEX={};
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function tile(name,cols,det){
 TEX[name]=cols.map((col,v)=>{const c=mkc(66,34),g=c.getContext('2d'),r=seeded(97+v*31+name.length*7);
  g.beginPath();g.moveTo(33,0);g.lineTo(66,17);g.lineTo(33,34);g.lineTo(0,17);g.closePath();g.clip();
  g.fillStyle=col;g.fillRect(0,0,66,34);det(g,r,v);
  for(let i=0;i<50;i++){g.fillStyle=r()<.5?'rgba(0,0,0,.09)':'rgba(255,255,255,.05)';g.fillRect(r()*66,r()*34,1+r()*2,1);}
  return c;});
}
function makeTextures(){
 const ln=(g,a,b,c,d,s)=>{g.strokeStyle=s;g.lineWidth=1;g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke();};
 const planks=c=>(g,r)=>{for(let k=-4;k<10;k++)ln(g,-4,k*6,72,k*6+38,c);};
 tile('wood',['#6a4a30','#5f4129'],planks('rgba(0,0,0,.3)'));
 tile('dark',['#3d2b35','#34242c'],planks('rgba(0,0,0,.4)'));
 tile('carpet',['#3d4862','#38425c'],(g,r)=>{for(let i=0;i<90;i++){g.fillStyle='rgba(255,255,255,.05)';g.fillRect(r()*66,r()*34,1,1);}});
 tile('tile',['#b4b8b0','#9a9f97'],(g)=>{g.strokeStyle='rgba(0,0,0,.2)';g.beginPath();g.moveTo(33,2);g.lineTo(64,17);g.lineTo(33,32);g.lineTo(2,17);g.closePath();g.stroke();});
 tile('grass',['#2c4d30','#315636'],(g,r)=>{for(let i=0;i<46;i++){const x=r()*66,y=r()*34;g.strokeStyle=r()<.5?'#3f7040':'#1f3a24';g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*2,y-2-r()*3);g.stroke();}});
 tile('road',['#2c2d31','#27282c'],(g,r)=>{for(let i=0;i<70;i++){g.fillStyle='rgba(255,255,255,.05)';g.fillRect(r()*66,r()*34,1,1);}ln(g,10,20,30,26,'rgba(0,0,0,.35)');});
 tile('walk',['#5d5e5b','#535452'],(g)=>{ln(g,33,0,33,34,'rgba(0,0,0,.2)');ln(g,0,17,66,17,'rgba(0,0,0,.2)');});
 tile('lino',['#8c8f7e','#7d8071'],(g)=>{g.strokeStyle='rgba(0,0,0,.18)';g.beginPath();g.moveTo(33,3);g.lineTo(62,17);g.lineTo(33,31);g.lineTo(4,17);g.closePath();g.stroke();});
 tile('waste',['#3d3229','#362c24'],(g,r)=>{for(let i=0;i<9;i++){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(r()*66,r()*34,1+r()*2,0,6.3);g.fill();}});
}


