/* ---------- drawing primitives ---------- */
const SHC={};
function shades(h){let s=SHC[h];if(s)return s;const n=parseInt(h.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;const f=k=>`rgb(${Math.min(255,r*k)|0},${Math.min(255,g*k)|0},${Math.min(255,b*k)|0})`;return SHC[h]={t:f(1.22),l:f(.88),r:f(.62)};}
let EDGE=true;
function poly(a,fill,st){cx.beginPath();cx.moveTo(a[0],a[1]);for(let i=2;i<a.length;i+=2)cx.lineTo(a[i],a[i+1]);cx.closePath();cx.fillStyle=fill;cx.fill();if(st){cx.strokeStyle=st;cx.lineWidth=.8;cx.stroke();}}
function box(x,y,z,w,d,h,col,ne){
 const s=shades(col),x1=x+w,y1=y+d,z1=z+h,e=(EDGE&&!ne)?'rgba(0,0,0,.3)':null;
 poly([isx(x1,y),isy(x1,y,z),isx(x1,y1),isy(x1,y1,z),isx(x1,y1),isy(x1,y1,z1),isx(x1,y),isy(x1,y,z1)],s.r,e);
 poly([isx(x,y1),isy(x,y1,z),isx(x1,y1),isy(x1,y1,z),isx(x1,y1),isy(x1,y1,z1),isx(x,y1),isy(x,y1,z1)],s.l,e);
 poly([isx(x,y),isy(x,y,z1),isx(x1,y),isy(x1,y,z1),isx(x1,y1),isy(x1,y1,z1),isx(x,y1),isy(x,y1,z1)],s.t,e);
}
const bx=(x,y,z,w,h,col)=>box(x-w/2,y-w/2,z,w,w,h,col,true);
function fr(p,u0,u1,z0,z1,col){
 if(p.f==='x'){const X=p.x+p.w+.006,a=p.y+p.d*u0,b=p.y+p.d*u1;poly([isx(X,a),isy(X,a,z0),isx(X,b),isy(X,b,z0),isx(X,b),isy(X,b,z1),isx(X,a),isy(X,a,z1)],col);}
 else{const Y=p.y+p.d+.006,a=p.x+p.w*u0,b=p.x+p.w*u1;poly([isx(a,Y),isy(a,Y,z0),isx(b,Y),isy(b,Y,z0),isx(b,Y),isy(b,Y,z1),isx(a,Y),isy(a,Y,z1)],col);}
}
function shadow(x,y,r,a){cx.globalAlpha=a||.32;cx.fillStyle='#000';cx.beginPath();cx.ellipse(isx(x,y),isy(x,y),r*45,r*22,0,0,6.2832);cx.fill();cx.globalAlpha=1;}
function glowDot(x,y,z,r,col,a){const sx=isx(x,y),sy=isy(x,y,z);cx.globalAlpha=a;cx.fillStyle=col;cx.beginPath();cx.arc(sx,sy,r,0,6.2832);cx.fill();cx.globalAlpha=1;}
function decalRect(x,y,w,d,fill,a){cx.globalAlpha=a==null?1:a;poly([isx(x,y),isy(x,y),isx(x+w,y),isy(x+w,y),isx(x+w,y+d),isy(x+w,y+d),isx(x,y+d),isy(x,y+d)],fill);cx.globalAlpha=1;}
function groundEll(x,y,r,fill,stroke,a,lw){cx.save();cx.translate(isx(x,y),isy(x,y));cx.scale(1,.5);cx.globalAlpha=a;cx.beginPath();cx.arc(0,0,r*45,0,6.2832);if(fill){cx.fillStyle=fill;cx.fill();}if(stroke){cx.strokeStyle=stroke;cx.lineWidth=lw||3;cx.stroke();}cx.restore();cx.globalAlpha=1;}
let T=0;

/* ---------- humanoid ---------- */
function human(x,y,o){
 const sc=o.sc||1,f=o.f||0,fx=Math.cos(f),fy=Math.sin(f),px=-fy,py=fx,ph=o.ph||0;
 const gait=o.gait==null?1:clamp(o.gait,0,2),bob=o.bob==null?1:clamp(o.bob,0,2),armSwing=o.armSwing==null?1:clamp(o.armSwing,0,2);
 const sw=Math.sin(ph)*.17*sc*gait,z0=(o.z||0)+Math.abs(Math.sin(ph))*.03*bob+Math.sin(T*2.2+(x*5.3+y*3.1))*.009*sc,F=o.fl,c=k=>F?'#ffffff':o[k];
 const up=o.up?.18:0,ar=(o.arms==='fwd'?.3:0),as=o.arms==='fwd'?0:Math.sin(ph)*.12*sc*armSwing,P=[];
 P.push([x+px*.1*sc+fx*sw,y+py*.1*sc+fy*sw,z0,.14*sc,.58*sc,c('pn')]);
 P.push([x-px*.1*sc-fx*sw,y-py*.1*sc-fy*sw,z0,.14*sc,.58*sc,c('pn')]);
 if(o.dress)P.push([x,y,z0+.3*sc,.4*sc,.34*sc,c('sh')]);
 P.push([x,y,z0+.56*sc,.32*sc,.55*sc,c('sh')]);
 P.push([x+px*.23*sc+fx*(ar-as),y+py*.23*sc+fy*(ar-as),z0+(.62+up)*sc,.11*sc,.42*sc,c('ar')||c('sh')]);
 P.push([x-px*.23*sc+fx*(ar+as),y-py*.23*sc+fy*(ar+as),z0+(.62+up)*sc,.11*sc,.42*sc,c('ar')||c('sh')]);
 P.push([x+fx*.02,y+fy*.02,z0+1.1*sc,.26*sc,.27*sc,c('sk')]);
 P.push([x,y,z0+1.0*sc,.17*sc,.09*sc,c('sk')]);
 if(o.jk)P.push([x,y,z0+.56*sc,.2*sc,.57*sc,c('jk')]);
 P.push([x,y,z0+1.33*sc,.29*sc,.1*sc,c('hr')]);
 if(o.hair2)P.push([x-fx*.1,y-fy*.1,z0+1.0*sc,.26*sc,.4*sc,c('hr')]);
 P.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1])||a[2]-b[2]);
 for(const p of P)bx(p[0],p[1],p[2],p[3],p[4],p[5]);
 if(fx+fy>-.25&&!F)for(const s of[-1,1])bx(x+fx*.15+px*.06*s*sc,y+fy*.15+py*.06*s*sc,z0+1.2*sc,.05,.05,o.eye||'#141414');
 if(o.glow&&!F){glowDot(x+fx*.15,y+fy*.15,z0+1.25*sc,7,o.glow,.45);}
 if(o.wp){const a=o.wa==null?f:o.wa,hz=z0+.85*sc,hx0=x+fx*.25,hy0=y+fy*.25;
  const tx=hx0+Math.cos(a)*(o.wl||.9),ty=hy0+Math.sin(a)*(o.wl||.9),tz=o.wa==null?hz-.35:hz+.1;
  cx.strokeStyle=o.wp;cx.lineWidth=3.5;cx.lineCap='round';cx.beginPath();cx.moveTo(isx(hx0,hy0),isy(hx0,hy0,hz));cx.lineTo(isx(tx,ty),isy(tx,ty,tz));cx.stroke();cx.lineCap='butt';}
}

/* ---------- props ---------- */
const PD={};
const def=(k,w,d,draw,o)=>{PD[k]=Object.assign({w,d,draw},o||{});};
const BOOKS=['#8a3a3a','#3a5a8a','#5a8a4a','#c9a24a','#6a4a8a','#4a8a8a'];
def('wall',1,.3,p=>{box(p.x,p.y,0,p.w,p.d,p.h||2.4,p.col||'#5d574d');if(p.win){if(p.w>p.d)box(p.x+p.w*.2,p.y-.02,.95,p.w*.6,p.d+.04,.85,'#5f87a8');else box(p.x-.02,p.y+p.d*.2,.95,p.w+.04,p.d*.6,.85,'#5f87a8');}},{tall:1});def('bed',1.5,2.2,p=>{box(p.x,p.y,0,p.w,p.d,.38,'#5b3d26');box(p.x,p.y,.38,p.w,.12,.55,'#4a3120');box(p.x+.07,p.y+.12,.38,p.w-.14,p.d-.19,.22,'#d9d4c8');box(p.x+.07,p.y+1.0,.6,p.w-.14,p.d-1.07,.1,p.col||'#3c5f8f');box(p.x+.2,p.y+.2,.6,p.w*.6,.4,.14,'#f1eee6');});def('nstand',.6,.5,p=>{box(p.x,p.y,0,p.w,p.d,.55,'#5b3d26');box(p.x+.2,p.y+.15,.55,.2,.2,.04,'#333333');box(p.x+.18,p.y+.13,.59,.24,.24,.3,'#f5dfa0');},{lt:{r:4.5,i:.55,c:'#ffd89a',z:1}});def('wardrobe',1.4,.6,p=>{box(p.x,p.y,0,p.w,p.d,2,'#6a4a30');fr(p,.04,.48,.08,1.9,'#583c27');fr(p,.52,.96,.08,1.9,'#583c27');fr(p,.42,.46,.9,1.1,'#d9c27a');fr(p,.54,.58,.9,1.1,'#d9c27a');},{tall:1});def('fridge',.9,.8,p=>{box(p.x,p.y,0,p.w,p.d,1.9,'#cdd5d8');fr(p,.06,.94,1.25,1.82,'#b9c3c7');fr(p,.06,.94,.08,1.2,'#c3ccd0');fr(p,.76,.84,.5,.95,'#555c5f');fr(p,.76,.84,1.38,1.65,'#555c5f');},{tall:1});def('counter',1.4,.7,p=>{box(p.x,p.y,0,p.w,p.d,.88,p.col||'#6d4f33');box(p.x-.03,p.y-.03,.88,p.w+.06,p.d+.06,.07,'#cfc9bc');fr(p,.08,.92,.14,.78,mixc(p.col||'#6d4f33',.82));});def('stove',1,.8,p=>{box(p.x,p.y,0,p.w,p.d,.86,'#8f9598');box(p.x+.08,p.y+.08,.86,p.w-.16,p.d-.16,.04,'#222222');for(const[a,b]of[[.2,.2],[.6,.2],[.2,.5],[.6,.5]])box(p.x+a,p.y+b,.9,.18,.18,.03,'#444444',true);fr(p,.15,.85,.12,.62,'#2a2f33');});def('sink',1.4,.7,p=>{box(p.x,p.y,0,p.w,p.d,.88,'#6d4f33');box(p.x-.03,p.y-.03,.88,p.w+.06,p.d+.06,.07,'#cfc9bc');box(p.x+.3,p.y+.15,.93,p.w-.6,p.d-.3,.03,'#7e8c93',true);box(p.x+p.w/2-.03,p.y+.08,.95,.06,.06,.3,'#aaaaaa',true);fr(p,.08,.92,.14,.78,'#5a3f27');});def('table',1.6,.9,p=>{const c=p.col||'#8a6a43';for(const[a,b]of[[0,0],[1,0],[0,1],[1,1]])box(p.x+a*(p.w-.12),p.y+b*(p.d-.12),0,.12,.12,.68,mixc(c,.6),true);box(p.x,p.y,.68,p.w,p.d,.09,c);});def('chair',.5,.5,p=>{const c=p.col||'#6b4a30';box(p.x+.03,p.y+.03,0,.08,.08,.4,c,true);box(p.x+.39,p.y+.03,0,.08,.08,.4,c,true);box(p.x+.03,p.y+.39,0,.08,.08,.4,c,true);box(p.x+.39,p.y+.39,0,.08,.08,.4,c,true);box(p.x,p.y,.4,.5,.5,.07,c);box(p.x,p.y,.47,.5,.07,.5,c);});def('sofa',2.3,.95,p=>{const c=p.col||'#7a3a3a';box(p.x,p.y,0,p.w,p.d,.4,c);if(p.back==='s')box(p.x,p.y+p.d-.25,.4,p.w,.25,.55,c);else box(p.x,p.y,.4,p.w,.25,.55,c);box(p.x,p.y,.4,.2,p.d,.25,c);box(p.x+p.w-.2,p.y,.4,.2,p.d,.25,c);box(p.x+.2,p.y+(p.back==='s'?0:.25),.4,p.w-.4,p.d-.25,.12,mixc(c,1.15));});def('tv',1.4,.5,p=>{box(p.x,p.y,0,p.w,p.d,.5,'#3b2c20');box(p.x+.12,p.y+.14,.5,p.w-.24,.14,.85,'#111111');const f=.5+.5*Math.sin(T*9+p.x);box(p.x+.2,p.y+.26,.58,p.w-.4,.05,.68,p.dead?'#0b0b0b':hx(40+f*40,100+f*70,130+f*90));},{lt:{r:4,i:.5,c:'#6ab0ff',z:1}});def('shelf',1.2,.4,p=>{box(p.x,p.y,0,p.w,p.d,1.9,'#5a3d28');for(let r=0;r<4;r++)for(let k=0;k<6;k++)fr(p,.06+k*.15,.06+k*.15+.12,.15+r*.45,.15+r*.45+.34,BOOKS[(r*7+k)%6]);},{tall:1});def('lamp',.4,.4,p=>{box(p.x+.15,p.y+.15,0,.1,.1,1.3,'#444444',true);box(p.x+.02,p.y+.02,1.3,.36,.36,.35,'#f5dfa0');},{lt:{r:5.5,i:.65,c:'#ffd89a',z:1.5}});def('plant',.5,.5,p=>{box(p.x+.08,p.y+.08,0,.34,.34,.4,'#6b4a33');const sx=isx(p.x+.25,p.y+.25),sy=isy(p.x+.25,p.y+.25,.7);for(const[a,b,r]of[[0,0,15],[-10,-8,11],[10,-10,11],[0,-16,10]]){cx.fillStyle='#2f6a3a';cx.beginPath();cx.arc(sx+a,sy+b,r,0,6.3);cx.fill();}});def('crate',.8,.8,p=>{box(p.x,p.y,0,p.w,p.d,.7,p.col||'#7a5a34');box(p.x-.02,p.y-.02,.62,p.w+.04,p.d+.04,.08,'#5a3f22');});def('desk',.95,.6,p=>{box(p.x+.04,p.y+.04,0,.07,.07,.65,'#555555',true);box(p.x+.84,p.y+.04,0,.07,.07,.65,'#555555',true);box(p.x+.04,p.y+.49,0,.07,.07,.65,'#555555',true);box(p.x+.84,p.y+.49,0,.07,.07,.65,'#555555',true);box(p.x,p.y,.65,p.w,p.d,.07,p.col||'#9a7a4a');});def('tdesk',2,1,p=>{box(p.x,p.y,0,p.w,p.d,.75,'#5a4630');box(p.x-.04,p.y-.04,.75,p.w+.08,p.d+.08,.07,'#7a6038');box(p.x+.3,p.y+.2,.82,.5,.06,.4,'#1a1a1a');box(p.x+.35,p.y+.28,.82,.4,.2,.03,'#333333',true);});def('board',3.4,.14,p=>{box(p.x,p.y,.9,p.w,p.d,1.3,'#4a3524');box(p.x+.08,p.y+.04,.98,p.w-.16,p.d+.01,1.14,'#1f3a2e');},{solid:false,tall:1});def('locker',.62,.6,p=>{box(p.x,p.y,0,p.w,p.d,1.9,p.col||'#4a6784');fr(p,.1,.9,1.35,1.75,'#34495e');fr(p,.1,.9,.12,1.25,mixc(p.col||'#4a6784',.85));fr(p,.72,.84,.8,.95,'#cfd8dc');},{tall:1});def('pillar',.9,.9,p=>{box(p.x,p.y,0,p.w,p.d,2.6,'#3a3445');box(p.x-.05,p.y-.05,2.5,p.w+.1,p.d+.1,.1,'#4a4258');},{tall:1});def('growth',.9,.9,p=>{box(p.x+.1,p.y+.1,0,.7,.7,.35,'#2a1a3a');const sx=isx(p.cx,p.cy),sy=isy(p.cx,p.cy,.5),pu=1+.12*Math.sin(T*2+p.x);for(const[a,b,r,c]of[[0,0,20,'#4a2a66'],[-12,-10,13,'#5c3480'],[12,-14,12,'#3a8a7a'],[2,-24,10,'#7a4aa0']]){cx.fillStyle=c;cx.beginPath();cx.arc(sx+a,sy+b,r*pu,0,6.3);cx.fill();}glowDot(p.cx,p.cy,1.1,9,'#7affd0',.6);},{lt:{r:4,i:.45,c:'#5affc0',z:.8}});def('tree',.5,.5,p=>{const s=p.s||1;shadow(p.cx,p.cy,1.1*s,.3);box(p.x+.1,p.y+.1,0,.3,.3,1.6*s,'#3d2b1c',true);const sx=isx(p.cx,p.cy),sy=isy(p.cx,p.cy,1.9*s);
 if(p.dead){cx.strokeStyle='#2a211a';cx.lineWidth=3;for(let i=0;i<6;i++){const a=i*1.05+p.x;cx.beginPath();cx.moveTo(sx,sy+20*s);cx.lineTo(sx+Math.cos(a)*34*s,sy-Math.abs(Math.sin(a))*34*s);cx.stroke();}return;}
 const C=p.inf?['#1d4a4a','#26665e','#33806f']:['#1f3d24','#2a4f2e','#35663a'];
 for(const[a,b,r,k]of[[-16,10,28,0],[16,8,27,0],[0,-4,34,1],[-10,-22,24,2],[12,-20,22,2]]){cx.fillStyle=C[k];cx.beginPath();cx.arc(sx+a*s,sy+b*s,r*s,0,6.3);cx.fill();}
 cx.fillStyle='rgba(255,255,255,.07)';cx.beginPath();cx.arc(sx-8*s,sy-26*s,16*s,0,6.3);cx.fill();if(p.inf)glowDot(p.cx,p.cy,2.4*s,22,'#4dffc0',.18);},{tall:1});def('bush',.8,.8,p=>{const sx=isx(p.cx,p.cy),sy=isy(p.cx,p.cy,.3);for(const[a,b,r,c]of[[-9,3,13,'#244a2c'],[9,3,13,'#244a2c'],[0,-5,15,'#2f5a36']]){cx.fillStyle=c;cx.beginPath();cx.arc(sx+a,sy+b,r,0,6.3);cx.fill();}});def('car',2.3,1.1,p=>{const c=p.col||'#8a2a2a',L=p.w>=p.d;shadow(p.cx,p.cy,Math.max(p.w,p.d)*.5,.3);
 const wh=(a,b)=>box(p.x+a,p.y+b,0,.4,.14,.28,'#111111',true);
 if(L){wh(.2,-.02);wh(p.w-.6,-.02);wh(.2,p.d-.12);wh(p.w-.6,p.d-.12);}else{for(const[a,b]of[[-.02,.2],[p.w-.12,.2],[-.02,p.d-.6],[p.w-.12,p.d-.6]])box(p.x+a,p.y+b,0,.14,.4,.28,'#111111',true);}
 box(p.x,p.y,.2,p.w,p.d,.45,c);
 if(L){const cxx=p.x+p.w*.28,cw=p.w*.46;box(cxx,p.y+.1,.65,cw,p.d-.2,.42,c);box(cxx-.015,p.y+.09,.72,cw+.03,p.d-.18,.26,'#16222e',true);box(cxx+.05,p.y+.12,1.07,cw-.1,p.d-.24,.05,mixc(c,1.1),true);glowDot(p.x+p.w,p.y+.25,.45,5,'#fff3b0',.5);glowDot(p.x+p.w,p.y+p.d-.25,.45,5,'#fff3b0',.5);}
 else{const cyy=p.y+p.d*.28,ch=p.d*.46;box(p.x+.1,cyy,.65,p.w-.2,ch,.42,c);box(p.x+.09,cyy-.015,.72,p.w-.18,ch+.03,.26,'#16222e',true);box(p.x+.12,cyy+.05,1.07,p.w-.24,ch-.1,.05,mixc(c,1.1),true);glowDot(p.x+.25,p.y+p.d,.45,5,'#fff3b0',.5);glowDot(p.x+p.w-.25,p.y+p.d,.45,5,'#fff3b0',.5);}});def('bus',4.8,1.5,p=>{shadow(p.cx,p.cy,2.4,.3);box(p.x,p.y,.2,p.w,p.d,1.1,'#d8a81c');box(p.x+.02,p.y-.01,.8,p.w-.04,p.d+.02,.35,'#16222e',true);box(p.x,p.y,1.3,p.w,p.d,.06,'#e8bc2c');for(const a of[.5,3.4])box(p.x+a,p.y-.02,0,.5,p.d+.04,.3,'#111111',true);},{tall:1});def('house',6,5,p=>{const c=p.col||'#6b5a4a',h=p.h||3;shadow(p.cx,p.cy+.4,3.4,.25);box(p.x,p.y,0,p.w,p.d,h,c);
 for(let i=0;i<Math.floor(p.w/2);i++)fr(p,.1+i*(.8/Math.floor(p.w/2)),.1+i*(.8/Math.floor(p.w/2))+.12,1.1,2.0,'#38505f');fr(p,.45,.55,0,1.7,'#3a2a20');
 box(p.x-.3,p.y-.3,h,p.w+.6,p.d+.6,.3,p.roof||'#3a2a2a');box(p.x+.4,p.y+.4,h+.3,p.w-.8,p.d-.8,.7,mixc(p.roof||'#3a2a2a',1.15));box(p.x+p.w-1.2,p.y+.6,h+.3,.5,.5,1.1,'#4a3a34');},{tall:1});def('ruin',5,4,p=>{const h=p.h||4,c=p.col||'#2e2925';box(p.x,p.y,0,p.w,p.d,h,c);box(p.x+p.w*.5,p.y,h,p.w*.5,p.d*.6,.6+(p.x%1),mixc(c,.8));box(p.x,p.y+p.d*.5,h,p.w*.35,p.d*.5,.3,mixc(c,.9));
 for(let r=0;r<Math.floor(h-1);r++)for(let k=0;k<Math.floor(p.w/1.3);k++)if(((r*5+k*3+(p.x|0))%4)!==0)fr(p,.08+k*(1/Math.floor(p.w/1.3)),.08+k*(1/Math.floor(p.w/1.3))+.12,.8+r*1.0,1.5+r*1.0,((r+k)%3===0)?'#6a4a1a':'#14100e');},{tall:1});def('fence',1,.14,p=>{box(p.x,p.y,0,p.w,p.d,.85,'#5a4d40');box(p.x-.02,p.y-.02,.75,p.w+.04,p.d+.04,.1,'#7a6a58');});def('slight',.3,.3,p=>{box(p.x+.1,p.y+.1,0,.1,.1,3.3,'#2c2f33',true);box(p.x,p.y,3.3,.3,.3,.15,'#ffe9b0');glowDot(p.cx,p.cy,3.3,12,'#ffd58a',.35);},{lt:{r:9,i:.95,c:'#ffd58a',z:3.2},tall:1});def('barrel',.5,.5,p=>{box(p.x+.05,p.y+.05,0,.4,.4,.7,p.col||'#7a3326');box(p.x+.03,p.y+.03,.7,.44,.44,.04,'#222222',true);if(p.fire){const f=.5+.5*Math.sin(T*13+p.x*3);glowDot(p.cx,p.cy,1.0+f*.15,10+f*4,'#ff9a30',.8);glowDot(p.cx,p.cy,1.2+f*.2,5,'#ffe070',.9);}});def('dump',1.7,.9,p=>{box(p.x,p.y,0,p.w,p.d,.95,'#2f5a3a');box(p.x-.04,p.y-.04,.95,p.w+.08,p.d+.08,.1,'#244a2e');});def('barr',2,.5,p=>{box(p.x,p.y,0,p.w,p.d,.9,'#d6d6d6');for(let i=0;i<4;i++)fr(p,.04+i*.25,.04+i*.25+.12,.12,.8,'#c0352f');});def('sand',2,.7,p=>{box(p.x,p.y,0,p.w,p.d,.5,'#8a7a58');box(p.x+.1,p.y+.1,.5,p.w-.2,p.d-.2,.3,'#7a6a4a');});def('pump',.6,.5,p=>{box(p.x,p.y,0,p.w,p.d,1.3,'#b33a30');fr(p,.2,.8,.8,1.1,'#222222');fr(p,.2,.8,.2,.6,'#e8e8e8');});def('mail',.3,.3,p=>{box(p.x+.12,p.y+.12,0,.06,.06,.8,'#444444',true);box(p.x,p.y,.8,.3,.3,.22,'#3a5a8a');});def('bunker',10,4,p=>{box(p.x,p.y,0,p.w,p.d,3.4,'#4a4d4e');box(p.x-.3,p.y-.3,3.4,p.w+.6,p.d+.6,.35,'#3a3d3e');fr(p,.38,.62,0,2.3,'#2b3033');fr(p,.4,.6,.1,2.2,'#383e42');fr(p,.3,.7,2.6,3.15,'#0c2a1a');glowDot(p.x+p.w*.5,p.y+p.d,2.9,14,'#4dff9a',.5);},{tall:1,lt:{r:8,i:.9,c:'#4dff9a',z:2.5}});def('gate',2,.3,p=>{if(p.open){box(p.x,p.y,0,p.w,p.d,.12,'#555555',true);}else{box(p.x,p.y,0,p.w,p.d,1.8,'#666b6f');for(let i=0;i<3;i++)fr(p,.1+i*.3,.1+i*.3+.15,.2,1.6,'#c0352f');glowDot(p.cx,p.cy,1.95,8,'#ff3030',.5+.4*Math.sin(T*6));}});

/* ---------- halo rings & wrecked vehicles ---------- */
function haloRing(x,y,col){const pu=.72+.18*Math.sin(T*3+(x+y)*.7);groundEll(x,y,.55,null,col,Math.min(.5,.28+.14*pu),3);groundEll(x,y,.55,rgba(col,.05),null,.9);}
def('carburn',2.3,1.1,p=>{const FT=.5+.5*Math.sin(T*7+p.x*3);shadow(p.cx,p.cy,Math.max(p.w,p.d)*.5,.3);
 box(p.x,p.y,.05,p.w*.94,p.d*.5,.3,'#191919');
 box(p.x+p.w*.05,p.y+p.d*.02,.35,p.w*.5,p.d*.42,.3,'#0f0f0f');
 box(p.x+p.w*.2,p.y+p.d*.05,.66,p.w*.14,p.d*.2,.16,'#0b0b0b');
 for(let i=0;i<3;i++){const a=T*1.3+i*2.1,r1=.14+.11*Math.sin(T*9+i*2);glowDot(p.cx+Math.cos(a)*p.w*.3,p.cy+Math.sin(a)*p.d*.3,1.0+r1,18+22*FT,'#ff9a30',.45+.35*FT);glowDot(p.cx+Math.cos(a*1.7)*p.w*.3,p.cy+Math.sin(a*1.7)*p.d*.3,1.6+r1,5,'#ffe070',.8);}
 glowDot(p.cx,p.cy,.6,44,'#ff5a10',.15+.1*FT);},{tall:1,lt:{r:6,i:.85,c:'#ff9a30',z:1.2}});
def('carwreck',2.3,1.1,p=>{shadow(p.cx,p.cy,Math.max(p.w,p.d)*.5,.3);
 box(p.x,p.y,0,p.w*.9,p.d*.5,.16,'#141414');
 box(p.x+p.w*.12,p.y+p.d*.1,.1,p.w*.5,p.d*.34,.3,'#0e0e0e');
 box(p.x+p.w*.34,p.y+p.d*.3,.05,p.w*.16,p.d*.4,.5,'#1a1a1a');
 box(p.x+p.w*.4,p.y+p.d*.05,.9,p.w*.05,p.d*.3,.02,'#222222');},{tall:1});

/* ---------- streetscape props ---------- */
def('truck',6.4,1.5,p=>{const c=p.col||'#6a7076',hz=p.f!=='x';
 shadow(p.cx,p.cy,3.2,.3);
 if(hz){box(p.cx-2.3,p.y,.05,4.6,p.d*.94,1.15,c);box(p.cx-2.25,p.y+.03,1.2,4.5,p.d*.84,.05,mixc(c,1.3));
  box(p.x,p.y+.06,.05,1.15,p.d*.78,1.0,mixc(c,.72));box(p.x+.12,p.y+.16,.82,.5,p.d*.5,.3,'#1c2226');box(p.x+.5,p.y+.16,1.32,.42,p.d*.56,.12,'#14181c');}
 else{box(p.x,p.cy-2.3,.05,p.w*.94,4.6,1.15,c);box(p.x+.03,p.cy-2.25,1.2,p.w*.84,4.5,.05,mixc(c,1.3));
  box(p.x+.06,p.y,.05,p.w*.78,1.15,1.0,mixc(c,.72));box(p.x+.16,p.y+.12,.82,p.w*.5,.5,.3,'#1c2226');box(p.x+.16,p.y+.5,1.32,p.w*.56,.42,.12,'#14181c');}
},{tall:1});
def('shop',3.8,2.4,p=>{const c=p.col||'#4a4438';
 shadow(p.cx,p.cy,2.4,.28);
 box(p.x,p.y,0,p.w,p.d,2.2,c);
 box(p.x+.08,p.y+.08,2.2,p.w-.16,p.d-.16,.22,mixc(c,1.2));
 box(p.x-.1,p.y+p.d-.2,1.9,p.w+.2,.4,.26,p.awn||'#7a3a2e');
 box(p.x+.2,p.y+p.d-.12,.3,p.w-1.2,.16,1.2,'#20323a');
 box(p.x+p.w-.75,p.y+p.d-.12,.3,1.0,.16,1.2,'#20323a');
 glowDot(p.cx,p.y+p.d-.02,.8,16,p.lit?'#ffd67a':'#3a4044',p.lit?.5:.1);
},{tall:1,lt:{r:4.5,i:.5,c:'#ffd67a',z:2.4}});
def('mall',8,6.4,p=>{const c=p.col||'#54503f';
 shadow(p.cx,p.cy,5,.32);
 box(p.x,p.y,0,p.w,p.d,3.1,c);
 box(p.x+.35,p.y+.35,3.1,p.w-.7,p.d-.7,.5,mixc(c,1.18));
 box(p.x+.5,p.y+p.d-.3,0,1.7,.34,2.3,'#2a2e33');
 box(p.x+.62,p.y+p.d-.34,.35,1.46,.12,1.6,'#ffd67a');
 box(p.x+2.5,p.y+p.d-.16,2.3,p.w-4,.18,.6,'#241f1a');
 glowDot(p.x+1.35,p.y+p.d-.15,1.1,24,'#ffcf6a',.3);
},{tall:1,lt:{r:9,i:.7,c:'#ffcf6a',z:3.3}});
def('ground',5.6,4.6,p=>{
 shadow(p.cx,p.cy,3,.2);
 groundEll(p.x+1.1,p.y+1.1,1.0,.8,'#c9b078','#b89a60',3);
 box(p.x+2.5,p.y+.35,0,.14,.14,1.5,'#5a4a3a');box(p.x+4.9,p.y+.35,0,.14,.14,1.5,'#5a4a3a');
 box(p.x+2.5,p.y+.3,1.5,2.54,.12,.1,'#4a3a2e');
 box(p.x+3.1,p.y+.55,.55,.05,.05,1.0,'#3a3a3a');box(p.x+4.3,p.y+.55,.55,.05,.05,1.0,'#3a3a3a');
 box(p.x+3.0,p.y+.62,0,.34,.34,.08,'#8a6a3a');box(p.x+4.2,p.y+.62,0,.34,.34,.08,'#8a6a3a');
 box(p.x+2.6,p.y+2.7,0,.5,.5,1.1,'#7a4a3a');box(p.x+3.4,p.y+3.3,0,.5,.5,.35,'#7a4a3a');
 box(p.x+2.75,p.y+2.95,.1,1.15,.5,.08,'#9a6a5a');
},{tall:1});
def('busstop',2.6,1.6,p=>{
 shadow(p.cx,p.cy,1.8,.28);
 box(p.x,p.y,0,p.w,p.d,2.0,'#2e3438');
 box(p.x+.12,p.y+.14,.9,p.w-.24,p.d-.28,.9,'#20262a',true);
 box(p.x+.3,p.y+p.d-.65,0,p.w-.7,.5,.5,'#4a3f33');
 box(p.x+p.w-.4,p.y-.25,0,.28,.2,1.7,'#b8b2a4');
},{tall:1});
