/* =============================================================================
   15-boss-visuals.js — THE BLOOM: Bloom-Wife Boss Visual Overhaul
   -----------------------------------------------------------------------------
   Transforms the Bloom-Wife (Maya) from a generic blocky humanoid into a
   grotesque, horrifying bio-horror entity:
   - Hunched, asymmetric bio-carapace torso with fungal tumors and twisted limbs
   - 6 writhing segmented tendrils that whip faster/wider when enraged
   - Pulsating bioluminescent spore bulbs with phase-reactive luminescence
   - Tragic cracked human face with sunken eye sockets and oozing fissure
   - Spreading ground corruption with dynamic bloom lighting
   - Charge trail afterimages and screaming rage concentric shockwaves
   ========================================================================== */
(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
  if (!root) return;

  // Clamp helper
  const clamp = (v, min, max) => v < min ? min : (v > max ? max : v);

  /**
   * Custom boss rendering function replacing default human() call
   * @param {Object} e - The boss enemy entity
   */
  function drawBloomWife(e) {
    if (!e) return;

    // View frustum culling with generous margin for tendrils and shockwaves
    try {
      if (typeof CX !== 'undefined' && typeof CY !== 'undefined' && typeof W !== 'undefined' && typeof H !== 'undefined' && typeof Z !== 'undefined') {
        const margin = 260;
        if (Math.abs(isx(e.x, e.y) - CX) > W / 2 / Z + margin || Math.abs(isy(e.x, e.y) - CY) > H / 2 / Z + margin) {
          return;
        }
      }
    } catch (_) {}

    const ph = Math.max(1, Math.min(3, e.phase || 1));
    const fl = (e.hurtT > 0);
    const sc = e.sc || 1.4;
    const time = (typeof T !== 'undefined') ? T : (Date.now() * 0.001);

    // Orientation vectors
    const f = e.f || 0;
    const fx = Math.cos(f), fy = Math.sin(f);
    const px = -fy, py = fx; // lateral vector (boss's right)

    // Phase-dependent dynamics:
    // Phase 1: Slow pulse, dimmer colors
    // Phase 2: Faster pulse, more tendrils active, orange-red accents
    // Phase 3: Violent shaking on body, all tendrils flailing, crimson #ff2040 glow replacing violet
    const pulseSpeed = ph === 1 ? 2.0 : (ph === 2 ? 3.8 : 5.8);
    const tendrilSpeed = ph === 1 ? 3.0 : (ph === 2 ? 5.5 : 8.5);
    const tendrilAmp = ph === 1 ? 0.16 : (ph === 2 ? 0.30 : 0.46);

    const sporeSacViolet = ph === 3 ? '#ff2040' : '#ff60ff';
    const sporeSacGreen = '#7aff60';
    const accentOrange = ph === 3 ? '#ff2040' : (ph === 2 ? '#ff6020' : '#5a2060');

    // Violent shaking on body in Phase 3
    let shkX = 0, shkY = 0, shkZ = 0;
    if (ph === 3) {
      shkX = (Math.random() - 0.5) * 0.08;
      shkY = (Math.random() - 0.5) * 0.08;
      shkZ = (Math.random() - 0.5) * 0.05;
    }

    // Impact kickback support from combat layer
    let kickX = 0, kickY = 0;
    if (e._kick > 0) {
      kickX = Math.cos(e._kdir || 0) * e._kick * 0.18;
      kickY = Math.sin(e._kdir || 0) * e._kick * 0.18;
    }

    const bx0 = e.x + shkX + kickX;
    const by0 = e.y + shkY + kickY;

    /* -------------------------------------------------------------------------
       1. GROUND CORRUPTION & BLOOM GLOW
       ------------------------------------------------------------------------- */
    // Boss ground shadow
    shadow(e.x, e.y, 0.95 * sc, 0.42);

    // Spreading dark stain beneath: rgba(40,10,50,0.3)
    const stainR = (1.85 + 0.15 * Math.sin(time * pulseSpeed * 0.7)) * (ph === 3 ? 1.25 : (ph === 2 ? 1.12 : 1.0));
    groundEll(e.x, e.y, stainR, 'rgba(40,10,50,0.3)', null, 1);
    // Inner deeper necrotic core stain
    groundEll(e.x, e.y, stainR * 0.62, 'rgba(25,5,35,0.45)', null, 1);

    // Dynamic ground halo ring
    const corruptionCol = ph === 3 ? '#ff2040' : (ph === 2 ? '#ff40b0' : '#8a40ff');
    if (typeof haloRing === 'function') {
      haloRing(e.x, e.y, corruptionCol);
    } else {
      groundEll(e.x, e.y, 1.2, null, corruptionCol, 0.35, 2);
    }

    // Bloom glow light: Phase 3 crimson replaces violet
    if (typeof light === 'function') {
      const lightR = ph === 3 ? 3.8 : (ph === 2 ? 3.3 : 3.0);
      const lightI = ph === 3 ? 0.7 : (ph === 2 ? 0.58 : 0.5);
      const lightCol = ph === 3 ? '#ff2040' : '#8a40ff';
      light(e.x, e.y, 0.1, lightR, lightI, lightCol);
    }

    /* -------------------------------------------------------------------------
       2. CHARGE TRAIL AFTERIMAGES
       When e.bs === 'charge', draw trailing afterimages using semi-transparent
       body shapes at previous positions.
       ------------------------------------------------------------------------- */
    if (!e._trail) e._trail = [];
    if (e.bs === 'charge') {
      const last = e._trail[0];
      if (!last || Math.hypot(e.x - last.x, e.y - last.y) > 0.08) {
        e._trail.unshift({ x: e.x, y: e.y, f: e.f, t: time });
        if (e._trail.length > 7) e._trail.length = 7;
      }
    } else if (e._trail.length > 0) {
      e._trail.pop();
    }

    if (e._trail.length > 0) {
      for (let ti = 0; ti < e._trail.length; ti++) {
        const tr = e._trail[ti];
        const alpha = (1 - (ti + 1) / (e._trail.length + 1)) * 0.32;
        if (alpha <= 0.02) continue;
        cx.save();
        cx.globalAlpha = alpha;
        const ghostCol = ph === 3 ? '#99152a' : '#4a1855';
        const ghostGreen = '#1a4a2a';
        bx(tr.x, tr.y, 0.35, 0.58, 0.65, ghostCol);
        bx(tr.x, tr.y, 0.95, 0.44, 0.50, ghostGreen);
        groundEll(tr.x, tr.y, 0.75, ph === 3 ? 'rgba(255,32,64,0.18)' : 'rgba(160,32,220,0.18)', null, alpha);
        cx.restore();
      }
    }

    /* -------------------------------------------------------------------------
       3. RAGE AURA (SCREAM)
       When e.bs === 'scream', draw expanding concentric rings using cx.arc()
       with decreasing alpha.
       ------------------------------------------------------------------------- */
    if (e.bs === 'scream') {
      const sx = isx(e.x, e.y);
      const sy = isy(e.x, e.y, 0.7);
      cx.save();
      cx.translate(sx, sy);
      cx.scale(1, 0.52);
      const ringColR = ph === 3 ? '255, 32, 64' : '224, 96, 255';
      for (let r = 0; r < 4; r++) {
        const prog = ((time * 3.2 + r * 0.25) % 1.0);
        const radius = 22 + prog * 160;
        const alpha = (1 - prog) * 0.85;
        cx.beginPath();
        cx.arc(0, 0, radius, 0, 6.2832);
        cx.strokeStyle = `rgba(${ringColR}, ${alpha.toFixed(3)})`;
        cx.lineWidth = 3.6 * (1 - prog) + 1.0;
        cx.stroke();
      }
      cx.restore();
    }

    /* -------------------------------------------------------------------------
       4. PULSATING SPORE SACS (BIOLUMINESCENT BULBS)
       4-6 bioluminescent bulbs drawn as groundEll() with oscillating alpha
       using Math.sin(T * 2 + i * 1.3). Colors: #7aff60 (green), #ff60ff (violet).
       Phase 3: crimson replaces violet.
       ------------------------------------------------------------------------- */
    const sporeOffsets = [
      [-0.38, 0.26],  // back-right
      [-0.45, -0.22], // back-left
      [-0.18, 0.42],  // side-right
      [0.12, -0.36],  // forward-left
      [-0.52, 0.04]   // directly behind
    ];

    for (let i = 0; i < sporeOffsets.length; i++) {
      const osc = Math.sin((ph === 1 ? (time * 2 + i * 1.3) : (ph === 2 ? (time * 3.6 + i * 1.3) : (time * 5.5 + i * 1.3))));
      const baseAlpha = ph === 1 ? 0.35 : (ph === 2 ? 0.52 : 0.68);
      const sacAlpha = clamp(baseAlpha + (ph === 1 ? 0.2 : 0.3) * osc, 0.05, 1.0);
      const sacR = (0.24 + 0.06 * osc) * (ph === 3 ? 1.25 : 1.0);

      let bulbFill, bulbStroke;
      if (i % 2 === 0) {
        bulbFill = sporeSacGreen; // #7aff60
        bulbStroke = '#50dd40';
      } else {
        bulbFill = (ph === 3) ? '#ff2040' : (ph === 2 ? '#ff40b0' : sporeSacViolet); // #ff60ff
        bulbStroke = (ph === 3) ? '#cc1030' : (ph === 2 ? '#dd2090' : '#d040e0');
      }

      // Phase 2 orange-red accent bulb
      if (ph === 2 && i === 3) {
        bulbFill = '#ff6020';
        bulbStroke = '#cc4010';
      }

      const sacX = e.x + fx * sporeOffsets[i][0] + px * sporeOffsets[i][1];
      const sacY = e.y + fy * sporeOffsets[i][0] + py * sporeOffsets[i][1];

      // Draw bioluminescent bulb with groundEll
      groundEll(sacX, sacY, sacR, bulbFill, bulbStroke, sacAlpha, 2);
      // Center luminescent core dot
      glowDot(sacX, sacY, 0.12, 7 * (1 + 0.3 * osc), bulbFill, sacAlpha * 0.7);
    }

    /* -------------------------------------------------------------------------
       5. BASE BODY & WRITHING TENDRILS (DEPTH-SORTED BOX PRIMITIVES)
       - Torso: hunched, asymmetric, multiple overlapping bx() calls with
         organic colors: dark violet #3a1845, infected green #1a4a2a, bruised purple #5a2060
       - Tendrils: 6 tentacles drawn as connected bx() segments emanating from body.
         Math.sin(T * 3 + i * 1.1) wave motion. Faster and wider in phase >= 2.
       - Face: small skin-colored box #d4b8a0 with two dark eye sockets #1a0a1a
         and a crack line across it.
       ------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------
       5. ETHEREAL GOTHIC BIO-HORROR BODY & FLOWING VEIL
       - Graceful feminine silhouette: slender form in a tattered white silk/bridal gown
       - Half human: porcelain skin, dark cascading hair, gold wedding ring on right hand
       - Half bloom: crown of blooming lavender/cyan petals, weeping teal tear streak,
         mutated floral scythe arm, trailing gossamer root-veil tendrils
       ------------------------------------------------------------------------- */
    const colPick = c => fl ? '#ffffff' : c;
    const cDress = colPick('#f0f4f8');
    const cSkin = colPick('#f5ded6');
    const cHair = colPick('#1c1420');

    // 1. Draw base graceful humanoid silhouette using human()
    human(bx0, by0, {
      sc: 1.25 * sc,
      f: f,
      sh: cDress,
      pn: colPick('#dbe2ea'),
      sk: cSkin,
      hr: cHair,
      hair2: true,
      dress: true,
      fl: fl,
      z: shkZ,
      glow: ph === 3 ? '#ff2040' : (ph === 2 ? '#ff50a0' : '#4dffa0')
    });

    const hx = bx0 + fx * 0.18 + px * 0.04;
    const hy = by0 + fy * 0.18 + py * 0.04;
    const hz = 1.35 * sc + shkZ;

    // 2. Crown of Blooming Ethereal Flower Petals on Maya's Head
    const crownSx = isx(hx, hy);
    const crownSy = isy(hx, hy, hz + 0.18);
    cx.save();
    const petalCol1 = ph === 3 ? '#ff2040' : '#d470ff';
    const petalCol2 = ph === 3 ? '#ff6060' : '#50ffa0';
    for (let pIdx = 0; pIdx < 7; pIdx++) {
      const pAng = (pIdx / 7) * 6.28 + time * 0.8;
      const pLen = (10 + 2 * Math.sin(time * 3 + pIdx)) * sc;
      cx.fillStyle = (pIdx % 2 === 0) ? petalCol1 : petalCol2;
      cx.globalAlpha = 0.85;
      cx.beginPath();
      cx.ellipse(crownSx + Math.cos(pAng) * (7 * sc), crownSy + Math.sin(pAng) * (5 * sc) - (8 * sc), pLen * 0.6, pLen * 0.35, pAng, 0, 6.28);
      cx.fill();
    }
    // Crown glowing core
    glowDot(hx, hy, hz + 0.22, 10 * sc, ph === 3 ? '#ff4060' : '#7affc0', 0.8);
    cx.restore();

    // 3. Weeping Bioluminescent Teal Tears (From left eye down to chest)
    const eyeX = hx + fx * 0.12 - px * 0.05;
    const eyeY = hy + fy * 0.12 - py * 0.05;
    const eyeZ = hz - 0.02;
    glowDot(eyeX, eyeY, eyeZ, 4.5, '#38e0ff', 0.95);
    const sEyeX = isx(eyeX, eyeY);
    const sEyeY = isy(eyeX, eyeY, eyeZ);
    cx.save();
    cx.strokeStyle = ph === 3 ? 'rgba(255, 60, 80, 0.85)' : 'rgba(56, 224, 255, 0.85)';
    cx.lineWidth = 2.2;
    cx.beginPath();
    cx.moveTo(sEyeX, sEyeY);
    cx.quadraticCurveTo(sEyeX - 3, sEyeY + 12, sEyeX - 1, sEyeY + 24);
    cx.stroke();
    cx.restore();

    // 4. Glinting Gold Wedding Band (On right hand)
    const ringX = bx0 - px * 0.28 + fx * 0.05;
    const ringY = by0 - py * 0.28 + fy * 0.05;
    const ringZ = 0.55 * sc + shkZ;
    const ringSparkle = Math.pow(Math.max(0, Math.sin(time * 2.5)), 6);
    glowDot(ringX, ringY, ringZ, 3.5 + ringSparkle * 4, '#ffd700', 0.7 + ringSparkle * 0.3);

    // 5. Mutated Left Floral Scythe Arm
    const scytheArmX = bx0 + px * 0.36 + fx * 0.15;
    const scytheArmY = by0 + py * 0.36 + fy * 0.15;
    const scytheArmZ = 0.65 * sc + shkZ;
    bx(scytheArmX, scytheArmY, scytheArmZ, 0.18, 0.45, colPick(ph === 3 ? '#99152a' : '#3a1845'));
    bx(scytheArmX + fx * 0.2, scytheArmY + fy * 0.2, scytheArmZ - 0.2, 0.14, 0.45, colPick(ph === 3 ? '#cc2040' : '#1a4a2a'));
    // Glowing bloom petal blade at tip
    glowDot(scytheArmX + fx * 0.35, scytheArmY + fy * 0.35, scytheArmZ - 0.25, 7, ph === 3 ? '#ff2040' : '#c850ff', 0.9);

    // 6. Flowing Gossamer Veil Tendrils (Smooth curved ribbon veils)
    cx.save();
    const veilCount = 6;
    for (let vi = 0; vi < veilCount; vi++) {
      const vAng = f + Math.PI + (vi - (veilCount - 1) / 2) * 0.45;
      const wave = Math.sin(time * tendrilSpeed + vi * 1.2);
      const vLength = (1.2 + (vi % 2) * 0.4) * (ph >= 2 ? 1.4 : 1.1);

      const rootX = bx0 - fx * 0.12 + (px * (vi - 2.5) * 0.08);
      const rootY = by0 - fy * 0.12 + (py * (vi - 2.5) * 0.08);
      const rootZ = (0.95 - vi * 0.08) * sc + shkZ;

      const midX = rootX + Math.cos(vAng) * vLength * 0.5 + Math.cos(vAng + 1.57) * wave * tendrilAmp * 1.5;
      const midY = rootY + Math.sin(vAng) * vLength * 0.5 + Math.sin(vAng + 1.57) * wave * tendrilAmp * 1.5;
      const midZ = rootZ * 0.6;

      const tipX = rootX + Math.cos(vAng) * vLength + Math.cos(vAng + 1.57) * wave * tendrilAmp * 2.2;
      const tipY = rootY + Math.sin(vAng) * vLength + Math.sin(vAng + 1.57) * wave * tendrilAmp * 2.2;
      const tipZ = 0.08;

      const sRootX = isx(rootX, rootY), sRootY = isy(rootX, rootY, rootZ);
      const sMidX = isx(midX, midY), sMidY = isy(midX, midY, midZ);
      const sTipX = isx(tipX, tipY), sTipY = isy(tipX, tipY, tipZ);

      // Translucent ethereal veil ribbon
      const veilCol = ph === 3 ? 'rgba(255, 32, 64, 0.45)' : (vi % 2 === 0 ? 'rgba(212, 112, 255, 0.42)' : 'rgba(77, 255, 160, 0.38)');
      cx.strokeStyle = veilCol;
      cx.lineWidth = (4.5 - vi * 0.4) * (1 + 0.2 * wave);
      cx.beginPath();
      cx.moveTo(sRootX, sRootY);
      cx.quadraticCurveTo(sMidX, sMidY, sTipX, sTipY);
      cx.stroke();

      // Glowing floral bud at each veil tip
      const tipGlowCol = ph === 3 ? '#ff2040' : (vi % 2 === 0 ? '#ff70e0' : '#4dffa0');
      glowDot(tipX, tipY, tipZ, 5.5, tipGlowCol, 0.85);
    }
    cx.restore();

    /* -------------------------------------------------------------------------
       7. STATUS TELEGRAPHS (STUN & WINDUP)
       ------------------------------------------------------------------------- */
    if (e.bs === 'stun') {
      cx.fillStyle = '#ffd34d';
      cx.font = 'bold 16px monospace';
      cx.textAlign = 'center';
      cx.fillText('★ ★ ★', isx(e.x, e.y), isy(e.x, e.y, 2.8 * sc));
    }

    if (e.wind > 0 && !e.dying) {
      cx.globalAlpha = 0.85;
      cx.fillStyle = '#ff3030';
      cx.font = 'bold 16px monospace';
      cx.textAlign = 'center';
      cx.fillText('!', isx(e.x, e.y), isy(e.x, e.y, 2.5 * sc));
      cx.globalAlpha = 1;
    }
  }

  // Expose globally
  root.drawBloomWife = drawBloomWife;

  /* ===========================================================================
     MONKEY-PATCHING: WRAP ENEMY DRAW LOGIC
     =========================================================================== */
  // 1. Wrap global drawEnemy so any enemy of type === 'boss' calls drawBloomWife
  const origDrawEnemy = root.drawEnemy || (typeof drawEnemy === 'function' ? drawEnemy : null);
  const wrappedDrawEnemy = function (e) {
    if (e && e.type === 'boss') {
      try {
        drawBloomWife(e);
        return;
      } catch (err) {
        console.warn('drawBloomWife error:', err);
      }
    }
    if (origDrawEnemy) return origDrawEnemy.apply(this, arguments);
  };

  root.drawEnemy = wrappedDrawEnemy;
  root.drawBloomWife = drawBloomWife;
  if (typeof window !== 'undefined') window.drawBloomWife = drawBloomWife;

  // 2. Wrap Level.prototype.draw to guarantee boss uses drawBloomWife in items rendering
  if (typeof Level !== 'undefined' && Level.prototype && typeof Level.prototype.draw === 'function') {
    const origLevelDraw = Level.prototype.draw;
    Level.prototype.draw = function () {
      return origLevelDraw.apply(this, arguments);
    };
    Level.prototype.draw.__bossVisualsPatched = true;
  }
})();
