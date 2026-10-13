/* =============================================================================
   09-enhancements.js  —  THE BLOOM enhancement patch
   -----------------------------------------------------------------------------
   LOAD ORDER (classic scripts, no modules):
        01-core.js … 07-*.js   (all globals / classes / BUILD[] exist)
        09-enhancements.js     <-- this file
        08-main.js             (frame loop + boot())
   Everything here wraps existing globals; every hook is optional and fails
   soft (a missing global or a thrown error just disables that one feature).
   Uses only existing globals: Level, Player, Daughter, Enemy, LV, G, S, SFX,
   cx, cv, W, H, Z, CX, CY, camX, camY, isx, isy, w2s, setWorld, setScreen,
   box, fr, poly, human, glowDot, groundEll, shadow, def, PD, tile, TEX, MMC,
   BUILD, light, LIGHTS, say, banner, shake, tone, nz, AC, MG, NB, state ...
   ========================================================================== */
(function () {
'use strict';

/* ------------------------------ tiny utils ------------------------------ */
const GL = typeof globalThis !== 'undefined' ? globalThis : window;
const warned = {};
function warn(tag, e) { if (warned[tag]) return; warned[tag] = 1; try { console.warn('[BLOOM+]', tag, (e && e.message) || e); } catch (_) {} }
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const rr = (a, b) => a + Math.random() * (b - a);
const pk = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
function wrapProto(cls, name, make) {
  try {
    if (typeof cls !== 'function' || !cls.prototype || typeof cls.prototype[name] !== 'function') return false;
    cls.prototype[name] = make(cls.prototype[name]); return true;
  } catch (e) { warn('wrap:' + name, e); return false; }
}
function wrapGlobal(name, make) {
  try { const o = GL[name]; if (typeof o !== 'function') return false; GL[name] = make(o); return true; }
  catch (e) { warn('wrapG:' + name, e); return false; }
}
const GQ = () => ({ low: .25, medium: .65, high: 1 })[S.gfx] || 1;
const sup = {};
function supports(mode) {
  if (mode in sup) return sup[mode];
  try { const o = cx.globalCompositeOperation; cx.globalCompositeOperation = mode; sup[mode] = cx.globalCompositeOperation === mode; cx.globalCompositeOperation = o; }
  catch (e) { sup[mode] = false; }
  return sup[mode];
}
function blend(mode, col) {
  if (!supports(mode)) return;
  cx.globalCompositeOperation = mode; cx.fillStyle = col; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over';
}

/* ------------------------------- state ---------------------------------- */
const E = {
  lv: null, t: 0, hitStop: 0, ts: 1, tsHold: 0, prev: [],
  lead: { x: 0, y: 0 }, kick: { x: 0, y: 0 }, zoom: 1, punch: 0, intro: 0, cine: 0, cineZoom: 1, bars: 1, barsT: 0,
  shock: 0, sdx: 1, sdy: 0, sflash: null,
  fx: [], rings: [], flashes: [], echoes: [], figs: [], veins: null,
  bub: null, cd: {}, dlgT: 1.5, idleT: 0, humT: 30, hintPick: null, hintT: 0,
  hallT: 7, dip: 0, blk: 0, blkT: 8, blkLeft: 0, evT: {}, stepPh: 0, heartT: 0, heartPulse: 0, breathT: 0,
  lightningPrev: 0, growlT: 0, fxAcc: 0, smokeT: 0,
  amb: [], lp: null, bus: false,
  bossAwoke: false, bossPhase: 1, bossDead: false, bl: null, blx: null
};

/* =============================== 1. AUDIO =============================== */
const ac = () => typeof AC !== 'undefined' && !!AC && typeof MG !== 'undefined' && !!MG && typeof NB !== 'undefined' && !!NB;
function panOf(x, y) { try { return cl((w2s(x, y, 0)[0] - W / 2) / (W / 2), -1, 1) * .85; } catch (e) { return 0; } }
function attn(x, y) { try { const p = LV.player; return cl(1.2 - Math.hypot(x - p.x, y - p.y) / 24, .04, 1); } catch (e) { return 1; } }
function outp(node, pan) {
  if (pan && AC.createStereoPanner) { const sp = AC.createStereoPanner(); sp.pan.value = pan; node.connect(sp); sp.connect(MG); } else node.connect(MG);
}
function sw(f0, f1, dur, type, v, pan) {
  if (!ac() || v <= .002) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(Math.max(20, f0), t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); outp(g, pan); o.start(t); o.stop(t + dur + .03);
}
function nsw(f0, f1, dur, v, q, pan, type) {
  if (!ac() || v <= .002) return;
  const t = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NB; s.loop = true; f.type = type || 'bandpass'; f.Q.value = q || 1;
  f.frequency.setValueAtTime(Math.max(30, f0), t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); outp(g, pan); s.start(t, Math.random() * .4, dur + .02);
}
function duck(freq, dur) {
  try { if (!E.lp) return; const t = AC.currentTime; E.lp.frequency.cancelScheduledValues(t); E.lp.frequency.setValueAtTime(freq, t); E.lp.frequency.linearRampToValueAtTime(18000, t + dur); } catch (e) {}
}
function setupAudioBus() {
  if (E.bus || !ac()) return;
  try {
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.Q.value = .5;
    const dry = AC.createGain(), conv = AC.createConvolver(), wet = AC.createGain();
    const rate = AC.sampleRate, len = Math.floor(rate * 1.9), ir = AC.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.7); }
    conv.buffer = ir; wet.gain.value = .2;
    MG.disconnect(); MG.connect(lp); lp.connect(dry); dry.connect(AC.destination); lp.connect(conv); conv.connect(wet); wet.connect(AC.destination);
    E.lp = lp; E.bus = true;
    if (E.lv) startAmbienceFor(E.lv);
  } catch (e) { try { MG.connect(AC.destination); } catch (_) {} warn('bus', e); }
}
function stopAmb() {
  if (!ac()) { E.amb = []; return; }
  const now = AC.currentTime;
  for (const n of E.amb) { try { n.g.gain.cancelScheduledValues(now); n.g.gain.setTargetAtTime(0, now, .2); const s = n.s; setTimeout(() => { try { s.stop(); } catch (e) {} }, 900); } catch (e) {} }
  E.amb = [];
}
function startAmbienceFor(lv) {
  if (!ac() || !lv) return;
  stopAmb();
  const id = lv.id;
  const noiseLoop = (type, f, q, base) => { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = NB; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(MG); s.start(); E.amb.push({ s, g, base }); };
  const oscLoop = (type, f, base) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = 0; o.connect(g); g.connect(MG); o.start(); E.amb.push({ s: o, g, base }); };
  noiseLoop('lowpass', id === 4 ? 700 : 420, .6, id === 4 ? .03 : .018);
  if (lv.rain) noiseLoop('bandpass', 3800, .7, .045);
  if (id === 0) oscLoop('sine', 55, .012);
  if (id === 1) { oscLoop('sine', 37, .03); oscLoop('triangle', 39.5, .02); }
  if (id === 3) { oscLoop('sawtooth', 100, .006); oscLoop('sine', 120, .01); }
  if (id === 4) { oscLoop('sine', 46, .025); noiseLoop('bandpass', 1800, 2, .012); }
  updateAmbLevel();
}
function updateAmbLevel() {
  if (!ac()) return;
  const st = typeof state !== 'undefined' ? state : 'play', lvl = st === 'play' ? 1 : st === 'pause' ? .3 : 0, now = AC.currentTime;
  for (const n of E.amb) { try { n.g.gain.setTargetAtTime(n.base * lvl, now, .35); } catch (e) {} }
}
function extendSFX() {
  if (typeof SFX === 'undefined') return;
  const add = (name, fn) => {
    const o = SFX[name];
    SFX[name] = function () { try { if (typeof o === 'function') o.apply(this, arguments); } catch (e) {} try { fn.apply(this, arguments); } catch (e) { warn('sfx:' + name, e); } };
  };
  add('swing', () => { nsw(500, 2600, .14, .07, 1.2); sw(220, 90, .12, 'triangle', .03); });
  add('hit', () => { sw(160, 50, .18, 'sine', .16); nsw(2400, 500, .09, .1, .8); sw(900, 300, .06, 'square', .03); });
  add('hurt', () => { sw(70, 40, .3, 'sine', .2); nsw(900, 200, .2, .07, .7); duck(900, .5); E.heartPulse = 1; });
  add('kill', () => { nsw(1200, 150, .28, .08, .6); sw(90, 45, .25, 'sine', .09); });
  add('heal', () => { sw(660, 990, .35, 'sine', .05); sw(880, 1320, .35, 'triangle', .03); });
  add('pick', () => { sw(1200, 1800, .18, 'sine', .04); });
  add('boom', () => { sw(70, 28, 1.1, 'sine', .35); nsw(900, 80, .95, .25, .5); duck(500, 1.5); });
  add('roar', () => { sw(95, 48, 1.0, 'sawtooth', .07); sw(190, 80, .9, 'square', .035); nsw(700, 200, .85, .05, 2); });
  add('shell', () => { sw(1800, 300, .9, 'sine', .04); nsw(3000, 500, .9, .04, 3); });
  add('shot', () => { nsw(3200, 400, .18, .12, .6); sw(260, 60, .2, 'square', .05); });
  SFX.spot = (x, y) => { const v = attn(x, y), p = panOf(x, y); sw(150, 70, .5, 'sawtooth', .06 * v, p); nsw(900, 300, .4, .04 * v, 2, p); };
  SFX.windup = (x, y) => { const v = attn(x, y); sw(180, 340, .28, 'sawtooth', .035 * v, panOf(x, y)); };
  SFX.thunder = () => { nsw(500, 50, 1.0, .16, .4); sw(52, 24, 1.8, 'sine', .22); duck(700, 1.2); };
  SFX.heart = (v) => { v = v || .12; sw(64, 40, .15, 'sine', v); setTimeout(() => sw(54, 38, .14, 'sine', v * .7), 130); };
  SFX.whisper = () => { const p = rr(-.8, .8); nsw(1900, 1000, .9, .035, 7, p); setTimeout(() => nsw(2300, 1200, .7, .025, 8, -p), 260); };
  SFX.groan = () => { sw(110, 55, 1.4, 'sawtooth', .03); nsw(300, 120, 1.0, .03, 2); };
  SFX.knock = () => { for (let i = 0; i < 3; i++) setTimeout(() => sw(130, 70, .09, 'square', .05, rr(-.7, .7)), i * 210); };
  SFX.rumble = () => { sw(58, 30, 1.6, 'sine', .09); nsw(260, 60, 1.2, .06, .5); };
  SFX.crackle = () => { for (let i = 0; i < 6; i++) setTimeout(() => nsw(rr(2000, 5000), 1500, .04, .03, 2), i * rr(20, 80)); };
  SFX.siren = (v) => { v = v || .014; sw(420, 640, 2.2, 'sine', v); setTimeout(() => sw(640, 420, 2.2, 'sine', v), 2200); };
  SFX.scream = () => { const p = rr(-.9, .9); sw(700, 1500, .7, 'sawtooth', .014, p); sw(900, 400, .9, 'sine', .012, p); };
  SFX.stun = () => { sw(300, 90, .4, 'square', .06); };
  SFX.hum = () => { const n = [392, 440, 523, 587, 659]; let t = 0; for (let i = 0; i < 6; i++) { const f = pk(n); setTimeout(() => sw(f, f * 1.01, .55, 'sine', .022), t); t += 520; } };
  const STEP = { wood: [900, 350, .03], dark: [900, 350, .03], tile: [2000, 900, .028], lino: [2000, 900, .028], grass: [1200, 500, .016], carpet: [500, 250, .012], road: [1500, 700, .024], walk: [1500, 700, .024], waste: [1100, 450, .022], plaza: [1700, 800, .026], park: [1200, 500, .016], conc: [1500, 650, .024] };
  SFX.step = (mat, loud) => { const s = STEP[mat] || STEP.road; nsw(s[0], s[1], .07, s[2] * (loud ? 1.7 : 1), 1); };
}

/* =========================== 2. PARTICLES / FX ========================== */
function mk(t, x, y, z, vx, vy, vz, life, r, col, g, extra) {
  if (E.fx.length > 460) return null;
  const o = { t, x, y, z, vx, vy, vz, life, max: life, r, col, g: !!g }; if (extra) Object.assign(o, extra); E.fx.push(o); return o;
}
function sparks(x, y, ang, n) {
  for (let i = 0; i < n; i++) {
    const a = ang + rr(-.9, .9), sp = rr(3, 8);
    mk('spark', x, y, rr(.5, 1.3), Math.cos(a) * sp, Math.sin(a) * sp, rr(1, 4), rr(.2, .45), rr(1, 2.2), pk(['#fff6c0', '#ffd070', '#ffffff']), true);
  }
}
function kickCam(dx, dy, amt) {
  const ix = dx - dy, iy = (dx + dy) * .5, m = Math.hypot(ix, iy) || 1;
  E.kick.x += ix / m * amt; E.kick.y += iy / m * amt;
  const mm = Math.hypot(E.kick.x, E.kick.y); if (mm > 22) { E.kick.x *= 22 / mm; E.kick.y *= 22 / mm; }
}
function updFX(d) {
  for (let i = E.fx.length - 1; i >= 0; i--) {
    const p = E.fx[i]; p.life -= d;
    if (p.life <= 0) { E.fx.splice(i, 1); continue; }
    p.x += p.vx * d; p.y += p.vy * d; p.z += p.vz * d;
    if (p.g) { p.vz -= 9 * d; if (p.z < 0) { p.z = 0; p.vz *= -.25; p.vx *= .6; p.vy *= .6; } }
    else if (p.t === 'smoke') { p.vx *= .98; p.vy *= .98; }
  }
  for (let i = E.rings.length - 1; i >= 0; i--) { const r = E.rings[i]; r.t += d; if (r.t >= r.life) E.rings.splice(i, 1); }
  for (let i = E.flashes.length - 1; i >= 0; i--) { const f = E.flashes[i]; f.t += d; if (f.t >= f.life) E.flashes.splice(i, 1); }
  for (let i = E.echoes.length - 1; i >= 0; i--) {
    const e = E.echoes[i]; e.t += d;
    try { const p = E.lv.player; if (Math.hypot(e.x - p.x, e.y - p.y) < 3.2) e.t = Math.max(e.t, e.life - .35); } catch (_) {}
    if (e.t >= e.life) E.echoes.splice(i, 1);
  }
  for (let i = E.figs.length - 1; i >= 0; i--) { const f = E.figs[i]; f.t -= d; if (f.t <= 0) E.figs.splice(i, 1); }
}
function ambientFX(lv, d) {
  if (!S.particles) return;
  const gq = GQ(), p = lv.player, id = lv.id;
  const rate = ({ 0: 9, 1: 16, 2: 22, 3: 8, 4: 22 })[id] || 8;
  E.fxAcc += d * rate * gq;
  let n = Math.min(6, E.fxAcc | 0); E.fxAcc -= n;
  while (n-- > 0) {
    const a = rr(0, TAU), r = rr(2, 15), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (x < 0 || y < 0 || x > lv.w || y > lv.h) continue;
    if (id === 0) mk('mote', x, y, rr(.2, 2.4), rr(-.1, .1), rr(-.1, .1), rr(.02, .1), rr(3, 6), rr(.8, 1.6), '#ffd9a0', false);
    else if (id === 3) mk('mote', x, y, rr(.2, 2.4), rr(-.1, .1), rr(-.1, .1), rr(.0, .06), rr(3, 6), rr(.8, 1.6), '#d8eaff', false);
    else if (id === 1) mk('spore', x, y, rr(.1, 1.8), rr(-.2, .2), rr(-.2, .2), rr(.1, .35), rr(3, 5), rr(1.2, 2.4), pk(['#7affd8', '#c78bff']), false);
    else if (id === 2) { const row = lv.floor[y | 0]; if (row && (row[x | 0] === 'road' || row[x | 0] === 'walk' || row[x | 0] === 'dashY' || row[x | 0] === 'dashX')) mk('splash', x, y, 0, 0, 0, 0, rr(.35, .55), rr(.25, .45), '#cfe6ff', false); }
    else if (id === 4) { if (Math.random() < .7) mk('ember', x, y, rr(.1, 1.2), rr(-.3, .3), rr(-.3, .3), rr(.5, 1.4), rr(1.4, 2.8), rr(1.2, 2.2), pk(['#ff9a30', '#ffcf5a', '#ff6a20']), false); else mk('mote', x, y, rr(.5, 2.8), rr(-.1, .4), rr(-.1, .1), rr(-.2, .0), rr(3, 5), rr(1, 1.8), '#bdb3a8', false); }
  }
  for (const dc of lv.decals) {
    if (dc.t !== 'bloom' || Math.hypot(dc.x - p.x, dc.y - p.y) > 16) continue;
    if (Math.random() < d * 6 * gq) { const a = rr(0, TAU), r = rr(0, dc.r * .9); mk('spore', dc.x + Math.cos(a) * r, dc.y + Math.sin(a) * r, .1, rr(-.1, .1), rr(-.1, .1), rr(.3, .8), rr(1.8, 3.2), rr(1.5, 3), '#7affd8', false); }
  }
  E.smokeT -= d;
  if (E.smokeT <= 0) {
    E.smokeT = .28;
    for (const q of lv.props) {
      if (!(q.smoke || q.fire)) continue;
      if (Math.abs(q.cx - p.x) > 20 || Math.abs(q.cy - p.y) > 20) continue;
      mk('smoke', q.cx + rr(-.2, .2), q.cy + rr(-.2, .2), 1.0, rr(-.1, .2), rr(-.1, .2), rr(.5, .9), rr(1.6, 2.4), rr(.5, .9), q.fire ? '#2a2420' : '#3a3632', false);
      if (q.fire && Math.random() < .5) mk('ember', q.cx, q.cy, 1.1, rr(-.4, .4), rr(-.4, .4), rr(1, 2), rr(.8, 1.6), rr(1, 1.8), '#ff9a30', false);
    }
  }
}
function drawFX() {
  const hw = W / 2 / Z + 70, hh = H / 2 / Z + 100; let mode = 'source-over';
  const setMode = m => { if (m !== mode) { cx.globalCompositeOperation = m; mode = m; } };
  for (const p of E.fx) {
    const sx = isx(p.x, p.y), sy = isy(p.x, p.y, p.z);
    if (Math.abs(sx - CX) > hw || Math.abs(sy - CY) > hh) continue;
    const k = p.life / p.max;
    switch (p.t) {
      case 'spark': { setMode('lighter'); cx.globalAlpha = Math.min(1, k * 1.5); cx.strokeStyle = p.col; cx.lineWidth = p.r; const tx = isx(p.x - p.vx * .05, p.y - p.vy * .05), ty = isy(p.x - p.vx * .05, p.y - p.vy * .05, p.z - p.vz * .05); cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(tx, ty); cx.stroke(); break; }
      case 'chunk': { setMode('source-over'); cx.globalAlpha = Math.min(1, k * 2); cx.fillStyle = p.col; cx.fillRect(sx - p.r / 2, sy - p.r / 2, p.r, p.r); break; }
      case 'mote': { setMode('lighter'); cx.globalAlpha = .28 * Math.sin(Math.PI * (1 - k)); cx.fillStyle = p.col; cx.beginPath(); cx.arc(sx, sy, p.r, 0, TAU); cx.fill(); break; }
      case 'ember': { setMode('lighter'); cx.globalAlpha = k * .9; cx.fillStyle = p.col; cx.beginPath(); cx.arc(sx, sy, p.r * (.5 + k * .5), 0, TAU); cx.fill(); cx.globalAlpha = k * .22; cx.beginPath(); cx.arc(sx, sy, p.r * 3, 0, TAU); cx.fill(); break; }
      case 'spore': { setMode('lighter'); cx.globalAlpha = .55 * Math.sin(Math.PI * (1 - k)); cx.fillStyle = p.col; cx.beginPath(); cx.arc(sx, sy, p.r, 0, TAU); cx.fill(); cx.globalAlpha *= .4; cx.beginPath(); cx.arc(sx, sy, p.r * 3, 0, TAU); cx.fill(); break; }
      case 'splash': { setMode('source-over'); cx.globalAlpha = k * .45; cx.strokeStyle = p.col; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(sx, sy, (1 - k) * p.r * 45, (1 - k) * p.r * 22, 0, 0, TAU); cx.stroke(); break; }
      case 'smoke': { setMode('source-over'); cx.globalAlpha = k * .2; cx.fillStyle = p.col; cx.beginPath(); cx.arc(sx, sy, p.r * (1.2 + (1 - k) * 2.6), 0, TAU); cx.fill(); break; }
      case 'ghost': { setMode('lighter'); cx.globalAlpha = k * .35; cx.fillStyle = p.col; cx.beginPath(); cx.ellipse(sx, sy, p.r * 30, p.r * 40, 0, 0, TAU); cx.fill(); break; }
    }
  }
  setMode('source-over'); cx.globalAlpha = 1;
}
function wedge(x, y, a, spread, r, col, alpha, stroke) {
  cx.beginPath(); cx.moveTo(isx(x, y), isy(x, y));
  for (let i = 0; i <= 10; i++) { const aa = a - spread + spread * 2 * i / 10, px = x + Math.cos(aa) * r, py = y + Math.sin(aa) * r; cx.lineTo(isx(px, py), isy(px, py)); }
  cx.closePath(); cx.globalAlpha = alpha; cx.fillStyle = col; cx.fill();
  if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 2; cx.globalAlpha = Math.min(1, alpha * 3); cx.stroke(); }
  cx.globalAlpha = 1;
}
function deathFX(lv, e) {
  e._cx = true;
  const col = e.shirt || '#6b4a3a';
  for (let i = 0; i < 11; i++) mk('chunk', e.x, e.y, rr(.4, 1.1), rr(-3, 3), rr(-3, 3), rr(1.5, 4.5), rr(.6, 1.1), rr(2, 4), pk([col, '#8a9a7a', '#8a1010', '#3a0a0a']), true);
  lv.stain(e.x, e.y, 1.1, '#300808'); lv.stain(e.x + rr(-.3, .3), e.y + rr(-.3, .3), .8, '#451010');
  E.rings.push({ x: e.x, y: e.y, r0: .2, r1: 1.4, t: 0, life: .35, col: '#ffffff', lw: 2 });
  E.flashes.push({ x: e.x, y: e.y, z: .8, r: 3.5, i: .5, life: .12, t: 0, c: '#ffcc88' });
}

/* =========================== 3. WORLD-SPACE PASS ======================== */
function worldPass(lv) {
  setWorld();
  const p = lv.player, gq = GQ();
  // streetlight shafts
  if (gq >= .6) {
    cx.globalCompositeOperation = 'lighter';
    for (const q of lv.props) {
      if (q.k !== 'slight') continue;
      if (Math.abs(q.cx - p.x) > 18 || Math.abs(q.cy - p.y) > 18) continue;
      const hx0 = isx(q.cx, q.cy), hy0 = isy(q.cx, q.cy, 3.2), gy = isy(q.cx, q.cy, 0);
      const g = cx.createLinearGradient(0, hy0, 0, gy + 10); g.addColorStop(0, 'rgba(255,225,160,.20)'); g.addColorStop(1, 'rgba(255,225,160,0)');
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(hx0 - 5, hy0); cx.lineTo(hx0 + 5, hy0); cx.lineTo(hx0 + 74, gy + 10); cx.lineTo(hx0 - 74, gy + 10); cx.closePath(); cx.fill();
    }
    cx.globalCompositeOperation = 'source-over';
  }
  // enemy telegraphs
  for (const e of lv.enemies) {
    if (e.dead || Math.abs(e.x - p.x) > 16 || Math.abs(e.y - p.y) > 16) continue;
    if (e.type === 'bloated' && e.dying) {
      const k = 1 - clampF(e.fuse / .95); const pu = .5 + .5 * Math.sin(T * 30);
      groundEll(e.x, e.y, 2.9, rgba('#ff3a20', .06 + .2 * k * pu), '#ff6a40', .85, 2);
    } else if (e.type === 'boss') {
      if (e.wind > 0) wedge(e.x, e.y, e.f, 1.0, 2.5, '#ff3a6a', .2 + .2 * (1 - e.wind / .5), '#ff6a8a');
      if (e.bs === 'charge') mk('ghost', e.x, e.y, .9, 0, 0, 0, .28, 1, '#a060ff', false);
    } else if (e.wind > 0) {
      const prog = 1 - e.wind / (e.windT || .35);
      wedge(e.x, e.y, e.f, .72, (e.r || .3) + e.reach + .75, '#ff3030', .1 + .24 * prog, '#ff5a5a');
    } else if (e.type === 'stalker' && e.state === 'chase' && e.lungeCd < .45 && e.lungeCd > 0) {
      const a = e.f; cx.strokeStyle = 'rgba(255,80,80,.35)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(isx(e.x, e.y), isy(e.x, e.y)); cx.lineTo(isx(e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4), isy(e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4)); cx.stroke();
    }
  }
  for (const r of E.rings) { const k = r.t / r.life; groundEll(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, null, r.col, (1 - k) * .85, r.lw || 2); }
  // melee slash glow
  if (p.swT > 0) {
    const k = 1 - p.swT / .2, a0 = p.swA - 1.15, sweep = 2.3 * Math.min(1, k + .15);
    cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .5 * (1 - k * .6);
    cx.beginPath();
    for (let i = 0; i <= 12; i++) { const a = a0 + sweep * i / 12, x = p.x + Math.cos(a) * 2.15, y = p.y + Math.sin(a) * 2.15; i ? cx.lineTo(isx(x, y), isy(x, y, .7)) : cx.moveTo(isx(x, y), isy(x, y, .7)); }
    for (let i = 12; i >= 0; i--) { const a = a0 + sweep * i / 12, x = p.x + Math.cos(a) * 1.0, y = p.y + Math.sin(a) * 1.0; cx.lineTo(isx(x, y), isy(x, y, .7)); }
    cx.closePath(); cx.fillStyle = '#cfe9ff'; cx.fill(); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  // memory echoes
  for (const e of E.echoes) {
    const k = Math.sin(Math.PI * cl(e.t / e.life, 0, 1)); cx.globalAlpha = .26 * k;
    if (e.kind === 'anaya') human(e.x, e.y, { f: e.f, sc: .74, sh: '#e8c23a', ar: '#e8c23a', dress: 1, pn: '#f0c8a0', sk: '#f0c8a0', hr: '#5a3418', hair2: 1, glow: '#9affea', ph: 0 });
    else human(e.x, e.y, { f: e.f, sc: 1.2, sh: '#43324f', ar: '#d3c8d0', dress: 1, pn: '#2a1f33', sk: '#d9ced6', hr: '#15101b', hair2: 1, arms: 'down', glow: '#9affea', ph: 0 });
    cx.globalAlpha = 1;
  }
  drawFX();
}
function clampF(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function addLights(lv) {
  const p = lv.player, a = lv.daughter, mul = cl(1 - E.blk * .9 - E.dip, .05, 1);
  for (const L of LIGHTS) { if (L.x === p.x && L.y === p.y) { L.i *= cl(1 - E.blk * .5 - E.dip * .3, .3, 1); continue; } if (Math.abs(L.x - p.x - Math.cos(p.f) * 3) < .01) continue; L.i *= mul; }
  const fx = Math.cos(p.f), fy = Math.sin(p.f), fl = 1 - (G.infect > 60 ? Math.random() * .12 : 0);
  light(p.x + fx * 5.8, p.y + fy * 5.8, .7, 3.6, .38 * fl); light(p.x + fx * 8, p.y + fy * 8, .6, 2.6, .2 * fl);
  if (a && !a.carried) light(a.x, a.y, 1.0, 2.8 + a.scared * .6, .26 + a.scared * .16 * (.6 + .4 * Math.sin(E.t * 18)), '#ffd89a');
  for (const f of E.flashes) { const k = f.t / f.life; light(f.x, f.y, f.z, f.r * (1 - k * .3), f.i * (1 - k), f.c); }
  for (const n of lv.npcs) if (n.kind === 'cop' && n.fx > 0) light(n.x, n.y, 1.2, 4, .9, '#ffe070');
  for (const t of lv.tele) if (t.t === 'shell') light(t.x, t.y, .3, t.r * 1.3, .3 * (t.age / t.max), '#ff5a30');
}

/* ============================= 4. CAMERA / CINE ========================= */
function camTick(lv, dt) {
  const p = lv.player; if (!p) return;
  const mv = !p.still;
  let k = (mv ? 2.6 : .9) * (p.sprint ? 1.5 : 1) * (p.carry ? .7 : 1), lx = Math.cos(p.f) * k, ly = Math.sin(p.f) * k;
  const b = lv.boss;
  if (b && b.awake && !b.dead) { const dx = b.x - p.x, dy = b.y - p.y, dd = Math.hypot(dx, dy) || 1, w = Math.min(1, dd / 10) * .3; lx += dx * w * .5; ly += dy * w * .5; }
  let sx = (lx - ly) * 32, sy = (lx + ly) * 16; const m = Math.hypot(sx, sy), lim = 130; if (m > lim) { sx *= lim / m; sy *= lim / m; }
  const a = Math.min(1, dt * 2.4); E.lead.x += (sx - E.lead.x) * a; E.lead.y += (sy - E.lead.y) * a;
  const dk = Math.exp(-dt * 11); E.kick.x *= dk; E.kick.y *= dk;
  let zt = 1; if (p.sprint) zt = .965; if (b && b.awake && !b.dead) zt = .94; if (E.intro > 0) zt = 1 + E.intro * .12;
  if (lv.over === 'win') zt = 1.1; if (E.cine > 0) zt = E.cineZoom; if (G.hp < 30) zt += .012 * Math.sin(E.t * 3);
  E.zoom += (zt - E.zoom) * Math.min(1, dt * 3.2); E.punch *= Math.exp(-dt * 9);
  E.barsT = (E.cine > 0 || lv.over) ? 1 : 0; E.bars += (E.barsT - E.bars) * Math.min(1, dt * 2.2);
}

/* ============================ 5. ANAYA BEHAVIOUR ======================== */
const L_DANGER = ['"Dad, look out!"', '"Behind you, Dad!"', '"They\'re coming from the dark!"', '"Daddy, watch out!"'];
const L_HURT = ['"Dad, you\'re bleeding... please be careful..."', '"Daddy, don\'t push yourself too hard..."'];
const L_CARRY = ['"Hold onto me tight, Dad..."', '"I\'ve got you, Daddy. Just keep moving."'];
const L_LOOK = ['"Dad, look over there by the crates..."', '"I think someone dropped supplies here, Dad!"'];
const L_IDLE = ['"Is Mom really gone, Dad? Be honest with me..."', '"The air smells like rotting salt and iron..."', '"How much further to the evacuation point?"', '"I don\'t want to turn into one of those monsters, Daddy..."', '"Will we ever be able to go back home?"'];
function bubble(txt, cat, gap, dur) {
  if (E.cd[cat] > E.t) return; if (E.bub && E.bub.t > 0 && cat !== 'danger' && cat !== 'hurt2') return;
  E.bub = { txt, t: dur || 3, max: dur || 3 }; E.cd[cat] = E.t + (gap || 20);
}
function anayaTick(lv, d, dt) {
  const a = lv.daughter, p = lv.player; if (!a || !p) return;
  if (E.bub) E.bub.t -= dt;
  const mvd = Math.hypot(a.x - (a._px == null ? a.x : a._px), a.y - (a._py == null ? a.y : a._py)); a._px = a.x; a._py = a.y;
  let near = null, nd = 1e9;
  for (const e of lv.enemies) { if (e.dead) continue; const dd = Math.hypot(e.x - a.x, e.y - a.y); if (dd < nd && (e.state === 'chase' || e.state === 'alert')) { nd = dd; near = e; } }
  if (!a.carried) {
    if (mvd < .002) {
      let tx = null, ty = null;
      if (near && nd < 12) { tx = near.x; ty = near.y; } else if (E.hintPick) { tx = E.hintPick.x; ty = E.hintPick.y; } else { tx = p.x + Math.cos(p.f) * 2; ty = p.y + Math.sin(p.f) * 2; }
      const ang = Math.atan2(ty - a.y, tx - a.x); a.f += ((ang - a.f + Math.PI * 3) % TAU - Math.PI) * Math.min(1, d * 3);
    }
    if (a.scared > .6 && near && nd < 7) {
      const dx = p.x - near.x, dy = p.y - near.y, dd = Math.hypot(dx, dy) || 1, bxp = p.x + dx / dd * 1.0, byp = p.y + dy / dd * 1.0, ex = bxp - a.x, ey = byp - a.y, el = Math.hypot(ex, ey);
      if (el > .15) lv.moveEnt(a, ex / el * 1.7 * d, ey / el * 1.7 * d);
    }
  }
  if (a.hp > (a._hp == null ? a.hp : a._hp) + 1) bubble('"Thank you, Dad... the bandage helps."', 'heal', 8, 2.4);
  a._hp = a.hp;
  if (a.trust < 30 && a._tl !== 1) { a._tl = 1; bubble('"Baba… don\'t leave me."', 'trust', 30, 3); } else if (a.trust > 60) a._tl = 0;
  E.dlgT -= dt;
  if (E.dlgT <= 0) {
    E.dlgT = .5;
    if (near && nd < 7 && !a.carried) bubble(pk(L_DANGER), 'danger', 9, 1.8);
    if (G.hp < 35) bubble(pk(L_HURT), 'hurt', 25, 2.6);
    if (G.infect > 75) bubble('"Baba, you\'re scaring me…"', 'inf2', 40, 3); else if (G.infect > 50) bubble('"Baba… your eyes look strange."', 'inf1', 40, 3);
    if (a.carried) bubble(pk(L_CARRY), 'carry', 30, 2.4);
    for (const dc of lv.decals) if (dc.t === 'bloom' && Math.hypot(dc.x - a.x, dc.y - a.y) < dc.r + 2.5) { bubble('"It\'s glowing… don\'t touch it, Baba."', 'glow', 35, 3); break; }
    if (!E.hintPick || E.hintPick.got) { E.hintPick = null; if (E.cd.look == null || E.cd.look < E.t) for (const k of lv.pick) if (!k.got && Math.hypot(k.x - a.x, k.y - a.y) < 9) { E.hintPick = k; E.hintT = 6; bubble(pk(L_LOOK), 'look', 28, 2.4); break; } }
    else { E.hintT -= .5; if (E.hintT <= 0) E.hintPick = null; }
    if (p.still && !near) E.idleT += .5; else E.idleT = 0;
    if (E.idleT > 8) { E.idleT = 0; bubble(L_IDLE[Math.min(lv.id, L_IDLE.length - 1)], 'idle', 45, 3.2); }
    E.humT -= .5;
    if (E.humT <= 0) { E.humT = rr(45, 80); if (!near && a.trust > 55 && ac()) { SFX.hum(); } }
  }
}

/* ============================ 6. HORROR / INFECTION ===================== */
const WHISPERS = ['"...David... why did you leave me on the shore...?"', '"...David... come into the water... it doesn\'t hurt anymore..."', '"...Do you hear the spores singing in the surf...?"', '"...She has your eyes, David... bring our daughter to me..."', '"...It\'s so peaceful down in the deep... let go..."'];
function genVeins() {
  let s = 4177; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; E.veins = [];
  for (let i = 0; i < 16; i++) {
    const side = i % 4; let x = side === 0 ? r() : side === 1 ? 1 : side === 2 ? r() : 0, y = side === 0 ? 0 : side === 1 ? r() : side === 2 ? 1 : r();
    const line = [[x, y]]; let a = Math.atan2(.5 - y, .5 - x);
    for (let k = 0; k < 7; k++) { a += (r() - .5) * 1.1; x += Math.cos(a) * .035; y += Math.sin(a) * .045; line.push([x, y]); }
    E.veins.push(line);
  }
}
function hallTick(lv, d) {
  const inf = G.infect || 0; E.dip = Math.max(0, E.dip - d * 2);
  if (inf < 30) return;
  E.hallT -= d;
  if (E.hallT > 0) return;
  E.hallT = rr(7, 14) * (1 - cl((inf - 30) / 100, 0, .55));
  const tier = inf > 70 ? 3 : inf > 50 ? 2 : 1, ev = Math.floor(Math.random() * (tier + 2));
  if (ev === 0) E.figs.push({ x: Math.random() < .5 ? .05 : .95, y: rr(.5, .7), t: 1.5, life: 1.5, s: rr(.9, 1.2) });
  else if (ev === 1) { SFX.whisper && SFX.whisper(); say(pk(WHISPERS), 1900, '#9be8ff'); }
  else if (ev === 2) E.dip = .45;
  else if (ev === 3 && lv.id !== 1) {
    const p = lv.player, a = p.f + rr(-.8, .8), r = rr(6, 9), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (!lv.hitSolid(x, y, .4)) E.echoes.push({ x, y, f: Math.atan2(p.y - y, p.x - x), t: 0, life: rr(3, 4.5), kind: (inf > 70 && Math.random() < .5) ? 'anaya' : 'maya' });
  } else if (ev >= 4) { for (let i = 0; i < 3; i++) setTimeout(() => SFX.step && SFX.step('road', false), i * 260); E.shock = Math.max(E.shock, .5); }
}

/* =========================== 7. PER-CHAPTER LAYER ======================= */
const CHAP = [
  { grade: 'rgba(255,160,80,.08)', fog: 'rgba(150,120,100,' },
  { grade: 'rgba(130,50,170,.11)', fog: 'rgba(110,70,140,' },
  { grade: 'rgba(70,120,180,.10)', fog: 'rgba(110,140,170,' },
  { grade: 'rgba(70,180,170,.09)', fog: 'rgba(90,150,150,' },
  { grade: 'rgba(255,100,40,.10)', fog: 'rgba(150,100,80,' }];
function chapterTick(lv, d) {
  const id = lv.id, ev = (k, lo, hi, fn) => { if (E.evT[k] == null) E.evT[k] = rr(lo * .5, hi); E.evT[k] -= d; if (E.evT[k] <= 0) { E.evT[k] = rr(lo, hi); try { fn(); } catch (e) {} } };
  if (id === 0) { ev('siren', 35, 60, () => SFX.siren()); ev('scream', 22, 40, () => SFX.scream()); }
  else if (id === 1) {
    ev('wh', 9, 16, () => SFX.whisper()); ev('gr', 20, 35, () => SFX.groan());
    E.blkT -= d;
    if (E.blkT <= 0) { E.blkT = rr(6, 13); E.blkLeft = rr(.25, .8); SFX.groan && SFX.groan(); }
    if (E.blkLeft > 0) { E.blkLeft -= d; E.blk = (Math.floor(E.blkLeft * 18) % 2) ? .9 : .35; if (E.blkLeft <= 0) E.blk = 0; } else E.blk = 0;
  } else if (id === 2) ev('gr', 25, 45, () => SFX.groan());
  else if (id === 3) { ev('pa', 14, 30, () => SFX.crackle()); ev('kn', 18, 35, () => SFX.knock()); ev('surge', 20, 40, () => { E.evT.surgeA = .12; E.dip = .5; }); if (E.evT.surgeA > 0) E.evT.surgeA -= d; }
  else if (id === 4) { ev('rb', 5, 10, () => { SFX.rumble(); shake && shake(3); }); ev('si', 40, 70, () => SFX.siren(.02)); }
  const lg = lv.lightning || 0;
  if (lg >= .99 && E.lightningPrev < .99) { setTimeout(() => { if (E.lv === lv) { SFX.thunder(); const a = lv.daughter; if (a) { a.scared = 1; bubble('"That shook the ground... was that thunder or an airstrike?"', 'thunder', 30, 2.4); } } }, rr(350, 1400)); E.sflash = { a: .12, c: '200,220,255' }; }
  E.lightningPrev = lg;
}

/* ============================== 8. LATE SCREEN PASS ===================== */
function lateFX(lv) {
  setScreen();
  const id = lv.id, t = E.t, inf = G.infect || 0, gq = GQ();
  if (S.gfx !== 'low') {
    if (CHAP[id]) blend('overlay', CHAP[id].grade);
    if (inf > 25) { const k = cl((inf - 25) / 130, 0, .5); blend('saturation', 'rgba(128,128,128,' + k + ')'); blend('overlay', 'rgba(30,200,170,' + (k * .18) + ')'); }
    if (G.hp < 35) blend('overlay', 'rgba(180,20,20,' + (.12 * (.5 + .5 * Math.sin(t * 4))) + ')');
  }
  if (gq >= .6 && CHAP[id]) {
    const f = CHAP[id].fog, n = gq >= 1 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const par = .12 + i * .05, span = W + 600, bxp = ((((i * 397 - CX * par * .6 + t * 8 * (i % 2 ? 1 : -1)) % span) + span) % span) - 300;
      const byp = H * (.25 + (i * .137 % .6)) + Math.sin(t * .25 + i) * 26 - CY * .04 * i, rx = 300 + i * 40, ry = 110 + i * 14;
      cx.save(); cx.translate(bxp, byp); cx.scale(1, ry / rx);
      const g = cx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, f + (.06 + .02 * Math.sin(t * .4 + i)) + ')'); g.addColorStop(1, f + '0)');
      cx.fillStyle = g; cx.fillRect(-rx, -rx, rx * 2, rx * 2); cx.restore();
    }
  }
  // chapter lights
  if (id === 0) {
    const ph = Math.sin(t * 5.2), a = .07 * Math.max(0, ph), b = .07 * Math.max(0, -ph);
    cx.globalCompositeOperation = 'lighter';
    let g = cx.createLinearGradient(0, H, W * .45, H * .55); g.addColorStop(0, 'rgba(255,40,50,' + a + ')'); g.addColorStop(1, 'rgba(255,40,50,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    g = cx.createLinearGradient(W, 0, W * .55, H * .45); g.addColorStop(0, 'rgba(60,110,255,' + b + ')'); g.addColorStop(1, 'rgba(60,110,255,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = 'source-over';
  } else if (id === 1) {
    const b = .09 + .06 * Math.sin(t * 2.1), g = cx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .9);
    g.addColorStop(0, 'rgba(120,20,160,0)'); g.addColorStop(1, 'rgba(120,20,160,' + b + ')'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    if (E.blk > .01) { cx.fillStyle = 'rgba(0,0,0,' + (E.blk * .55) + ')'; cx.fillRect(0, 0, W, H); }
  } else if (id === 3) {
    cx.fillStyle = 'rgba(200,230,255,.018)'; for (let i = 0; i < 3; i++) cx.fillRect(0, (t * 60 + i * H / 3) % H, W, 26);
    if (E.evT.surgeA > 0) { cx.fillStyle = 'rgba(255,255,255,' + E.evT.surgeA + ')'; cx.fillRect(0, 0, W, H); }
  } else if (id === 4) {
    cx.globalCompositeOperation = 'lighter';
    let g = cx.createLinearGradient(0, H, 0, H * .45); g.addColorStop(0, 'rgba(255,120,40,' + (.06 + .04 * Math.random()) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    g = cx.createLinearGradient(0, 0, 0, H * .4); g.addColorStop(0, 'rgba(255,60,30,' + (.03 + .02 * Math.sin(t * 1.7)) + ')'); g.addColorStop(1, 'rgba(255,60,30,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = 'source-over';
  }
  // infection overlays
  if (inf > 45) {
    if (!E.veins) genVeins();
    const k = cl((inf - 45) / 55, 0, 1) * (.6 + .4 * Math.sin(t * 2.2));
    cx.strokeStyle = 'rgba(90,255,215,' + (k * .32) + ')'; cx.lineWidth = 1.6;
    for (const v of E.veins) { cx.beginPath(); for (let i = 0; i < v.length; i++) { const px = v[i][0] * W, py = v[i][1] * H; i ? cx.lineTo(px, py) : cx.moveTo(px, py); } cx.stroke(); }
  }
  for (const f of E.figs) {
    const k = Math.sin(Math.PI * cl(1 - f.t / f.life, 0, 1)), x = f.x * W, y = H * f.y, s = 70 * f.s;
    cx.globalAlpha = .6 * k; cx.fillStyle = '#000'; cx.beginPath(); cx.ellipse(x, y + s * .6, s * .32, s * .9, 0, 0, TAU); cx.fill(); cx.beginPath(); cx.arc(x, y - s * .5, s * .22, 0, TAU); cx.fill();
    cx.fillStyle = '#ff4a4a'; cx.globalAlpha = .9 * k; cx.fillRect(x - s * .1, y - s * .55, 3, 3); cx.fillRect(x + s * .06, y - s * .55, 3, 3); cx.globalAlpha = 1;
  }
  // bloom
  if (S.gfx === 'high') {
    try {
      const bw = Math.max(8, W >> 3), bh = Math.max(8, H >> 3);
      if (!E.bl) { E.bl = document.createElement('canvas'); E.blx = E.bl.getContext('2d'); }
      if (E.bl.width !== bw || E.bl.height !== bh) { E.bl.width = bw; E.bl.height = bh; }
      const hasF = 'filter' in E.blx; E.blx.setTransform(1, 0, 0, 1, 0, 0);
      if (hasF) E.blx.filter = 'brightness(.8) contrast(1.7) saturate(1.2)';
      E.blx.clearRect(0, 0, bw, bh); E.blx.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, bw, bh);
      if (hasF) E.blx.filter = 'none';
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = hasF ? .3 : .09; cx.drawImage(E.bl, 0, 0, bw, bh, 0, 0, W, H); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    } catch (e) { warn('bloom', e); }
  }
  // hit shock ghosting
  if (E.shock > .03 && S.gfx !== 'low') {
    const o = E.shock * 6; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = E.shock * .12;
    cx.drawImage(cv, 0, 0, cv.width, cv.height, E.sdx * o, E.sdy * o, W, H); cx.drawImage(cv, 0, 0, cv.width, cv.height, -E.sdx * o, -E.sdy * o, W, H);
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  if (E.heartPulse > .02 && G.hp < 40) { const g = cx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .85); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, 'rgba(160,0,0,' + (E.heartPulse * .22) + ')'); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
  // off-screen danger arrows
  const p = lv.player; let cnt = 0;
  for (const e of lv.enemies) {
    if (cnt > 5 || e.dead || e.state !== 'chase' || Math.hypot(e.x - p.x, e.y - p.y) > 16) continue;
    const s = w2s(e.x, e.y, 1); if (s[0] > 20 && s[0] < W - 20 && s[1] > 20 && s[1] < H - 20) continue;
    const dx = s[0] - W / 2, dy = s[1] - H / 2, m = Math.max(Math.abs(dx) / (W / 2 - 34), Math.abs(dy) / (H / 2 - 34)), x = W / 2 + dx / m, y = H / 2 + dy / m, a = Math.atan2(dy, dx);
    cx.save(); cx.translate(x, y); cx.rotate(a); cx.globalAlpha = .55; cx.fillStyle = '#ff4a4a'; cx.beginPath(); cx.moveTo(10, 0); cx.lineTo(-7, 7); cx.lineTo(-7, -7); cx.closePath(); cx.fill(); cx.restore(); cx.globalAlpha = 1; cnt++;
  }
  // Anaya speech bubble + pick-up hint
  const a = lv.daughter;
  if (E.hintPick && !E.hintPick.got) { const s = w2s(E.hintPick.x, E.hintPick.y, 1.5 + .2 * Math.sin(t * 5)); cx.fillStyle = THEMES[S.theme].acc; cx.beginPath(); cx.moveTo(s[0], s[1] + 8); cx.lineTo(s[0] - 7, s[1] - 4); cx.lineTo(s[0] + 7, s[1] - 4); cx.closePath(); cx.fill(); }
  if (E.bub && E.bub.t > 0 && a) {
    const s = w2s(a.x, a.y, 2.3), k = cl(Math.min(E.bub.t, E.bub.max - E.bub.t) * 4, 0, 1);
    cx.font = '15px "Special Elite","Courier New",serif'; cx.textAlign = 'center';
    const tw = cx.measureText(E.bub.txt).width, pw = tw + 24, ph = 30, x = s[0] - pw / 2, y = s[1] - ph - 10 - (1 - k) * 6;
    cx.globalAlpha = k; cx.fillStyle = 'rgba(8,14,12,.84)'; cx.strokeStyle = 'rgba(255,211,77,.7)'; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(x + 8, y); cx.lineTo(x + pw - 8, y); cx.quadraticCurveTo(x + pw, y, x + pw, y + 8); cx.lineTo(x + pw, y + ph - 8); cx.quadraticCurveTo(x + pw, y + ph, x + pw - 8, y + ph);
    cx.lineTo(s[0] + 6, y + ph); cx.lineTo(s[0], y + ph + 8); cx.lineTo(s[0] - 6, y + ph); cx.lineTo(x + 8, y + ph); cx.quadraticCurveTo(x, y + ph, x, y + ph - 8); cx.lineTo(x, y + 8); cx.quadraticCurveTo(x, y, x + 8, y); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle = '#ffe9a8'; cx.fillText(E.bub.txt, s[0], y + 20); cx.globalAlpha = 1;
  }
  if (E.sflash && E.sflash.a > .01) { cx.fillStyle = 'rgba(' + E.sflash.c + ',' + E.sflash.a + ')'; cx.fillRect(0, 0, W, H); E.sflash.a *= .86; }
  if (E.bars > .01) { const h = E.bars * H * .11; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, h); cx.fillRect(0, H - h, W, h); }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
}

/* ============================ 9. BOSS RE-DESIGN ========================= */
function drawBoss(e) {
  if (typeof drawBloomWife === 'function') { drawBloomWife(e); return; }
  const fl = e.hurtT > 0, rage = e.phase > 1, pu = .5 + .5 * Math.sin(T * 3), sc = 1.38;
  const fx = Math.cos(e.f), fy = Math.sin(e.f), px = -fy, py = fx, front = fx + fy > -.2;
  shadow(e.x, e.y, .85, .4);
  glowDot(e.x, e.y, .3, 44 + 8 * pu, rage ? '#6a2fa8' : '#2a7a7a', .1);
  human(e.x, e.y, { f: e.f, ph: e.ph, sc, sh: '#43324f', ar: '#d3c8d0', pn: '#2a1f33', sk: '#d9ced6', hr: '#15101b', dress: 1, hair2: 1, arms: 'fwd', up: e.wind > 0 || e.bs === 'scream', fl, glow: rage ? '#b8fff0' : '#8fe8e0', eye: '#e8ffff' });
  if (!fl) {
    // soft hair draped over the shoulders (no spikes, no crown)
    if (front) for (const s of [-1, 1]) bx(e.x + px * .2 * sc * s + fx * .04, e.y + py * .2 * sc * s + fy * .04, .52 * sc, .09 * sc, .62 * sc, '#15101b');
    // fungal growth on one shoulder (the Bloom taking her), bigger when enraged
    const gh = rage ? 1.35 : 1;
    for (let i = 0; i < 4; i++) { const off = (i - 1.5) * .1 * sc, sx = e.x + px * .27 * sc + px * off, sy = e.y + py * .27 * sc + py * off, h = (.28 + (i % 2) * .16) * sc * gh; bx(sx, sy, 1.02 * sc, .07, h, i % 2 ? '#2f9a8c' : '#52d6b8'); glowDot(sx, sy, 1.02 * sc + h, 5, '#6affd8', .6 + .2 * pu); }
    if (!front) for (let i = 0; i < 3; i++) { const off = (i - 1) * .12 * sc; bx(e.x - fx * .17 * sc + px * off, e.y - fy * .17 * sc + py * off, .9 * sc, .07, .4 * sc * gh, '#2f9a8c'); glowDot(e.x - fx * .17 * sc + px * off, e.y - fy * .17 * sc + py * off, .9 * sc + .4 * sc * gh, 4, '#6affd8', .55); }
    if (front) {
      cx.strokeStyle = 'rgba(120,255,225,' + (.5 + .25 * pu) + ')'; cx.lineWidth = 1.4; const cxp = isx(e.x + fx * .1, e.y + fy * .1), cyp = isy(e.x + fx * .1, e.y + fy * .1, .95 * sc);
      for (let i = -1; i <= 1; i++) { cx.beginPath(); cx.moveTo(cxp + i * 6, cyp - 10); cx.lineTo(cxp + i * 6 + 3, cyp - 3); cx.lineTo(cxp + i * 6 - 2, cyp + 4); cx.lineTo(cxp + i * 6 + 2, cyp + 11); cx.stroke(); }
      for (const s of [-1, 1]) bx(e.x + fx * .15 + px * .06 * s * sc, e.y + fy * .15 + py * .06 * s * sc, 1.1 * sc, .03, .09, '#bfefff');
    }
  }
  if (rage) groundEll(e.x, e.y, 1.2 + .1 * pu, null, '#9affea', .25, 2);
  if (e.bs === 'stun') { cx.fillStyle = '#ffd34d'; cx.font = 'bold 16px monospace'; cx.textAlign = 'center'; cx.fillText('★ ★ ★', isx(e.x, e.y), isy(e.x, e.y, 2.9)); }
  if (e.wind > 0) { cx.globalAlpha = .8; cx.fillStyle = '#ff3030'; cx.font = 'bold 16px monospace'; cx.textAlign = 'center'; cx.fillText('!', isx(e.x, e.y), isy(e.x, e.y, 2.5)); cx.globalAlpha = 1; }
}

/* ======================= 10. NEW CITY CONTENT (assets) ================== */
function newTextures() {
  if (typeof tile !== 'function' || typeof TEX === 'undefined') return;
  const ln = (g, a, b, c, d, s, w) => { g.strokeStyle = s; g.lineWidth = w || 1; g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
  const road = ['#2c2d31', '#27282c'];
  const dash = dx => (g, r, v) => { if (v === 0) { g.strokeStyle = 'rgba(222,184,80,.85)'; g.lineWidth = 2.6; g.beginPath(); if (dx) { g.moveTo(22, 11.4); g.lineTo(44, 22.6); } else { g.moveTo(44, 11.4); g.lineTo(22, 22.6); } g.stroke(); } };
  tile('dashX', road, dash(true)); tile('dashY', road, dash(false));
  const zebra = alongX => (g) => {
    g.strokeStyle = 'rgba(225,225,215,.8)'; g.lineWidth = 3.2;
    for (const o of [-.3, 0, .3]) {
      g.beginPath();
      if (alongX) { g.moveTo(33 + (-.5 - o) * 32, 17 + (-.5 + o) * 16); g.lineTo(33 + (.5 - o) * 32, 17 + (.5 + o) * 16); }
      else { g.moveTo(33 + (o + .5) * 32, 17 + (o - .5) * 16); g.lineTo(33 + (o - .5) * 32, 17 + (o + .5) * 16); }
      g.stroke();
    }
  };
  tile('zebraX', road, zebra(true)); tile('zebraY', road, zebra(false));
  tile('plaza', ['#77726a', '#6d6860'], (g, r) => { g.strokeStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.moveTo(33, 3); g.lineTo(62, 17); g.lineTo(33, 31); g.lineTo(4, 17); g.closePath(); g.stroke(); ln(g, 20, 10, 46, 24, 'rgba(255,255,255,.05)'); });
  tile('park', ['#2f5a34', '#356239'], (g, r) => { for (let i = 0; i < 50; i++) { const x = r() * 66, y = r() * 34; g.strokeStyle = r() < .5 ? '#437a46' : '#244a2a'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 2, y - 2 - r() * 3); g.stroke(); } for (let i = 0; i < 3; i++) { g.fillStyle = pk(['#d8c860', '#c860a0', '#e8e8e0']); g.fillRect(r() * 60 + 3, r() * 28 + 3, 2, 2); } });
  tile('conc', ['#4a4b4d', '#434447'], (g, r) => { for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(r() * 60 + 3, r() * 28 + 3, 3 + r() * 4, 1.5 + r() * 2, 0, 0, TAU); g.fill(); } ln(g, 8 + r() * 20, 6, 30 + r() * 20, 28, 'rgba(0,0,0,.3)'); });
  if (typeof MMC !== 'undefined') Object.assign(MMC, { dashX: '#2c2e33', dashY: '#2c2e33', zebraX: '#3a3c40', zebraY: '#3a3c40', plaza: '#6e6a64', park: '#27472c', conc: '#4a4b4d' });
}
const WIN_WARM = ['#f0c070', '#e8b050', '#ffd890'], WIN_COOL = ['#9ad8ff', '#7ac0e8'];
function towerDraw(p) {
  const h = p.h || 9, c = p.col || '#3a3f4a', rn = seeded((((p.x * 131 + p.y * 71) | 0) || 7));
  box(p.x - .25, p.y - .25, 0, p.w + .5, p.d + .5, .9, mixc(c, .7)); box(p.x, p.y, .9, p.w, p.d, h - .9, c);
  const q = { x: p.x, y: p.y, w: p.w, d: p.d, f: 'x' }, rows = Math.max(2, Math.floor(h - 1.8)), st = (h - 2.4) / rows;
  for (let r = 0; r < rows; r++) { const z = 1.5 + r * st; fr(p, .07, .93, z, z + .5, '#0f1a22'); fr(q, .07, .93, z, z + .5, '#0b141b'); }
  for (let k = 0; k < 9; k++) { const r = Math.floor(rn() * rows), z = 1.5 + r * st + .06, u = .1 + rn() * .72, col = rn() < .72 ? WIN_WARM[Math.floor(rn() * 3)] : WIN_COOL[Math.floor(rn() * 2)]; fr(k % 2 ? p : q, u, u + .14, z, z + .38, col); }
  box(p.x + p.w * .18, p.y + p.d * .2, h, p.w * .34, p.d * .3, .7, '#272b31'); box(p.x + p.w * .6, p.y + p.d * .55, h, p.w * .22, p.d * .2, .4, '#2d3138');
  box(p.x + p.w * .8, p.y + p.d * .12, h, .1, .1, 1.6, '#444a52', true); glowDot(p.x + p.w * .8 + .05, p.y + p.d * .12 + .05, h + 1.6, 5, '#ff3030', .35 + .45 * Math.max(0, Math.sin(T * 3 + p.x)));
  if (p.inf) for (let i = 0; i < 5; i++) { const u = .1 + i * .17, hh = 2 + rn() * 4; fr(q, u, u + .06, .9, .9 + hh, '#2fd0a0'); fr(p, u + .05, u + .1, .9, .9 + hh * .7, '#27b08a'); glowDot(p.x + p.w, p.y + p.d * u, 1.3, 9, '#4affc8', .25); }
}
function newProps() {
  if (typeof def !== 'function' || typeof PD === 'undefined') return;
  def('tower', 6, 6, towerDraw, { tall: 1 });
  def('hospital', 12, 8, p => {
    const h = 5.5; box(p.x, p.y, 0, p.w, p.d, h, '#8c9296'); box(p.x - .3, p.y - .3, h, p.w + .6, p.d + .6, .3, '#5a5f63');
    const q = { x: p.x, y: p.y, w: p.w, d: p.d, f: 'x' };
    for (let r = 0; r < 4; r++) { const z = 1.6 + r * .95; fr(p, .04, .96, z, z + .55, '#1a2630'); fr(q, .04, .96, z, z + .55, '#141e26'); }
    fr(p, .42, .58, 0, 1.9, '#1a2630'); box(p.x + p.w * .38, p.y + p.d, 1.9, p.w * .24, 1.3, .12, '#c8c8c8');
    fr(p, .41, .59, 4.15, 5.1, '#f0f0f0'); fr(p, .43, .57, 4.5, 4.75, '#d02828'); fr(p, .48, .52, 4.2, 5.05, '#d02828');
    glowDot(p.cx, p.y + p.d, 4.6, 24, '#ff6a6a', .22 + .1 * Math.sin(T * 2));
  }, { tall: 1, lt: { r: 9, i: .8, c: '#ff6a6a', z: 3 } });
  def('shop', 6, 4, p => {
    const c = p.col || '#6a5a4a', h = 2.7; box(p.x, p.y, 0, p.w, p.d, h, c); fr(p, .06, .94, .15, 1.85, '#142330');
    for (let i = 1; i < 4; i++) fr(p, i * .25 - .008, i * .25 + .008, .15, 1.85, mixc(c, .7));
    fr(p, .1, .9, 2.0, 2.55, '#2a2218'); box(p.x - .1, p.y + p.d - .05, 1.95, p.w + .2, .9, .1, p.awn || '#a33a3a'); box(p.x - .2, p.y - .2, h, p.w + .4, p.d + .4, .25, mixc(c, .6));
    cx.font = 'bold 11px "Share Tech Mono",monospace'; cx.textAlign = 'center'; cx.fillStyle = '#ffeaa8'; cx.fillText(p.name || 'SHOP', isx(p.cx, p.y + p.d), isy(p.cx, p.y + p.d, 2.2));
    glowDot(p.cx, p.y + p.d + .2, 1.2, 26, '#ffcf7a', .12);
  }, { tall: 1, lt: { r: 5, i: .55, c: '#ffd58a', z: 1.5 } });
  def('bench', 1.4, .5, p => { box(p.x + .1, p.y + .1, 0, .1, .3, .35, '#3a3a3a', true); box(p.x + p.w - .2, p.y + .1, 0, .1, .3, .35, '#3a3a3a', true); box(p.x, p.y + .12, .35, p.w, .3, .08, '#7a5a34'); box(p.x, p.y, .43, p.w, .08, .4, '#6a4a2a'); });
  def('hydrant', .35, .35, p => { box(p.x + .05, p.y + .05, 0, .25, .25, .55, '#b03030'); box(p.x, p.y + .1, .3, .35, .15, .1, '#902020', true); });
  def('trash', .5, .5, p => { box(p.x + .05, p.y + .05, 0, .4, .4, .7, '#3b4a3b'); box(p.x, p.y, .7, .5, .5, .06, '#2a362a'); });
  def('container', 5, 2, p => {
    const c = p.col || '#8a3a2a'; box(p.x, p.y, 0, p.w, p.d, 2.3, c);
    const q = { x: p.x, y: p.y, w: p.w, d: p.d, f: 'x' }, n1 = Math.floor(p.w / .5), n2 = Math.floor(p.d / .5);
    for (let i = 0; i < n1; i++) fr(p, .04 + i * (.92 / n1), .04 + i * (.92 / n1) + .035, .1, 2.2, mixc(c, .8));
    for (let i = 0; i < n2; i++) fr(q, .04 + i * (.92 / n2), .04 + i * (.92 / n2) + .05, .1, 2.2, mixc(c, .8));
  }, { tall: 1 });
  def('billboard', 5, .5, p => {
    box(p.x + .4, p.y + .1, 0, .2, .3, 3.2, '#2a2d32', true); box(p.x + p.w - .6, p.y + .1, 0, .2, .3, 3.2, '#2a2d32', true);
    box(p.x, p.y, 3, p.w, .3, 2, '#1b1e24'); fr(p, .03, .97, 3.08, 4.92, p.bg || '#16313d');
    cx.font = 'bold 15px "Share Tech Mono",monospace'; cx.textAlign = 'center'; cx.fillStyle = '#bff4ff'; cx.fillText(p.msg || 'STAY INDOORS', isx(p.cx, p.y + p.d), isy(p.cx, p.y + p.d, 4.0));
    glowDot(p.cx, p.y + p.d, 4.0, 40, '#6ad8ff', .08);
  }, { tall: 1, lt: { r: 6, i: .5, c: '#6ad8ff', z: 3.8 } });
  def('fountain', 3, 3, p => {
    shadow(p.cx, p.cy, 1.8, .3); box(p.x, p.y, 0, 3, 3, .5, '#6a7078'); box(p.x + .2, p.y + .2, .45, 2.6, 2.6, .08, '#1a8f7a');
    box(p.cx - .3, p.cy - .3, .5, .6, .6, 1.1, '#7a8088'); box(p.cx - .7, p.cy - .7, 1.5, 1.4, 1.4, .15, '#868c94');
    glowDot(p.cx, p.cy, 1.9, 12 + 3 * Math.sin(T * 4), '#6affd8', .35);
  }, { lt: { r: 5, i: .5, c: '#4affd0', z: .8 } });
  def('tlight', .3, .3, p => { box(p.x + .1, p.y + .1, 0, .1, .1, 3, '#2c2f33', true); box(p.x, p.y, 2.7, .3, .3, .5, '#1a1c20'); const on = Math.floor(T * 1.2 + p.x) % 3; glowDot(p.cx, p.cy, 3.0, 5, on === 0 ? '#ff3030' : on === 1 ? '#ffb030' : '#30ff60', .8); });
  def('busstop', 3, .8, p => { box(p.x + .1, p.y + .1, 0, .1, .1, 2.4, '#3a3f44', true); box(p.x + p.w - .2, p.y + .1, 0, .1, .1, 2.4, '#3a3f44', true); box(p.x, p.y, 2.4, p.w, p.d, .1, '#2a2e32'); fr(p, .06, .94, .5, 2.2, 'rgba(120,170,200,.18)'); box(p.x + .3, p.y + .3, 0, p.w - .6, .35, .4, '#6a4a2a'); }, { tall: 1 });
  def('planter', 1.2, .5, p => { box(p.x, p.y, 0, p.w, p.d, .5, '#5a5248'); const sx = isx(p.cx, p.cy), sy = isy(p.cx, p.cy, .7); for (const [a, b, r] of [[-9, 2, 11], [9, 2, 11], [0, -5, 12]]) { cx.fillStyle = '#2f6a3a'; cx.beginPath(); cx.arc(sx + a, sy + b, r, 0, TAU); cx.fill(); } });
}
/* occlusion fade + cast shadows + lit windows on large props */
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  const up = []; for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function castShadow(p, h) {
  const L = Math.min(h, 9) * .5, sx = L * .9, sy = L * .55, c = [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.d], [p.x, p.y + p.d]], pts = [];
  for (const q of c) { pts.push([isx(q[0], q[1]), isy(q[0], q[1])]); pts.push([isx(q[0] + sx, q[1] + sy), isy(q[0] + sx, q[1] + sy)]); }
  const hl = hull(pts); cx.beginPath(); cx.moveTo(hl[0][0], hl[0][1]); for (let i = 1; i < hl.length; i++) cx.lineTo(hl[i][0], hl[i][1]); cx.closePath();
  const a0 = cx.globalAlpha; cx.globalAlpha = a0 * .22; cx.fillStyle = '#000'; cx.fill(); cx.globalAlpha = a0;
}
function occWrap(kind, hfn) {
  const d = typeof PD !== 'undefined' && PD[kind]; if (!d || typeof d.draw !== 'function' || d._occ) return; const o = d.draw; d._occ = true;
  d.draw = function (p) {
    const a0 = cx.globalAlpha; let fade = false;
    try {
      const pl = typeof LV !== 'undefined' && LV && LV.player;
      if (pl && p.cx + p.cy > pl.x + pl.y + .2) {
        const h = hfn(p), Lx = isx(p.x, p.y + p.d) - 18, Rx = isx(p.x + p.w, p.y) + 18, Tp = isy(p.x, p.y, h) - 18, B = isy(p.x + p.w, p.y + p.d, 0), sx = isx(pl.x, pl.y), sy = isy(pl.x, pl.y, 1);
        if (sx > Lx && sx < Rx && sy > Tp && sy < B) fade = true;
      }
      if (S.gfx !== 'low') castShadow(p, hfn(p));
    } catch (e) {}
    if (fade) cx.globalAlpha = Math.min(a0, .28);
    o.call(this, p);
    if (kind === 'house') {
      try { const n = Math.floor(p.w / 2), rn = seeded((((p.x * 53 + p.y * 29) | 0) || 5)); for (let i = 0; i < n; i++) if (rn() < .38) { const u = .1 + i * (.8 / n); fr(p, u, u + .12, 1.1, 2.0, '#e8b858'); glowDot(p.x + p.w * (u + .06), p.y + p.d, 1.5, 12, '#ffcf7a', .18); } } catch (e) {}
    }
    cx.globalAlpha = a0;
  };
}
function installProps() {
  occWrap('tower', p => p.h || 9); occWrap('hospital', () => 5.8); occWrap('ruin', p => p.h || 4); occWrap('house', p => (p.h || 3) + 1);
  occWrap('container', () => 2.3); occWrap('shop', () => 3); occWrap('bus', () => 1.5); occWrap('bunker', () => 3.8);
}

/* ===================== EXISTING-MAP VISUAL POLISH =======================
   The current level builders already own the world layout and map dimensions.
   Do not mutate BUILD[] / Level.floor / Level.w / Level.h here.
   Visual decoration is applied through existing render/property hooks only.
   ====================================================================== */
/* ============================== 12. HOOK INSTALL ======================== */
function installHooks() {
  if (typeof Level !== 'function') return;
  // ambient wanderers must not block "wave cleared" / reinforcement counters
  wrapProto(Level, 'alive', () => function () { let n = 0; for (const e of this.enemies) if (!e.dead && !e._amb) n++; return n; });

  wrapProto(Level, 'update', orig => function (dt) {
    let d = dt;
    try {
      if (E.lv !== this) newLevel(this);
      if (E.hitStop > 0) { E.hitStop -= dt; d = dt * .03; }
      else { if (E.tsHold > 0) E.tsHold -= dt; else E.ts += (1 - E.ts) * Math.min(1, dt * 3); d = dt * E.ts; }
      E.prev = this.enemies.slice();
    } catch (e) { warn('pre', e); d = dt; }
    const r = orig.call(this, d);
    try { afterUpdate(this, d, dt); } catch (e) { warn('after', e); }
    return r;
  });
  wrapProto(Level, 'draw', orig => function () {
    let ox = 0, oy = 0, z0 = null;
    try { ox = E.lead.x + E.kick.x; oy = E.lead.y + E.kick.y; camX += ox; camY += oy; z0 = S.zoom; S.zoom = z0 * E.zoom * (1 + E.punch); } catch (e) { ox = oy = 0; }
    try { return orig.apply(this, arguments); }
    finally { try { camX -= ox; camY -= oy; if (z0 !== null) S.zoom = z0; } catch (e) {} }
  });
  wrapProto(Level, 'post', orig => function () {
    if (this === E.lv) { try { worldPass(this); } catch (e) { warn('world', e); } try { addLights(this); } catch (e) { warn('lights', e); } }
    return orig.apply(this, arguments);
  });
  wrapGlobal('minimap', orig => function (lv) { try { if (lv === E.lv) lateFX(lv); } catch (e) { warn('late', e); } return orig.apply(this, arguments); });

  wrapProto(Level, 'explosion', orig => function (x, y, r, dmg) {
    const res = orig.apply(this, arguments);
    try {
      E.hitStop = Math.max(E.hitStop, .07); E.punch = Math.max(E.punch, .07); E.shock = 1; E.sflash = { a: .4, c: '255,200,140' };
      E.flashes.push({ x, y, z: .8, r: 9, i: 1, life: .4, t: 0, c: '#ffb060' });
      E.rings.push({ x, y, r0: .3, r1: r * 1.6, t: 0, life: .5, col: '#ffcf8a', lw: 4 }, { x, y, r0: .2, r1: r * 1.1, t: 0, life: .35, col: '#ffffff', lw: 2 });
      for (let i = 0; i < 16; i++) { const a = rr(0, TAU), sp = rr(3, 9); mk('spark', x, y, .5, Math.cos(a) * sp, Math.sin(a) * sp, rr(2, 6), rr(.3, .7), rr(1.2, 2.4), pk(['#ffd070', '#ff9a30', '#fff2b0']), true); }
      for (let i = 0; i < 8; i++) mk('smoke', x + rr(-.8, .8), y + rr(-.8, .8), .4, rr(-.3, .3), rr(-.3, .3), rr(.6, 1.2), rr(1.4, 2.4), rr(.7, 1.2), '#2e2a26', false);
      kickCam(Math.random() - .5, Math.random() - .5, 14);
      const a = this.daughter; if (a && Math.hypot(a.x - x, a.y - y) < 10) { a.scared = 1; bubble('"Baba!!"', 'boom', 8, 1.8); }
    } catch (e) { warn('expl', e); }
    return res;
  });
  wrapProto(Level, 'win', orig => function () { const first = !this.over; const r = orig.apply(this, arguments); try { if (first && this.over === 'win') E.sflash = { a: .12, c: '255,255,255' }; } catch (e) {} return r; });
  wrapProto(Level, 'fail', orig => function () {
    const first = !this.over; const r = orig.apply(this, arguments);
    try { if (first && this.over === 'lose') { E.ts = .28; E.tsHold = .7; E.shock = 1; E.sflash = { a: .3, c: '160,0,0' }; duck(500, 1.6); } } catch (e) {}
    return r;
  });

  wrapProto(Enemy, 'hurt', orig => function (d, ang, nokb) {
    const dead0 = this.dead || this.dying, hp0 = this.hp, lv = this.lv, r = orig.apply(this, arguments);
    try {
      if (!dead0 && lv === E.lv && hp0 - this.hp > 0) {
        const killed = this.dead || this.dying, boss = this.type === 'boss', a = ang || 0;
        if (!nokb) {
          E.hitStop = Math.max(E.hitStop, killed ? .085 : boss ? .06 : .05); E.punch = Math.max(E.punch, killed ? .05 : .028);
          kickCam(Math.cos(a), Math.sin(a), killed ? 14 : 8); E.shock = Math.max(E.shock, killed ? .55 : .3); E.sdx = Math.cos(a); E.sdy = Math.sin(a) * .5;
          sparks(this.x, this.y, a, killed ? 16 : 9); this._kick = 1; this._kdir = a;
          E.rings.push({ x: this.x, y: this.y, r0: .15, r1: killed ? 1.5 : .9, t: 0, life: .25, col: '#ffe9b0', lw: 2 });
          E.flashes.push({ x: this.x, y: this.y, z: .9, r: killed ? 4.5 : 3, i: killed ? .6 : .4, life: .1, t: 0, c: '#ffd9a0' });
        }
        if (boss && this.bs === 'stun') SFX.stun && SFX.stun();
      }
    } catch (e) { warn('hurt', e); }
    return r;
  });
  wrapProto(Player, 'hurt', orig => function (d, ang) {
    const hp0 = G.hp, r = orig.apply(this, arguments);
    try {
      if (hp0 - G.hp > 0 && this.lv === E.lv) { E.hitStop = Math.max(E.hitStop, .06); E.punch = Math.max(E.punch, .04); E.shock = Math.max(E.shock, .8); const a = ang || 0; E.sdx = Math.cos(a); E.sdy = Math.sin(a) * .5; kickCam(Math.cos(a), Math.sin(a), 12); E.sflash = { a: .18, c: '200,0,0' }; }
    } catch (e) { warn('phurt', e); }
    return r;
  });
  wrapProto(Player, 'attack', orig => function () {
    const r = orig.apply(this, arguments);
    try { if (this.swT > .1 && this.lv) { this.lv.moveEnt(this, Math.cos(this.f) * .28, Math.sin(this.f) * .28); kickCam(Math.cos(this.f), Math.sin(this.f), -3); } } catch (e) {}
    return r;
  });
  wrapProto(Daughter, 'hurt', orig => function () {
    const hp0 = this.hp, r = orig.apply(this, arguments);
    try { if (hp0 - this.hp > 0) { this.scared = 1; E.shock = Math.max(E.shock, .35); bubble(pk(['"Ow!"', '"Baba!!"']), 'hurt2', 4, 1.6); } } catch (e) {}
    return r;
  });

  wrapGlobal('drawEnemy', orig => function (e) {
    try { if (Math.abs(isx(e.x, e.y) - camX) > W / 2 / Z + 140 || Math.abs(isy(e.x, e.y) - camY) > H / 2 / Z + 200) return; } catch (_) {}
    if (e.type === 'boss') { try { if (typeof drawBloomWife === 'function') drawBloomWife(e); else drawBoss(e); return; } catch (err) { warn('boss', err); } }
    const k = e._kick > 0 ? e._kick : 0;
    if (k > 0) { const ox = Math.cos(e._kdir || 0) * k * .18, oy = Math.sin(e._kdir || 0) * k * .18; e.x += ox; e.y += oy; try { return orig(e); } finally { e.x -= ox; e.y -= oy; } }
    return orig(e);
  });
  wrapGlobal('drawPickup', orig => function (k, t) {
    try { if (Math.abs(isx(k.x, k.y) - camX) > W / 2 / Z + 100 || Math.abs(isy(k.x, k.y) - camY) > H / 2 / Z + 160) return; } catch (_) {}
    return orig(k, t);
  });
  wrapGlobal('audioInit', orig => function () { const had = ac(); orig.apply(this, arguments); if (!had && ac()) setupAudioBus(); });
}
function newLevel(lv) {
  E.lv = lv; E.t = 0; E.hitStop = 0; E.ts = 1; E.tsHold = 0; E.lead.x = E.lead.y = 0; E.kick.x = E.kick.y = 0; E.zoom = 1; E.punch = 0; E.intro = 1; E.cine = 0; E.bars = 1; E.barsT = 0;
  E.shock = 0; E.sflash = null; E.fx.length = 0; E.rings.length = 0; E.flashes.length = 0; E.echoes.length = 0; E.figs.length = 0; E.bub = null; E.cd = {}; E.dlgT = 1.5; E.idleT = 0; E.humT = rr(25, 50);
  E.hintPick = null; E.hallT = rr(5, 9); E.dip = 0; E.blk = 0; E.blkT = rr(6, 12); E.blkLeft = 0; E.evT = {}; E.stepPh = 0; E.heartT = 0; E.breathT = 0; E.lightningPrev = 0;
  E.bossAwoke = false; E.bossPhase = 1; E.bossDead = false; E.smokeT = 0; E.prev = [];
  startAmbienceFor(lv);
}
function afterUpdate(lv, d, dt) {
  const p = lv.player, a = lv.daughter; if (!p) return;
  E.t += dt; E.shock *= Math.exp(-dt * 7); E.heartPulse *= Math.exp(-dt * 4); E.growlT -= dt;
  if (E.intro > 0) E.intro = Math.max(0, E.intro - dt * .55);
  if (E.cine > 0) E.cine = Math.max(0, E.cine - dt);
  // enemy reactions (alert / spotted) + death effects
  for (const e of lv.enemies) {
    if (e.dead) continue;
    if (e._ps === undefined) { e._ps = e.state; e._kick = 0; e._cx = false; e._wp = false; }
    if (e._kick > 0) e._kick = Math.max(0, e._kick - d * 6);
    if (e._ps !== e.state) {
      const near = Math.hypot(e.x - p.x, e.y - p.y) < 16;
      if (near && e.state === 'chase') { lv.fl(e.x, e.y, '!', '#ff5a5a'); if (E.growlT <= 0) { E.growlT = .3; SFX.spot && SFX.spot(e.x, e.y); } }
      else if (near && e.state === 'alert' && e._ps === 'patrol') lv.fl(e.x, e.y, '?', '#ffd34d');
      e._ps = e.state;
    }
    if (e.wind > 0 && !e._wp) { e._wp = true; if (e.type !== 'boss' && Math.hypot(e.x - p.x, e.y - p.y) < 14) SFX.windup && SFX.windup(e.x, e.y); } else if (!(e.wind > 0)) e._wp = false;
  }
  for (const e of E.prev) if (e.dead && !e._cx) deathFX(lv, e);
  // boss cinematics
  const b = lv.boss;
  if (b) {
    if (b.awake && !E.bossAwoke) { E.bossAwoke = true; E.ts = .35; E.tsHold = .7; E.cine = 2.4; E.cineZoom = 1.12; E.sflash = { a: .3, c: '160,60,220' }; E.rings.push({ x: b.x, y: b.y, r0: .5, r1: 7, t: 0, life: .9, col: '#b080ff', lw: 4 }); shake && shake(10); }
    if (b.awake && b.phase !== E.bossPhase) { E.bossPhase = b.phase; E.punch = Math.max(E.punch, .07); E.sflash = { a: .22, c: '150,80,255' }; E.rings.push({ x: b.x, y: b.y, r0: .5, r1: 8, t: 0, life: .8, col: '#d68cff', lw: 4 }); }
    if (b.dead && !E.bossDead) { E.bossDead = true; E.ts = .25; E.tsHold = 1.1; E.cine = 2.2; E.cineZoom = 1.15; E.sflash = { a: .25, c: '255,255,255' }; E.rings.push({ x: b.x, y: b.y, r0: .3, r1: 9, t: 0, life: 1.2, col: '#9affea', lw: 3 }); }
  }
  camTick(lv, dt); updFX(d); ambientFX(lv, d); hallTick(lv, d); chapterTick(lv, d); anayaTick(lv, d, dt);
  // footsteps (surface-aware) + low-health heartbeat + exhausted breathing
  if (!p.still && p.dodT <= 0) {
    const ph = Math.floor(p.ph / Math.PI); if (ph !== E.stepPh) { E.stepPh = ph; try { const row = lv.floor[p.y | 0]; SFX.step && SFX.step(row && row[p.x | 0], p.sprint); } catch (e) {} }
  }
  const bpm = G.hp < 35 ? 70 + (1 - G.hp / 35) * 60 : (G.infect > 60 ? 62 : 0);
  if (bpm > 0 && lv.over !== 'win') { E.heartT -= dt; if (E.heartT <= 0) { E.heartT = 60 / bpm; E.heartPulse = 1; SFX.heart && SFX.heart(G.hp < 35 ? .14 : .07); } }
  if (p.exh) { E.breathT -= dt; if (E.breathT <= 0) { E.breathT = 1; nsw(900, 350, .4, .035, 1.5); } }
  // chapter 5: tension rises as the clock runs out
  if (lv.id === 4) { try { const m = /(\d+):(\d\d)/.exec(lv.objText()); if (m && (+m[1] * 60 + +m[2]) < 30 && Math.random() < dt * .6) shake && shake(2.5); } catch (e) {} }
}

/* ================================= BOOT ================================= */
function safe(fn, tag) { try { fn(); } catch (e) { warn(tag, e); } }
safe(newTextures, 'textures'); safe(newProps, 'props'); safe(installProps, 'occ'); safe(extendSFX, 'sfx'); safe(installHooks, 'hooks');
})();
