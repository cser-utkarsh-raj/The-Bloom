/* ============================================================
   THE BLOOM — EXPANDED WORLD / CITY GAMEPLAY PASS
   Ported from the supplied Claude enhancement source, but adapted
   to the current Level/BUILD architecture.

   This module INTENTIONALLY changes:
   - selected BUILD[] builders (L1/L3/L5)
   - selected level dimensions
   - Level.floor outside the original playable footprint
   - collision/pathfinding after world generation
   - ambient enemy population/spawning

   It DOES NOT replace the original objective logic, wave logic,
   boss logic, gate logic, or completion rules.
   Ambient enemies are marked _amb and are already excluded from
   Level.alive() by the current enhancement layer.
   ============================================================ */

(() => {
  if (typeof window !== 'undefined' && window.__BLOOM_CITY_GAMEPLAY_V1) return;
  if (typeof Level !== 'function' || typeof BUILD === 'undefined' || !Array.isArray(BUILD)) return;
  if (typeof PD === 'undefined') return;

  window.__BLOOM_CITY_GAMEPLAY_V1 = true;

  const cityWarn = (tag, e) => {
    try { console.warn('[THE BLOOM city]', tag, e); } catch (_) {}
  };

/* ============================= 11. CITY GENERATOR ======================= */
const BLOOM_CITY_NOTES = [
  'Hospital notice: "ALL WARDS FULL. Do not touch the water. Do not go to the coast."',
  'A child\'s chalk drawing on the pavement: a spiral, and one tall dark flower.',
  'Radio: "Stay indoors. Do not approach the coast. Do not approach the infected."',
  'Shop receipt, 3:12 AM: "Bottled water — sold out. Everyone is leaving."',
  'Spray-painted on a wall: "THE SEA IS BREATHING."',
  'A missing-person flyer, stained green: "Have you seen my wife? She smelled of salt."',
  'Pinned note: "They sing at night. Do not answer. They know our voices."'];
const BLOOM_BILL_MSGS = ['STAY INDOORS', 'AVOID THE COAST', 'CITY QUARANTINE', 'EVACUATE NORTH', 'DO NOT TOUCH THE WATER'];
const BLOOM_SHOP_NAMES = ['CAFE', 'PHARMACY', '24H MART', 'BOOKS', 'DINER', 'PAWN', 'HARDWARE', 'BAKERY'];
const BLOOM_CITY_CARS = ['#8a2a2a', '#2e5a8a', '#6b6b2a', '#3a6a4a', '#8a8a8a', '#5a3a6a', '#2a2a2a'];

function cityKit(L, cfg) {
  const rng = seeded(cfg.seed || 977), R = (a, b) => a + rng() * (b - a), pickR = a => a[Math.floor(rng() * a.length)];
  const ow = cfg.ow, oh = cfg.oh, base = cfg.base || 'walk', dead = cfg.style === 'dead';
  const inO = (x, y) => x < ow && y < oh;
  // 1. grow the grid (new cells only on +x / +y so every existing coordinate stays valid)
  for (let j = 0; j < L.h; j++) { const row = L.floor[j]; for (let i = L.w; i < cfg.W; i++) row.push(base); }
  for (let j = L.h; j < cfg.H; j++) L.floor.push(new Array(cfg.W).fill(base));
  L.w = cfg.W; L.h = cfg.H;
  const getF = (x, y) => (x >= 0 && y >= 0 && x < L.w && y < L.h) ? L.floor[y][x] : null;
  const setF = (x, y, m, force) => { if (x < 0 || y < 0 || x >= L.w || y >= L.h) return; if (!force && inO(x, y)) return; L.floor[y][x] = m; };
  const fillF = (x0, y0, x1, y1, m) => { for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) setF(x, y, m); };
  const isRoad = m => m === 'road' || m === 'dashX' || m === 'dashY' || m === 'zebraX' || m === 'zebraY';
  const A = (k, x, y, o) => L.add(k, x, y, o);
  // 2. connectors through the original map (L3): clear props in the strip
  for (const r of cfg.rows) if (r.force) { const x1 = ow, y0 = r.y0 - 1, y1 = r.y1 + 1; L.props = L.props.filter(p => !(p.x < x1 && p.x + p.w > r.x0 && p.y < y1 && p.y + p.d > y0)); }
  // 3. roads (7 wide, dashed centre line, intersections, crosswalks)
  for (const r of cfg.rows) { const mid = r.y0 + 3, x1 = r.x1 || L.w; for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < x1; x++) setF(x, y, y === mid ? 'dashX' : 'road', r.force); }
  for (const c of cfg.cols) { const mid = c.x0 + ((c.x1 - c.x0) >> 1), y1 = c.y1 || L.h; for (let x = c.x0; x < c.x1; x++) for (let y = c.y0; y < y1; y++) setF(x, y, isRoad(getF(x, y)) ? 'road' : (x === mid ? 'dashY' : 'road'), c.force); }
  for (const c of cfg.cols) for (const r of cfg.rows) {
    const cy1 = c.y1 || L.h, rx1 = r.x1 || L.w; if (!(r.y0 >= c.y0 && r.y1 <= cy1 && c.x0 >= r.x0 && c.x1 <= rx1)) continue;
    for (let x = c.x0; x < c.x1; x++) for (const y of [r.y0 - 1, r.y1]) if (isRoad(getF(x, y))) setF(x, y, 'zebraY');
    for (let y = r.y0; y < r.y1; y++) for (const x of [c.x0 - 1, c.x1]) if (isRoad(getF(x, y))) setF(x, y, 'zebraX');
  }
  // 4. blocks
  const xb = cfg.cols.map(c => [c.x0, c.x1]).sort((a, b) => a[0] - b[0]), yb = cfg.rows.map(r => [r.y0, r.y1]).sort((a, b) => a[0] - b[0]);
  const gp = (bands, hi) => { const out = []; let cur = 0; for (const [s, e] of bands) { if (s > cur) out.push([cur, s]); cur = Math.max(cur, e); } if (hi > cur) out.push([cur, hi]); return out; };
  const blocks = [];
  for (const gx of gp(xb, L.w)) for (const gy of gp(yb, L.h)) {
    let x0 = gx[0], x1 = gx[1], y0 = gy[0], y1 = gy[1];
    if (x0 < ow && y0 < oh) { if (x1 > ow) x0 = Math.max(x0, ow); else if (y1 > oh) y0 = Math.max(y0, oh); else continue; }
    const b = { x0, y0, x1, y1, ix0: x0 + 2, iy0: y0 + 2, ix1: x1 - 2, iy1: y1 - 2 }; b.iw = b.ix1 - b.ix0; b.ih = b.iy1 - b.iy0;
    if (b.iw < 7 || b.ih < 7) continue; blocks.push(b);
  }
  let hosp = null; if (cfg.hospital) { let best = 1e9; for (const b of blocks) if (b.iw >= 16 && b.ih >= 13) { const d = Math.hypot((b.x0 + b.x1) / 2 - L.w * .6, (b.y0 + b.y1) / 2 - L.h * .5); if (d < best) { best = d; hosp = b; } } }
  const Wt = dead ? [['ruins', .42], ['towers', .16], ['parking', .14], ['industrial', .14], ['park', .08], ['plaza', .06]] : [['towers', .24], ['houses', .26], ['park', .14], ['plaza', .06], ['parking', .12], ['industrial', .08], ['shops', .1]];
  const chooseType = () => { let r = rng(), s = 0; for (const [t, w] of Wt) { s += w; if (r < s) return t; } return Wt[0][0]; };
  const tPal = ['#3a3f4a', '#4a4540', '#2f3a40', '#454a50', '#3a3a44'], hPal = ['#6a5a4a', '#4a5a6a', '#5a4a4a', '#5a6a5a', '#6a6050'], roofP = ['#3a2a2a', '#2a3040', '#2a2a2a', '#3a3a2a'];
  const tower = (x, y, w, d) => A('tower', x, y, { w, d, h: R(6, 13), col: pickR(tPal), inf: !dead && rng() < .25 || dead && rng() < .5 });
  const shopAt = (x, y, w, d) => A('shop', x, y, { w, d, col: pickR(hPal), awn: pickR(['#a33a3a', '#3a6aa3', '#3aa36a', '#a38a3a']), name: pickR(BLOOM_SHOP_NAMES) });
  const treeAt = (x, y) => A('tree', x, y, { s: R(.9, 1.2), dead: dead && rng() < .8, inf: !dead && rng() < .12 });
  const carAt = (x, y, rot, wreck) => A('car', x, y, { col: wreck ? '#2a2420' : pickR(BLOOM_CITY_CARS), r: rot ? 1 : 0, smoke: !!wreck });
  const gens = {
    towers(b, shopsOnly) {
      const nx = b.iw >= 17 ? 2 : 1, ny = b.ih >= 17 ? 2 : 1, gap = 3, cw = (b.iw - (nx - 1) * gap) / nx, ch = (b.ih - (ny - 1) * gap) / ny;
      for (let a = 0; a < nx; a++) for (let c = 0; c < ny; c++) {
        const w = Math.max(4.2, cw - R(0, 1.6)), d = Math.max(4.2, ch - R(0, 1.6)), x = b.ix0 + a * (cw + gap) + (cw - w) * rng(), y = b.iy0 + c * (ch + gap) + (ch - d) * rng();
        if (rng() < .1) { A('crate', x + 1, y + 1, {}); A('crate', x + 2.2, y + 1.4, {}); A('sand', x + 1, y + 3, {}); }
        else if (c === ny - 1 && (shopsOnly || rng() < .45)) shopAt(x, b.iy1 - Math.min(d, 4.2), Math.min(w, 7), Math.min(d, 4.2));
        else tower(x, y, w, d);
      }
    },
    shops(b) { gens.towers(b, true); },
    houses(b) {
      const cols = Math.max(1, Math.floor(b.iw / 7)), rows = Math.max(1, Math.floor(b.ih / 8)), lw = b.iw / cols, lh = b.ih / rows;
      for (let a = 0; a < cols; a++) for (let c = 0; c < rows; c++) {
        const x = b.ix0 + a * lw, y = b.iy0 + c * lh, hw = R(3.6, Math.max(3.7, Math.min(4.6, lw - 1.8))), hd = R(3.2, 4);
        A('house', x + .8 + R(0, Math.max(0, lw - hw - 1.6)), y + .6, { w: hw, d: hd, h: R(2.6, 3.4), col: pickR(hPal), roof: pickR(roofP) });
        if (rng() < .6) treeAt(x + lw - 1, y + lh - 1.6);
        if (rng() < .35) carAt(x + 1.2, y + hd + 1.4, false, rng() < .2);
        const fy = y + lh - .5; for (let fxp = x + .3; fxp < x + lw - .3; fxp++) { const mid = x + lw / 2; if (Math.abs(fxp + .5 - mid) < 1.1) continue; if (rng() < .8) A('fence', fxp, fy, { w: 1, d: .14 }); }
      }
    },
    park(b) {
      fillF(b.ix0, b.iy0, b.ix1, b.iy1, 'park'); const cxm = (b.ix0 + b.ix1) / 2, cym = (b.iy0 + b.iy1) / 2;
      fillF(cxm - 1, b.iy0, cxm + 1, b.iy1, 'plaza'); fillF(b.ix0, cym - 1, b.ix1, cym + 1, 'plaza');
      if (b.iw >= 14 && b.ih >= 14) A('fountain', cxm - 1.5, cym - 1.5, {});
      const n = Math.floor(b.iw * b.ih / 20);
      for (let i = 0; i < n; i++) { const x = R(b.ix0 + .8, b.ix1 - .8), y = R(b.iy0 + .8, b.iy1 - .8); if (Math.abs(x - cxm) < 2.2 || Math.abs(y - cym) < 2.2) continue; treeAt(x, y); }
      A('bench', cxm + 1.3, cym - 1.85, {}); A('bench', cxm - 2.7, cym + 1.4, {}); if (rng() < .5) A('bench', cxm + 1.3, cym + 1.4, {});
      if (rng() < .4) L.decal({ t: 'bloom', x: R(b.ix0 + 3, b.ix1 - 3), y: R(b.iy0 + 3, b.iy1 - 3), r: R(1.8, 2.6) });
    },
    plaza(b) {
      fillF(b.ix0, b.iy0, b.ix1, b.iy1, 'plaza'); const cxm = (b.ix0 + b.ix1) / 2, cym = (b.iy0 + b.iy1) / 2;
      A('fountain', cxm - 1.5, cym - 1.5, {});
      for (const [x, y] of [[b.ix0 + 1, b.iy0 + 1], [b.ix1 - 2.2, b.iy0 + 1], [b.ix0 + 1, b.iy1 - 1.5], [b.ix1 - 2.2, b.iy1 - 1.5]]) A('planter', x, y, {});
      treeAt(b.ix0 + 1.5, cym); treeAt(b.ix1 - 1.5, cym); A('bench', cxm - .7, cym + 2.4, {}); A('bench', cxm - .7, cym - 2.9, {});
      if (b.iw >= 12) shopAt(cxm - 3, b.iy0, 6, 3.4);
    },
    parking(b) {
      fillF(b.ix0, b.iy0, b.ix1, b.iy1, 'road');
      for (let yy = b.iy0 + .7; yy + 2.4 < b.iy1; yy += 8) for (const row of [0, 4.6]) { if (yy + row + 2.4 > b.iy1) continue; for (let x = b.ix0 + .8; x + 1.2 < b.ix1; x += 2.9) if (rng() < .55) carAt(x, yy + row, true, rng() < .12); }
      A('slight', b.ix0 + .4, b.iy0 + .4, {}); A('slight', b.ix1 - .8, b.iy1 - .8, {}); A('barrel', b.ix1 - 1.4, b.iy0 + .5, { fire: rng() < .3, col: '#5a2a22' });
      if (rng() < .5) A('billboard', b.ix0 + 1, b.iy0 - .1, { msg: pickR(BLOOM_BILL_MSGS) });
    },
    industrial(b) {
      fillF(b.ix0, b.iy0, b.ix1, b.iy1, 'conc');
      for (let y = b.iy0 + .5; y + 2 < b.iy1 - 2; y += 5) { let x = b.ix0 + .5; while (x + 5 < b.ix1) { if (rng() < .75) A('container', x, y, { col: pickR(['#8a3a2a', '#2a5a8a', '#6a6a2a', '#3a6a4a', '#7a4a2a']) }); x += 5 + (rng() < .5 ? .4 : 3); } }
      for (let i = 0; i < 4; i++) { A('crate', R(b.ix0 + .5, b.ix1 - 1.5), b.iy1 - 1.4 - rng(), {}); }
      A('dump', b.ix0 + .5, b.iy1 - 1.4, {}); A('barrel', b.ix1 - 1, b.iy1 - 1, { col: '#7a3326' });
    },
    ruins(b) {
      const n = Math.max(1, Math.floor(b.iw * b.ih / 110));
      for (let i = 0; i < n; i++) { const w = R(4, 6), d = R(4, 5.5); A('ruin', R(b.ix0, Math.max(b.ix0 + .1, b.ix1 - w)), R(b.iy0, Math.max(b.iy0 + .1, b.iy1 - d)), { w, d, h: R(3, 7), col: pickR(['#2e2925', '#322c28', '#2a2623']) }); }
      for (let i = 0; i < 6; i++) { const x = R(b.ix0, b.ix1 - 1), y = R(b.iy0, b.iy1 - 1); if (rng() < .5) A('crate', x, y, {}); else A('sand', x, y, {}); }
      if (rng() < .5) treeAt(R(b.ix0 + 1, b.ix1 - 1), R(b.iy0 + 1, b.iy1 - 1)); if (rng() < .4) carAt(R(b.ix0 + 1, b.ix1 - 3), R(b.iy0 + 1, b.iy1 - 2), rng() < .5, true);
      if (rng() < .5) L.decal({ t: 'bloom', x: R(b.ix0 + 2, b.ix1 - 2), y: R(b.iy0 + 2, b.iy1 - 2), r: R(1.8, 2.8) });
    },
    hospital(b) {
      const cxm = (b.ix0 + b.ix1) / 2; A('hospital', cxm - 6, b.iy0 + .5, {});
      fillF(b.ix0, b.iy0 + 9, b.ix1, b.iy1, 'road');
      for (let x = b.ix0 + 1; x + 1.2 < b.ix1; x += 2.9) if (rng() < .5) carAt(x, b.iy1 - 2.8, true, rng() < .2);
      A('slight', b.ix0 + .4, b.iy0 + 9.2, {}); A('slight', b.ix1 - .8, b.iy0 + 9.2, {}); A('barr', cxm - 1, b.iy0 + 9.3, {});
    }
  };
  for (const b of blocks) {
    const t = b === hosp ? 'hospital' : chooseType(); gens[t](b);
    // sidewalk furniture along the ring
    for (let x = b.x0 + 5; x < b.x1 - 3; x += R(9, 13)) { if (rng() < .5) A('slight', x, b.y0 + .35, {}); if (rng() < .4) A(pickR(['trash', 'hydrant']), x + 3, b.y1 - .8, {}); if (rng() < .5) treeAt(x + 1.5, b.y1 - .7); }
    for (let y = b.y0 + 5; y < b.y1 - 3; y += R(9, 13)) { if (rng() < .45) A('slight', b.x0 + .35, y, {}); if (rng() < .3) A('trash', b.x1 - .8, y + 2, {}); }
  }
  // 5. parked cars along curbs + wreck pile-ups at some intersections
  const farFromOrig = (x, y, w, d) => !(x < ow && y < oh) && !(x + w < ow && y + d < oh);
  const nearCol = x => cfg.cols.some(c => x > c.x0 - 3 && x < c.x1 + 2), nearRow = y => cfg.rows.some(r => y > r.y0 - 3 && y < r.y1 + 2);
  for (const r of cfg.rows) for (let x = r.x0 + 3; x < (r.x1 || L.w) - 3; x += 7) {
    if (nearCol(x)) continue;
    for (const y of [r.y0 + .5, r.y1 - 1.6]) if (rng() < .3 && farFromOrig(x, y, 2.3, 1.1) && !(x < ow && r.force)) carAt(x, y, false, rng() < .1);
  }
  for (const c of cfg.cols) for (let y = c.y0 + 3; y < (c.y1 || L.h) - 3; y += 7) {
    if (nearRow(y)) continue;
    for (const x of [c.x0 + .5, c.x1 - 1.6]) if (rng() < .3 && farFromOrig(x, y, 1.1, 2.3)) carAt(x, y, true, rng() < .1);
  }
  for (const c of cfg.cols) for (const r of cfg.rows) {
    const cy1 = c.y1 || L.h, rx1 = r.x1 || L.w; if (!(r.y0 >= c.y0 && r.y1 <= cy1 && c.x0 >= r.x0 && c.x1 <= rx1) || rng() > .3) continue;
    const mx = (c.x0 + c.x1) / 2, my = r.y0 + 3.5; if (inO(mx, my)) continue;
    carAt(mx - 2.6, my - 1.8, false, true); carAt(mx + .6, my + .9, true, rng() < .5); A('barrel', mx - 1, my + 2.2, { fire: true, col: '#5a2a22' });
  }
  // 6. blockade caps where roads hit the map edge, so the city ends in a wall, not a void
  for (const c of cfg.cols) if (!c.y1 || c.y1 >= L.h) for (let x = c.x0; x < c.x1; x += 2) { A('barr', x, L.h - 1.8, { w: Math.min(2, c.x1 - x) }); }
  for (const r of cfg.rows) if (!r.x1 || r.x1 >= L.w) for (let y = r.y0; y < r.y1; y += 2) { A('barr', L.w - 1.8, y, { r: 1, d: Math.min(2, r.y1 - y) }); }
  if (cfg.seal) for (let y = 0; y < cfg.seal.y1; y++) A('fence', cfg.seal.x, y, { w: .14, d: 1 });
  for (let i = 0; i < (cfg.blooms || 0); i++) L.decal({ t: 'bloom', x: R(ow + 4, L.w - 4), y: R(6, L.h - 6), r: R(2, 3) });
  // 7. rebuild collision / path-finding data, then populate
  L.finish();
  // finish() rebuilds the larger collision grid; refresh both flow fields too.
  if (L.player && L.fP) L.bfs(L.player.x, L.player.y, L.fP);
  if (L.daughter && L.fD) L.bfs(L.daughter.x, L.daughter.y, L.fD);
  const pl = L.player, free = (x, y, r) => !L.hitSolid(x, y, r) && L.blk[(y | 0) * L.w + (x | 0)] === 0;
  let placed = 0, tries = 0; const f = cfg.foes;
  if (f) while (placed < f.n && tries < f.n * 40) {
    tries++; const x = R(f.x0 || 0, L.w), y = R(f.y0 || 0, L.h); if (inO(x, y) || Math.hypot(x - pl.x, y - pl.y) < f.minD || !free(x, y, .8)) continue;
    const grp = 1 + Math.floor(rng() * 3);
    for (let g = 0; g < grp && placed < f.n; g++) { const ex = x + R(-1.5, 1.5), ey = y + R(-1.5, 1.5); if (!free(ex, ey, .6)) continue; const e = L.spawnEnemy(pickR(f.types), ex, ey, { pr: 4 }); e._amb = true; placed++; }
  }
  const pc = cfg.picks || {}, drop = (kind, n, txt) => { for (let i = 0, k = 0; i < n && k < 200; k++) { const x = R(2, L.w - 2), y = R(2, L.h - 2); if (inO(x, y) || !free(x, y, .5)) continue; L.pickup(kind, x, y, txt ? pickR(BLOOM_CITY_NOTES) : undefined); i++; } };
  drop('med', pc.med || 0); drop('anti', pc.anti || 0); drop('note', pc.note || 0, true);
}
function expandBuild(i, make) {
  if (typeof BUILD === 'undefined' || !Array.isArray(BUILD) || typeof BUILD[i] !== 'function') return;
  const orig = BUILD[i];
  BUILD[i] = function () {
    const L = orig.apply(this, arguments);
    try { make(L); } catch (e) { warn('city' + i, e); try { L.finish(); } catch (_) {} }
    return L;
  };
}
function installBloomCity() {
  if (typeof Level !== 'function' || typeof PD === 'undefined' || !PD.tower) return;
  const living = ['drifter', 'drifter', 'drifter', 'stalker', 'bloated'];
  expandBuild(0, L => cityKit(L, {
    ow: 44, oh: 34, W: 150, H: 118, seed: 1103, style: 'living', hospital: true, blooms: 6,
    rows: [{ y0: 2, y1: 9, x0: 44 }, { y0: 28, y1: 35, x0: 0 }, { y0: 54, y1: 61, x0: 0 }, { y0: 80, y1: 87, x0: 0 }, { y0: 106, y1: 113, x0: 0 }],
    cols: [{ x0: 10, x1: 17, y0: 34 }, { x0: 36, x1: 43, y0: 34 }, { x0: 62, x1: 69, y0: 0 }, { x0: 88, x1: 95, y0: 0 }, { x0: 114, x1: 121, y0: 0 }, { x0: 140, x1: 147, y0: 0 }],
    foes: { n: 26, types: living, minD: 26 }, picks: { med: 6, anti: 3, note: 6 }
  }));
  expandBuild(2, L => cityKit(L, {
    ow: 28, oh: 100, W: 120, H: 150, seed: 2207, style: 'living', hospital: true, blooms: 6,
    rows: [{ y0: 3, y1: 10, x0: 28 }, { y0: 31, y1: 38, x0: 20, force: true }, { y0: 59, y1: 66, x0: 20, force: true }, { y0: 87, y1: 94, x0: 20, force: true }, { y0: 115, y1: 122, x0: 0 }, { y0: 143, y1: 150, x0: 0 }],
    cols: [{ x0: 8, x1: 20, y0: 100 }, { x0: 46, x1: 53, y0: 0 }, { x0: 73, x1: 80, y0: 0 }, { x0: 99, x1: 106, y0: 0 }],
    foes: { n: 28, types: living, minD: 24 }, picks: { med: 6, anti: 3, note: 6 }
  }));
  expandBuild(4, L => cityKit(L, {
    ow: 30, oh: 110, W: 120, H: 170, seed: 3319, style: 'dead', blooms: 8, seal: { x: 29.55, y1: 104 },
    rows: [{ y0: 4, y1: 11, x0: 30 }, { y0: 32, y1: 39, x0: 30 }, { y0: 60, y1: 67, x0: 30 }, { y0: 88, y1: 95, x0: 30 }, { y0: 118, y1: 125, x0: 0 }, { y0: 146, y1: 153, x0: 0 }],
    cols: [{ x0: 8, x1: 22, y0: 110 }, { x0: 46, x1: 53, y0: 0 }, { x0: 73, x1: 80, y0: 0 }, { x0: 99, x1: 106, y0: 0 }],
    foes: { n: 34, types: ['drifter', 'drifter', 'stalker', 'bloated'], minD: 20, y0: 110 }, picks: { med: 5, anti: 3, note: 5 }
  }));
}



/* ========================= 13. GAMEPLAY SAFETY ========================== */

// The city expansion is deliberately additive. Existing objectives remain the
// source of truth, while the expanded district adds traversal/combat depth.
function installCityGameplaySafety() {
  // Keep the existing completion/objective systems authoritative.
  // Only add metadata and an ambient encounter director.
  for (const L of BUILD) {
    if (typeof L !== 'function') continue;
  }

  // Ambient enemies get a controlled population refresh only in expanded maps.
  if (typeof Level.prototype.update === 'function' && !Level.prototype.__bloomCityDirector) {
    const originalUpdate = Level.prototype.update;
    const wrapped = function(dt) {
      const r = originalUpdate.call(this, dt);
      try {
        const city = this._bloomCity;
        if (!city || this.ended || !this.player) return r;

        city.spawnT -= dt;
        if (city.spawnT > 0) return r;

        city.spawnT = 24 + Math.random() * 18;

        // Keep encounters sparse. Never use these for objectives/completion.
        const active = this.enemies.filter(e => !e.dead && !e.dying && e._amb).length;
        if (active >= city.maxAmbient) return r;

        // Spawn only when the player is actually exploring the new district.
        const outsideOriginal =
          this.player.x >= city.originalW - 3 ||
          this.player.y >= city.originalH - 3;

        if (!outsideOriginal) return r;

        const pool = city.style === 'dead'
          ? ['drifter','drifter','stalker','bloated']
          : ['drifter','drifter','drifter','stalker'];

        const anchor = this.farCitySpawn(city.minDistance);
        if (!anchor) return r;

        const e = this.spawnEnemy(
          pool[(Math.random() * pool.length) | 0],
          anchor[0],
          anchor[1],
          { pr: 4, hunt: false }
        );
        e._amb = true;
        e._cityAmbient = true;
      } catch (e) {
        cityWarn('director', e);
      }
      return r;
    };

    Level.prototype.update = wrapped;
    Level.prototype.update.__bloomCityDirector = true;
  }

  // Helper methods are non-invasive additions to Level.
  if (!Level.prototype.farCitySpawn) {
    Level.prototype.farCitySpawn = function(minD) {
      if (!this.player || !this._bloomCity) return null;
      const city = this._bloomCity;
      const candidates = [];
      for (let i = 0; i < 18; i++) {
        const x = 2 + Math.random() * (this.w - 4);
        const y = 2 + Math.random() * (this.h - 4);
        if (x < city.originalW && y < city.originalH) continue;
        if (Math.hypot(x - this.player.x, y - this.player.y) < (minD || 14)) continue;
        if (this.hitSolid(x, y, .7)) continue;
        if (this.blk && this.blk[(y|0) * this.w + (x|0)]) continue;
        candidates.push([x,y]);
      }
      return candidates.length ? candidates[(Math.random()*candidates.length)|0] : null;
    };
  }

  // Mark expanded levels without replacing their existing objectives.
  // This is intentionally metadata-only.
  const mark = (idx, style, originalW, originalH) => {
    const orig = BUILD[idx];
    if (typeof orig !== 'function' || orig.__bloomCityMarked) return;
    const wrapped = function() {
      const L = orig.apply(this, arguments);
      try {
        L._bloomCity = {
          style,
          originalW,
          originalH,
          spawnT: 28 + Math.random() * 12,
          maxAmbient: style === 'dead' ? 10 : 7,
          minDistance: style === 'dead' ? 15 : 18
        };
        L.cityBrief = style === 'dead'
          ? 'QUARANTINE DISTRICT — BOMBARDMENT ZONE'
          : 'ABANDONED CITY DISTRICT';

        // Improve the existing objective without replacing it. The original
        // level objective remains authoritative; this adds context only while
        // the player is actually exploring the expanded district.
        const baseObjective = L.objText;
        if (typeof baseObjective === 'function' && !L._bloomCityObjective) {
          L._bloomCityObjective = true;
          L.objText = () => {
            const base = baseObjective();
            if (L.over || !L.player) return base;
            const outside = L.player.x >= originalW - 3 || L.player.y >= originalH - 3;
            return outside ? base + '  —  ' + L.cityBrief : base;
          };
        }
      } catch (e) { cityWarn('mark', e); }
      return L;
    };
    wrapped.__bloomCityMarked = true;
    BUILD[idx] = wrapped;
  };

  mark(0, 'living', 44, 34);
  mark(2, 'living', 40, 130);
  mark(4, 'dead', 40, 140);
}

try {
  installBloomCity();
  installCityGameplaySafety();
} catch (e) {
  cityWarn('install', e);
}
})();