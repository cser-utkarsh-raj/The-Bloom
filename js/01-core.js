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
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';lc.width=Math.max(2,W>>1);lc.height=Math.max(2,H>>1);const oc=$('oc');oc.width=W;oc.height=H;}addEventListener('resize',resize);

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
  const o1=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),l=AC.createOscillator(),lg=AC.createGain();
  o1.frequency.value=48;o2.type='triangle';o2.frequency.value=51.5;g.gain.value=.05;l.frequency.value=.12;lg.gain.value=.03;
  l.connect(lg);lg.connect(g.gain);o1.connect(g);o2.connect(g);g.connect(MG);o1.start();o2.start();l.start();
  setInterval(()=>{if(state==='play'&&Math.random()<.35)tone(rnd(70,110),1.6,'sawtooth',.04,-25);},7000);
 }catch(e){AC=null;}
}
function setVol(){if(MG)MG.gain.value=S.volume;}
function tone(f,dur,type,vol,slide){if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);g.gain.setValueAtTime(vol||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(MG);o.start(t);o.stop(t+dur+.02);}
function nz(dur,vol,fq){if(!AC)return;const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NB;f.type='bandpass';f.frequency.value=fq||1000;g.gain.setValueAtTime(vol||.15,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(MG);s.start(t,Math.random()*.5,dur);}
const SFX={swing:()=>nz(.12,.1,2500),hit:()=>{tone(130,.14,'square',.1,-70);nz(.1,.12,700);},hurt:()=>tone(95,.28,'sawtooth',.18,-45),kill:()=>nz(.2,.12,400),heal:()=>tone(520,.2,'sine',.12,260),pick:()=>tone(760,.12,'triangle',.1,300),boom:()=>{nz(.8,.35,150);tone(60,.8,'sine',.3,-30);},roar:()=>tone(110,.9,'sawtooth',.16,-60),shell:()=>tone(900,.8,'sine',.05,-700),shot:()=>{nz(.12,.2,1800);tone(300,.1,'square',.08,-200);}};
/* ---------- adaptive soundtrack (Web Audio, fully local) ---------- */
const MUSIC={level:-1,step:0,pads:[],timer:null};
function startMusicForLevel(level){
 audioInit();if(!AC||!MG)return;
 MUSIC.level=clamp(level|0,0,4);MUSIC.step=0;
 const roots=[55,49,52,46,41],root=roots[MUSIC.level];
 if(!MUSIC.pads.length){
  for(const[ratio,type,gain] of [[1,'triangle',.075],[1.4983,'sine',.042],[2.0,'sine',.02]]){
   const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter();
   o.type=type;o.frequency.value=root*ratio;o.detune.value=ratio===1?0:Math.random()*8-4;
   f.type='lowpass';f.frequency.value=520;f.Q.value=.7;
   g.gain.value=.0001;o.connect(f);f.connect(g);g.connect(MG);o.start();
   MUSIC.pads.push({o,g,f,ratio,maxGain:gain});
  }
  MUSIC.timer=setInterval(()=>{
   if(!AC||!MG)return;
   const playing=state==='play',base=roots[clamp(MUSIC.level,0,4)];
   const infect=(typeof G!=='undefined'&&G)?clamp(G.infect||0,0,100):0;
   for(const p of MUSIC.pads){
    p.o.frequency.setTargetAtTime(base*p.ratio,AC.currentTime,.8);
    p.f.frequency.setTargetAtTime(playing?(480+infect*10):300,AC.currentTime,1.5);
    p.g.gain.setTargetAtTime(playing?p.maxGain:.0001,AC.currentTime,playing?1.2:.3);
   }
   if(playing&&S.volume>.001){
    const scales=[[0,3,7,10,7,5,3,2],[0,3,5,7,10,7,5,2],[0,2,5,7,9,7,5,2],[0,3,7,8,10,8,7,3],[0,3,5,7,10,8,7,2]];
    const n=scales[MUSIC.level][MUSIC.step%scales[MUSIC.level].length],oct=MUSIC.step%4===0?2:1;
    tone(base*Math.pow(2,n/12)*oct,1.35,'sine',MUSIC.level===1?.06:.045,-2);
    if(MUSIC.step%4===0)tone(base*2,.8,'triangle',.03,1);
    if(MUSIC.step%8===4)tone(base*Math.pow(2,(n+7)/12),1.1,'sine',.02,-2);
    if(infect>55&&MUSIC.step%2===0)tone(base/2,.25,'sine',.05,-8);
    MUSIC.step++;
   }
  },1450);
 }
 /* immediate retune + fast fade-in so the score is audible the moment a chapter begins */
 for(const p of MUSIC.pads){
  p.o.frequency.setTargetAtTime(root*p.ratio,AC.currentTime,.6);
  p.g.gain.setTargetAtTime(state==='play'?p.maxGain:.0001,AC.currentTime,.5);
 }
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


