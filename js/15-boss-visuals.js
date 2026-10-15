/* Maya / Bloom-Wife — keep a readable human silhouette; infection is secondary.
   Visual-only: Enemy.update/updBoss still owns movement, AI, attacks and hitboxes. */
function drawBloomWife(e){
 if(!e||e.dead)return;
 const phase=Math.max(1,Math.min(3,e.phase||1)),fl=e.hurtT>0,sc=e.sc||1.4;
 const t=typeof T==='number'?T:0;
 const pulse=.5+.5*Math.sin(t*(phase===1?2.1:phase===2?3.8:5.2));
 const glow=phase===3?'#ff3656':phase===2?'#ff7a42':'#c45bdb';
 const moving=e.bs==='charge'?1.75:e.bs==='walk'?1.05:e.bs==='aim'?.12:e.bs==='stun'?.2:.55;
 // updBoss only advances e.ph during the charge. Drive the render-only gait from T
 // as well, so Maya's legs and arms visibly move while walking/chasing.
 const gaitPhase=t*(e.bs==='charge'?12.5:e.bs==='walk'?6.4:e.bs==='aim'?1.1:2.0)+(e.ph||0);
 shadow(e.x,e.y,.72*sc,.4);
 groundEll(e.x,e.y,.95+phase*.12,'rgba(34,5,42,.35)',glow,.3,2);
 haloRing(e.x,e.y,glow);
 light(e.x,e.y,.7,phase===3?4:3,.3,glow);
 human(e.x,e.y,{
  f:e.f,ph:gaitPhase,gait:moving,bob:e.bs==='stun'?.22:1,
  armSwing:e.bs==='charge'?1.8:1.2,sc:sc*1.04,
  z:e.bs==='charge'?Math.abs(Math.sin(gaitPhase))*.035:0,
  sh:fl?'#ffffff':(phase===3?'#48232c':'#4a304f'),
  ar:fl?'#ffffff':(phase===3?'#6d343b':'#a98ca9'),
  pn:fl?'#ffffff':'#241d2c',sk:fl?'#ffffff':'#bca0ad',
  hr:fl?'#ffffff':'#17111d',dress:1,hair2:1,arms:'loose',
  up:e.wind>0||e.bs==='scream',glow:glow,eye:glow
 });
 // Small, bounded spore motes communicate infection without replacing her silhouette.
 for(let i=0;i<3;i++){
  const a=i*2.1+t*(.32+i*.07);
  glowDot(e.x+Math.cos(a)*.28*sc,e.y+Math.sin(a)*.22*sc,1.22*sc+Math.sin(t*2+i)*.06,5+pulse*2,i===1?'#78ff91':glow,.22+pulse*.18);
 }
 if(e.bs==='charge')for(let i=1;i<=3;i++)groundEll(e.x-Math.cos(e.f)*i*.35,e.y-Math.sin(e.f)*i*.35,.35,null,glow,.22,2);
 if(e.bs==='stun'){cx.fillStyle='#ffd34d';cx.font='bold 16px "Cinzel",monospace';cx.textAlign='center';cx.fillText('✦ ✦ ✦',isx(e.x,e.y),isy(e.x,e.y,2.9));}
}
