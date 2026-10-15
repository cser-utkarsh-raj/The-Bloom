/* THE BLOOM — cinematic treatment for existing chapter scenes.
   Uses the game's current scene canvas and intro flow; no video or gameplay replacement. */
(function(){
 'use strict';
 if(typeof showOv!=='function'||window.__bloomCinematicsInstalled)return;
 window.__bloomCinematicsInstalled=true;
 const css=[
  '#ov.bloom-cinematic{isolation:isolate;background:rgba(0,0,0,.12)!important;}',
  '#ov.bloom-cinematic #oc{z-index:0;filter:brightness(.78) contrast(1.12) saturate(.82);}',
  '#ov.bloom-cinematic .bloom-cine-overlay{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.56;',
  'background:radial-gradient(ellipse at 50% 48%,rgba(0,0,0,0) 22%,rgba(0,0,0,.46) 100%),',
  'repeating-linear-gradient(to bottom,rgba(255,255,255,.022) 0,rgba(255,255,255,.022) 1px,transparent 1px,transparent 4px);}',
  '#ov.bloom-cinematic .bloom-cine-overlay:after{content:"";position:absolute;inset:-20%;',
  'background:linear-gradient(112deg,transparent 35%,rgba(128,255,200,.055) 48%,transparent 61%);',
  'animation:bloomCineLeak 11s ease-in-out infinite alternate;}',
  '#ov.bloom-cinematic:before,#ov.bloom-cinematic:after{content:"";position:absolute;left:0;right:0;height:clamp(18px,4.6vh,54px);',
  'background:#020303;z-index:5;pointer-events:none;box-shadow:0 0 24px rgba(0,0,0,.5);}',
  '#ov.bloom-cinematic:before{top:0;}#ov.bloom-cinematic:after{bottom:0;}',
  '#ov.bloom-cinematic #pn{position:relative;z-index:3;text-shadow:0 2px 12px rgba(0,0,0,.85);}',
  '#ov.bloom-cinematic #pn .ttl{text-shadow:0 2px 0 #090b0b,0 0 28px rgba(110,255,190,.16);}',
  '#ov.bloom-cinematic #pn .btn{box-shadow:0 0 0 1px rgba(160,255,205,.16),0 8px 28px rgba(0,0,0,.42);}',
  '#ov.bloom-cinematic[data-chapter="2"] .bloom-cine-overlay{background:radial-gradient(ellipse at 50% 48%,rgba(110,20,55,.04) 18%,rgba(70,8,34,.32) 100%),repeating-linear-gradient(to bottom,rgba(255,220,230,.022) 0,rgba(255,220,230,.022) 1px,transparent 1px,transparent 4px);}',
  '#ov.bloom-cinematic[data-chapter="5"] .bloom-cine-overlay:after{background:linear-gradient(112deg,transparent 32%,rgba(255,105,66,.09) 48%,transparent 63%);}',
  '@keyframes bloomCineLeak{from{transform:translateX(-2%) translateY(0);opacity:.35;}to{transform:translateX(2%) translateY(1%);opacity:1;}}',
  '@media(prefers-reduced-motion:reduce){#ov.bloom-cinematic .bloom-cine-overlay:after{animation:none;}}',
  '#ov.bloom-cinematic.bloom-cinematic-still .bloom-cine-overlay:after{animation:none;}'
 ].join('');
 const style=document.createElement('style');style.id='bloom-cinematics-style';style.textContent=css;document.head.appendChild(style);
 function setCinematic(on){
  const ov=$('ov'),pn=$('pn');if(!ov||!pn)return;
  let texture=ov.querySelector('.bloom-cine-overlay');
  if(on){
   if(!texture){texture=document.createElement('div');texture.className='bloom-cine-overlay';texture.setAttribute('aria-hidden','true');ov.insertBefore(texture,pn);}
   ov.classList.add('bloom-cinematic');
   ov.dataset.chapter=String((typeof introIdx==='number'?introIdx:0)+1);
   const reduced=!!S.reducedMotion||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
   ov.classList.toggle('bloom-cinematic-still',reduced);
  }else{
   ov.classList.remove('bloom-cinematic','bloom-cinematic-still');
   delete ov.dataset.chapter;
  }
 }
 const baseShowOv=showOv;
 showOv=function(){
  const result=baseShowOv.apply(this,arguments);
  setCinematic(state==='intro');
  return result;
 };
})();
