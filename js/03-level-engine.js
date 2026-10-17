/* ---------- level ---------- */
let LV=null,state='menu',mapBig=false,ovAnim=null;
const LIGHTS=[];
const light=(x,y,z,r,i,c)=>LIGHTS.push({x,y,z,r,i,c});

class Level{
 constructor(id,w,h,mat){Object.assign(this,{id,w,h,props:[],decals:[],pick:[],enemies:[],parts:[],floats:[],stains:[],spawn:[],tele:[],npcs:[],ghosts:[],t:0,dark:.5,rain:0,over:null,endT:0,ended:false,kills:0,lastWarn:-99,fieldT:0,flk:1,goal:null,objText:()=>'',hint:'',lightning:0,ash:false,failMsg:''});
  this.floor=Array.from({length:h},()=>Array(w).fill(mat));this.rdrops=null;}
 fl(m,x0,y0,x1,y1){for(let j=Math.max(0,y0|0);j<Math.min(this.h,y1);j++)for(let i=Math.max(0,x0|0);i<Math.min(this.w,x1);i++)this.floor[j][i]=m;}
 add(k,x,y,o){const d=PD[k];if(!d)throw new Error('prop '+k);const p=Object.assign({k,x,y,w:d.w,d:d.d,f:'y',solid:d.solid!==false,tall:!!d.tall,lt:d.lt},o);if(o&&o.r){const t=p.w;p.w=p.d;p.d=t;p.f='x';}p.cx=p.x+p.w/2;p.cy=p.y+p.d/2;this.props.push(p);return p;}
 wH(x0,x1,y,o){o=o||{};let n=0;for(let x=x0;x<x1;x+=1,n++)this.add('wall',x,y,Object.assign({},o,{w:Math.min(1,x1-x),d:.3,win:!!o.win&&n%o.win===1}));}
 wV(y0,y1,x,o){o=o||{};let n=0;for(let y=y0;y<y1;y+=1,n++)this.add('wall',x,y,Object.assign({},o,{w:.3,d:Math.min(1,y1-y),win:!!o.win&&n%o.win===1}));}
 decal(o){this.decals.push(o);}
 pickup(k,x,y,txt){this.pick.push({k,x,y,txt,got:false});}
 finish(){const w=this.w,h=this.h;this.sg=new Array(w*h);
  for(const p of this.props){const i0=Math.max(0,Math.floor(p.x-1)),i1=Math.min(w-1,Math.floor(p.x+p.w+1)),j0=Math.max(0,Math.floor(p.y-1)),j1=Math.min(h-1,Math.floor(p.y+p.d+1));for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const c=j*w+i;(this.sg[c]||(this.sg[c]=[])).push(p);}}
  this.fP=new Int16Array(w*h);this.fD=new Int16Array(w*h);this.q=new Int32Array(w*h);this.rebuild();}
 rebuild(){const w=this.w,h=this.h;this.blk=new Uint8Array(w*h);for(let c=0;c<w*h;c++){const L=this.sg[c];if(!L)continue;const i=c%w,j=(c/w)|0;for(const p of L){if(p.solid&&p.x<i+.95&&p.x+p.w>i+.05&&p.y<j+.95&&p.y+p.d>j+.05){this.blk[c]=1;break;}}}}
 hitSolid(x,y,r){const i=x|0,j=y|0;if(i<0||j<0||i>=this.w||j>=this.h)return true;const L=this.sg[j*this.w+i];if(!L)return false;for(const p of L){if(!p.solid)continue;const dx=x-clamp(x,p.x,p.x+p.w),dy=y-clamp(y,p.y,p.y+p.d);if(dx*dx+dy*dy<r*r)return true;}return false;}
 moveEnt(e,dx,dy){
  const maxStep = 0.15;
  // X axis sub-stepping
  const sx = Math.abs(dx);
  if(sx > 0.001){
    const steps = Math.ceil(sx / maxStep);
    const stepX = dx / steps;
    for(let i = 0; i < steps; i++){
      const nx = e.x + stepX;
      if(this.hitSolid(nx, e.y, e.r)) break;
      e.x = nx;
    }
  }
  // Y axis sub-stepping
  const sy = Math.abs(dy);
  if(sy > 0.001){
    const steps = Math.ceil(sy / maxStep);
    const stepY = dy / steps;
    for(let i = 0; i < steps; i++){
      const ny = e.y + stepY;
      if(this.hitSolid(e.x, ny, e.r)) break;
      e.y = ny;
    }
  }
  e.x = clamp(e.x, e.r, this.w - e.r);
  e.y = clamp(e.y, e.r, this.h - e.r);
  const mDist = Math.hypot(dx, dy);
  if(mDist > 0.005){
   if(e.stepDist === undefined){ e.stepDist = 0; e.stepStain = null; }
   e.stepDist += mDist;
   if(this._bloomWorldData && this._bloomWorldData.decals){
    for(let k=0; k<this._bloomWorldData.decals.length; k++){
     const d = this._bloomWorldData.decals[k];
     if((d.type==='blood_trail'||d.type==='spore_mold') && dst(e.x,e.y,d.x,d.y)<(d.radius||1.0)){
      e.stepStain = { col: d.type==='blood_trail' ? 'rgba(130,22,18,0.55)' : 'rgba(48,85,32,0.55)', steps: 6 };
      break;
     }
    }
   }
   if(!e.stepStain && this.stains && this.stains.length){
    for(let k=0; k<this.stains.length; k++){
     const s = this.stains[k];
     if(dst(e.x,e.y,s.x,s.y)<s.r){
      e.stepStain = { col: (s.col && s.col.indexOf('5a0a0a')!==-1) ? 'rgba(130,22,18,0.55)' : 'rgba(48,85,32,0.55)', steps: 6 };
      break;
     }
    }
   }
   if(e.stepStain && e.stepStain.steps > 0 && e.stepDist >= 0.55){
    e.stepDist = 0;
    if(this.decals.length < 150){
     this.decals.push({
      t: 'rect',
      x: e.x - 0.09,
      y: e.y - 0.09,
      w: 0.18,
      d: 0.18,
      c: e.stepStain.col,
      a: (e.stepStain.steps / 6) * 0.45
     });
    }
    e.stepStain.steps--;
    if(e.stepStain.steps <= 0) e.stepStain = null;
   }
  }
 }
 clear(x0,y0,x1,y1,r){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/.4);for(let s=1;s<n;s++){const t=s/n;if(this.hitSolid(x0+(x1-x0)*t,y0+(y1-y0)*t,r))return false;}return true;}
 bfs(tx,ty,out){const w=this.w,h=this.h,q=this.q,blk=this.blk;out.fill(-1);const i0=clamp(tx|0,0,w-1),j0=clamp(ty|0,0,h-1);let hd=0,tl=0;out[j0*w+i0]=0;q[tl++]=j0*w+i0;
  while(hd<tl){const c=q[hd++],ci=c%w,cj=(c/w)|0,d=out[c];for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=ci+di,nj=cj+dj;if(ni<0||nj<0||ni>=w||nj>=h)continue;const n=nj*w+ni;if(blk[n]||out[n]>=0)continue;if(di&&dj&&(blk[cj*w+ni]||blk[nj*w+ci]))continue;out[n]=d+1;q[tl++]=n;}}}
 flowStep(f,x,y){const w=this.w,h=this.h,i=clamp(x|0,0,w-1),j=clamp(y|0,0,h-1);let best=f[j*w+i]>=0?f[j*w+i]:1e9,bi=-1,bj=-1;
  for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=w||nj>=h)continue;const v=f[nj*w+ni];if(v<0||v>=best)continue;if(di&&dj&&(this.blk[j*w+ni]||this.blk[nj*w+i]))continue;best=v;bi=ni;bj=nj;}
  return bi<0?null:[bi+.5,bj+.5];}
 freeSpot(x0,x1,y0,y1,r){for(let k=0;k<40;k++){const x=rnd(x0,x1),y=rnd(y0,y1);if(!this.hitSolid(x,y,r||.7)&&this.blk[(y|0)*this.w+(x|0)]===0)return[x,y];}return[(x0+x1)/2,(y0+y1)/2];}
 start(px,py,dx,dy){this.player=new Player(this,px,py);this.daughter=new Daughter(this,dx,dy);camX=isx(px,py);camY=isy(px,py,1);this.bfs(px,py,this.fP);this.bfs(dx,dy,this.fD);}
 spawnEnemy(t,x,y,o){const e=new Enemy(this,t,x,y,o);this.enemies.push(e);return e;}
 farSpawn(minD){const c=this.spawn.filter(s=>dst(s[0],s[1],this.player.x,this.player.y)>(minD||14));return pick(c.length?c:this.spawn);}
 alive(){let n=0;for(const e of this.enemies)if(!e.dead&&!e.dying)n++;return n;}
 noise(x,y,r){for(const e of this.enemies){if(e.dead||e.dying||e.state==='chase'||e.hunt||e.type==='boss')continue;if(dst(e.x,e.y,x,y)<r*DIFFS[S.difficulty].aware){e.state='alert';e.ax=x;e.ay=y;e.searchT=4;}}}
 alertNear(x,y,r,src){for(const e of this.enemies){if(e===src||e.dead||e.state==='chase'||e.hunt||e.type==='boss')continue;if(dst(e.x,e.y,x,y)<r){e.state='alert';e.ax=x;e.ay=y;e.searchT=5;}}}
 onSpotted(){if(this.t-this.lastWarn>16){this.lastWarn=this.t;say(pick(['"Baba, they\'ve seen us!"','"Baba, behind you!"','"Something is coming\u2026"']),2600,'#ffd34d');}}
 part(x,y,z,vx,vy,vz,life,col,r,g){if(!S.particles&&r<5)return;if(this.parts.length>300)return;this.parts.push({x,y,z,vx,vy,vz,life,max:life,col,r,g:g!==false});}
 fl(x,y,txt,col){this.floats.push({x,y,z:1.9,t:1,txt,col:col||'#fff'});}
 stain(x,y,r,col){this.stains.push({x,y,r,col:col||'#5a0a0a'});if(this.stains.length>50)this.stains.shift();}
 explosion(x,y,r,dmg){SFX.boom();shake(14);this.noise(x,y,14);const p=this.player;
  for(let i=0;i<26;i++)this.part(x,y,.3,rnd(-5,5),rnd(-5,5),rnd(1,5),.9,pick(['#9dff3a','#c8ff7a','#4dff9a']),rnd(2,5));
  const d=dst(x,y,p.x,p.y);if(d<r)p.hurt(dmg*(1-d/r*.6),Math.atan2(p.y-y,p.x-x));if(d<r+1)G.infect=Math.min(100,G.infect+7);
  const dd=this.daughter;if(!dd.carried&&dst(x,y,dd.x,dd.y)<r)dd.hurt(dmg*.6);
  for(const e of this.enemies){if(e.dead||e.dying)continue;const k=dst(x,y,e.x,e.y);if(k<r)e.hurt(dmg*1.4*(1-k/r*.5),Math.atan2(e.y-y,e.x-x),true);}
  this.stain(x,y,1.6,'#2f5a14');}
 win(delay){if(this.over)return;this.over='win';this.endT=delay==null?1.8:delay;banner('AREA CLEARED','#5dffa0');}
 fail(msg){if(this.over)return;this.over='lose';this.failMsg=msg;this.endT=1.4;shake(18);}
 update(dt){
  this.t+=dt;T=this.t;
  if(this.over){this.endT-=dt;if(this.endT<=0&&!this.ended){this.ended=true;this.over==='win'?levelDone():gameOver(this.failMsg);}this.fx(dt);return;}
  this.fieldT-=dt;if(this.fieldT<=0){this.fieldT=.25;this.bfs(this.player.x,this.player.y,this.fP);this.bfs(this.daughter.x,this.daughter.y,this.fD);}
  this.flk=this.flicker?(Math.random()<.08?rnd(.55,1.4):this.flk+(1-this.flk)*.2):1;
  this.player.update(dt);this.daughter.update(dt);
  for(const e of this.enemies)e.update(dt);
  for(let i=0;i<this.enemies.length;i++){const a=this.enemies[i];if(a.dead)continue;for(let j=i+1;j<this.enemies.length;j++){const b=this.enemies[j];if(b.dead)continue;const d=dst(a.x,a.y,b.x,b.y),m=(a.r+b.r)*.9;if(d<m&&d>.001){const k=(m-d)*.3,nx=(a.x-b.x)/d,ny=(a.y-b.y)/d;if(a.type!=='boss')this.moveEnt(a,nx*k,ny*k);if(b.type!=='boss')this.moveEnt(b,-nx*k,-ny*k);}}}
  this.enemies=this.enemies.filter(e=>!e.dead);
  const p=this.player;
  for(const k of this.pick){if(k.got)continue;if(dst(k.x,k.y,p.x,p.y)<.75){k.got=true;SFX.pick();
   if(k.k==='med'){G.meds++;this.fl(k.x,k.y,'+MEDKIT','#7dffb0');}else if(k.k==='anti'){G.infect=Math.max(0,G.infect-30);this.fl(k.x,k.y,'-INFECTION','#6ad8ff');}else{
    say(k.txt,6000,'#e8dcae');this.fl(k.x,k.y,'NOTE','#e8dcae');
    if(typeof window.BloomMegaUI!=='undefined'){
     BloomMegaUI.inspectItem({
      id:'field_note_'+(G?G.level:0),
      title:'RECOVERED SURVIVOR NOTE',
      category:'ARCHIVAL EVIDENCE // SECTOR '+(G?(G.level+1):1),
      date:'OCTOBER 14 // RECENT',
      paperStyle:G&&G.level===1?'clinical':G&&G.level===3?'bulletin':'field',
      stainType:'blood_and_coffee',
      badgeCode:'NOTE-0'+(G?(G.level+1):1),
      body:k.txt,
      transcript:k.txt
     });
    }
   }}}
  for(const d of this.decals)if(d.t==='bloom'){const q=dst(p.x,p.y,d.x,d.y);if(q<d.r*.85){G.infect=Math.min(100,G.infect+2.6*dt);if(!this.spW){this.spW=1;say('The spores are suffocating here. Keep Nancy clear of the fungal bloom.', 3200, '#6ad8ff');}}}
  G.infect=Math.min(100,G.infect+.07*dt);
  if(G.infect>55&&Math.random()<dt*.15&&this.ghosts.length<3){const a=rnd(0,6.28),r=rnd(4,7);this.ghosts.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,t:2.4});if(Math.random()<.5)say(pick(['"...David... why did you leave me...?"', '"David... come into the water..."', '"Do you hear the spores calling...?"']), 2200, '#9be8ff');}
  for(const g of this.ghosts){g.t-=dt;if(dst(g.x,g.y,p.x,p.y)<1.8)g.t=Math.min(g.t,.2);}this.ghosts=this.ghosts.filter(g=>g.t>0);
  for(let i=this.tele.length-1;i>=0;i--){const t=this.tele[i];t.age+=dt;if(t.age>=t.max){if(t.t==='shell')this.explosion(t.x,t.y,t.r,22*DIFFS[S.difficulty].dmg);this.tele.splice(i,1);}}
  for(const n of this.npcs)if(n.kind==='cop'){n.cd-=dt;n.fx-=dt;let b=null,bd=7.5;for(const e of this.enemies)if(!e.dead&&!e.dying){const d=dst(n.x,n.y,e.x,e.y);if(d<bd&&this.clear(n.x,n.y,e.x,e.y,.1)){bd=d;b=e;}}
   if(b){n.f=Math.atan2(b.y-n.y,b.x-n.x);if(n.cd<=0){n.cd=1.4;n.fx=.12;n.tx=b.x;n.ty=b.y;SFX.shot();b.hurt(24,n.f);}}}
  this.tick(dt);this.fx(dt);
 }
 fx(dt){
  const p=this.player;
  for(let i=this.parts.length-1;i>=0;i--){const q=this.parts[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;if(q.g){q.vz-=9*dt;if(q.z<0){q.z=0;q.vz*=-.3;q.vx*=.6;q.vy*=.6;}}q.life-=dt;if(q.life<=0)this.parts.splice(i,1);}
  for(let i=this.floats.length-1;i>=0;i--){const f=this.floats[i];f.z+=dt*1.2;f.t-=dt*1.1;if(f.t<=0)this.floats.splice(i,1);}
  if(this.lightning>0)this.lightning-=dt*1.6;else if(this.storm&&Math.random()<dt*.07){this.lightning=1;}
  const tx=isx(p.x,p.y),ty=isy(p.x,p.y,1);camX+=(tx-camX)*Math.min(1,dt*6);camY+=(ty-camY)*Math.min(1,dt*6);
  // Clamp camera to map bounds so the void is never visible
  const mapMinX = isx(0, this.h);
  const mapMaxX = isx(this.w, 0);
  const mapMinY = isy(0, 0, 0) - 40;
  const mapMaxY = isy(this.w, this.h, 0) + 40;
  const vpW = W / (2 * Z), vpH = H / (2 * Z);
  if(mapMaxX - mapMinX > vpW * 2){
    camX = clamp(camX, mapMinX + vpW, mapMaxX - vpW);
  }
  if(mapMaxY - mapMinY > vpH * 2){
    camY = clamp(camY, mapMinY + vpH, mapMaxY - vpH);
  }
 }
 /* ---------- rendering ---------- */
 draw(){
  let camBonus = 0, camOffX = 0, camOffY = 0;
  if(typeof window.BloomMegaUI !== 'undefined'){
   const ctf = BloomMegaUI.getCameraTransformOffset();
   camBonus = ctf.zoomBonus || 0;
   camOffX = ctf.offsetX || 0;
   camOffY = ctf.offsetY || 0;
  }
  Z=Math.max(.55,Math.min(1.6,Math.min(W/1280,H/720)))*S.zoom*(1 + camBonus);EDGE=S.gfx!=='low';
  shk*=.86;if(shk<.2)shk=0;const sx=(Math.random()-.5)*shk*2,sy=(Math.random()-.5)*shk*2;CX=camX+sx+camOffX;CY=camY+sy+camOffY;
  if(typeof window.BloomWorldEnhancements!=='undefined'){
    BloomWorldEnhancements.renderPerimeterBuffer(cx,this,CX,CY,Z,W,H);
  }else{
    setScreen();cx.fillStyle='#05090b';cx.fillRect(0,0,W,H);
  }
  setWorld();LIGHTS.length=0;
  const hw=W/2/Z+110,hh=H/2/Z+170,p=this.player,pk=p.x+p.y;
  const pad = 16;
  const extMat = (this.id === 1 ? 'grass' : this.id === 4 ? 'waste' : (this.id === 0 || this.id === 2 ? 'grass' : 'road'));
  const extTex = (typeof TEX !== 'undefined' && TEX && TEX[extMat]) ? TEX[extMat] : ((typeof TEX !== 'undefined' && TEX && TEX.grass) ? TEX.grass : null);

  for(let j = -pad; j < this.h + pad; j++){
    const inJ = j >= 0 && j < this.h;
    const row = inJ ? this.floor[j] : null;
    for(let i = -pad; i < this.w + pad; i++){
      const x = (i - j) * 32, y = (i + j + 1) * 16;
      if(Math.abs(x - CX) > hw || Math.abs(y - CY) > hh) continue;
      const inI = inJ && i >= 0 && i < this.w;
      if(inI){
        const tileName = this.getEnhancedTileType ? this.getEnhancedTileType(i, j, row[i]) : row[i];
        const t = (typeof TEX !== 'undefined' && TEX[tileName]) ? TEX[tileName] : TEX[row[i]];
        if(t) cx.drawImage(t[(i + j) & 1], x - 33, y - 17);
      } else if(extTex){
        // Exterior apron beyond playable boundaries: seamless terrain
        const t = extTex;
        cx.drawImage(t[Math.abs(i + j) & 1], x - 33, y - 17);
        // Volumetric distance darkening
        const dOut = Math.max(0, -i, i - (this.w - 1), -j, j - (this.h - 1));
        const shade = Math.min(0.92, 0.32 + dOut * 0.048);
        cx.fillStyle = `rgba(3, 7, 10, ${shade.toFixed(2)})`;
        cx.beginPath();
        cx.moveTo(x, y - 16);
        cx.lineTo(x + 32, y);
        cx.lineTo(x, y + 16);
        cx.lineTo(x - 32, y);
        cx.closePath();
        cx.fill();
      }
    }
  }
  for(const s of this.stains){decalRect(s.x-s.r*.6,s.y-s.r*.6,s.r*1.2,s.r*1.2,s.col,.0);groundEll(s.x,s.y,s.r*.5,s.col,null,.45);}
  for(const d of this.decals){
   if(d.t==='rug'){decalRect(d.x,d.y,d.w,d.d,d.c1,.95);decalRect(d.x+.25,d.y+.25,d.w-.5,d.d-.5,d.c2,.95);decalRect(d.x+.5,d.y+.5,d.w-1,d.d-1,d.c1,.6);}
   else if(d.t==='rect')decalRect(d.x,d.y,d.w,d.d,d.c,d.a);
   else if(d.t==='bloom'){const pu=.5+.5*Math.sin(this.t*1.6+d.x);groundEll(d.x,d.y,d.r*.85,'rgba(20,12,24,.45)',null,.8);groundEll(d.x,d.y,d.r*.5,'rgba(10,25,18,.35)',rgba('#1f6b4d',.3+.15*pu),.8,1.2);
    cx.strokeStyle='rgba(25,50,38,.45)';cx.lineWidth=1.2;for(let k=0;k<6;k++){const a=k*1.05+d.x;cx.beginPath();cx.moveTo(isx(d.x,d.y),isy(d.x,d.y));cx.lineTo(isx(d.x+Math.cos(a)*d.r*.7,d.y+Math.sin(a)*d.r*.7),isy(d.x+Math.cos(a)*d.r*.7,d.y+Math.sin(a)*d.r*.7));cx.stroke();}
    light(d.x,d.y,.2,d.r*1.1,.25,'#1f8a5d');}
  }
  if(typeof window.BloomWorldEnhancements!=='undefined'){
   BloomWorldEnhancements.renderDecals(cx,this,CX,CY,Z);
  }
  if(this.goal){const g=this.goal,pu=.5+.5*Math.sin(this.t*3);groundEll(g.x,g.y,g.r,rgba(THEMES[S.theme].acc,.1+.1*pu),THEMES[S.theme].acc,.8,3);const sx0=isx(g.x,g.y),sy0=isy(g.x,g.y);const gr=cx.createLinearGradient(0,sy0-260,0,sy0);gr.addColorStop(0,'rgba(120,255,190,0)');gr.addColorStop(1,'rgba(120,255,190,.28)');cx.fillStyle=gr;cx.fillRect(sx0-18,sy0-260,36,260);light(g.x,g.y,.5,g.r*1.6,.7,THEMES[S.theme].acc);}
  for(const t of this.tele){const k=t.age/t.max;
   if(t.t==='ring')groundEll(t.x,t.y,t.r*k,rgba('#ff3a5a',.12),'#ff6a8a',.85,3);
   else if(t.t==='shell'){groundEll(t.x,t.y,t.r,rgba('#ff2a2a',.1+.25*k),'#ff4a3a',.9,3);groundEll(t.x,t.y,t.r*k,null,'#ffaa40',.9,2);}}
  const b=this.boss;if(b&&b.bs==='aim'){const L=9,w=.45,a=Math.atan2(b.diry,b.dirx),nx=-Math.sin(a)*w,ny=Math.cos(a)*w;poly([isx(b.x+nx,b.y+ny),isy(b.x+nx,b.y+ny),isx(b.x+nx+b.dirx*L,b.y+ny+b.diry*L),isy(b.x+nx+b.dirx*L,b.y+ny+b.diry*L),isx(b.x-nx+b.dirx*L,b.y-ny+b.diry*L),isy(b.x-nx+b.dirx*L,b.y-ny+b.diry*L),isx(b.x-nx,b.y-ny),isy(b.x-nx,b.y-ny)],`rgba(255,60,120,${.18+.15*Math.sin(this.t*30)})`);}
  const items=[];
  for(const q of this.props){const x=isx(q.cx,q.cy),y=isy(q.cx,q.cy);if(Math.abs(x-CX)>hw+60||Math.abs(y-CY)>hh+120)continue;items.push({k:(q.x+q.w)+(q.y+q.d),t:0,o:q});}
  for(const k of this.pick)if(!k.got)items.push({k:k.x+k.y,t:1,o:k});
  for(const n of this.npcs)items.push({k:n.x+n.y,t:2,o:n});
  for(const e of this.enemies)if(!e.dead)items.push({k:e.x+e.y,t:3,o:e});
  if(!this.daughter.carried)items.push({k:this.daughter.x+this.daughter.y,t:4,o:this.daughter});
  items.push({k:p.x+p.y,t:5,o:p});
  for(const g of this.ghosts)items.push({k:g.x+g.y,t:6,o:g});
  if(typeof window.BloomWorldEnhancements!=='undefined'){
   const propQueue=BloomWorldEnhancements.getDepthSortedPropQueue(this,CX,CY,Z,W,H);
   for(const pq of propQueue){items.push({k:pq.k,t:99,draw:pq.draw});}
  }
  items.sort((a,b)=>a.k-b.k);
  for(const it of items){const o=it.o;
   if(it.t===0){const d=PD[o.k];let occ=false;if(o.tall&&Math.min(o.w,o.d)>.62&&it.k>pk+.2&&Math.abs(o.cx-p.x)<2.3&&Math.abs(o.cy-p.y)<2.3)occ=true;
    if(occ)cx.globalAlpha=.42;d.draw(o);if(occ)cx.globalAlpha=1;
    if(o.lt){const f=o.k==='tv'?.7+.3*Math.sin(T*9):this.flk;light(o.cx,o.cy,o.lt.z,o.lt.r,Math.min(1,o.lt.i*f),o.lt.c);}}
   else if(it.t===1)drawPickup(o,this.t);
   else if(it.t===2)drawNPC(o,this);
   else if(it.t===3)drawEnemy(o);
   else if(it.t===4)drawNancy(o);
   else if(it.t===5)drawDavid(o,this);
   else if(it.t===99)it.draw(cx);
   else{cx.globalAlpha=.3+.2*Math.sin(this.t*10);human(o.x,o.y,{f:Math.atan2(p.y-o.y,p.x-o.x),sh:'#2a3a3a',pn:'#1a2626',sk:'#6a8a8a',hr:'#101818',arms:'fwd',glow:'#ff3030',ph:0});cx.globalAlpha=1;}}
  for(const q of this.parts){const k=q.life/q.max;cx.globalAlpha=Math.min(1,k*1.4);cx.fillStyle=q.col;cx.beginPath();cx.arc(isx(q.x,q.y),isy(q.x,q.y,q.z),q.r*(.4+k*.6),0,6.2832);cx.fill();}cx.globalAlpha=1;
  cx.font='bold 15px "Share Tech Mono",monospace';cx.textAlign='center';
  for(const f of this.floats){cx.globalAlpha=Math.min(1,f.t*1.5);cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(f.txt,isx(f.x,f.y),isy(f.x,f.y,f.z));cx.fillStyle=f.col;cx.fillText(f.txt,isx(f.x,f.y),isy(f.x,f.y,f.z));}cx.globalAlpha=1;
  light(p.x,p.y,1,8,.95);light(p.x+Math.cos(p.f)*3,p.y+Math.sin(p.f)*3,.8,5.5,.55);
  if(G.infect>35)light(p.x,p.y,1,3,.15,'#33ffd0');
  this.goalArrow(p);
  this.post();
 }
/* floating chevron toward the objective when it is off-screen — works with minimap OFF too */
goalArrow(p){
 if(!this.goal||state!=='play')return;
 const th=THEMES[S.theme],g=w2s(this.goal.x,this.goal.y,0),m=64;
 if(g[0]>m&&g[0]<W-m&&g[1]>m&&g[1]<H-m)return;
 setScreen();
 let dx=g[0]-W/2,dy=g[1]-H/2;const dl=Math.hypot(dx,dy)||1;dx/=dl;dy/=dl;
 const rx=W/2-58,ry=H/2-58,k=1/Math.hypot(dx/rx,dy/ry);
 const ex=W/2+dx*k,ey=H/2+dy*k,a=Math.atan2(dy,dx),pu=.75+.25*Math.sin(this.t*4);
 cx.save();cx.translate(ex,ey);cx.rotate(a);cx.globalAlpha=pu;
 cx.fillStyle=th.acc;cx.beginPath();cx.moveTo(14,0);cx.lineTo(-8,9);cx.lineTo(-3,0);cx.lineTo(-8,-9);cx.closePath();cx.fill();
 cx.restore();cx.globalAlpha=1;setWorld();
}
 post(){
  setScreen();const th=THEMES[S.theme];
  if(S.lighting&&S.gfx!=='low'){
   const k=lc.width/W,bright={dim:1.15,normal:1,bright:.62}[S.bright];let a=clamp(this.dark*bright*(this.flicker?this.flk*.5+.5:1),0,.93);const am=this.amb||th.amb;
   lx.setTransform(1,0,0,1,0,0);lx.globalCompositeOperation='source-over';lx.clearRect(0,0,lc.width,lc.height);lx.fillStyle=`rgba(${am[0]},${am[1]},${am[2]},${a})`;lx.fillRect(0,0,lc.width,lc.height);
   lx.globalCompositeOperation='destination-out';
   for(const L of LIGHTS){const[sx,sy]=w2s(L.x,L.y,L.z),R=L.r*45*Z*k;if(sx*k<-R||sx*k>lc.width+R||sy*k<-R||sy*k>lc.height+R)continue;lx.save();lx.translate(sx*k,sy*k);lx.scale(1,.58);const g=lx.createRadialGradient(0,0,R*.05,0,0,R);g.addColorStop(0,`rgba(0,0,0,${L.i})`);g.addColorStop(.55,`rgba(0,0,0,${L.i*.45})`);g.addColorStop(1,'rgba(0,0,0,0)');lx.fillStyle=g;lx.fillRect(-R,-R,R*2,R*2);lx.restore();}
   const p=this.player;
   if(p){
    const pf=p.f,flLen=7.2,spr=0.36;
    const p0=w2s(p.x,p.y,0.7),pL=w2s(p.x+Math.cos(pf-spr)*flLen,p.y+Math.sin(pf-spr)*flLen,0);
    const pM=w2s(p.x+Math.cos(pf)*(flLen*1.08),p.y+Math.sin(pf)*(flLen*1.08),0);
    const pR=w2s(p.x+Math.cos(pf+spr)*flLen,p.y+Math.sin(pf+spr)*flLen,0);
    lx.save();
    const flGrad=lx.createRadialGradient(p0[0]*k,p0[1]*k,6*k,pM[0]*k,pM[1]*k,flLen*32*Z*k);
    flGrad.addColorStop(0,'rgba(0,0,0,0.92)');
    flGrad.addColorStop(0.65,'rgba(0,0,0,0.65)');
    flGrad.addColorStop(1,'rgba(0,0,0,0)');
    lx.fillStyle=flGrad;
    lx.beginPath();
    lx.moveTo(p0[0]*k,p0[1]*k);
    lx.lineTo(pL[0]*k,pL[1]*k);
    lx.lineTo(pM[0]*k,pM[1]*k);
    lx.lineTo(pR[0]*k,pR[1]*k);
    lx.closePath();
    lx.fill();
    lx.restore();
   }
   lx.globalCompositeOperation='source-over';cx.drawImage(lc,0,0,W,H);
   if(S.gfx==='high'){
    cx.globalCompositeOperation='lighter';
    for(const L of LIGHTS){if(!L.c)continue;const[sx,sy]=w2s(L.x,L.y,L.z),R=L.r*45*Z*.75;if(sx<-R||sx>W+R||sy<-R||sy>H+R)continue;cx.save();cx.translate(sx,sy);cx.scale(1,.58);const g=cx.createRadialGradient(0,0,0,0,0,R);g.addColorStop(0,rgba(L.c,.2*L.i));g.addColorStop(1,rgba(L.c,0));cx.fillStyle=g;cx.fillRect(-R,-R,R*2,R*2);cx.restore();}
    if(p){
     const pf=p.f,flLen=7.2,spr=0.36;
     const p0=w2s(p.x,p.y,0.7),pL=w2s(p.x+Math.cos(pf-spr)*flLen,p.y+Math.sin(pf-spr)*flLen,0);
     const pM=w2s(p.x+Math.cos(pf)*(flLen*1.08),p.y+Math.sin(pf)*(flLen*1.08),0);
     const pR=w2s(p.x+Math.cos(pf+spr)*flLen,p.y+Math.sin(pf+spr)*flLen,0);
     cx.save();
     const beamGrad=cx.createRadialGradient(p0[0],p0[1],10,pM[0],pM[1],flLen*32*Z);
     beamGrad.addColorStop(0,'rgba(235,245,255,0.15)');
     beamGrad.addColorStop(0.5,'rgba(200,230,255,0.06)');
     beamGrad.addColorStop(1,'rgba(160,210,255,0)');
     cx.fillStyle=beamGrad;
     cx.beginPath();
     cx.moveTo(p0[0],p0[1]);
     cx.lineTo(pL[0],pL[1]);
     cx.lineTo(pM[0],pM[1]);
     cx.lineTo(pR[0],pR[1]);
     cx.closePath();
     cx.fill();
     cx.restore();
    }
    cx.globalCompositeOperation='source-over';
   }
  }else{cx.fillStyle=`rgba(0,6,8,${this.dark*.45})`;cx.fillRect(0,0,W,H);}
  if(S.gfx!=='low'){cx.globalCompositeOperation='multiply';cx.fillStyle=`rgb(${th.tint[0]},${th.tint[1]},${th.tint[2]})`;cx.fillRect(0,0,W,H);cx.globalCompositeOperation='source-over';}
  if(S.weather&&S.gfx!=='low'&&(this.rain||this.ash)){const n=S.gfx==='high'?150:70;if(!this.rdrops||this.rdrops.length!==n)this.rdrops=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()}));
   cx.strokeStyle=this.ash?'rgba(200,190,180,.35)':'rgba(170,200,230,.3)';cx.lineWidth=this.ash?2:1;cx.beginPath();for(const r of this.rdrops){if(this.ash){r.y+=40*(.4+r.s)*.016;r.x+=14*.016;}else{r.y+=900*(.6+r.s*.5)*.016;r.x-=120*.016;}if(r.y>H){r.y=-10;r.x=Math.random()*W;}if(r.x<0)r.x=W;if(r.x>W)r.x=0;cx.moveTo(r.x,r.y);if(this.ash)cx.lineTo(r.x+2,r.y+2);else cx.lineTo(r.x+5,r.y-18);}cx.stroke();}
  if(this.lightning>0){cx.fillStyle=`rgba(210,225,255,${this.lightning*.3})`;cx.fillRect(0,0,W,H);}
  const vg=cx.createRadialGradient(W/2,H/2,H*.28,W/2,H/2,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.62)');cx.fillStyle=vg;cx.fillRect(0,0,W,H);
  if(G.infect>40){const pu=.5+.5*Math.sin(this.t*2.5),ig=cx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.9);ig.addColorStop(0,'rgba(0,0,0,0)');ig.addColorStop(1,rgba('#18e0b0',(G.infect-40)/260*(.6+.4*pu)));cx.fillStyle=ig;cx.fillRect(0,0,W,H);}
  if(S.grain&&S.gfx==='high'&&GRAIN){cx.globalAlpha=.07;cx.save();cx.translate(Math.random()*128,Math.random()*128);cx.fillStyle=GRAIN;cx.fillRect(-128,-128,W+256,H+256);cx.restore();cx.globalAlpha=1;}
  minimap(this);
 }
}
let GRAIN=null;
function makeGrain(){const c=mkc(128,128),g=c.getContext('2d'),r=seeded(5);for(let i=0;i<2600;i++){const v=r()*255|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(r()*128,r()*128,1,1);}GRAIN=cx.createPattern(c,'repeat');}

/* ---------- entity drawing ---------- */
function drawDavid(p,lv){
 shadow(p.x,p.y,.4);const fl=p.hurtT>0,sw=p.swT>0;
 if(p.dodT>0)cx.globalAlpha=.55;
 let wa=null;if(sw){const k=1-p.swT/.2;wa=p.swA-1.15+2.3*k;}
 human(p.x,p.y,{f:p.f,ph:p.ph,sh:'#35567e',ar:'#2c4a6e',jk:'#27436b',pn:'#2b2f3a',sk:'#e0b08a',hr:'#2a1c10',fl,wp:'#c3c9cf',wa,wl:1.05,z:p.dodT>0?-.15:0});
 haloRing(p.x,p.y,G.infect<25?'#3aff70':G.infect<55?'#ffd34d':G.infect<80?'#ff8a3a':'#ff4040');
 cx.globalAlpha=1;
 if(p.carry){human(p.x+Math.cos(p.f+1.4)*.28,p.y+Math.sin(p.f+1.4)*.28,{f:p.f,sc:.6,z:.55,ph:0,sh:'#e8c23a',dress:1,pn:'#f0c8a0',sk:'#f0c8a0',hr:'#5a3418',arms:'fwd'});}
 if(sw){const k=1-p.swT/.2;cx.strokeStyle=`rgba(255,255,255,${.7*(1-k)})`;cx.lineWidth=5;cx.beginPath();for(let i=0;i<=10;i++){const a=p.swA-1.15+2.3*Math.min(1,k+.15)*i/10,r=1.7;const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;i?cx.lineTo(isx(x,y),isy(x,y,.7)):cx.moveTo(isx(x,y),isy(x,y,.7));}cx.stroke();}
}
function drawNancy(d){
 const crouch=Boolean(d.crouch);
 shadow(d.x,d.y,crouch?.34:.3);
 const tremor=(d.trust<40)?((40-d.trust)/40)*Math.sin(T*32)*.025:0;
 const sh=(d.scared>.5?Math.sin(T*40)*.02:0)+tremor;
 const z=crouch?-0.16:0;
 const sc=crouch?0.63:0.74;
 human(d.x+sh,d.y,{f:d.f,ph:d.ph,sc,z,sh:'#e8c23a',ar:'#e8c23a',dress:1,pn:'#f0c8a0',sk:'#f0c8a0',hr:'#5a3418',hair2:1,fl:d.hT>1.7,arms:crouch?'fwd':'down'});
 haloRing(d.x,d.y,'#3aff70');
 if(d.trust<35){cx.globalAlpha=.7;cx.fillStyle='#ffb04a';cx.font='bold 13px monospace';cx.textAlign='center';cx.fillText('!',isx(d.x,d.y),isy(d.x,d.y,1.8));cx.globalAlpha=1;}
}
function drawNPC(n){haloRing(n.x,n.y,'#3aff70');shadow(n.x,n.y,.34);
 if(n.kind==='cop'){human(n.x,n.y,{f:n.f||1,ph:0,sh:'#26466b',ar:'#26466b',pn:'#1b2b44',sk:'#d9a47c',hr:'#10151f',arms:'fwd'});box(n.x-.16,n.y-.16,1.5,.32,.32,.1,'#16233a',true);if(n.fx>0){const x=n.x+Math.cos(n.f)*.5,y=n.y+Math.sin(n.f)*.5;glowDot(x,y,1,12,'#ffe070',.9);cx.strokeStyle='rgba(255,230,140,.8)';cx.lineWidth=2;cx.beginPath();cx.moveTo(isx(x,y),isy(x,y,1));cx.lineTo(isx(n.tx,n.ty),isy(n.tx,n.ty,.8));cx.stroke();}}
 else human(n.x,n.y,{f:n.f||2,ph:0,sc:.62,z:0,sh:n.c||'#7a4a4a',ar:n.c||'#7a4a4a',pn:'#2a2a3a',sk:'#e0b890',hr:'#2a1a10'});}
function drawPickup(k,t){const b=Math.sin(t*3+k.x)*.08+.35,c=k.k==='med'?'#6aff9a':k.k==='anti'?'#6ad8ff':'#f0e4b0';
 groundEll(k.x,k.y,.45,rgba(c,.2),c,.8,2);
 if(k.k==='med'){box(k.x-.17,k.y-.17,b,.34,.34,.26,'#e8e8e8');box(k.x-.15,k.y-.04,b+.26,.3,.08,.04,'#d02828',true);box(k.x-.04,k.y-.15,b+.26,.08,.3,.04,'#d02828',true);}
 else if(k.k==='anti'){box(k.x-.07,k.y-.07,b,.14,.14,.34,'#4aa3ff');box(k.x-.05,k.y-.05,b+.34,.1,.1,.08,'#dddddd',true);}
 else{box(k.x-.2,k.y-.25,b,.4,.5,.04,'#e7dfc4');}
 glowDot(k.x,k.y,b+.4,14,c,.28);light(k.x,k.y,.5,2.2,.45,c);}
function drawEnemy(e){
 if(e.type==='boss'&&typeof drawBloomWife==='function'){drawBloomWife(e);return;}
 haloRing(e.x,e.y,e.type==='boss'?'#c040ff':(e.type==='stalker'?'#38ffe0':'#ff3030'));
 const fl=e.hurtT>0,sc=e.sc||1,f=e.f||0,fx=Math.cos(f),fy=Math.sin(f),px=-fy,py=fx;
 const pu=.5+.5*Math.sin(T*4+(e.seed||0));
 
 if(e.type==='bloated'){
  shadow(e.x,e.y,.85*sc,.45);
  const bp=1+.09*Math.sin(T*5+(e.seed||0)),dy=e.dying?(Math.sin(T*35)>0?'#ff5a30':'#ffe060'):'#5a7038';
  groundEll(e.x,e.y,.75*bp,rgba('#204010',.28),e.dying?'#ff4020':'#66cc22',.45,2);
  bx(e.x,e.y,0,.45*sc,.45*sc,fl?'#fff':'#2f3824');
  bx(e.x,e.y,.38*sc,.82*bp*sc,.75*bp*sc,fl?'#fff':dy);
  bx(e.x+fx*.1,e.y+fy*.1,.95*sc,.42*sc,.32*sc,fl?'#fff':'#6a7a4a');
  const pustules=[[.22,.12,.95,.26,'#98ff40'],[-.2,.2,.85,.28,'#ffd040'],[.15,-.2,.9,.24,'#88ff30'],[-.15,-.15,1.05,.22,'#ff7030']];
  for(const[ox,oy,oz,or,oc]of pustules){
   const psz=(or*(.85+.15*Math.sin(T*6+ox*10)))*sc;
   bx(e.x+ox,e.y+oy,oz*sc,psz,psz,fl?'#fff':(e.dying?'#ff4020':oc));
   glowDot(e.x+ox,e.y+oy,(oz+.15)*sc,10,e.dying?'#ff6030':oc,.45);
  }
  light(e.x,e.y,.8,3.5,.5,e.dying?'#ff5020':'#70dd30');
  glowDot(e.x,e.y,1.1*sc,28*bp,e.dying?'#ff5020':'#88ff44',.32);
  if(!fl){glowDot(e.x+fx*.2,e.y+fy*.2,1.15*sc,6,'#ff3020',.95);}
 }
 else if(e.type==='boss'){
  if(typeof drawBloomWife==='function'){drawBloomWife(e);return;}
  shadow(e.x,e.y,.8,.4);
  human(e.x,e.y,{f:e.f,ph:e.ph,sc:1.4,sh:'#5a2f6a',ar:'#c9b8d0',pn:'#3a1f4a',sk:'#c9b8d0',hr:'#14101c',dress:1,hair2:1,arms:'fwd',up:e.wind>0||e.bs==='scream',fl,glow:'#e060ff',eye:'#e060ff'});
  for(let i=0;i<6;i++){const a=i*1.05+T*.6;bx(e.x+Math.cos(a)*.28,e.y+Math.sin(a)*.28,1.95,.1,.4+.12*Math.sin(T*3+i),'#d85cff');}
  glowDot(e.x,e.y,1.4,50+10*pu,'#c040ff',.12+(e.phase>1?.1:0));
  if(e.bs==='stun'){cx.fillStyle='#ffd34d';cx.font='bold 16px "Cinzel",monospace';cx.textAlign='center';cx.fillText('\u2605 \u2605 \u2605',isx(e.x,e.y),isy(e.x,e.y,2.9));}
 }
 else if(e.type==='stalker'){
  shadow(e.x,e.y,.48*sc,.4);
  const lungeOff=e.lunge>0?.25:0;
  human(e.x+fx*lungeOff,e.y+fy*lungeOff,{f:e.f,ph:e.ph*1.4,sc:sc*.92,z:-.1,sh:'#1a2a24',ar:'#2d3d34',pn:'#101815',sk:'#3d5045',hr:'#0a120e',arms:'fwd',up:false,fl,glow:'#38ffe0',eye:'#38ffe0'});
  const sx0=isx(e.x+fx*.35+px*.15,e.y+fy*.35+py*.15),sy0=isy(e.x+fx*.35+px*.15,e.y+fy*.35+py*.15,.55*sc);
  cx.strokeStyle=fl?'#fff':'#8ee8d8';cx.lineWidth=2;cx.beginPath();cx.moveTo(sx0,sy0);cx.lineTo(sx0+fx*12,sy0+fy*8+4);cx.stroke();
  const sx1=isx(e.x+fx*.35-px*.15,e.y+fy*.35-py*.15),sy1=isy(e.x+fx*.35-px*.15,e.y+fy*.35-py*.15,.55*sc);
  cx.beginPath();cx.moveTo(sx1,sy1);cx.lineTo(sx1+fx*12,sy1+fy*8+4);cx.stroke();
  for(let i=0;i<3;i++){bx(e.x-fx*(.08+i*.08),e.y-fy*(.08+i*.08),(.65+i*.12)*sc,.06*sc,.14*sc,fl?'#fff':'#284238');}
  glowDot(e.x+fx*.2,e.y+fy*.2,.9*sc,8,'#38ffe0',.65);
 }
 else{
  shadow(e.x,e.y,.38*sc);
  const limp=Math.sin(e.ph||0)*.08;
  human(e.x,e.y,{f:e.f,ph:e.ph,sc,z:limp,sh:e.shirt||'#4a3a2e',ar:e.shirt||'#3a2c20',pn:'#25201c',sk:'#6a7860',hr:'#15110e',arms:'fwd',up:e.wind>0,fl,glow:'#ff4020',eye:'#ff3520'});
  bx(e.x+px*.18*sc,e.y+py*.18*sc,1.05*sc,.12*sc,.24*sc,fl?'#fff':'#386b40');
  glowDot(e.x+px*.18*sc,e.y+py*.18*sc,1.25*sc,6,'#55ff77',.45);
 }
 if(e.wind>0&&!e.dying){cx.globalAlpha=.85;cx.fillStyle='#ff3030';cx.font='bold 16px "Cinzel",monospace';cx.textAlign='center';cx.fillText('!',isx(e.x,e.y),isy(e.x,e.y,2.3*sc));cx.globalAlpha=1;}
 if(S.bars&&e.type!=='boss'&&e.hp<e.max&&!e.dead){const x=isx(e.x,e.y),y=isy(e.x,e.y,2.1*sc),w=30;cx.fillStyle='rgba(0,0,0,.75)';cx.fillRect(x-w/2,y,w,4);cx.fillStyle=hx(255*(1-e.hp/e.max)+40,200*e.hp/e.max+30,40);cx.fillRect(x-w/2+.5,y+.5,(w-1)*clamp(e.hp/e.max,0,1),3);}
}

/* ---------- minimap ---------- */
const MMC={road:'#2c2e33',walk:'#4a4c4a',grass:'#1f3a24',wood:'#4f3a26',dark:'#3a2a33',carpet:'#3a4560',tile:'#8a8e86',lino:'#767a6c',waste:'#33291f'};
function brighten(col,factor){const n=parseInt(col.slice(1),16);const r=(n>>16),g=(n>>8)&255,b=n&255;return`#${((Math.min(255,r*factor)|0).toString(16).padStart(2,'0'))}${((Math.min(255,g*factor)|0).toString(16).padStart(2,'0'))}${((Math.min(255,b*factor)|0).toString(16).padStart(2,'0'))}`;}
function minimap(lv){
 if(!S.minimap)return;setScreen();const p=lv.player,big=mapBig,R=big?Math.min(W,H)*.38:88,sc=big?6:3.6,mx=big?W/2:W-R-18,my=big?H/2:H-R-18;
 cx.save();cx.beginPath();cx.arc(mx,my,R,0,6.2832);cx.clip();
 const bgCol=S.accessibility?'#1a1a1a':'rgba(2,8,7,.82)';cx.fillStyle=bgCol;cx.fillRect(mx-R,my-R,R*2,R*2);
 cx.translate(mx,my);cx.rotate(Math.PI/4);cx.translate(-p.x*sc,-p.y*sc);
 const span=Math.ceil(R/sc*1.45),pi=p.x|0,pj=p.y|0;
 for(let j=Math.max(0,pj-span);j<Math.min(lv.h,pj+span);j++)for(let i=Math.max(0,pi-span);i<Math.min(lv.w,pi+span);i++){const c=MMC[lv.floor[j][i]]||'#222';cx.fillStyle=S.accessibility?brighten(c,1.8):c;cx.fillRect(i*sc,j*sc,sc+.6,sc+.6);}
 for(const q of lv.props){if(!q.solid&&q.k!=='gate')continue;if(Math.abs(q.cx-p.x)>span||Math.abs(q.cy-p.y)>span)continue;cx.fillStyle=q.k==='wall'?'#cfd8d3':q.k==='tree'||q.k==='bush'?'#2a6a3a':q.k==='car'||q.k==='bus'||q.k==='truck'?'#9a6a3a':q.k==='mall'?'#e8c46a':q.k==='shop'||q.k==='busstop'?'#c9a86a':q.k==='ground'?'#3a9a4a':q.k==='ruin'?'#6a5a4a':'#8b9a92';cx.fillRect(q.x*sc,q.y*sc,Math.max(1.5,q.w*sc),Math.max(1.5,q.d*sc));}
 for(const k of lv.pick)if(!k.got){cx.fillStyle=k.k==='med'?'#6aff9a':k.k==='anti'?'#6ad8ff':'#f0e4b0';cx.fillRect(k.x*sc-2,k.y*sc-2,4,4);}
 for(const e of lv.enemies){if(e.dead)continue;cx.fillStyle=e.type==='boss'?'#ff66ff':'#ff3a3a';cx.beginPath();cx.arc(e.x*sc,e.y*sc,e.type==='boss'?4:2.4,0,6.3);cx.fill();}
 for(const n of lv.npcs){cx.fillStyle='#5aa0ff';cx.fillRect(n.x*sc-2,n.y*sc-2,4,4);}
 const d=lv.daughter;cx.fillStyle='#ffd34d';cx.beginPath();cx.arc(d.x*sc,d.y*sc,3,0,6.3);cx.fill();
 if(lv.goal){const g=lv.goal;let gx=g.x*sc,gy=g.y*sc;const dx=gx-p.x*sc,dy=gy-p.y*sc,dl=Math.hypot(dx,dy),lim=R/1.18;if(dl>lim){gx=p.x*sc+dx/dl*lim;gy=p.y*sc+dy/dl*lim;}cx.fillStyle=lv.ui||THEMES[S.theme].acc;cx.save();cx.translate(gx,gy);cx.rotate(Math.PI/4);cx.fillRect(-4,-4,8,8);cx.restore();}
 cx.save();cx.translate(p.x*sc,p.y*sc);cx.rotate(p.f);cx.fillStyle=lv.ui||THEMES[S.theme].acc;cx.beginPath();cx.moveTo(6,0);cx.lineTo(-4,4);cx.lineTo(-4,-4);cx.closePath();cx.fill();cx.restore();
 cx.restore();cx.strokeStyle=rgba(lv.ui||THEMES[S.theme].acc,.55);cx.lineWidth=2;cx.beginPath();cx.arc(mx,my,R,0,6.2832);cx.stroke();
 cx.fillStyle='rgba(200,230,215,.6)';cx.font='10px "Share Tech Mono",monospace';cx.textAlign='center';cx.fillText(big?(document.body.classList.contains('mobile')?'TAP TO CLOSE':'MAP [M] CLOSE'):'MAP',mx,my+R+12);
}
