/* ---------- game state & HUD ---------- */
let G=null;// built in boot() after settings load, so difficulty medkits are correct
function newGame(){return{score:0,hp:100,maxHp:100,meds:DIFFS[S.difficulty].med,infect:0,trust:100,dmgUp:0,level:0,bought:{},snap:null,kills:0,runKills:0,maxCombo:0};}
let bloomBst={};try{bloomBst=JSON.parse(localStorage.getItem('bloomBst')||'{}')||{};}catch(e){bloomBst={};}
const saveBst=(i,s)=>{if((bloomBst[i]|0)>=s)return false;bloomBst[i]=s;try{localStorage.setItem('bloomBst',JSON.stringify(bloomBst));}catch(e){}return true;};
let subTimer=0;
function say(txt,ms,col){if(!S.subs&&!col)return;const el=$('sub');el.textContent=txt;el.style.color=col||'';el.style.opacity=1;clearTimeout(subTimer);subTimer=setTimeout(()=>el.style.opacity=0,ms||3200);}
let banTimer=0;
function banner(txt,col){const b=$('banner');b.textContent=txt;b.style.color=col||'#ff5a5a';b.style.opacity=1;clearTimeout(banTimer);banTimer=setTimeout(()=>b.style.opacity=0,1700);}
const cache={};
function setT(id,v){if(cache[id]!==v){cache[id]=v;$(id).textContent=v;}}
function setW(id,v){const s=v.toFixed(1)+'%';if(cache[id]!==s){cache[id]=s;$(id).style.width=s;}}
let helpShown=0;
function toggleHelp(){helpShown=helpShown>0?0:99;$('help').style.opacity=helpShown?1:0;}
function hud(lv){
 const p=lv.player,d=lv.daughter,f=G.hp/G.maxHp;
 setW('bA',f*100);$('bA').style.background=f>.6?'#4dffa0':f>.3?'#ffd34d':'#ff4a4a';setW('bS',p.stam);setW('bN',d.hp/d.max*100);setW('bI',G.infect);
 setT('tr','TRUST '+Math.round(d.trust));setT('med','✚ ×'+G.meds+'  [Q]');setT('score',G.score);setT('obj',lv.objText());
 const b=lv.boss;$('boss').style.display=b&&b.awake&&!b.dead?'block':'none';if(b&&b.awake){setT('bn','MAYA — THE BLOOM-WIFE');setW('bB',Math.max(0,b.hp/b.max*100));}
 let pr='';if(lv.hint)pr=lv.hint;else if(p.carry)pr='[E] Put Nancy down';else if(!d.carried&&dst(p.x,p.y,d.x,d.y)<2.6)pr='[E] Carry Nancy';setT('prompt',pr);
 $('hurt').style.boxShadow=G.hp<30?`inset 0 0 ${80+30*Math.sin(lv.t*5)}px rgba(160,0,0,.6)`:'none';
}
function portraits(){
 let g=$('pA').getContext('2d');g.fillStyle='#0b1411';g.fillRect(0,0,46,46);g.fillStyle='#35567e';g.fillRect(5,34,36,12);g.fillStyle='#e0b08a';g.fillRect(15,10,16,22);g.fillStyle='#2a1c10';g.fillRect(13,6,20,8);g.fillRect(13,10,3,10);g.fillRect(30,10,3,10);g.fillStyle='#141414';g.fillRect(18,19,3,3);g.fillRect(26,19,3,3);g.fillStyle='rgba(40,30,20,.5)';g.fillRect(16,27,14,4);
 g=$('pN').getContext('2d');g.fillStyle='#0b1411';g.fillRect(0,0,46,46);g.fillStyle='#e8c23a';g.fillRect(8,34,30,12);g.fillStyle='#f0c8a0';g.fillRect(14,11,18,20);g.fillStyle='#5a3418';g.fillRect(12,7,22,8);g.fillRect(10,10,5,20);g.fillRect(31,10,5,20);g.fillStyle='#141414';g.fillRect(18,20,3,3);g.fillRect(26,20,3,3);g.fillStyle='#c0605a';g.fillRect(21,26,5,2);
}

/* ---------- level flow ---------- */
const BUILD=[];
const INTRO=[
 {t:'Home Defence',scene:'home',txt:'The coastal grid dies at sundown. Maya went to the shoreline to investigate the dead fish and never came back. Now the front door shudders beneath something that used to be human. David drags the sofa into place, pushes Nancy behind him, and grips a length of pipe. The first window breaks. There is no time to call for help.',tip:'Hold the living room through three waves. Protect Nancy and conserve stamina.'},
 {t:'The Face I Loved',scene:'wife',txt:'The bedroom door hangs from one hinge. Moonlight catches Maya in the doorway — her wedding ring still on her hand, her face barely recognizable beneath the fungal growth. She takes one step toward David, then claws at her own throat as if something inside is pulling the strings. For one second, she knows him. Then the thing wearing her screams.',tip:'Bait Maya’s charges into the pillars to stun her. Listen to her warnings and strike during recovery.'},
 {t:'Miles of Silence',scene:'road',txt:'Route 101 has become a four-mile graveyard of wrecked cars and burning trucks. Rain swallows the road ahead. Something moves above the overpasses, keeping pace with David and Nancy. Every footstep could draw it down. The evacuation point is still north — if anyone is left to reach it.',tip:'Sprinting draws stalkers out of the rain. Move deliberately and keep Nancy close.'},
 {t:'No Safe Haven',scene:'school',txt:'St. Jude’s High School was meant to be a civilian intake station. The courtyard is breached, the doors are buckling, and exhausted survivors are trapped inside. A patrol officer levels his shotgun beside David. Beyond the doors, the infected press forward in a single, heaving mass. This shelter will not hold forever.',tip:'Hold the barricaded doors for 60 seconds. Create space before bloated hosts rupture.'},
 {t:'The Point Of No Return',scene:'bunker',txt:'Operation Scorched Shore begins at dawn. The military will burn the coastline to contain the outbreak, whether anyone is still alive there or not. Bunker 7 lies beyond the quarantine barricades, through a highway of ash and artillery. Nancy’s hand is small in David’s grip. He cannot stop now — and he cannot go back.',tip:'Break through the quarantine checkpoints before the countdown expires. Reach Bunker 7 with Nancy.'}];
function startLevel(i){
 G.level=i;const D=DIFFS[S.difficulty];
 G.hp=Math.min(G.maxHp,G.hp+(i>0?25:0));if(i===0&&!G.snap){G.hp=G.maxHp;}
 G.snap={hp:G.hp,meds:G.meds,infect:G.infect,score:G.score,trust:G.trust,kills:0,maxCombo:G.maxCombo||0};G.kills=0;
 LV=BUILD[i]();state='play';mapBig=false;
 if(LV.ui)document.documentElement.style.setProperty('--acc',LV.ui);
 $('ov').style.display='none';$('hud').style.display='block';ovAnim=null;
 portraits();Object.keys(cache).forEach(k=>delete cache[k]);
 $('help').innerHTML=document.body.classList.contains('mobile')?'<b>TOUCH &amp; HOLD</b> move toward your finger &nbsp; <b>DOUBLE-TAP</b> attack<br><b>MAP</b> big map &nbsp; <b>II</b> pause &nbsp; <b>H</b> hide help':'<b>WASD / ARROWS</b> move &nbsp; <b>SPACE</b> attack (or click)<br><b>SHIFT</b> sprint &nbsp; <b>F</b> dodge roll &nbsp; <b>Q</b> medkit<br><b>E</b> carry Nancy &nbsp; <b>M</b> map &nbsp; <b>P</b> pause &nbsp; <b>H</b> hide help';
 helpShown=i===0?12:5;$('help').style.opacity=1;
 banner(INTRO[i].t,LV.ui||THEMES[S.theme].acc);say(INTRO[i].tip,4500);
}
function levelDone(){G.trust=LV.daughter.trust;unlocked=Math.max(unlocked,G.level+1);try{localStorage.setItem('bloomU2',unlocked);}catch(e){}saveBst(G.level,G.score);if(G.level>=4)showEnding();else showShop(G.level+1);}
function gameOver(msg){state='over';$('hud').style.display='none';const nb=saveBst(G.level,G.score),best=bloomBst[G.level]|0;
 showOv(`<div class="ttl" style="font-size:68px;color:#ff4a4a;text-shadow:0 0 40px #f00a">GAME OVER</div><div class="sub" style="color:#7a3a3a">THE BLOOM HAS CONSUMED THEM</div>
 <div class="txt">${msg||'You could not protect her.'}<br>The infection spreads. David's name is forgotten.</div>
 <div class="kv"><span>Score</span><b>${G.score}${nb?' <i style="color:#4dffa0">NEW BEST!</i>':''}</b><span>Chapter Best</span><b>${best}</b><span>Kills</span><b>${G.kills}</b><span>Max Combo</span><b>${G.maxCombo||0}</b><span>Difficulty</span><b>${DIFFS[S.difficulty].name}</b></div>
 <div class="row"><button class="btn" onclick="retry()">↺ RETRY LEVEL</button><button class="btn" onclick="showMenu()">⌂ MENU</button></div>`,'dead');}
function retry(){const s=G.snap;if(s){G.hp=s.hp<=0?G.maxHp:s.hp;G.meds=s.meds;G.infect=s.infect;G.score=s.score;G.trust=s.trust;G.kills=0;G.maxCombo=s.maxCombo||0;}startLevel(G.level);}
