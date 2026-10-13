/* ---------- main loop ---------- */
let last=0;
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min(.05,((now-last)/1000)||0);last=now;
 if(ovAnim)ovAnim(now/1000);
 if(state==='play'&&LV){LV.update(dt);hud(LV);if(helpShown>0&&helpShown<99){helpShown-=dt;if(helpShown<=0)$('help').style.opacity=0;}}
 if(LV&&(state==='play'||state==='pause'||state==='over'))LV.draw();
 else if(!ovAnim){setScreen();cx.fillStyle='#03070a';cx.fillRect(0,0,W,H);}
 for(const k in hit)hit[k]=false;mouse.click=false;
}
function boot(){resize();makeTextures();makeGrain();applyTheme();const cmd=new URLSearchParams(window.location.search).get('cmd');if(cmd==='chapters')showChapters();else if(cmd==='settings')showSettings();else showMenu();requestAnimationFrame(frame);}
boot();
