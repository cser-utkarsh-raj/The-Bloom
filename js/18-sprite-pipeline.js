/* =============================================================================
   18-sprite-pipeline.js — THE BLOOM Canonical 2.5D Isometric Engine & Animation
   -----------------------------------------------------------------------------
   Architecture:
   1. True 3D World-Space Joint Kinematics & 8-Directional Isometric Projection.
      Every joint (pelvis, hips, knees, feet, torso, shoulders, head, hands)
      is positioned relative to the character's continuous world heading
      (fwdX, fwdY) and lateral vector (latX, latY), then projected through isx/isy.
      Characters walk straight in all directions with natural stride, body twist,
      center-of-mass bobbing, and counter-swinging arms.
   2. Authentic Proportions & Scale matching world objects (doors, cars, tables, walls).
   3. Distinct Gaits:
      - David & Nancy: Smooth grounded walk/run with natural footstep lift and idle breathing.
      - Zombie Drifters: Asymmetrical dragging limp with hunched posture and reaching claws.
      - Stalkers: Sinuous predatory crouch with cyan-glowing fungal forearm blades.
   4. Combat Rig: 3-phase melee strike (wind-up, strike, recovery) with dynamic
      steel pipe weapon swivel and hand-drawn slashing motion arc.
   5. Rich Isometric Props: Vehicles (sedan, wreck, burned husk) and furniture
      (sofa with plush cushions, oak dining table, bed with duvet, kitchen counter).
   ========================================================================== */
(function () {
  'use strict';

  // --- Ambient & Ground Contact Shadow Primitives ---
  function drawGroundShadow(x, y, radiusX, radiusY, alpha) {
    cx.save();
    cx.globalAlpha = alpha || 0.38;
    cx.fillStyle = '#000000';
    cx.beginPath();
    cx.ellipse(isx(x, y), isy(x, y, 0), radiusX * 32, (radiusY || radiusX * 0.5) * 32, 0, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
  }

  // =========================================================================
  // 1. 3D KINEMATIC ARTICULATED ISOMETRIC HUMANOID ENGINE
  // =========================================================================

  /**
   * Renders a fully articulated humanoid with genuine 3D joint projection.
   * Eliminates 2D billboard flat rectangles and sideways crab-walking.
   */
  function drawKinematicIsoHumanoid(ent, cfg) {
    const x = ent.x, y = ent.y;
    const z = (ent.z || 0) + (ent.dodT > 0 ? -0.15 : 0);
    const sc = cfg.scale || 1.35;
    const f = ent.f || 0;

    // True continuous forward & lateral vectors in world space
    const fwdX = Math.cos(f);
    const fwdY = Math.sin(f);
    const latX = -fwdY;
    const latY = fwdX;

    // Screen forward vector to determine front vs back facing
    const sxFwd = (fwdX - fwdY) * 32;
    const syFwd = (fwdX + fwdY) * 16;
    const isFacingFront = syFwd > -6; // Towards camera (+Y screen)
    const isFacingLeft = sxFwd < -6;
    const isFacingRight = sxFwd > 6;

    const moving = !ent.still && (ent.ph && Math.abs(ent.ph) > 0.01);
    const ph = ent.ph || 0;
    const isZombie = cfg.isZombie || false;
    const isNancy = cfg.isNancy || false;
    const isFlash = cfg.flash || false;
    const c = col => isFlash ? '#ffffff' : col;

    // Contact drop shadow on floor plane
    drawGroundShadow(x, y, 0.44 * sc, 0.22 * sc, cfg.shadowAlpha || 0.42);

    // Stride & gait parameters
    let strideL = 0, strideR = 0, liftL = 0, liftR = 0;
    let bob = 0, twist = 0, armSwing = 0;
    const fwdLean = (ent.sprint ? 0.2 : moving ? 0.08 : 0) + (isZombie ? 0.22 : 0);

    if (isZombie) {
      // Asymmetric Limp: Left leg takes a forward step, right leg drags behind with a slight hitch
      const limpPhase = ph % (Math.PI * 2);
      strideL = moving ? Math.sin(limpPhase) * 0.26 * sc : 0;
      strideR = moving ? (-0.12 * sc + Math.sin(limpPhase + Math.PI) * 0.12 * sc) : 0;
      liftL = moving ? Math.max(0, -Math.cos(limpPhase)) * 0.12 * sc : 0;
      liftR = moving ? Math.max(0, Math.cos(limpPhase + Math.PI)) * 0.03 * sc : 0;
      bob = moving ? Math.abs(Math.sin(limpPhase)) * 0.04 * sc : Math.sin((window.T || 0) * 1.8) * 0.012 * sc;
      twist = moving ? Math.sin(limpPhase) * 0.14 : 0;
      armSwing = moving ? Math.sin(limpPhase) * 0.16 * sc : 0;
    } else {
      // Natural human walk / run
      const strideLen = (ent.sprint ? 0.32 : 0.24) * sc * (cfg.gait || 1);
      strideL = moving ? Math.sin(ph) * strideLen : 0;
      strideR = moving ? -Math.sin(ph) * strideLen : 0;
      liftL = moving ? Math.max(0, -Math.cos(ph)) * 0.13 * sc : 0;
      liftR = moving ? Math.max(0, Math.cos(ph)) * 0.13 * sc : 0;
      bob = moving ? Math.abs(Math.sin(ph)) * 0.042 * sc : Math.sin((window.T || 0) * 2.2) * 0.012 * sc;
      twist = moving ? -Math.sin(ph) * 0.2 : 0;
      armSwing = moving ? Math.sin(ph) * 0.28 * sc : 0;
    }

    // 1. Compute 3D World Positions of All Joints
    // Pelvis
    const pX = x + fwdX * (bob * 0.2);
    const pY = y + fwdY * (bob * 0.2);
    const pZ = z + 0.68 * sc + bob;

    // Hips
    const hipSpan = 0.12 * sc;
    const hipLX = pX + latX * (-hipSpan);
    const hipLY = pY + latY * (-hipSpan);
    const hipRX = pX + latX * hipSpan;
    const hipRY = pY + latY * hipSpan;

    // Feet (step forward and backward along fwdX, fwdY!)
    const footLX = x + latX * (-hipSpan) + fwdX * strideL;
    const footLY = y + latY * (-hipSpan) + fwdY * strideL;
    const footLZ = z + liftL;

    const footRX = x + latX * hipSpan + fwdX * strideR;
    const footRY = y + latY * hipSpan + fwdY * strideR;
    const footRZ = z + liftR;

    // Torso Center
    const torsoX = pX + fwdX * (fwdLean * sc);
    const torsoY = pY + fwdY * (fwdLean * sc);
    const torsoZ = pZ + 0.38 * sc;

    // Shoulders
    const shoulderSpan = 0.20 * sc;
    const shTwistX = fwdX * (-twist * 0.12 * sc);
    const shTwistY = fwdY * (-twist * 0.12 * sc);
    const shLX = torsoX + latX * (-shoulderSpan) + shTwistX;
    const shLY = torsoY + latY * (-shoulderSpan) + shTwistY;
    const shRX = torsoX + latX * shoulderSpan - shTwistX;
    const shRY = torsoY + latY * shoulderSpan - shTwistY;
    const shZ = torsoZ + 0.04 * sc;

    // Head
    const headX = torsoX + fwdX * 0.04 * sc;
    const headY = torsoY + fwdY * 0.04 * sc;
    const headZ = torsoZ + 0.34 * sc;

    // Hands
    let hLX = shLX + fwdX * (-armSwing) + latX * (-0.04 * sc);
    let hLY = shLY + fwdY * (-armSwing) + latY * (-0.04 * sc);
    let hLZ = shZ - 0.36 * sc + Math.abs(armSwing) * 0.25;

    let hRX = shRX + fwdX * armSwing + latX * (0.04 * sc);
    let hRY = shRY + fwdY * armSwing + latY * (0.04 * sc);
    let hRZ = shZ - 0.36 * sc + Math.abs(armSwing) * 0.25;

    // If zombie, arms reach forward aggressively
    if (isZombie) {
      hLX = shLX + fwdX * 0.32 * sc;
      hLY = shLY + fwdY * 0.32 * sc;
      hLZ = shZ - 0.14 * sc;

      hRX = shRX + fwdX * 0.35 * sc;
      hRY = shRY + fwdY * 0.35 * sc;
      hRZ = shZ - 0.12 * sc;
    }

    // 2. Project All Joints to Screen Coordinates
    const sPelvis = [isx(pX, pY), isy(pX, pY, pZ)];
    const sHipL = [isx(hipLX, hipLY), isy(hipLX, hipLY, pZ)];
    const sHipR = [isx(hipRX, hipRY), isy(hipRX, hipRY, pZ)];
    const sFootL = [isx(footLX, footLY), isy(footLX, footLY, footLZ)];
    const sFootR = [isx(footRX, footRY), isy(footRX, footRY, footRZ)];

    const sTorso = [isx(torsoX, torsoY), isy(torsoX, torsoY, torsoZ)];
    const sShL = [isx(shLX, shLY), isy(shLX, shLY, shZ)];
    const sShR = [isx(shRX, shRY), isy(shRX, shRY, shZ)];
    const sHead = [isx(headX, headY), isy(headX, headY, headZ)];

    const sHandL = [isx(hLX, hLY), isy(hLX, hLY, hLZ)];
    const sHandR = [isx(hRX, hRY), isy(hRX, hRY, hRZ)];

    // Individual foot contact shadows on floor
    const sf = sc;
    const alphaL = Math.max(0.15, 0.75 - liftL * 4.5);
    const alphaR = Math.max(0.15, 0.75 - liftR * 4.5);

    cx.save();
    cx.fillStyle = `rgba(0,0,0,${alphaL.toFixed(2)})`;
    cx.beginPath();
    cx.ellipse(isx(footLX, footLY), isy(footLX, footLY, 0), 4.8 * sf, 2.6 * sf, 0, 0, Math.PI * 2);
    cx.fill();

    cx.fillStyle = `rgba(0,0,0,${alphaR.toFixed(2)})`;
    cx.beginPath();
    cx.ellipse(isx(footRX, footRY), isy(footRX, footRY, 0), 4.8 * sf, 2.6 * sf, 0, 0, Math.PI * 2);
    cx.fill();
    cx.restore();

    // 3. Depth Sorting: Determine Draw Order of Body Parts
    // World depth key = (x + y + z * 0.2)
    const legLDepth = hipLX + hipLY + footLX + footLY;
    const legRDepth = hipRX + hipRY + footRX + footRY;
    const torsoDepth = torsoX + torsoY;
    const armLDepth = shLX + shLY + hLX + hLY;
    const armRDepth = shRX + shRY + hRX + hRY;
    const headDepth = headX + headY + 0.1;

    const parts = [
      {
        id: 'legL',
        depth: legLDepth,
        draw: () => drawLimb(sHipL, sFootL, cfg.pantsCol || '#252932', cfg.shoeCol || '#141311', 4.8 * sf, 4.0 * sf)
      },
      {
        id: 'legR',
        depth: legRDepth,
        draw: () => drawLimb(sHipR, sFootR, cfg.pantsCol || '#252932', cfg.shoeCol || '#141311', 4.8 * sf, 4.0 * sf)
      },
      {
        id: 'torso',
        depth: torsoDepth,
        draw: () => drawTorso(sShL, sShR, sHipL, sHipR, sTorso)
      },
      {
        id: 'armL',
        depth: armLDepth,
        draw: () => drawArm(sShL, sHandL, cfg.jacketCol || '#2d4b73', cfg.skinCol || '#d9a67e', 3.8 * sf)
      },
      {
        id: 'armR',
        depth: armRDepth,
        draw: () => drawArm(sShR, sHandR, cfg.jacketCol || '#2d4b73', cfg.skinCol || '#d9a67e', 3.8 * sf)
      },
      {
        id: 'head',
        depth: headDepth,
        draw: () => drawHead(sHead)
      }
    ];

    parts.sort((a, b) => a.depth - b.depth);

    // Drawing Subroutines
    function drawLimb(pHip, pFoot, pCol, sCol, wUpper, wLower) {
      cx.save();
      // Mid knee point
      const midX = (pHip[0] + pFoot[0]) * 0.5;
      const midY = (pHip[1] + pFoot[1]) * 0.5 - 2 * sf;

      cx.lineCap = 'round';
      cx.lineJoin = 'round';
      cx.strokeStyle = c(pCol);
      cx.lineWidth = wUpper;
      cx.beginPath();
      cx.moveTo(pHip[0], pHip[1]);
      cx.lineTo(midX, midY);
      cx.lineTo(pFoot[0], pFoot[1]);
      cx.stroke();

      // Boot
      cx.fillStyle = c(sCol);
      cx.beginPath();
      cx.ellipse(pFoot[0], pFoot[1], 4.2 * sf, 2.4 * sf, 0, 0, Math.PI * 2);
      cx.fill();
      cx.restore();
    }

    function drawTorso(shL, shR, hpL, hpR, ct) {
      cx.save();
      // Torso polygon: Connect Left Shoulder -> Right Shoulder -> Right Hip -> Left Hip
      cx.beginPath();
      cx.moveTo(shL[0], shL[1]);
      cx.lineTo(shR[0], shR[1]);
      cx.lineTo(hpR[0], hpR[1]);
      cx.lineTo(hpL[0], hpL[1]);
      cx.closePath();

      cx.fillStyle = c(cfg.jacketCol || '#2d4b73');
      cx.fill();
      cx.strokeStyle = 'rgba(10,12,15,0.75)';
      cx.lineWidth = 1;
      cx.stroke();

      // Clothing details (Lapels, Shirt, Belt)
      if (isFacingFront) {
        // Front inner shirt panel
        cx.fillStyle = c(cfg.shirtCol || '#8ca0b3');
        cx.beginPath();
        cx.moveTo((shL[0] * 2 + shR[0]) / 3, (shL[1] * 2 + shR[1]) / 3);
        cx.lineTo((shL[0] + shR[0] * 2) / 3, (shL[1] + shR[1] * 2) / 3);
        cx.lineTo((hpL[0] + hpR[0]) / 2, (hpL[1] + hpR[1]) / 2);
        cx.closePath();
        cx.fill();

        // Collar highlights
        cx.strokeStyle = c(cfg.lapelCol || '#1e3352');
        cx.lineWidth = 1.5;
        cx.beginPath();
        cx.moveTo(shL[0] * 0.6 + shR[0] * 0.4, shL[1] * 0.6 + shR[1] * 0.4);
        cx.lineTo(ct[0], ct[1]);
        cx.lineTo(shL[0] * 0.4 + shR[0] * 0.6, shL[1] * 0.4 + shR[1] * 0.6);
        cx.stroke();
      } else {
        // Back seam
        cx.strokeStyle = c(cfg.lapelCol || '#1e3352');
        cx.lineWidth = 1.4;
        cx.beginPath();
        cx.moveTo((shL[0] + shR[0]) / 2, (shL[1] + shR[1]) / 2);
        cx.lineTo((hpL[0] + hpR[0]) / 2, (hpL[1] + hpR[1]) / 2);
        cx.stroke();
      }

      // Belt
      cx.strokeStyle = c(cfg.beltCol || '#181410');
      cx.lineWidth = 2.4 * sf;
      cx.beginPath();
      cx.moveTo(hpL[0], hpL[1]);
      cx.lineTo(hpR[0], hpR[1]);
      cx.stroke();
      cx.restore();
    }

    function drawArm(pSh, pHand, sleeveCol, skinCol, wArm) {
      cx.save();
      const midX = (pSh[0] + pHand[0]) * 0.5 + (isZombie ? 3 * sf : 1 * sf);
      const midY = (pSh[1] + pHand[1]) * 0.5 + 2 * sf;

      cx.lineCap = 'round';
      cx.strokeStyle = c(sleeveCol);
      cx.lineWidth = wArm;
      cx.beginPath();
      cx.moveTo(pSh[0], pSh[1]);
      cx.lineTo(midX, midY);
      cx.lineTo(pHand[0], pHand[1]);
      cx.stroke();

      // Hand
      cx.fillStyle = c(skinCol);
      cx.beginPath();
      cx.arc(pHand[0], pHand[1], 2.4 * sf, 0, Math.PI * 2);
      cx.fill();
      cx.restore();
    }

    function drawHead(pHead) {
      cx.save();
      const headR = 5.2 * sf;

      // Face base
      cx.fillStyle = c(cfg.skinCol || '#d9a67e');
      cx.beginPath();
      cx.arc(pHead[0], pHead[1], headR, 0, Math.PI * 2);
      cx.fill();

      // Hair
      cx.fillStyle = c(cfg.hairCol || '#241b14');
      cx.beginPath();
      if (!isFacingFront) {
        // Full back hair
        cx.arc(pHead[0], pHead[1] - 0.5 * sf, headR * 0.98, 0, Math.PI * 2);
      } else {
        // Front fringe & sides
        cx.arc(pHead[0], pHead[1] - 1.2 * sf, headR * 0.96, Math.PI * 0.85, Math.PI * 2.15);
      }
      cx.fill();

      // Facial features when front-facing
      if (isFacingFront && !isFlash && !isZombie) {
        cx.fillStyle = cfg.eyeCol || '#181614';
        const eyeOffset = isFacingLeft ? -1.8 * sf : isFacingRight ? 1.8 * sf : 0;
        cx.fillRect(pHead[0] - 2.2 * sf + eyeOffset, pHead[1] - 1 * sf, 1.6 * sf, 1.6 * sf);
        cx.fillRect(pHead[0] + 0.8 * sf + eyeOffset, pHead[1] - 1 * sf, 1.6 * sf, 1.6 * sf);
      } else if (isZombie && !isFlash) {
        // Hollow dead eye sockets with faint infection glow
        cx.fillStyle = '#111410';
        cx.beginPath();
        cx.arc(pHead[0] - 1.8 * sf, pHead[1] - 0.5 * sf, 1.5 * sf, 0, Math.PI * 2);
        cx.arc(pHead[0] + 1.8 * sf, pHead[1] - 0.5 * sf, 1.5 * sf, 0, Math.PI * 2);
        cx.fill();
      }
      cx.restore();
    }

    // Execute Depth-Sorted Body Pass
    cx.save();
    if (cfg.alpha !== undefined) cx.globalAlpha *= cfg.alpha;
    for (let i = 0; i < parts.length; i++) {
      parts[i].draw();
    }
    cx.restore();

    return {
      handR: sHandR,
      handL: sHandL,
      head: sHead,
      isFacingFront,
      isFacingLeft,
      isFacingRight,
      fwdX, fwdY, latX, latY,
      scale: sf
    };
  }

  // =========================================================================
  // 2. DAVID, NANCY & ENEMY ADAPTERS
  // =========================================================================

  // --- DAVID ---
  window.drawDavid = function (p, lv) {
    const isAttacking = p.swT > 0;
    // Scale 1.35 matches realistic door/car/wall proportions (~56px total height)
    const sc = 1.35;

    const rig = drawKinematicIsoHumanoid(p, {
      scale: sc,
      pantsCol: '#232934',
      shoeCol: '#121110',
      jacketCol: '#27436b',
      lapelCol: '#1a2e4a',
      shirtCol: '#8ca0b3',
      skinCol: '#e0b08a',
      hairCol: '#241b12',
      beltCol: '#161310',
      alpha: p.dodT > 0 ? 0.55 : 1,
      flash: p.hurtT > 0,
      shadowAlpha: 0.44
    });

    const handX = rig.handR[0];
    const handY = rig.handR[1];
    const sf = rig.scale;

    // Dynamic Steel Pipe Swivel & Swing Arc
    cx.save();
    let pipeAng = rig.isFacingLeft ? 2.3 : 0.8;
    let pipeLen = 22 * sf;

    if (isAttacking) {
      const k = 1 - p.swT / 0.2;
      const swingProg = Math.sin(k * Math.PI * 0.5);
      pipeAng = rig.isFacingLeft ? (3.4 - swingProg * 3.2) : (-1.0 + swingProg * 3.2);
      pipeLen = 26 * sf;
    } else if (!p.still) {
      pipeAng += Math.sin((p.ph || 0) * 1.2) * 0.22;
    } else {
      pipeAng += Math.sin((window.T || 0) * 2.2) * 0.08;
    }

    // Pipe Shadow
    cx.strokeStyle = 'rgba(0,0,0,0.35)';
    cx.lineWidth = 3.8 * sf;
    cx.lineCap = 'round';
    cx.beginPath();
    cx.moveTo(handX + 2, handY + 2);
    cx.lineTo(handX + 2 + Math.cos(pipeAng) * pipeLen, handY + 2 + Math.sin(pipeAng) * pipeLen);
    cx.stroke();

    // Steel Pipe Body
    cx.strokeStyle = isAttacking ? '#ffffff' : '#c8d4df';
    cx.lineWidth = 2.8 * sf;
    cx.beginPath();
    cx.moveTo(handX, handY);
    cx.lineTo(handX + Math.cos(pipeAng) * pipeLen, handY + Math.sin(pipeAng) * pipeLen);
    cx.stroke();

    // Grip wrapping
    cx.strokeStyle = '#4e3a2b';
    cx.lineWidth = 3.4 * sf;
    cx.beginPath();
    cx.moveTo(handX, handY);
    cx.lineTo(handX + Math.cos(pipeAng) * 6 * sf, handY + Math.sin(pipeAng) * 6 * sf);
    cx.stroke();
    cx.restore();

    // Hand-Drawn Weapon Slash Arc Trail
    if (isAttacking) {
      const k = 1 - p.swT / 0.2;
      cx.save();
      const grad = cx.createRadialGradient(isx(p.x, p.y), isy(p.x, p.y, 0.6), 14, isx(p.x, p.y), isy(p.x, p.y, 0.6), 56);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.92 * (1 - k)})`);
      grad.addColorStop(0.4, `rgba(180, 225, 255, ${0.55 * (1 - k)})`);
      grad.addColorStop(1, 'rgba(100, 190, 255, 0)');

      cx.strokeStyle = grad;
      cx.lineWidth = 8;
      cx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const a = p.swA - 1.25 + 2.5 * Math.min(1, k + 0.16) * (i / 14);
        const r = 1.85;
        const wx = p.x + Math.cos(a) * r;
        const wy = p.y + Math.sin(a) * r;
        if (i === 0) cx.moveTo(isx(wx, wy), isy(wx, wy, 0.65));
        else cx.lineTo(isx(wx, wy), isy(wx, wy, 0.65));
      }
      cx.stroke();

      cx.strokeStyle = `rgba(255, 255, 255, ${0.95 * (1 - k)})`;
      cx.lineWidth = 2.6;
      cx.stroke();
      cx.restore();
    }

    // Nancy carried
    if (p.carry) {
      drawKinematicIsoHumanoid({
        x: p.x + Math.cos(p.f + 1.4) * 0.28,
        y: p.y + Math.sin(p.f + 1.4) * 0.28,
        z: 0.55,
        f: p.f,
        ph: 0,
        still: true
      }, {
        scale: 0.95,
        isNancy: true,
        pantsCol: '#9e322b',
        shoeCol: '#4a1e1a',
        jacketCol: '#e8c23a',
        lapelCol: '#d4ad28',
        shirtCol: '#f4dc70',
        skinCol: '#f0c8a0',
        hairCol: '#4e2d14',
        shadowAlpha: 0
      });
    }
  };

  // --- NANCY ---
  window.drawNancy = function (d) {
    const sc = 0.98; // Proportional child scale (~40px height, reaching David's chest)
    const shudder = (d.scared > 0.5) ? Math.sin((window.T || 0) * 45) * 1.5 : 0;

    drawKinematicIsoHumanoid({
      x: d.x + (shudder ? shudder * 0.015 : 0),
      y: d.y,
      f: d.f,
      ph: d.ph,
      still: Math.hypot(d.vx || 0, d.vy || 0) < 0.05
    }, {
      scale: sc,
      isNancy: true,
      pantsCol: '#9e322b',
      shoeCol: '#4a1e1a',
      jacketCol: '#e8c23a',
      lapelCol: '#d4ad28',
      shirtCol: '#f4dc70',
      skinCol: '#f0c8a0',
      hairCol: '#4e2d14',
      flash: d.hT > 1.7,
      shadowAlpha: 0.36
    });

    if (d.trust < 35) {
      cx.save();
      cx.globalAlpha = 0.85;
      cx.fillStyle = '#ffb04a';
      cx.font = 'bold 15px "Share Tech Mono", monospace';
      cx.textAlign = 'center';
      cx.fillText('!', isx(d.x, d.y), isy(d.x, d.y, 0) - 56);
      cx.restore();
    }
  };

  // --- ENEMIES (Drifters, Stalkers, Bloated, Boss Maya) ---
  const origDrawEnemy = window.drawEnemy;
  window.drawEnemy = function (e) {
    if (e.type === 'boss') {
      if (typeof drawBloomWife === 'function') {
        drawBloomWife(e);
        return;
      }
      return origDrawEnemy.call(this, e);
    }

    if (e.type === 'drifter') {
      const sc = 1.30 * (e.sc || 1); // Adult infected zombie (~53px height)

      drawKinematicIsoHumanoid(e, {
        scale: sc,
        isZombie: true,
        gait: 1.25,
        pantsCol: '#262422',
        shoeCol: '#121212',
        jacketCol: e.shirt || '#5a4234',
        lapelCol: '#3e2d23',
        shirtCol: '#735746',
        skinCol: '#7b8c6e',
        hairCol: '#191715',
        flash: e.hurtT > 0,
        shadowAlpha: 0.4
      });

      // Winding Attack Telegraph (Claw streaks)
      if (e.wind > 0) {
        cx.save();
        cx.strokeStyle = 'rgba(235, 50, 50, 0.85)';
        cx.lineWidth = 2.4;
        const clawX = isx(e.x, e.y);
        const clawY = isy(e.x, e.y, 0.8 * sc);
        for (let i = -1; i <= 1; i++) {
          cx.beginPath();
          cx.moveTo(clawX, clawY + i * 5);
          cx.lineTo(clawX + Math.cos(e.f) * 16 * sc, clawY + Math.sin(e.f) * 10 * sc + i * 4);
          cx.stroke();
        }
        cx.restore();
      }
      return;
    }

    if (e.type === 'stalker') {
      const sc = 1.15 * (e.sc || 1);
      drawKinematicIsoHumanoid(e, {
        scale: sc,
        isZombie: true,
        gait: 1.5,
        pantsCol: '#141c18',
        shoeCol: '#0a100d',
        jacketCol: '#1a2b24',
        lapelCol: '#111f19',
        shirtCol: '#243b31',
        skinCol: '#385244',
        hairCol: '#080d0b',
        eyeCol: '#38ffe0',
        flash: e.hurtT > 0,
        shadowAlpha: 0.36
      });

      // Sharp cyan-glowing fungal blade growths
      const sx = isx(e.x, e.y);
      const sy = isy(e.x, e.y, 0.6 * sc);
      cx.save();
      cx.strokeStyle = '#38ffe0';
      cx.lineWidth = 2.0;
      cx.beginPath();
      cx.moveTo(sx - 10 * sc, sy);
      cx.lineTo(sx - 20 * sc, sy + 8 * sc);
      cx.moveTo(sx + 10 * sc, sy);
      cx.lineTo(sx + 20 * sc, sy + 8 * sc);
      cx.stroke();
      cx.restore();
      return;
    }

    return origDrawEnemy.call(this, e);
  };

  // =========================================================================
  // 3. UNIFIED ISOMETRIC SURVIVAL HORROR VEHICLES & PROPS
  // =========================================================================
  if (typeof PD !== 'undefined') {

    /**
     * Renders detailed 3D isometric vehicles (Sedan, Wreck, Burned Husk).
     * Proportions match street grid and character scale.
     */
    function renderDetailedIsoCar(p, isWreck, isBurned) {
      const isHorizontal = p.w >= p.d;
      const w = p.w;
      const d = p.d;
      const x = p.x;
      const y = p.y;

      // Contact shadow anchored precisely under car base
      drawGroundShadow(p.cx, p.cy, Math.max(w, d) * 0.54, Math.min(w, d) * 0.34, 0.45);

      // Color scheme
      let bodyCol = p.col || '#2d333a';
      let roofCol = mixc(bodyCol, 1.15);
      let glassCol = '#15222e';
      let chromeCol = '#68727b';
      let tireCol = '#141414';

      if (isBurned) {
        bodyCol = '#141414';
        roofCol = '#0d0d0d';
        glassCol = '#080808';
        chromeCol = '#2a2a2a';
      } else if (isWreck) {
        bodyCol = mixc(bodyCol, 0.85);
        roofCol = mixc(bodyCol, 0.95);
        glassCol = '#202e38';
      }

      const tireH = 0.28;
      if (isHorizontal) {
        // Horizontal street orientation (facing Southeast)
        const tireInsetX1 = 0.22;
        const tireInsetX2 = w - 0.58;
        box(x + tireInsetX1, y - 0.02, 0, 0.38, 0.15, tireH, tireCol, true);
        box(x + tireInsetX2, y - 0.02, 0, 0.38, 0.15, tireH, tireCol, true);
        box(x + tireInsetX1, y + d - 0.13, 0, 0.38, 0.15, tireH, tireCol, true);
        box(x + tireInsetX2, y + d - 0.13, 0, 0.38, 0.15, tireH, tireCol, true);

        // Lower Chassis Skirt
        box(x + 0.08, y + 0.04, 0.1, w - 0.16, d - 0.08, 0.12, '#121416');

        // Main Car Body (Fenders, Doors, Hood, Trunk)
        box(x, y, 0.22, w, d, 0.46, bodyCol);

        // Front Grille & Headlights
        box(x + w - 0.03, y + 0.15, 0.26, 0.05, d - 0.3, 0.28, chromeCol, true);
        if (!isBurned) {
          glowDot(x + w, y + 0.22, 0.42, 4.5, isWreck ? '#a09070' : '#fff0b0', isWreck ? 0.3 : 0.65);
          glowDot(x + w, y + d - 0.22, 0.42, 4.5, isWreck ? '#a09070' : '#fff0b0', isWreck ? 0.3 : 0.65);
        }

        // Taillights
        box(x - 0.02, y + 0.18, 0.4, 0.04, 0.22, 0.14, '#8a1818', true);
        box(x - 0.02, y + d - 0.4, 0.4, 0.04, 0.22, 0.14, '#8a1818', true);

        // Cabin Greenhouse (Windshield, Side Windows, Roof)
        const cabX = x + w * 0.26;
        const cabW = w * 0.48;
        const cabD = d - 0.16;
        box(cabX, y + 0.08, 0.68, cabW, cabD, 0.44, bodyCol);

        // Glass areas with dark reflections
        box(cabX - 0.02, y + 0.09, 0.73, cabW + 0.04, cabD - 0.02, 0.32, glassCol, true);
        // Roof cap
        box(cabX + 0.06, y + 0.12, 1.12, cabW - 0.12, cabD - 0.08, 0.05, roofCol, true);

        // Wreck details: Dented crumpled hood, spiderweb crack
        if (isWreck) {
          box(x + w * 0.72, y + 0.1, 0.66, 0.35, d * 0.6, 0.12, '#3a251b', true);
          cx.save();
          cx.strokeStyle = 'rgba(255,255,255,0.35)';
          cx.lineWidth = 1;
          const gx = isx(cabX + cabW * 0.8, y + d * 0.5);
          const gy = isy(cabX + cabW * 0.8, y + d * 0.5, 0.88);
          cx.beginPath();
          cx.moveTo(gx, gy);
          cx.lineTo(gx - 8, gy - 6);
          cx.lineTo(gx + 6, gy - 9);
          cx.stroke();
          cx.restore();
        }

        // Burned details: Flickering embers inside
        if (isBurned) {
          const ft = 0.5 + 0.5 * Math.sin((window.T || 0) * 8 + p.x);
          glowDot(cabX + cabW * 0.5, y + d * 0.5, 0.55, 14 + ft * 8, '#ff6a20', 0.45 + ft * 0.35);
        }

      } else {
        // Vertical cross-street orientation (facing Southwest)
        const tireInsetY1 = 0.22;
        const tireInsetY2 = d - 0.58;
        box(x - 0.02, y + tireInsetY1, 0, 0.15, 0.38, tireH, tireCol, true);
        box(x - 0.02, y + tireInsetY2, 0, 0.15, 0.38, tireH, tireCol, true);
        box(x + w - 0.13, y + tireInsetY1, 0, 0.15, 0.38, tireH, tireCol, true);
        box(x + w - 0.13, y + tireInsetY2, 0, 0.15, 0.38, tireH, tireCol, true);

        // Lower Chassis Skirt
        box(x + 0.04, y + 0.08, 0.1, w - 0.08, d - 0.16, 0.12, '#121416');

        // Main Car Body
        box(x, y, 0.22, w, d, 0.46, bodyCol);

        // Front Grille & Headlights (Facing south +Y)
        box(x + 0.15, y + d - 0.03, 0.26, w - 0.3, 0.05, 0.28, chromeCol, true);
        if (!isBurned) {
          glowDot(x + 0.22, y + d, 0.42, 4.5, isWreck ? '#a09070' : '#fff0b0', isWreck ? 0.3 : 0.65);
          glowDot(x + w - 0.22, y + d, 0.42, 4.5, isWreck ? '#a09070' : '#fff0b0', isWreck ? 0.3 : 0.65);
        }

        // Cabin Greenhouse
        const cabY = y + d * 0.26;
        const cabH = d * 0.48;
        const cabW = w - 0.16;
        box(x + 0.08, cabY, 0.68, cabW, cabH, 0.44, bodyCol);
        box(x + 0.09, cabY - 0.02, 0.73, cabW - 0.02, cabH + 0.04, 0.32, glassCol, true);
        box(x + 0.12, cabY + 0.06, 1.12, cabW - 0.08, cabH - 0.12, 0.05, roofCol, true);

        if (isWreck) {
          box(x + 0.1, y + d * 0.72, 0.66, w * 0.6, 0.35, 0.12, '#3a251b', true);
        }
        if (isBurned) {
          const ft = 0.5 + 0.5 * Math.sin((window.T || 0) * 8 + p.x);
          glowDot(x + w * 0.5, cabY + cabH * 0.5, 0.55, 14 + ft * 8, '#ff6a20', 0.45 + ft * 0.35);
        }
      }
    }

    if (PD.car) PD.car.draw = p => renderDetailedIsoCar(p, false, false);
    if (PD.carwreck) PD.carwreck.draw = p => renderDetailedIsoCar(p, true, false);
    if (PD.carburn) PD.carburn.draw = p => renderDetailedIsoCar(p, false, true);

    // --- SOFA ---
    if (PD.sofa) {
      PD.sofa.draw = function (p) {
        const c = p.col || '#3a2b22'; // Dark weathered leather/velvet
        drawGroundShadow(p.cx, p.cy, p.w * 0.48, p.d * 0.3, 0.38);

        // 4 Wooden corner feet
        const legH = 0.14;
        box(p.x + 0.06, p.y + 0.06, 0, 0.1, 0.1, legH, '#1c130d', true);
        box(p.x + p.w - 0.16, p.y + 0.06, 0, 0.1, 0.1, legH, '#1c130d', true);
        box(p.x + 0.06, p.y + p.d - 0.16, 0, 0.1, 0.1, legH, '#1c130d', true);
        box(p.x + p.w - 0.16, p.y + p.d - 0.16, 0, 0.1, 0.1, legH, '#1c130d', true);

        // Base frame
        box(p.x, p.y, legH, p.w, p.d, 0.32, c);

        // Backrest
        const isBackSouth = p.back === 's';
        if (isBackSouth) {
          box(p.x, p.y + p.d - 0.28, legH + 0.32, p.w, 0.28, 0.55, c);
        } else {
          box(p.x, p.y, legH + 0.32, p.w, 0.28, 0.55, c);
        }

        // Armrests
        box(p.x, p.y, legH + 0.28, 0.24, p.d, 0.32, mixc(c, 0.9));
        box(p.x + p.w - 0.24, p.y, legH + 0.28, 0.24, p.d, 0.32, mixc(c, 0.9));

        // Plush seat cushions with center crease
        const seatY = isBackSouth ? p.y : p.y + 0.28;
        const seatD = p.d - 0.28;
        box(p.x + 0.24, seatY, legH + 0.32, (p.w - 0.48) * 0.48, seatD, 0.12, mixc(c, 1.15));
        box(p.x + 0.24 + (p.w - 0.48) * 0.52, seatY, legH + 0.32, (p.w - 0.48) * 0.48, seatD, 0.12, mixc(c, 1.15));
      };
    }

    // --- DINING TABLE ---
    if (PD.table) {
      PD.table.draw = function (p) {
        const c = p.col || '#4e3825'; // Walnut/oak
        drawGroundShadow(p.cx, p.cy, p.w * 0.46, p.d * 0.28, 0.35);

        // 4 Turned corner legs
        const legW = 0.12, legH = 0.72;
        box(p.x + 0.05, p.y + 0.05, 0, legW, legW, legH, mixc(c, 0.65), true);
        box(p.x + p.w - 0.17, p.y + 0.05, 0, legW, legW, legH, mixc(c, 0.65), true);
        box(p.x + 0.05, p.y + p.d - 0.17, 0, legW, legW, legH, mixc(c, 0.65), true);
        box(p.x + p.w - 0.17, p.y + p.d - 0.17, 0, legW, legW, legH, mixc(c, 0.65), true);

        // Support apron
        box(p.x + 0.08, p.y + 0.08, legH - 0.12, p.w - 0.16, p.d - 0.16, 0.12, mixc(c, 0.75), true);

        // Solid beveled tabletop with wood grain lines
        box(p.x, p.y, legH, p.w, p.d, 0.1, c);
      };
    }

    // --- BED ---
    if (PD.bed) {
      PD.bed.draw = function (p) {
        const woodCol = '#382416';
        drawGroundShadow(p.cx, p.cy, p.w * 0.48, p.d * 0.32, 0.4);

        // Wood frame
        box(p.x, p.y, 0, p.w, p.d, 0.36, woodCol);
        // Headboard
        box(p.x, p.y, 0.36, p.w, 0.14, 0.65, mixc(woodCol, 0.9));
        // Footboard
        box(p.x, p.y + p.d - 0.12, 0.36, p.w, 0.12, 0.32, mixc(woodCol, 0.9));

        // Mattress
        box(p.x + 0.06, p.y + 0.14, 0.36, p.w - 0.12, p.d - 0.24, 0.24, '#d8d4c7');

        // Rumpled Duvet Blanket
        const duvetCol = p.col || '#2d3f52'; // Midnight blue
        box(p.x + 0.06, p.y + 0.95, 0.58, p.w - 0.12, p.d - 1.05, 0.12, duvetCol);

        // Textured folded pillow
        box(p.x + 0.18, p.y + 0.22, 0.58, p.w * 0.64, 0.44, 0.14, '#f2ede2');
      };
    }

    // --- KITCHEN COUNTER ---
    if (PD.counter) {
      PD.counter.draw = function (p) {
        const c = p.col || '#4e3928';
        drawGroundShadow(p.cx, p.cy, p.w * 0.46, p.d * 0.28, 0.35);

        // Base cabinetry
        box(p.x, p.y, 0, p.w, p.d, 0.86, c);
        // Granite/laminate countertop with bevel
        box(p.x - 0.03, p.y - 0.03, 0.86, p.w + 0.06, p.d + 0.06, 0.08, '#cfc8b8');
        // Cabinet doors & drawer fronts
        fr(p, 0.06, 0.94, 0.12, 0.76, mixc(c, 0.8));
      };
    }
  }

  console.log('[THE BLOOM] Kinematic 3D-Projected Isometric Engine Active.');
})();
