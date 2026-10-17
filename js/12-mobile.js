'use strict';
/* ============================================================
   THE BLOOM — Mobile Architecture & Character Showcase Engine
   File: 12-mobile.js
   ------------------------------------------------------------
   1. Fast-boot mobile detection (instant load, 0s delay).
   2. Mobile Unplayable Blocker (desktop required for full 2.5D gameplay).
   3. Interactive 2.5D Character Showcase & Diorama Turntable
      (David, Nancy, Maya, Drifter, Stalker, Bloated).
   4. Auto-Cycle mode ("see the characters for a while").
   ============================================================ */

(function (global) {
  // 1. Mobile Detection (Immediate, ultra-lightweight)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 820 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

  global.IS_MOBILE = isMobile;

  if (isMobile) {
    document.body.classList.add('mobile');
    document.documentElement.classList.add('is-mobile-device');
    // Immediate boot-shield release on mobile
    window.addEventListener('DOMContentLoaded', () => {
      const shield = document.getElementById('boot-shield');
      if (shield) shield.classList.add('boot-ready');
    });
  }

  // 2. Character Data Roster
  const CHARACTERS = [
    {
      id: 'david',
      name: 'DAVID MERCER',
      shortName: 'DAVID',
      role: 'SURVIVOR // PROTECTIVE FATHER',
      threat: 'PROTAGONIST',
      status: 'ALIVE // EXHAUSTED',
      col: '#e8dcae',
      badgeCol: '#3aff70',
      quote: '"I\'ve got you, Nancy. Don\'t look back."',
      desc: 'Former Coast Guard mechanic. When the fungal bloom swallowed Cedar Ridge, David barricaded the living room with a lead pipe and a single promise: Nancy will survive the night.',
      draw: function (g, x, y, angle, phase) {
        if (typeof window.drawDavid === 'function') {
          window.drawDavid({
            x: x, y: y, f: angle, ph: phase, still: false,
            swT: 0, dodT: 0, hurtT: 0, sprint: false
          });
        } else {
          shadow(x, y, 0.44);
          human(x, y, {
            f: angle, ph: phase, sc: 1.08,
            sh: '#35567e', ar: '#2c4a6e', jk: '#27436b',
            pn: '#2b2f3a', sk: '#e0b08a', hr: '#2a1c10',
            wp: '#c3c9cf', wa: angle + 0.35, wl: 1.15
          });
        }
        haloRing(x, y, '#3aff70');
      }
    },
    {
      id: 'nancy',
      name: 'NANCY MERCER',
      shortName: 'NANCY',
      role: 'COMPANION // DAUGHTER',
      threat: 'PROTECT AT ALL COSTS',
      status: 'ALIVE // TRAUMATIZED',
      col: '#ffd34d',
      badgeCol: '#ffd34d',
      quote: '"Papa, please... keep holding my hand."',
      desc: 'Eight years old. Clings to her yellow rain slicker from the beach. When infected approach, Nancy ducks into a cower and shivers with terror. If David falls, hope dies with him.',
      draw: function (g, x, y, angle, phase) {
        if (typeof window.drawNancy === 'function') {
          window.drawNancy({
            x: x, y: y, f: angle, ph: phase,
            vx: 0.1, vy: 0.1, scared: 0, hT: 0
          });
        } else {
          shadow(x, y, 0.34);
          human(x, y, {
            f: angle, ph: phase, sc: 0.78,
            sh: '#e8c23a', ar: '#e8c23a', dress: 1,
            pn: '#f0c8a0', sk: '#f0c8a0', hr: '#5a3418',
            hair2: 1, arms: 'down'
          });
        }
        haloRing(x, y, '#ffd34d');
      }
    },
    {
      id: 'maya',
      name: 'MAYA MERCER (THE BLOOM-WIFE)',
      shortName: 'MAYA',
      role: 'PATIENT ZERO // TRAGIC MOTHER',
      threat: 'BOSS // LETHAL MUTATION',
      status: 'INFECTED // ADVANCED METAMORPHOSIS',
      col: '#d68cff',
      badgeCol: '#c040ff',
      quote: '"David, run... while I can still feel your face... shoot me..."',
      desc: 'Marine researcher who investigated the dead coastal shoals. The mycelium re-engineered her into a weeping botanical predator, yet fragments of her human soul still fight to warn David.',
      draw: function (g, x, y, angle, phase) {
        if (typeof window.drawMayaSprite === 'function') {
          window.drawMayaSprite({
            x: x, y: y, f: angle, ph: phase, phase: 2, bs: 'walk', sc: 1.34, hurtT: 0
          });
        } else if (typeof drawBloomWife === 'function') {
          drawBloomWife({ x: x, y: y, f: angle, ph: phase, phase: 2, bs: 'walk', sc: 1.35, max: 260, hp: 260 });
        } else {
          shadow(x, y, 0.65, 0.4);
          human(x, y, {
            f: angle, ph: phase, sc: 1.35,
            sh: '#5a2f6a', ar: '#c9b8d0', pn: '#3a1f4a', sk: '#c9b8d0', hr: '#14101c',
            dress: 1, hair2: 1, arms: 'fwd', glow: '#e060ff', eye: '#e060ff'
          });
        }
      }
    },
    {
      id: 'drifter',
      name: 'THE DRIFTER',
      shortName: 'DRIFTER',
      role: 'COMMON INFECTED HOST',
      threat: 'MODERATE // SWARM RUNNER',
      status: 'DECEASED // PARASITIC PUPPET',
      col: '#ff8a5a',
      badgeCol: '#ff5a5a',
      quote: '"*Guttural rasping beneath calcified lungs*"',
      desc: 'Local coastal residents caught in the initial spore burst. Shambles erratically until provoked by running footsteps or flashlight beams, then lunges with relentless aggression.',
      draw: function (g, x, y, angle, phase) {
        if (typeof window.drawEnemy === 'function') {
          window.drawEnemy({
            type: 'drifter', x: x, y: y, f: angle, ph: phase, still: false, hurtT: 0, sc: 1.25
          });
        } else {
          shadow(x, y, 0.42);
          human(x, y, {
            f: angle, ph: phase, sc: 1.05,
            sh: '#4a3a2e', ar: '#3a2c20', pn: '#25201c',
            sk: '#6a7860', hr: '#15110e', arms: 'fwd',
            glow: '#ff4020', eye: '#ff3520'
          });
        }
      }
    },
    {
      id: 'stalker',
      name: 'THE STALKER',
      shortName: 'STALKER',
      role: 'RAPID QUADRUPED HUNTER',
      threat: 'HIGH // AMBUSH PREDATOR',
      status: 'MUTATED // APEX TRACKER',
      col: '#38ffe0',
      badgeCol: '#38ffe0',
      quote: '"*Chitinous clicking along concrete overpasses*"',
      desc: 'Carnivorous mutation that nests inside highway overpasses and tree branches. Sprints at high velocity, evading head-on combat and lunging at vulnerable flanks.',
      draw: function (g, x, y, angle, phase) {
        if (typeof window.drawEnemy === 'function') {
          window.drawEnemy({
            type: 'stalker', x: x, y: y, f: angle, ph: phase * 1.3, still: false, hurtT: 0, sc: 1.15
          });
        } else {
          shadow(x, y, 0.52, 0.4);
          human(x, y, {
            f: angle, ph: phase * 1.4, sc: 1.08, z: -0.1,
            sh: '#1a2a24', ar: '#2d3d34', pn: '#101815',
            sk: '#3d5045', hr: '#0a120e', arms: 'fwd',
            glow: '#38ffe0', eye: '#38ffe0'
          });
        }
      }
    },
    {
      id: 'bloated',
      name: 'THE BLOATED',
      shortName: 'BLOATED',
      role: 'VOLATILE SPORE CARRIER',
      threat: 'EXTREME // EXPLOSIVE HAZARD',
      status: 'NECROTIC // ACID RESERVOIR',
      col: '#98ff40',
      badgeCol: '#98ff40',
      quote: '"*Fetid gurgling of chemical boil*"',
      desc: 'Massive, distended carrier filled with caustic bioluminescent acid and fungal spores. Upon fatal damage, its thorax ruptures into a lethal area-of-effect acid burst.',
      draw: function (g, x, y, angle, phase) {
        if (typeof window.drawEnemy === 'function') {
          window.drawEnemy({
            type: 'bloated', x: x, y: y, sc: 1.35, f: angle, ph: phase, seed: 1, max: 95, hp: 95, dead: false, dying: false
          });
        } else {
          shadow(x, y, 0.85 * 1.35, 0.45);
          bx(x, y, 0, 0.45 * 1.35, 0.45 * 1.35, '#2f3824');
        }
      }
    }
  ];

  // 3. Showcase State & Animation Loop
  let currentIndex = 0;
  let currentAngle = Math.PI * 0.25;
  let walkPhase = 0;
  let autoCycle = true;
  let autoCycleTimer = 0;
  const CYCLE_INTERVAL = 6.5; // seconds per character
  let isDragging = false;
  let lastTouchX = 0;
  let animReq = null;
  let containerEl = null;
  let canvasEl = null;
  let ctx = null;
  let isMobileMode = false;

  function initShowcaseUI() {
    if (document.getElementById('bcs-container')) return;

    const wrap = document.createElement('div');
    wrap.id = 'bcs-container';
    wrap.className = 'bcs-overlay';
    wrap.innerHTML = `
      <div class="bcs-shell">
        <div class="bcs-header">
          <img src="logo.svg" alt="THE BLOOM" class="bcs-logo">
          <div class="bcs-badge">DESKTOP EXCLUSIVE • MOBILE UNPLAYABLE</div>
          <button class="bcs-close-btn" id="bcs-close" style="display:none;" onclick="BloomCharacterShowcase.close()">✕ CLOSE</button>
        </div>

        <div class="bcs-stage-box">
          <canvas id="bcs-canvas" width="340" height="280"></canvas>
          <div class="bcs-angle-hint">⟲ DRAG TO ROTATE 360°</div>
        </div>

        <div class="bcs-tabs" id="bcs-tabs"></div>

        <div class="bcs-dossier" id="bcs-dossier">
          <div class="bcs-name-row">
            <span class="bcs-name" id="bcs-name">DAVID MERCER</span>
            <span class="bcs-threat" id="bcs-threat">PROTAGONIST</span>
          </div>
          <div class="bcs-role" id="bcs-role">SURVIVOR // PROTECTIVE FATHER</div>
          <div class="bcs-quote" id="bcs-quote">"I've got you, Nancy. Don't look back."</div>
          <div class="bcs-desc" id="bcs-desc"></div>
        </div>

        <div class="bcs-footer">
          <button class="bcs-cycle-btn" id="bcs-cycle-btn" onclick="BloomCharacterShowcase.toggleAutoCycle()">AUTO-CYCLE: ON</button>
          <div class="bcs-notice" id="bcs-notice">
            THE BLOOM is a 2.5D survival-horror game requiring physical keyboard WASD movement, flashlight steering, dodge timing, and precision mouse aim. Playable exclusively on desktop browsers.
            <br><span style="color:#4dffa0;">Desktop URL: <b>http://localhost:1954</b></span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    containerEl = wrap;
    canvasEl = document.getElementById('bcs-canvas');
    ctx = canvasEl.getContext('2d');

    // Build tabs
    const tabsContainer = document.getElementById('bcs-tabs');
    CHARACTERS.forEach((char, idx) => {
      const btn = document.createElement('button');
      btn.className = 'bcs-tab' + (idx === 0 ? ' active' : '');
      btn.textContent = char.shortName || (char.name.startsWith('THE ') ? char.name.replace('THE ', '') : char.name.split(' ')[0]);
      btn.onclick = () => {
        select(idx);
        autoCycle = false;
        updateCycleButton();
      };
      tabsContainer.appendChild(btn);
    });

    // Touch / Drag controls on canvas
    canvasEl.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      isDragging = true;
      lastTouchX = e.touches[0].clientX;
    }, { passive: true });

    canvasEl.addEventListener('touchmove', (e) => {
      if (!isDragging || !e.touches[0]) return;
      const dx = e.touches[0].clientX - lastTouchX;
      lastTouchX = e.touches[0].clientX;
      currentAngle += dx * 0.02;
      autoCycle = false;
      updateCycleButton();
    }, { passive: true });

    canvasEl.addEventListener('touchend', () => { isDragging = false; });

    canvasEl.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastTouchX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastTouchX;
      lastTouchX = e.clientX;
      currentAngle += dx * 0.02;
      autoCycle = false;
      updateCycleButton();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  function select(index) {
    currentIndex = (index + CHARACTERS.length) % CHARACTERS.length;
    autoCycleTimer = 0;
    const char = CHARACTERS[currentIndex];

    // Update text
    document.getElementById('bcs-name').textContent = char.name;
    document.getElementById('bcs-threat').textContent = char.threat;
    document.getElementById('bcs-threat').style.borderColor = char.badgeCol;
    document.getElementById('bcs-threat').style.color = char.badgeCol;
    document.getElementById('bcs-role').textContent = char.role;
    document.getElementById('bcs-quote').textContent = char.quote;
    document.getElementById('bcs-quote').style.color = char.col;
    document.getElementById('bcs-desc').textContent = char.desc;

    // Update tabs
    const tabs = document.querySelectorAll('.bcs-tab');
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === currentIndex);
    });
  }

  function toggleAutoCycle() {
    autoCycle = !autoCycle;
    autoCycleTimer = 0;
    updateCycleButton();
  }

  function updateCycleButton() {
    const btn = document.getElementById('bcs-cycle-btn');
    if (!btn) return;
    btn.textContent = autoCycle ? 'AUTO-CYCLE: ON' : 'AUTO-CYCLE: PAUSED';
    btn.style.borderColor = autoCycle ? '#4dffa0' : '#888';
    btn.style.color = autoCycle ? '#4dffa0' : '#aaa';
  }

  function renderFrame(now) {
    if (!containerEl || containerEl.style.display === 'none') {
      animReq = null;
      return;
    }

    const dt = 0.016;
    walkPhase += dt * 3.2;

    if (!isDragging) {
      currentAngle += dt * 0.35; // Slow continuous cinematic turntable
    }

    if (autoCycle) {
      autoCycleTimer += dt;
      if (autoCycleTimer >= CYCLE_INTERVAL) {
        autoCycleTimer = 0;
        select(currentIndex + 1);
      }
    }

    // Render Character on Podium
    const cw = canvasEl.width;
    const ch = canvasEl.height;

    // Advance global T for spore, particle & breathing effects
    window.T = (window.T || 0) + dt;

    // Direct all global game rendering primitives (bx, poly, shadow, haloRing, glowDot) to this canvas
    const oldCx = typeof cx !== 'undefined' ? cx : window.cx;
    if (typeof cx !== 'undefined') cx = ctx;
    window.cx = ctx;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Deep radial backdrop
    const bgGrad = ctx.createRadialGradient(cw / 2, ch / 2, 20, cw / 2, ch / 2, cw * 0.55);
    bgGrad.addColorStop(0, 'rgba(18, 30, 24, 0.85)');
    bgGrad.addColorStop(0.65, 'rgba(8, 12, 10, 0.95)');
    bgGrad.addColorStop(1, 'rgba(4, 6, 8, 1)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Isometric circular pedestal
    const px = cw / 2;
    const py = ch / 2 + 50;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.52);

    // Outer glow ring
    ctx.strokeStyle = 'rgba(77, 255, 160, 0.32)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();

    // Inner filled pedestal
    ctx.fillStyle = '#101714';
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.fill();

    // Subtle compass / rotation ticks
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 58, Math.sin(a) * 58);
      ctx.lineTo(Math.cos(a) * 68, Math.sin(a) * 68);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Character centered on pedestal
    const char = CHARACTERS[currentIndex];
    const charZoom = 1.55;

    // Set canvas transform so world coordinate (0, 0, 0) projects directly onto pedestal surface (px, py)
    ctx.save();
    ctx.setTransform(charZoom, 0, 0, charZoom, px, py);

    // Call character draw function (x=0, y=0)
    try {
      char.draw(ctx, 0, 0, currentAngle, walkPhase, dt);
    } catch (e) {
      console.warn('Char draw error:', e);
      human(0, 0, { f: currentAngle, ph: walkPhase, sc: 1.0 });
    }
    ctx.restore();

    ctx.restore();
    if (typeof cx !== 'undefined') cx = oldCx;
    window.cx = oldCx;

    animReq = requestAnimationFrame(renderFrame);
  }

  function open(mobileOnly) {
    initShowcaseUI();
    isMobileMode = Boolean(mobileOnly);
    containerEl.style.display = 'flex';
    document.getElementById('bcs-close').style.display = isMobileMode ? 'none' : 'block';

    select(0);
    autoCycle = true;
    updateCycleButton();

    if (!animReq) {
      animReq = requestAnimationFrame(renderFrame);
    }
  }

  function close() {
    if (containerEl) {
      containerEl.style.display = 'none';
    }
    if (animReq) {
      cancelAnimationFrame(animReq);
      animReq = null;
    }
  }

  // 4. Public API & Global Hooks
  global.BloomCharacterShowcase = {
    open: open,
    close: close,
    select: select,
    toggleAutoCycle: toggleAutoCycle,
    CHARACTERS: CHARACTERS
  };

  global.showCharacters = function () {
    open(false);
  };

  global.showMobileBlocker = function () {
    open(true);
  };

  // 5. Automatic Mobile Boot Hook
  if (isMobile) {
    // Hide game HUD / overlays and open Character Showcase immediately
    window.addEventListener('load', () => {
      const shield = document.getElementById('boot-shield');
      if (shield) shield.classList.add('boot-ready');
      const hud = document.getElementById('hud');
      if (hud) hud.style.display = 'none';
      const ov = document.getElementById('ov');
      if (ov) ov.style.display = 'none';
      open(true);
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);