/* ============================================================
   LEVEL BUILDERS
   ============================================================ */
const CARS=['#8a2a2a','#2e5a8a','#6b6b2a','#3a6a4a','#8a8a8a','#5a3a6a','#2a2a2a'];
const NOTE1='Maya\'s field notebook: "Day 3 — the fish are dead in the water, curled into a spiral. It learns from us. If I don\'t come back, David, take Nancy and go north."';
function buildL1(){
 const L=new Level(0,44,34,'grass'),D=DIFFS[S.difficulty];L.dark=.5;L.amb=[14,9,4];L.ui='#e8b06a';
 L.fl('road',0,28,44,34);L.fl('walk',0,26,44,28);L.fl('walk',9,20,13,26);L.fl('walk',8,19,14,21);L.fl('wood',6,3,16,19);L.fl('carpet',16,3,28,11);L.fl('tile',16,11,28,19);
 L.decal({t:'rug',x:7.4,y:5.2,w:4.6,d:4.2,c1:'#6a2a2a',c2:'#8a3a3a'});L.decal({t:'rug',x:19.5,y:5.5,w:4,d:3,c1:'#2a3a6a',c2:'#3a4a8a'});
 for(let x=1;x<44;x+=4)L.decal({t:'rect',x,y:30.9,w:2,d:.2,c:'#caa24a',a:.8});
 const WC='#5d574d';
 L.wH(6,10,19);L.wH(12,28,19,{win:3});L.wH(6,28,3,{win:4});L.wV(3,19,6,{win:4});L.wV(3,14,28,{win:3});L.wV(16,19,28);
 L.wV(3,9,16,{col:WC});L.wV(11,15,16,{col:WC});L.wV(17,19,16,{col:WC});L.wH(16,21,11,{col:WC});L.wH(23,28,11,{col:WC});
 L.add('shelf',6.5,3.4);L.add('tv',9.4,3.4);L.add('sofa',8.6,8.2,{back:'s'});L.add('table',8.7,6.2,{w:1.4,d:.7});L.add('lamp',14.8,3.6);L.add('plant',6.5,17.8);L.add('chair',13,6.4);
 L.add('bed',23.6,3.4);L.add('nstand',22.9,3.4);L.add('wardrobe',17,3.4);L.add('counter',19.2,3.4,{col:'#6a4a30',w:1.4,d:.6});L.add('desk',26.6,7.6);L.add('chair',26.7,8.5);L.add('crate',18.5,7);
 L.add('counter',16.4,11.4,{w:1.4});L.add('stove',17.8,11.4);L.add('sink',18.8,11.4);L.add('fridge',23.2,11.4);L.add('counter',24.1,11.4,{w:1.6});L.add('counter',25.7,11.4,{w:1.6});
 L.add('table',18.6,14.2,{w:1.8,d:1});for(const[x,y]of[[18.9,13.4],[20,13.4],[18.9,15.3],[20,15.3]])L.add('chair',x,y);
 for(const[x,y]of[[2,4],[3,10],[2,16],[3,22],[31,3],[41,5],[36,10.5],[42,12],[30,16],[39,20],[33,23],[41,23],[25,23],[5,23.5],[18,23],[28,23.5]])L.add('tree',x,y,{s:rnd(.9,1.15)});
 for(const x of[7,14.2,16.2,20,24])L.add('bush',x,19.85);
 L.add('house',33,3,{w:6,d:5,col:'#6a5a4a'});L.add('house',33,13,{w:6,d:5,col:'#4a5a6a',roof:'#2a3040'});
 for(let x=0;x<8.5;x++)L.add('fence',x,24.5);for(let x=14;x<26;x++)L.add('fence',x,24.5);
 L.add('car',30,20.5,{col:'#8a2a2a'});L.add('car',15,30.4,{col:'#2e5a8a'});L.add('car',29,29,{col:'#6b6b2a',r:1});L.add('carburn',36,30.2,{});L.add('carwreck',4.5,26.4,{r:1});
 for(const x of[7,25,40])L.add('slight',x,27.1);L.add('mail',13.8,26.4);L.add('dump',2,28.6);
 L.decal({t:'bloom',x:22,y:31,r:2.2});L.decal({t:'bloom',x:4,y:14,r:1.6});
 L.spawn=[[1,1],[1,14],[1,24],[43,1],[43,10],[43,24],[1,31],[43,31],[22,1.2],[14,33]];
 L.pickup('med',25.5,17.2);L.pickup('anti',17.8,6.5);L.pickup('note',7.5,13,NOTE1);L.pickup('note',26.8,9.2,'A child\'s drawing: a huge sea creature, and three small people holding hands. Only two of them are smiling.');
 L.finish();L.start(11,12.5,12.4,13.2);
 let wave=0,queue=[],spT=2,rest=3,phase='rest';const m=S.difficulty==='story'?.7:S.difficulty==='nightmare'?1.3:1,sizes=[5,8,11].map(n=>Math.round(n*m));
 L.objText=()=>phase==='rest'?(wave?`WAVE ${wave} CLEARED — GET READY`:'THEY ARE COMING — PREPARE'):`WAVE ${wave}/3 — ${L.alive()+queue.length} LEFT`;
 L.tick=dt=>{
  if(phase==='rest'){rest-=dt;if(rest<=0){wave++;phase='fight';banner('WAVE '+wave+' / 3');queue=[];for(let i=0;i<sizes[wave-1];i++)queue.push(wave===1?'drifter':wave===2?(i%4===3?'stalker':'drifter'):(i%5===4?'bloated':i%3===2?'stalker':'drifter'));spT=2;}return;}
  if(queue.length){spT-=dt;if(spT<=0){spT=D.gap*rnd(.8,1.3);const s=L.farSpawn(14);L.spawnEnemy(queue.shift(),s[0],s[1],{hunt:true});}}
  else if(L.alive()===0){if(wave>=3)L.win();else{phase='rest';rest=5;}}
 };
 return L;
}
function buildL2(){
 const L=new Level(1,30,24,'dark'),D=DIFFS[S.difficulty];L.dark=.65;L.flicker=true;L.amb=[12,10,24];L.ui='#c870ff';
 L.fl('dark',2,2,15,22);L.fl('carpet',15,2,28,22);
 L.decal({t:'rug',x:5,y:14,w:5,d:4,c1:'#2a1030',c2:'#3a1840'});
 L.decal({t:'bloom',x:22,y:11,r:4.2});L.decal({t:'bloom',x:15,y:11,r:2.8});L.decal({t:'bloom',x:20,y:13,r:3.2});L.decal({t:'bloom',x:6,y:7,r:2.2});L.decal({t:'bloom',x:24,y:19,r:2.2});
 const WC='#4a4050';L.wH(2,28,2,{col:WC,win:5});L.wH(2,28,22,{col:WC});L.wV(2,22,2,{col:WC,win:4});L.wV(2,22,28,{col:WC,win:4});L.wV(2,9.5,15,{col:WC});L.wV(14.5,22,15,{col:WC});
 for(const[x,y]of[[8,8],[8,15],[22,8],[22,15]])L.add('pillar',x,y);
 L.add('shelf',3.5,2.4);L.add('tv',6,2.4,{dead:false});L.add('sofa',4,11.5,{r:1,back:'s'});L.add('table',9.5,11,{w:1.4,d:.8,r:1});L.add('chair',11,5);L.add('chair',5.5,18.5);L.add('lamp',13.5,2.6);
 L.add('bed',23,2.4,{col:'#5a2f5f'});L.add('nstand',21.9,2.4);L.add('wardrobe',17,2.4);L.add('crate',26,19);L.add('plant',17,20);L.add('counter',19.5,2.4,{w:1.4,d:.6,col:'#4a3a30'});
 L.add('growth',22,11);L.add('growth',20.5,9.5);L.add('growth',23.5,12.5);L.add('growth',3,19);L.add('growth',26,4.5);L.add('growth',15.4,19.5);L.add('growth',4,4);
 L.spawn=[[4,20],[26,20],[26,4],[4,4]];
 L.pickup('med',20,20);L.pickup('med',4,3.5);L.pickup('anti',26.5,12);L.pickup('note',8,17,'A shattered framed photo from the beach — Maya, David, little Nancy. The crack in the glass runs straight across Maya\'s smiling face.');
 L.finish();L.start(6,18,5,19.3);
 const boss=new Enemy(L,'boss',22,11);L.boss=boss;L.enemies.push(boss);let intro=3.5,addT=12;
 L.bossPhase=ph=>{shake(16);SFX.roar();say(ph===2?'"Run, David… I can\'t… hold it…"':'"Nancy… my baby…"',3500,'#d68cff');banner(ph===2?'SHE CHARGES':'SHE SCREAMS','#d68cff');for(let i=0;i<2;i++){const s=L.farSpawn(10);L.spawnEnemy('drifter',s[0],s[1],{hunt:true});}};
 L.onBossDead=()=>{say('"Thank you… David… keep her safe."',4500,'#d68cff');for(const e of L.enemies)if(e!==boss&&!e.dead)e.dead=true;L.win(3);};
 L.objText=()=>boss.awake?`MAYA — ${Math.max(0,Math.round(boss.hp/boss.max*100))}%`:'SOMETHING IS IN THE ROOM…';
 L.tick=dt=>{if(!boss.awake){intro-=dt;if(intro<=0){boss.awake=true;boss.bs='walk';say('"David…?"',2600,'#d68cff');banner('MAYA','#d68cff');SFX.roar();}return;}
  addT-=dt;if(addT<=0){addT=Math.max(8,18/D.hp);if(L.alive()<2+boss.phase){const s=L.farSpawn(10);L.spawnEnemy('drifter',s[0],s[1],{hunt:true});}}};
 return L;
}
function buildL3(){
 const L=new Level(2,40,130,'grass'),D=DIFFS[S.difficulty];L.dark=.55;L.rain=1;L.storm=true;L.amb=[8,12,16];L.ui='#a9c1cf';
 L.fl('road',12,0,26,130);L.fl('walk',10,0,12,130);L.fl('walk',26,0,28,130);
 for(let y=1;y<130;y+=4)L.decal({t:'rect',x:18.9,y,w:.22,d:2,c:'#caa24a',a:.75});
 const r=seeded(31);
 for(let y=30;y<122;y+=16)L.add('house',.5,y,{w:5,d:5,col:pick(['#6a5a4a','#4a5a6a','#5a4a4a']),h:3});
 for(let y=8;y<124;y+=16){if(y>74&&y<98)continue;L.add('house',34.8,y,{w:4.8,d:5,col:pick(['#6a5a4a','#4a5a6a']),h:2.8});}
 for(let y=2;y<128;y+=5){L.add('tree',r()*1.5+.3,y+r()*2,{s:.9+r()*.3});L.add('tree',37.5+r()*.8-.6,y+2+r()*2,{s:.9+r()*.3,inf:r()<.3});}
 for(let y=10,i=0;y<122;y+=12,i++)L.add('slight',i%2?11.3:26.4,y);
 for(let y=118,i=0;y>20;y-=6.5,i++){if(Math.abs(y-58)<4||Math.abs(y-14)<4)continue;const x=12.4+r()*10,rot=r()<.5;L.add('car',x,y,{col:CARS[i%CARS.length],r:rot?1:0});}
 L.add('truck',13.2,66,{col:'#3a5a7a',r:1});L.add('truck',20.5,33,{col:'#7a4a3a'});
 L.add('carburn',19,52,{r:1});L.add('carwreck',15,90,{});
 L.add('mall',1.5,16,{col:'#54503f'});
 L.fl('walk',1,26,10,40);
 for(let i=0;i<5;i++)L.add('car',2.2+r()*6,28+i*2.6,{col:CARS[(i+3)%CARS.length],r:1});
 L.add('shop',2.5,48,{col:'#4a4438',awn:'#7a3a2e',lit:true});L.add('shop',2.5,54.5,{col:'#3f4a44',awn:'#2e5a7a'});L.add('shop',2.5,61,{col:'#4a3f44',awn:'#7a6a2e',lit:true});
 L.add('busstop',27,28,{});
 L.wH(30,36,78,{col:'#6a5a4a'});L.wH(30,36,90,{col:'#6a5a4a'});L.wV(78,83,30,{col:'#6a5a4a'});L.wV(85,90,30,{col:'#6a5a4a'});L.wV(78,90,36,{col:'#6a5a4a',win:2});
 L.fl('lino',30,78,36,90);L.add('tdesk',31,80);L.add('tdesk',33,80);L.add('board',30.4,78.5,{r:1});L.add('locker',30.2,86);
 L.add('bus',24,88,{r:1});
 L.add('ground',30.5,98,{});
 L.wH(28,33.7,40,{col:'#6a5a4a'});L.wH(28,33.7,50,{col:'#6a5a4a',win:2});L.wV(40,50,28,{col:'#6a5a4a'});L.wV(40,44,33.7,{col:'#6a5a4a'});L.wV(46,50,33.7,{col:'#6a5a4a'});
 L.fl('lino',28,40,34,50);L.add('shelf',29,40.4);L.add('shelf',32,40.4);L.add('counter',32.8,45,{w:1.2,d:.8,r:1});L.add('crate',29,48.5);
 L.add('pump',26.6,41);L.add('pump',26.6,48);
 L.add('barrel',11,40);L.add('dump',10.4,88);L.add('barrel',11.2,116);
 L.decal({t:'bloom',x:19,y:46,r:2.4});L.decal({t:'bloom',x:15,y:96,r:2});L.decal({t:'bloom',x:22,y:30,r:2.2});L.decal({t:'bloom',x:17,y:112,r:1.8});
 L.goal={x:19,y:7,r:3.2};L.add('car',13.5,5,{col:'#3a5a3a'});L.add('car',23.5,5,{col:'#3a5a3a'});
 const groups=[[120,2],[110,3],[98,3],[86,3],[72,3],[58,4],[46,3],[34,3],[24,2]];
 L.finish();L.start(19,126,18.2,126);
 groups.forEach(([y,n],gi)=>{for(let i=0;i<n;i++){const[x,yy]=L.freeSpot(13,25,y-3,y+3,.7);const t=gi===3&&i===0?'stalker':gi===5&&i===0?'bloated':(gi>=6&&i===2)?'stalker':'drifter';L.spawnEnemy(t,x,yy,{pr:4});}});
 L.spawn=[[19,60]];
 L.pickup('med',16,112);L.pickup('med',32,62);L.pickup('med',21,26);L.pickup('anti',20,80);L.pickup('note',16,122,'A radio, still warm: "…all survivors, the evacuation point is north of the highway. Do not stop for anyone. We repeat — do not stop."');L.pickup('note',33,44,'A note taped to the shutters: "CLOSED. They came out of the water. My son is on the second floor. Please, somebody read this."');
 L.objText=()=>'REACH THE EVACUATION POINT — '+Math.max(0,Math.round(L.player.y-7))+' m';
 L.tick=dt=>{const p=L.player,d=L.daughter;L.hint='';if(p.y<11&&Math.abs(p.x-19)<7){if(dst(p.x,p.y,d.x,d.y)<6||d.carried)L.win();else L.hint='WAIT FOR NANCY';}};
 return L;
}
function buildL4(){
 const L=new Level(3,34,26,'walk'),D=DIFFS[S.difficulty];L.dark=.5;L.flicker=true;L.amb=[8,12,7];L.ui='#b8d8a0';
 L.fl('lino',2,2,32,24);L.decal({t:'rug',x:27,y:12,w:5,d:6,c1:'#3a3a5a',c2:'#4a4a6a'});
 const WC='#5a5c6a';L.wH(2,32,2,{col:WC,win:3});L.wH(2,8,24,{col:WC});L.wH(10.5,23.5,24,{col:WC});L.wH(26,32,24,{col:WC});L.wV(2,12,2,{col:WC,win:3});L.wV(14.5,24,2,{col:WC});L.wV(2,24,32,{col:WC,win:3});
 L.wV(2,9,26,{col:WC});L.wH(26,28,9,{col:WC});L.wH(30,32,9,{col:WC});
 L.add('board',8.3,2.3);L.add('board',14.6,2.3);
 for(let i=0;i<8;i++)L.add('locker',2.4,3+i*.65<9?3+i*.8:3,{r:1});
 for(const x of[6,10,14,18,22])for(const y of[6,9.5,13,16.5,20]){L.add('desk',x,y);L.add('chair',x+.25,y+.65);}
 L.add('tdesk',28,3.2);L.add('shelf',30.4,3);
 L.add('locker',3,23.2,{col:'#6a4a4a'});
 L.npcs.push({kind:'cop',x:28,y:15,f:2.4,cd:0,fx:0,tx:0,ty:0});
 for(const[x,y,c]of[[30.2,13,'#7a4a4a'],[30.9,14.2,'#4a6a7a'],[29.6,12.2,'#6a7a4a']])L.npcs.push({kind:'surv',x,y,c,f:2});
 L.decal({t:'bloom',x:12,y:22,r:1.6});
 L.spawn=[[9.2,25.2],[24.7,25.2],[1.2,13.2]];
 L.pickup('med',30,4.5);L.pickup('anti',3.4,11);L.pickup('note',27.5,6,'A teacher\'s attendance sheet. Half the names are crossed out in red. The last one just says "gone home".');
 L.finish();L.start(26,19,27.2,19.8);
 let rem=60,wt=2,queue=[],spT=0,n=0;
 L.objText=()=>`HOLD THE SHELTER — ${Math.max(0,Math.ceil(rem))}s`;
 L.tick=dt=>{rem-=dt;wt-=dt;if(wt<=0){wt=8;const c=3+Math.floor(n++*.9)+(S.difficulty==='nightmare'?1:0)-(S.difficulty==='story'?1:0);for(let i=0;i<c;i++)queue.push(Math.random()<.14?'stalker':Math.random()<.1?'bloated':'drifter');banner('THEY ARE AT THE DOORS','#ff5a5a');}
  if(queue.length){spT-=dt;if(spT<=0){spT=D.gap*.6;const s=pick(L.spawn);L.spawnEnemy(queue.shift(),s[0],s[1],{hunt:true});}}
  if(rem<=0){for(const e of L.enemies)if(!e.dead){e.dead=true;}say('Headlights. The convoy has arrived.',3500);L.win();}};
 return L;
}
function buildL5(){
 const L=new Level(4,40,140,'waste'),D=DIFFS[S.difficulty];L.dark=.5;L.ash=true;L.amb=[18,8,4];L.storm=true;L.ui='#ff9a50';
 L.fl('road',12,0,26,140);L.fl('walk',10,0,12,140);L.fl('walk',26,0,28,140);
 for(let y=1;y<140;y+=4)L.decal({t:'rect',x:18.9,y,w:.22,d:2,c:'#6a6a4a',a:.6});
 const r=seeded(77);
 for(let y=6;y<132;y+=9){if(y>28&&y<68)continue;L.add('ruin',.4+r()*.6,y,{w:4.5+r()*1.2,d:5,h:3+Math.floor(r()*4)});}
 for(let y=9;y<132;y+=9){if(y>92&&y<112)continue;L.add('ruin',34.6,y+3,{w:4.6,d:5,h:3+Math.floor(r()*4)});}
 for(let y=130,i=0;y>20;y-=7,i++){if(Math.abs(y-96)<3||Math.abs(y-56)<3)continue;L.add('car',12.4+r()*10,y,{col:i%2?'#2a2420':CARS[i%CARS.length],r:r()<.5?1:0});}
 L.add('truck',13,122,{col:'#5a5a4a',r:1});L.add('truck',21.5,44,{col:'#4a3a2a',r:1});L.add('bus',26.2,64,{r:1});
 L.add('carburn',14.5,112,{});L.add('carburn',22.6,70,{r:1});L.add('carwreck',16.8,36,{r:1});L.add('carwreck',13.6,84,{});
 for(let y=12,i=0;y<132;y+=12,i++)L.add('barrel',i%2?10.6:24.6,y,{fire:true,col:'#5a2a22'});
 for(let y=8;y<132;y+=10)L.add('tree',r()<.5?10.2:27,y+r()*3,{dead:true,s:1});
 L.add('sand',13,28);L.add('sand',21,28);L.add('barr',13,74);L.add('barr',21,110);
 L.add('mall',1.5,52,{col:'#3f3a33'});
 L.add('shop',2.2,38,{col:'#3a3630',awn:'#5a2a20'});L.add('shop',2.2,66,{col:'#3a3630',awn:'#2a3a5a'});
 L.add('ground',30.5,100,{});
 L.add('busstop',28.5,16,{});
 L.decal({t:'bloom',x:19,y:120,r:2.4});L.decal({t:'bloom',x:15,y:72,r:2.6});L.decal({t:'bloom',x:22,y:38,r:2.4});L.decal({t:'bloom',x:14,y:24,r:2});
 const gates=[];for(const gy of[96,56])for(let x=12;x<26;x+=2)gates.push(L.add('gate',x,gy,{zone:gy===96?1:2,open:false}));
 L.add('bunker',16,2.2);L.goal={x:19,y:9,r:3.5};
 L.finish();L.start(19,136,20.3,137);
 const zb=[[96,136,1,7],[56,96,2,9],[12,56,0,8]];
 for(const[y0,y1,z,n]of zb)for(let i=0;i<n;i++){const[x,y]=L.freeSpot(13,25,y0+3,y1-2,.7);const t=i%5===4?'bloated':i%3===2?'stalker':'drifter';L.spawnEnemy(t,x,y,{zone:z,pr:4});}
 L.spawn=[[14,112],[24,112],[14,76],[24,76],[14,35],[24,35],[19,128],[19,76]];
 L.pickup('med',17,126);L.pickup('med',23,110);L.pickup('med',17,88);L.pickup('med',23,70);L.pickup('med',17,46);L.pickup('med',23,28);L.pickup('anti',21,118);L.pickup('anti',17,74);L.pickup('anti',23,40);
 L.pickup('note',10,132,'A looping military broadcast: "All civilians proceed to Bunker 7. Coastal bombardment begins at dawn. This is not a drill."');L.pickup('note',28.5,58,'Scratched high on a wall, where somebody climbed: "It was never an accident. The ocean is taking back what we took from it."');
 let timer=200*D.timer,shellT=8,reT=14,opened={1:false,2:false};
 L.objText=()=>{const t=Math.max(0,Math.ceil(timer));return '⚠ BOMBING IN '+Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+' — REACH THE BUNKER';};
 L.tick=dt=>{const p=L.player,d=L.daughter;L.hint='';timer-=dt;
  if(timer<=0){L.fail('The bombs fell before they reached the bunker.');return;}
  for(const z of[1,2])if(!opened[z]){let c=0;for(const e of L.enemies)if(!e.dead&&e.zone===z)c++;if(c===0){opened[z]=true;for(const g of gates)if(g.zone===z){g.open=true;g.solid=false;}L.rebuild();banner('BARRICADE OPEN','#5dffa0');SFX.pick();}}
  const prog=timer/(200*D.timer);shellT-=dt;if(shellT<=0){shellT=prog>.66?9:prog>.33?6:3.8;const a=rnd(0,6.28),rr=rnd(3.5,10),x=clamp(p.x+Math.cos(a)*rr,1,39),y=clamp(p.y+Math.sin(a)*rr,1,139);L.tele.push({t:'shell',x,y,r:2.4,age:0,max:1.5});SFX.shell();}
  reT-=dt;if(reT<=0){reT=18*D.gap/1.9;if(L.alive()<16){let zone=p.y>96?1:p.y>56?2:0,y0=zone===1?96:zone===2?56:12,y1=zone===1?136:zone===2?96:56;for(let i=0;i<2;i++){let x,y,k=0;do{[x,y]=L.freeSpot(13,25,y0+1,y1-1,.7);k++;}while(dst(x,y,p.x,p.y)<13&&k<12);if(dst(x,y,p.x,p.y)>=11)L.spawnEnemy(Math.random()<.35?'stalker':'drifter',x,y,{hunt:true,zone});}}}
  if(p.y<12&&Math.abs(p.x-19)<5){if(dst(p.x,p.y,d.x,d.y)<6||d.carried)L.win();else L.hint='WAIT FOR NANCY';}
 };
 return L;
}
BUILD.push(buildL1,buildL2,buildL3,buildL4,buildL5);
