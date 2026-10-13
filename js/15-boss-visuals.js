/* Maya / Bloom-Wife — human silhouette first, infection second.
   The existing Enemy AI continues to control her movement and attacks. */
function drawBloomWife(e){
 if(!e||e.dead)return;
 const phase=Math.max(1,Math.min(3,e.phase||1)),fl=e.hurtT>0,sc=e.sc||1.4;
 const pulse=.5+.5*Math.sin((typeof T==='number'?T:0)*(phase===1?2.1:phase===2?3.8:5.2));
 const glow=phase===3?'#ff3656':phase===2?'#ff7a42':'#c45bdb';
 shadow(e.x,e.y,.72*sc,.4);groundEll(e.x,e.y,.95+phase*.12,'rgba(34,5,42,.35)',glow,.3,2);haloRing(e.x,e.y,glow);light(e.x,e.y,.7,phase===3?4:3,.3,glow);
 human(e.x,e.y,{f:e.f,ph:(e.ph||0)+Math.sin(T*2)*.08,sc:sc*1.04,z:Math.sin(T*3)*.025,
   sh:fl?'#ffffff':(phase===3?'#48232c':'#4a304f'),ar:fl?'#ffffff':(phase===3?'#6d343b':'#a98ca9'),
   pn:fl?'#ffffff':'#241d2c',sk:fl?'#ffffff':'#bca0ad',hr:fl?'#ffffff':'#17111d',
   dress:1,hair2:1,arms:'fwd',up:e.wind>0||e.bs==='scream',glow:glow,eye:glow});
 for(let i=0;i<4;i++){const a=i*1.7+(T||0)*.22;glowDot(e.x+Math.cos(a)*.24*sc,e.y+Math.sin(a)*.2*sc,1.28*sc,6+pulse*3,i%2?'#78ff91':glow,.3+pulse*.25);}
 if(e.bs==='charge')for(let i=1;i<=3;i++)groundEll(e.x-Math.cos(e.f)*i*.35,e.y-Math.sin(e.f)*i*.35,.35,null,glow,.22,2);
 if(e.bs==='stun'){cx.fillStyle='#ffd34d';cx.font='bold 16px "Cinzel",monospace';cx.textAlign='center';cx.fillText('✦ ✦ ✦',isx(e.x,e.y),isy(e.x,e.y,2.9));}
}