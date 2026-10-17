/* ---------- main loop ---------- */
let last=0,bootStarted=0,bootShieldReleased=false;
function frame(now){
 requestAnimationFrame(frame);if(!bootStarted)bootStarted=now;const dt=Math.min(.05,((now-last)/1000)||0);last=now;
 if(ovAnim)ovAnim(now/1000);
 if(state==='play'&&LV){
  LV.update(dt);hud(LV);
  if(typeof window.BloomMegaUI!=='undefined'&&G){
   BloomMegaUI.updateHUD({
    hp:G.hp,maxHp:G.maxHp,
    stamina:LV.player?LV.player.stam:100,
    nancyHp:LV.daughter?LV.daughter.hp:100,
    nancyScared:LV.daughter&&LV.daughter.scared?1:0,
    infection:G.infect,
    camX:camX,camY:camY
   },dt);
  }
  if(helpShown>0&&helpShown<99){helpShown-=dt;if(helpShown<=0)$('help').style.opacity=0;}
 }
 if(LV&&(state==='play'||state==='pause'||state==='over')){
  LV.draw();
  if(typeof drawAtmosphereOverlay==='function')drawAtmosphereOverlay(now,dt);
  if(typeof window.BloomMegaUI!=='undefined'){
   setScreen();
   BloomMegaUI.renderOverlay(dt,cx);
  }
 }
 else if(!ovAnim){
  setScreen();cx.fillStyle='#03070a';cx.fillRect(0,0,W,H);
  if(typeof drawAtmosphereOverlay==='function')drawAtmosphereOverlay(now,dt);
  if(typeof window.BloomMegaUI!=='undefined'&&(state==='intro'||state==='shop'||state==='chapters')){
   setScreen();
   BloomMegaUI.renderOverlay(dt,cx);
  }
 }
 // Keep the boot shield over the canvas until the actual menu image has been drawn.
 // This prevents the procedural fallback/old canvas state flashing during asset loading.
 if(!bootShieldReleased){
  const isMob=Boolean(window.IS_MOBILE);
  const menuImage=typeof getSceneImg==='function'?getSceneImg('menu'):null;
  if(isMob||(menuImage&&(menuImage.loaded||menuImage.failed))||now-bootStarted>400){
   bootShieldReleased=true;const shield=$('boot-shield');if(shield)shield.classList.add('boot-ready');
  }
 }
 for(const k in hit)hit[k]=false;mouse.click=false;
}
function boot(){
 resize();makeTextures();makeGrain();applyTheme();
 if(typeof window.BloomMegaUI!=='undefined'){
  BloomMegaUI.init({
   quality:window.IS_MOBILE?'low':((typeof S!=='undefined'&&S.gfx)||'high'),
   reducedMotion:!!(typeof S!=='undefined'&&S.reducedMotion)
  });
 }
 const cmd=new URLSearchParams(window.location.search).get('cmd');
 if(window.IS_MOBILE){
  if(typeof BloomCharacterShowcase!=='undefined')BloomCharacterShowcase.open(true);
 }else if(cmd==='chapters')showChapters();else if(cmd==='characters')showCharacters();else if(cmd==='settings')showSettings();else showMenu();
 requestAnimationFrame(frame);
}
boot();
