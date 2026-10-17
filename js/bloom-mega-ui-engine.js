/**

 * ============================================================================

 * THE BLOOM — MEGA UI/UX, DIEGETIC TELEMETRY & ATMOSPHERIC DIRECTOR

 * File: bloom-mega-ui-engine.js

 * ============================================================================

 * Classic script architecture (IIFE attaching to window.BloomMegaUI).

 * Zero ES module import/export statements. Safe for direct <script> loading.

 *

 * Subsystems included:

 *   1. Deterministic PRNG, Easing & Procedural WebAudio Micro-SFX Synthesizer

 *   2. Scoped Survival-Horror CSS Injector & DOM Decorator (#hud, #hl, #vig, #sub)

 *   3. Tactile Diegetic Bio-Monitor (David ECG/Stamina, Nancy Heart-Rate/Trust, Geiger Infection)

 *   4. Creeping Fungal Vein & Necrotic Vignette Renderer (#vig + #oc)

 *   5. Interactive 2.5D Tactical Item & Lore Inspector Modal (Paper Tilt, Stains, Transcript)

 *   6. Archival Collage B-Roll & CRT/VHS Distress Compositor (Polaroids, Maps, Dossiers)

 *   7. Hyperframes-Style Cinematic Director (Letterbox, Chapters 1-5, Camera Trauma/Focus, Subtitles)

 *   8. p5.js Instance-Mode Volumetric Atmosphere Overlay (with Canvas2D Fallback)

 * ============================================================================

 */

(function (global) {

  'use strict';



  // ==========================================================================

  // [SECTION 1] QUALITY PRESETS, CHAPTER LORE & ARCHIVAL PRESETS

  // ==========================================================================



  var QUALITY_PRESETS = {

    low: {

      tier: 'low',

      particleBudget: 40,

      fogRibbons: 2,

      enableCRTScanlines: false,

      enableChromaticAberration: false,

      enableFungalVeins: true,

      veinSegments: 14,

      ecgSampleRate: 30,

      reducedMotion: false

    },

    medium: {

      tier: 'medium',

      particleBudget: 95,

      fogRibbons: 4,

      enableCRTScanlines: true,

      enableChromaticAberration: true,

      enableFungalVeins: true,

      veinSegments: 28,

      ecgSampleRate: 45,

      reducedMotion: false

    },

    high: {

      tier: 'high',

      particleBudget: 180,

      fogRibbons: 6,

      enableCRTScanlines: true,

      enableChromaticAberration: true,

      enableFungalVeins: true,

      veinSegments: 46,

      ecgSampleRate: 60,

      reducedMotion: false

    }

  };



  var CHAPTER_PRESETS = {

    1: {

      chapterNumber: 'CHAPTER I',

      title: 'HOME DEFENCE',

      subtitle: 'QUARANTINE PERIMETER — SECTOR 4 OUTSKIRTS',

      timestamp: 'OCT 14 // 02:18 HRS // TEMP 4°C',

      epigraph: '“The sirens stopped three days ago. Only the pollen remains.”',

      collageType: 'evac_map',

      duration: 6.2

    },

    2: {

      chapterNumber: 'CHAPTER II',

      title: 'THE FACE I LOVED',

      subtitle: 'SAINT JUDE MEMORIAL — EAST TRIAGE WING',

      timestamp: 'OCT 14 // 04:41 HRS // BIO-CONTAINMENT BREACH',

      epigraph: '“Do not breathe the warm air near the vents.”',

      collageType: 'medical_dossier',

      duration: 6.2

    },

    3: {

      chapterNumber: 'CHAPTER III',

      title: 'MILES OF SILENCE',

      subtitle: 'ABANDONED TRANSIT DEPOT & RAIL UNDERPASS',

      timestamp: 'OCT 14 // 06:12 HRS // SIGNAL DETECTED',

      epigraph: '“Keep your voice low. She trusts footsteps more than words.”',

      collageType: 'quarantine_flyer',

      duration: 6.2

    },

    4: {

      chapterNumber: 'CHAPTER IV',

      title: 'NO SAFE HAVEN',

      subtitle: 'MUNICIPAL FILTRATION & SUB-SURFACE CONDUITS',

      timestamp: 'OCT 14 // 09:05 HRS // SPORE DENSITY CRITICAL',

      epigraph: '“The concrete isn’t cracking—it’s being digested.”',

      collageType: 'family_polaroid',

      duration: 6.5

    },

    5: {

      chapterNumber: 'CHAPTER V',

      title: 'THE POINT OF NO RETURN',

      subtitle: 'EPICENTER — OVERGROWN BOTANICAL CONSERVATORY',

      timestamp: 'OCT 14 // 11:58 HRS // FINAL CONVERGENCE',

      epigraph: '“Every memory eventually takes root.”',

      collageType: 'family_polaroid',

      duration: 6.8

    }

  };



  var SPEAKER_PROFILES = {

    david: {

      name: 'DAVID MERCER',

      role: 'SURVIVOR',

      color: '#d4c5a9',

      accent: '#8c7a5b',

      pitchHz: 145

    },

    nancy: {

      name: 'NANCY',

      role: 'COMPANION',

      color: '#a8c4b8',

      accent: '#5b8272',

      pitchHz: 240

    },

    maya: {
      name: 'MAYA MERCER',
      role: 'THE BLOOM-WIFE',
      color: '#d68cff',
      accent: '#9a44c7',
      pitchHz: 210
    },

    radio: {

      name: 'EMERGENCY BROADCAST',

      role: 'EBS // 162.55 MHz',

      color: '#9cb86e',

      accent: '#5f7838',

      pitchHz: 420

    },

    system: {

      name: 'FIELD LOG',

      role: 'OBSERVATION',

      color: '#b0b5b8',

      accent: '#646a6e',

      pitchHz: 190

    }

  };



  var ITEM_PRESETS = {

    note_triage: {

      id: 'note_triage',

      title: 'TRIAGE SHIFT DIRECTIVE #409',

      category: 'MEDICAL LOG // SAINT JUDE',

      date: 'OCTOBER 11 — 23:15',

      paperStyle: 'clinical',

      stainType: 'blood_and_coffee',

      badgeCode: 'SJ-MED-04',

      body: 'Effective immediately, patients exhibiting Stage-2 sub-dermal filaments are to be moved to Basement Annex B.\n\nAnalgesics have zero effect once the fruiting bodies breach the collarbone. If a patient begins humming or staring toward the skylight, secure the restraints before calling security.\n\n— Dr. H. Vance, Chief of Pulmonology',

      transcript: 'TRIAGE SHIFT DIRECTIVE #409 (Medical Log, Saint Jude, Oct 11 23:15): Effective immediately, patients exhibiting Stage-2 sub-dermal filaments are to be moved to Basement Annex B. Analgesics have zero effect once the fruiting bodies breach the collarbone. If a patient begins humming or staring toward the skylight, secure the restraints before calling security. Signed Dr. H. Vance.'

    },

    photo_maya: {

      id: 'photo_maya',

      title: 'FADED POLAROID — AUTUMN LAKE',

      category: 'PERSONAL KEEPSAKE',

      date: 'SEPTEMBER — TWO YEARS AGO',

      paperStyle: 'polaroid',

      stainType: 'water_damage',

      badgeCode: 'ARCHIVE-M',

      body: 'Written on the back in smudged graphite:\n\n“David & Maya at Cedar Ridge Overlook. You promised we’d come back before the first frost. Don’t lose the spare key under the planter.”',

      transcript: 'FADED POLAROID — AUTUMN LAKE (Personal Keepsake): Written on the back in smudged graphite: "David & Maya at Cedar Ridge Overlook. You promised we’d come back before the first frost. Don’t lose the spare key under the planter."'

    },

    keycard_lab: {

      id: 'keycard_lab',

      title: 'MYCOLOGY CONTAINMENT PASS',

      category: 'SECURITY CLEARANCE LEVEL 3',

      date: 'EXPIRES: INDEFINITE HOLD',

      paperStyle: 'keycard',

      stainType: 'spore_resin',

      badgeCode: 'SEC-LVL-03',

      body: 'MAGNETIC STRIPE ENCODED: SUB-LEVEL PUMP STATION & CONSERVATORY AIRLOCK.\n\nWARNING: Cardholder must pass decontamination scrubber prior to exit. Tampering with atmospheric dampers is a Class-A Quarantine Felony.',

      transcript: 'MYCOLOGY CONTAINMENT PASS (Security Clearance Level 3): Magnetic stripe encoded for Sub-Level Pump Station and Conservatory Airlock. Cardholder must pass decontamination scrubber prior to exit.'

    }

  };



  // ==========================================================================

  // [SECTION 2] DETERMINISTIC PRNG, MATH & WEBAUDIO SYNTHESIZER

  // ==========================================================================



  function SeededRNG(seedStr) {

    this.setSeed(seedStr || 'BLOOM_UI_SEED');

  }



  SeededRNG.prototype.setSeed = function (seedStr) {

    var str = String(seedStr);

    var h = 2166136261 >>> 0;

    for (var i = 0; i < str.length; i++) {

      h ^= str.charCodeAt(i);

      h = Math.imul(h, 16777619) >>> 0;

    }

    this._state = h || 0x9e3779b9;

  };



  SeededRNG.prototype.next = function () {

    var t = (this._state += 0x6d2b79f5);

    t = Math.imul(t ^ (t >>> 15), t | 1);

    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  };



  SeededRNG.prototype.range = function (min, max) {

    return min + this.next() * (max - min);

  };



  SeededRNG.prototype.chance = function (prob) {

    return this.next() < prob;

  };



  function clamp(v, min, max) {

    return v < min ? min : (v > max ? max : v);

  }



  function lerp(a, b, t) {

    return a + (b - a) * clamp(t, 0, 1);

  }



  /**

   * Procedural WebAudio synthesizer for tactile UI feedback (typewriter keys,

   * Geiger ticks, ECG monitor pulses, paper rustles, and chapter drone impacts).

   */

  function DiegeticSoundSynth(externalSoundCallback) {

    this.ctx = null;

    this.muted = false;

    this.externalHook = typeof externalSoundCallback === 'function' ? externalSoundCallback : null;

  }



  DiegeticSoundSynth.prototype._ensureContext = function () {

    if (this.muted) return null;

    if (!this.ctx && typeof window !== 'undefined') {

      var AudioCtx = window.AudioContext || window.webkitAudioContext;

      if (AudioCtx) {

        try {

          this.ctx = new AudioCtx();

        } catch (e) {

          this.ctx = null;

        }

      }

    }

    if (this.ctx && this.ctx.state === 'suspended') {

      try {

        this.ctx.resume();

      } catch (e) {}

    }

    return this.ctx;

  };



  DiegeticSoundSynth.prototype.playTypewriterClick = function (pitchHz) {

    if (this.externalHook) {

      try { this.externalHook('typewriter_click', { pitchHz: pitchHz }); } catch (e) {}

    }

    var ac = this._ensureContext();

    if (!ac) return;

    try {

      var now = ac.currentTime;

      var osc = ac.createOscillator();

      var gain = ac.createGain();

      osc.type = 'triangle';

      osc.frequency.setValueAtTime((pitchHz || 180) * (0.92 + Math.random() * 0.16), now);

      osc.frequency.exponentialRampToValueAtTime(55, now + 0.028);



      gain.gain.setValueAtTime(0.035, now);

      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.028);



      osc.connect(gain);

      gain.connect(ac.destination);

      osc.start(now);

      osc.stop(now + 0.03);

    } catch (e) {}

  };



  DiegeticSoundSynth.prototype.playGeigerClick = function () {

    if (this.externalHook) {

      try { this.externalHook('geiger_tick'); } catch (e) {}

    }

    var ac = this._ensureContext();

    if (!ac) return;

    try {

      var now = ac.currentTime;

      var osc = ac.createOscillator();

      var gain = ac.createGain();

      osc.type = 'square';

      osc.frequency.setValueAtTime(1100 + Math.random() * 600, now);

      gain.gain.setValueAtTime(0.018, now);

      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.009);

      osc.connect(gain);

      gain.connect(ac.destination);

      osc.start(now);

      osc.stop(now + 0.01);

    } catch (e) {}

  };



  DiegeticSoundSynth.prototype.playChapterBoom = function () {

    if (this.externalHook) {

      try { this.externalHook('chapter_boom'); } catch (e) {}

    }

    var ac = this._ensureContext();

    if (!ac) return;

    try {

      var now = ac.currentTime;

      var osc = ac.createOscillator();

      var gain = ac.createGain();

      osc.type = 'sine';

      osc.frequency.setValueAtTime(68, now);

      osc.frequency.exponentialRampToValueAtTime(26, now + 2.4);



      gain.gain.setValueAtTime(0.001, now);

      gain.gain.linearRampToValueAtTime(0.14, now + 0.08);

      gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.5);



      osc.connect(gain);

      gain.connect(ac.destination);

      osc.start(now);

      osc.stop(now + 2.55);

    } catch (e) {}

  };



  DiegeticSoundSynth.prototype.playPaperRustle = function () {

    if (this.externalHook) {

      try { this.externalHook('paper_rustle'); } catch (e) {}

    }

    var ac = this._ensureContext();

    if (!ac) return;

    try {

      var now = ac.currentTime;

      var bufferSize = Math.floor(ac.sampleRate * 0.09);

      var buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);

      var data = buffer.getChannelData(0);

      for (var i = 0; i < bufferSize; i++) {

        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);

      }

      var noise = ac.createBufferSource();

      noise.buffer = buffer;



      var filter = ac.createBiquadFilter();

      filter.type = 'bandpass';

      filter.frequency.setValueAtTime(1400, now);

      filter.Q.setValueAtTime(1.8, now);



      var gain = ac.createGain();

      gain.gain.setValueAtTime(0.04, now);

      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);



      noise.connect(filter);

      filter.connect(gain);

      gain.connect(ac.destination);

      noise.start(now);

    } catch (e) {}

  };



  // ==========================================================================

  // [SECTION 3] SCOPED SURVIVAL-HORROR CSS INJECTOR & DOM UPGRADER

  // ==========================================================================



  function injectSurvivalHorrorStyles() {

    if (typeof document === 'undefined') return;

    if (document.getElementById('bloom-mega-ui-styles')) return;



    var style = document.createElement('style');

    style.id = 'bloom-mega-ui-styles';

    style.textContent = [

      '/* THE BLOOM — Mega UI Diegetic Styling */',

      '#hud {',

      '  font-family: "Share Tech Mono", monospace;',

      '  user-select: none;',

      '  -webkit-font-smoothing: antialiased;',

      '}',

      '#hl {',

      '  background: linear-gradient(165deg, rgba(12, 15, 14, 0.88) 0%, rgba(7, 9, 10, 0.94) 100%);',

      '  border: 1px solid rgba(112, 124, 108, 0.28);',

      '  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.78), inset 0 0 18px rgba(0, 0, 0, 0.85);',

      '  border-radius: 3px;',

      '  position: absolute;',

      '  left: 14px;',

      '  top: 12px;',

      '  padding: 6px;',

      '  overflow: hidden;',

      '}',

      '#sub {',

      '  display: none !important;',

      '}',

      '#hl::before {',

      '  content: "BIO-TELEMETRY // UNIT 04";',

      '  display: block;',

      '  font-family: "Share Tech Mono", monospace;',

      '  font-size: 9px;',

      '  letter-spacing: 2px;',

      '  color: rgba(154, 168, 146, 0.55);',

      '  border-bottom: 1px solid rgba(112, 124, 108, 0.18);',

      '  padding: 2px 6px 3px 6px;',

      '  margin-bottom: 4px;',

      '}',

      '.bloom-ecg-strip {',

      '  display: block;',

      '  width: 150px;',

      '  height: 18px;',

      '  margin: 3px 0 3px 0;',

      '  background: rgba(5, 8, 7, 0.9);',

      '  border: 1px solid rgba(90, 110, 92, 0.28);',

      '  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.9);',

      '}',

      '#bA, #bS, #bN, #bI {',

      '  transition: width 0.18s cubic-bezier(0.22, 1, 0.36, 1), filter 0.2s ease;',

      '  position: relative;',

      '}',

      '.bloom-hud-glitch {',

      '  animation: bloomHudJitter 0.18s infinite;',

      '}',

      '@keyframes bloomHudJitter {',

      '  0% { transform: translate(0, 0); filter: hue-rotate(0deg); }',

      '  33% { transform: translate(-1.5px, 0.5px); filter: contrast(1.35) brightness(1.1); }',

      '  66% { transform: translate(1.5px, -0.5px); }',

      '  100% { transform: translate(0, 0); }',

      '}',

      '/* Diegetic Subtitle Card (#sub + custom container) */',

      '.bloom-dialogue-box {',

      '  position: fixed;',

      '  left: 50%;',

      '  bottom: 64px;',

      '  transform: translateX(-50%);',

      '  min-width: 340px;',

      '  max-width: min(740px, 88vw);',

      '  background: linear-gradient(180deg, rgba(10, 12, 12, 0.92) 0%, rgba(6, 7, 8, 0.96) 100%);',

      '  border: 1px solid rgba(156, 146, 122, 0.34);',

      '  border-left: 3px solid var(--speaker-accent, #8c7a5b);',

      '  padding: 12px 18px 14px 18px;',

      '  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.85), inset 0 0 22px rgba(0, 0, 0, 0.7);',

      '  pointer-events: none;',

      '  z-index: 45;',

      '  opacity: 0;',

      '  transition: opacity 0.25s ease, transform 0.25s ease;',

      '}',

      '.bloom-dialogue-box.active {',

      '  opacity: 1;',

      '  transform: translateX(-50%) translateY(0);',

      '}',

      '.bloom-dialogue-header {',

      '  display: flex;',

      '  justify-content: space-between;',

      '  align-items: baseline;',

      '  margin-bottom: 5px;',

      '  font-family: "Share Tech Mono", monospace;',

      '  font-size: 11px;',

      '  letter-spacing: 1.8px;',

      '  color: var(--speaker-color, #d4c5a9);',

      '}',

      '.bloom-dialogue-role {',

      '  font-size: 9px;',

      '  color: rgba(160, 165, 160, 0.55);',

      '}',

      '.bloom-dialogue-text {',

      '  font-family: "Special Elite", "Courier New", monospace;',

      '  font-size: 15px;',

      '  line-height: 1.48;',

      '  color: #e4e0d5;',

      '  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95);',

      '  min-height: 22px;',

      '}',

      '/* Tactical Item & Lore Inspector Modal */',

      '#bloom-inspector-backdrop {',

      '  position: fixed;',

      '  inset: 0;',

      '  background: radial-gradient(circle at center, rgba(10, 13, 12, 0.82) 0%, rgba(3, 4, 5, 0.95) 100%);',

      '  display: none;',

      '  align-items: center;',

      '  justify-content: center;',

      '  z-index: 80;',

      '  perspective: 1100px;',

      '  pointer-events: auto;',

      '}',

      '#bloom-inspector-backdrop.open {',

      '  display: flex;',

      '}',

      '#bloom-inspector-card-wrap {',

      '  position: relative;',

      '  width: min(540px, 90vw);',

      '  transform-style: preserve-3d;',

      '  transition: transform 0.08s ease-out;',

      '}',

      '#bloom-inspector-canvas {',

      '  display: block;',

      '  width: 100%;',

      '  height: auto;',

      '  border-radius: 2px;',

      '  box-shadow: 0 26px 65px rgba(0, 0, 0, 0.92), 0 0 1px rgba(255, 240, 200, 0.3);',

      '  cursor: grab;',

      '}',

      '#bloom-inspector-transcript {',

      '  position: absolute;',

      '  inset: 18px;',

      '  background: rgba(8, 10, 10, 0.95);',

      '  border: 1px solid rgba(175, 168, 142, 0.45);',

      '  padding: 20px;',

      '  color: #ece8dc;',

      '  font-family: "Share Tech Mono", monospace;',

      '  font-size: 14px;',

      '  line-height: 1.6;',

      '  overflow-y: auto;',

      '  display: none;',

      '}',

      '#bloom-inspector-transcript.visible {',

      '  display: block;',

      '}',

      '.bloom-inspector-controls {',

      '  margin-top: 12px;',

      '  display: flex;',

      '  justify-content: space-between;',

      '  align-items: center;',

      '  font-family: "Share Tech Mono", monospace;',

      '  font-size: 11px;',

      '  letter-spacing: 1.4px;',

      '  color: rgba(200, 205, 195, 0.78);',

      '}',

      '.bloom-inspector-btn {',

      '  background: rgba(22, 27, 25, 0.9);',

      '  color: #d8d2c2;',

      '  border: 1px solid rgba(145, 155, 138, 0.45);',

      '  padding: 5px 12px;',

      '  font-family: "Share Tech Mono", monospace;',

      '  font-size: 11px;',

      '  letter-spacing: 1.2px;',

      '  cursor: pointer;',

      '}',

      '.bloom-inspector-btn:hover {',

      '  background: rgba(45, 56, 48, 0.95);',

      '  border-color: #b5c49e;',

      '}'

    ].join('\n');



    document.head.appendChild(style);

  }



  // ==========================================================================

  // [SECTION 4] DIEGETIC BIO-MONITOR & VITAL TELEMETRY (#hl, #vig)

  // ==========================================================================



  function DiegeticBioMonitor(soundSynth, qualityProfile) {

    this.sound = soundSynth;

    this.quality = qualityProfile || QUALITY_PRESETS.high;

    this.time = 0;



    // Telemetry state

    this.state = {

      davidHealth: 1.0,   // 0..1

      davidStamina: 1.0,  // 0..1

      nancyHealth: 1.0,   // 0..1

      nancyScared: 0.0,   // 0..1 (scared > 0.5 triggers panic spikes)

      nancyTrust: 0.85,   // 0..1

      infection: 0.0,     // 0..1 (infection > 0.4 triggers creeping veins & Geiger ticks)

      medkits: 1,

      objectiveText: '',

      bossActive: false,

      bossName: '',

      bossHealth: 1.0

    };



    this._davidEcgCanvas = null;

    this._davidEcgCtx = null;

    this._nancyEcgCanvas = null;

    this._nancyEcgCtx = null;

    this._geigerTimer = 0;

    this._mounted = false;

  }



    DiegeticBioMonitor.prototype.mount = function () {
    if (typeof document === 'undefined' || this._mounted) return;
    injectSurvivalHorrorStyles();
    // Remove any legacy confusing waveform canvas strips from HUD
    var oldD = document.getElementById('bloom-david-ecg');
    if (oldD && oldD.parentNode) oldD.parentNode.removeChild(oldD);
    var oldN = document.getElementById('bloom-nancy-ecg');
    if (oldN && oldN.parentNode) oldN.parentNode.removeChild(oldN);
    this._davidEcgCanvas = null;
    this._davidEcgCtx = null;
    this._nancyEcgCanvas = null;
    this._nancyEcgCtx = null;
    this._mounted = true;
  };



  /**

   * Synchronizes state from either an explicit gameState object OR by reading

   * the current DOM widths/values if partial state was passed.

   */

  DiegeticBioMonitor.prototype.update = function (gameState, dt) {

    if (!this._mounted) this.mount();

    var stepDt = clamp(dt || 0.016, 0.001, 0.1);

    this.time += stepDt;



    var gs = gameState || {};

    var bA = document.getElementById('bA');

    var bS = document.getElementById('bS');

    var bN = document.getElementById('bN');

    var bI = document.getElementById('bI');

    var med = document.getElementById('med');

    var obj = document.getElementById('obj');

    var hl = document.getElementById('hl');

    var vig = document.getElementById('vig');



    // Resolve David Health (0..1)

    if (gs.hp !== undefined && gs.maxHp !== undefined) {

      this.state.davidHealth = clamp(gs.hp / Math.max(1, gs.maxHp), 0, 1);

    } else if (gs.davidHealth !== undefined) {

      this.state.davidHealth = clamp(gs.davidHealth > 1 ? gs.davidHealth / 100 : gs.davidHealth, 0, 1);

    } else if (bA && bA.style && bA.style.width) {

      this.state.davidHealth = clamp((parseFloat(bA.style.width) || 100) / 100, 0, 1);

    }



    // Resolve David Stamina (0..1)

    if (gs.stamina !== undefined) {

      this.state.davidStamina = clamp(gs.stamina > 1 ? gs.stamina / 100 : gs.stamina, 0, 1);

    } else if (bS && bS.style && bS.style.width) {

      this.state.davidStamina = clamp((parseFloat(bS.style.width) || 100) / 100, 0, 1);

    }



    // Resolve Nancy Health & Fear/Scared level

    if (gs.nancyHp !== undefined) {

      this.state.nancyHealth = clamp(gs.nancyHp > 1 ? gs.nancyHp / 100 : gs.nancyHp, 0, 1);

    } else if (bN && bN.style && bN.style.width) {

      this.state.nancyHealth = clamp((parseFloat(bN.style.width) || 100) / 100, 0, 1);

    }

    if (gs.nancyScared !== undefined) {

      this.state.nancyScared = clamp(gs.nancyScared, 0, 1);

    } else if (gs.scared !== undefined) {

      this.state.nancyScared = clamp(gs.scared, 0, 1);

    }



    // Resolve Infection (0..1)

    if (gs.infection !== undefined) {

      this.state.infection = clamp(gs.infection > 1 ? gs.infection / 100 : gs.infection, 0, 1);

    } else if (bI && bI.style && bI.style.width) {

      this.state.infection = clamp((parseFloat(bI.style.width) || 0) / 100, 0, 1);

    }



    // Apply DOM bar widths & tactile distress colors if gameState explicitly supplied them

    if (bA && (gs.hp !== undefined || gs.davidHealth !== undefined)) {

      bA.style.width = (this.state.davidHealth * 100).toFixed(1) + '%';

    }

    if (bS && gs.stamina !== undefined) {

      bS.style.width = (this.state.davidStamina * 100).toFixed(1) + '%';

    }

    if (bN && gs.nancyHp !== undefined) {

      bN.style.width = (this.state.nancyHealth * 100).toFixed(1) + '%';

    }

    if (bI && gs.infection !== undefined) {

      bI.style.width = (this.state.infection * 100).toFixed(1) + '%';

    }

    if (med && gs.medkits !== undefined) {

      med.textContent = String(gs.medkits);

    }

    if (obj && gs.objective) {

      obj.textContent = gs.objective;

    }



    // Low-health HUD glitch class

    if (hl) {

      if (this.state.davidHealth < 0.25 && !this.quality.reducedMotion) {

        hl.classList.add('bloom-hud-glitch');

      } else {

        hl.classList.remove('bloom-hud-glitch');

      }

    }



    // Geiger counter clicks when infection exceeds 40%

    if (this.state.infection > 0.4) {

      this._geigerTimer -= stepDt;

      if (this._geigerTimer <= 0) {

        var severity = (this.state.infection - 0.4) / 0.6;

        this._geigerTimer = lerp(0.55, 0.08, severity) * (0.6 + Math.random() * 0.8);

        if (this.sound) this.sound.playGeigerClick();

      }

    }



    // Update #vig necrotic & low-health vignette CSS

    if (vig) {

      var infOver = Math.max(0, (this.state.infection - 0.35) / 0.65);

      var lowHpOver = Math.max(0, (0.35 - this.state.davidHealth) / 0.35);

      var pulse = this.quality.reducedMotion ? 1.0 : (0.85 + 0.15 * Math.sin(this.time * 4.5));

      if (infOver > 0.02 || lowHpOver > 0.02) {

        var r = Math.round(lerp(18, 95, lowHpOver) + lerp(0, 48, infOver));

        var g = Math.round(lerp(12, 82, infOver));

        var b = Math.round(lerp(14, 24, infOver));

        var spread = Math.round(lerp(45, 135, Math.max(infOver, lowHpOver)) * pulse);

        vig.style.boxShadow = 'inset 0 0 ' + spread + 'px rgba(' + r + ',' + g + ',' + b + ',' + clamp(0.45 + Math.max(infOver, lowHpOver) * 0.45, 0.3, 0.92).toFixed(2) + ')';

      }

    }



    this._renderDavidECG();

    this._renderNancyECG();

  };



  /**

   * PQRST biomedical waveform generator for ECG traces.

   */

  DiegeticBioMonitor.prototype._sampleECG = function (phase, irregularity) {

    var u = ((phase % 1) + 1) % 1;

    var val = 0;

    // P wave

    if (u > 0.12 && u < 0.22) {

      val += Math.sin(((u - 0.12) / 0.10) * Math.PI) * 0.18;

    }

    // Q dip

    if (u >= 0.26 && u < 0.29) {

      val -= Math.sin(((u - 0.26) / 0.03) * Math.PI) * 0.22;

    }

    // R spike

    if (u >= 0.29 && u < 0.34) {

      val += Math.sin(((u - 0.29) / 0.05) * Math.PI) * 0.95;

    }

    // S dip

    if (u >= 0.34 && u < 0.38) {

      val -= Math.sin(((u - 0.34) / 0.04) * Math.PI) * 0.35;

    }

    // T wave

    if (u >= 0.46 && u < 0.58) {

      val += Math.sin(((u - 0.46) / 0.12) * Math.PI) * 0.26;

    }

    if (irregularity > 0) {

      val += Math.sin(phase * 19.7) * irregularity * 0.18;

    }

    return val;

  };



  DiegeticBioMonitor.prototype._renderDavidECG = function () {

    var ctx = this._davidEcgCtx;

    if (!ctx) return;

    var w = this._davidEcgCanvas.width;

    var h = this._davidEcgCanvas.height;

    var hp = this.state.davidHealth;

    var stam = this.state.davidStamina;

    var inf = this.state.infection;



    ctx.save();

    ctx.fillStyle = '#050807';

    ctx.fillRect(0, 0, w, h);



    // Subtle oscilloscope grid lines

    ctx.strokeStyle = 'rgba(72, 95, 76, 0.14)';

    ctx.lineWidth = 1;

    ctx.beginPath();

    for (var gx = 0; gx < w; gx += 16) {

      ctx.moveTo(gx, 0);

      ctx.lineTo(gx, h);

    }

    ctx.moveTo(0, h * 0.5);

    ctx.lineTo(w, h * 0.5);

    ctx.stroke();



    // Heart rate accelerates when injured or low stamina

    var bpmFreq = 1.15 + (1 - hp) * 1.45 + (1 - stam) * 0.65;

    var strokeColor = hp > 0.6 ? '#76b87c' : (hp > 0.3 ? '#d4a348' : '#cf4438');



    ctx.strokeStyle = strokeColor;

    ctx.lineWidth = 1.4;

    ctx.beginPath();

    for (var x = 0; x < w; x += 2) {

      var phase = this.time * bpmFreq - (w - x) * 0.016;

      var yNorm = this._sampleECG(phase, inf * 0.6);

      var py = h * 0.54 - yNorm * (h * 0.42);

      if (x === 0) ctx.moveTo(x, py);

      else ctx.lineTo(x, py);

    }

    ctx.stroke();



    // BPM & Spore % digital readout

    var bpmReadout = Math.round(bpmFreq * 62);

    ctx.fillStyle = 'rgba(210, 220, 205, 0.72)';

    ctx.font = '9px "Share Tech Mono", monospace';

    ctx.fillText(bpmReadout + ' BPM', 4, 9);

    if (inf > 0.05) {

      ctx.fillStyle = inf > 0.4 ? '#b8c454' : 'rgba(165, 178, 120, 0.7)';

      ctx.fillText('SPORE ' + Math.round(inf * 100) + '%', w - 62, 9);

    }



    // Distressed glass wear scratches

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';

    ctx.lineWidth = 0.8;

    ctx.beginPath();

    ctx.moveTo(28, 2);

    ctx.lineTo(39, 14);

    ctx.moveTo(118, 5);

    ctx.lineTo(132, 19);

    ctx.stroke();



    ctx.restore();

  };



  DiegeticBioMonitor.prototype._renderNancyECG = function () {

    var ctx = this._nancyEcgCtx;

    if (!ctx) return;

    var w = this._nancyEcgCanvas.width;

    var h = this._nancyEcgCanvas.height;

    var scared = this.state.nancyScared;

    var isPanicking = scared > 0.5;



    ctx.save();

    ctx.fillStyle = '#060809';

    ctx.fillRect(0, 0, w, h);



    var freq = 1.25 + scared * 1.9;

    var color = isPanicking ? '#d96b43' : '#7aa89e';



    ctx.strokeStyle = color;

    ctx.lineWidth = 1.3;

    ctx.beginPath();

    for (var x = 0; x < w; x += 2) {

      var phase = this.time * freq - (w - x) * 0.018;

      var yNorm = this._sampleECG(phase, isPanicking ? 0.85 : 0.1);

      var py = h * 0.55 - yNorm * (h * 0.4);

      if (x === 0) ctx.moveTo(x, py);

      else ctx.lineTo(x, py);

    }

    ctx.stroke();



    ctx.fillStyle = isPanicking ? '#f08a65' : 'rgba(170, 200, 192, 0.75)';

    ctx.font = '9px "Share Tech Mono", monospace';

    ctx.fillText(isPanicking ? 'NANCY // PANIC ELEVATED' : 'NANCY // PULSE STABLE', 4, 9);

    ctx.restore();

  };



  // ==========================================================================

  // [SECTION 5] TACTICAL INVENTORY & 2.5D ITEM / LORE INSPECTOR MODAL

  // ==========================================================================



  function TacticalItemInspector(soundSynth) {

    this.sound = soundSynth;

    this.isOpen = false;

    this.transcriptVisible = false;

    this.currentItem = null;



    this._backdrop = null;

    this._cardWrap = null;

    this._canvas = null;

    this._ctx = null;

    this._transcriptEl = null;

    this._keyHandler = null;

  }



  TacticalItemInspector.prototype._ensureDOM = function () {

    if (typeof document === 'undefined' || this._backdrop) return;

    injectSurvivalHorrorStyles();



    var self = this;

    this._backdrop = document.createElement('div');

    this._backdrop.id = 'bloom-inspector-backdrop';

    this._backdrop.setAttribute('role', 'dialog');

    this._backdrop.setAttribute('aria-modal', 'true');



    this._cardWrap = document.createElement('div');

    this._cardWrap.id = 'bloom-inspector-card-wrap';



    this._canvas = document.createElement('canvas');

    this._canvas.id = 'bloom-inspector-canvas';

    this._canvas.width = 560;

    this._canvas.height = 680;

    this._ctx = this._canvas.getContext('2d');



    this._transcriptEl = document.createElement('div');

    this._transcriptEl.id = 'bloom-inspector-transcript';



    var controls = document.createElement('div');

    controls.className = 'bloom-inspector-controls';



    var hint = document.createElement('span');

    hint.textContent = 'MOVE CURSOR TO TILT DOCUMENT // [T] TRANSCRIPT // [ESC] CLOSE';



    var btnGroup = document.createElement('div');

    btnGroup.style.display = 'flex';

    btnGroup.style.gap = '8px';



    var btnTranscript = document.createElement('button');

    btnTranscript.className = 'bloom-inspector-btn';

    btnTranscript.textContent = '[T] TRANSCRIPTION';

    btnTranscript.onclick = function (e) {

      e.stopPropagation();

      self.toggleTranscript();

    };



    var btnClose = document.createElement('button');

    btnClose.className = 'bloom-inspector-btn';

    btnClose.textContent = '[ESC] CLOSE';

    btnClose.onclick = function (e) {

      e.stopPropagation();

      self.close();

    };



    btnGroup.appendChild(btnTranscript);

    btnGroup.appendChild(btnClose);

    controls.appendChild(hint);

    controls.appendChild(btnGroup);



    this._cardWrap.appendChild(this._canvas);

    this._cardWrap.appendChild(this._transcriptEl);

    this._cardWrap.appendChild(controls);

    this._backdrop.appendChild(this._cardWrap);



    // Interactive 2.5D paper tilt on pointer move

    this._backdrop.addEventListener('mousemove', function (ev) {

      if (!self.isOpen) return;

      var rect = self._canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      var nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;

      var ny = ((ev.clientY - rect.top) / rect.height) * 2 - 1;

      var rotY = clamp(nx * 11, -14, 14);

      var rotX = clamp(-ny * 9, -12, 12);

      self._cardWrap.style.transform = 'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';

    });



    this._backdrop.addEventListener('mouseleave', function () {

      if (self._cardWrap) {

        self._cardWrap.style.transform = 'rotateX(0deg) rotateY(0deg)';

      }

    });



    this._backdrop.addEventListener('click', function (ev) {

      if (ev.target === self._backdrop) self.close();

    });



    this._keyHandler = function (ev) {

      if (!self.isOpen) return;

      if (ev.key === 'Escape' || ev.key === 'x' || ev.key === 'X') {

        self.close();

      } else if (ev.key === 't' || ev.key === 'T') {

        self.toggleTranscript();

      }

    };

    window.addEventListener('keydown', this._keyHandler);



    var parent = document.getElementById('hud') || document.body;

    parent.appendChild(this._backdrop);

  };



  TacticalItemInspector.prototype.inspect = function (itemSpecOrId) {

    this._ensureDOM();

    if (!this._backdrop) return;



    var spec = typeof itemSpecOrId === 'string'

      ? (ITEM_PRESETS[itemSpecOrId] || { id: itemSpecOrId, title: itemSpecOrId, body: '' })

      : (itemSpecOrId || ITEM_PRESETS.note_triage);



    this.currentItem = {

      id: spec.id || 'doc_01',

      title: spec.title || 'RECOVERED FIELD DOCUMENT',

      category: spec.category || 'ARCHIVAL EVIDENCE',

      date: spec.date || 'OCTOBER 14',

      paperStyle: spec.paperStyle || 'clinical',

      stainType: spec.stainType || 'blood_and_coffee',

      badgeCode: spec.badgeCode || 'DOC-04',

      body: spec.body || '',

      transcript: spec.transcript || (spec.title + '\n\n' + (spec.body || ''))

    };



    this.transcriptVisible = false;

    this._transcriptEl.classList.remove('visible');

    this._transcriptEl.textContent = this.currentItem.transcript;



    this._renderDocumentCanvas(this.currentItem);

    this._backdrop.classList.add('open');

    this.isOpen = true;



    if (this.sound) this.sound.playPaperRustle();

  };



  TacticalItemInspector.prototype.toggleTranscript = function () {

    if (!this._transcriptEl) return;

    this.transcriptVisible = !this.transcriptVisible;

    if (this.transcriptVisible) {

      this._transcriptEl.classList.add('visible');

    } else {

      this._transcriptEl.classList.remove('visible');

    }

    if (this.sound) this.sound.playTypewriterClick(260);

  };



  TacticalItemInspector.prototype.close = function () {

    if (!this._backdrop) return;

    this._backdrop.classList.remove('open');

    this.isOpen = false;

    if (this._cardWrap) {

      this._cardWrap.style.transform = 'rotateX(0deg) rotateY(0deg)';

    }

    if (this.sound) this.sound.playPaperRustle();

  };



  TacticalItemInspector.prototype._renderDocumentCanvas = function (item) {

    var ctx = this._ctx;

    var w = this._canvas.width;

    var h = this._canvas.height;

    var rng = new SeededRNG(item.id + item.title);



    ctx.save();

    ctx.clearRect(0, 0, w, h);



    // 1. Base Aged Paper / Dossier Cardstock

    var baseGrad = ctx.createLinearGradient(0, 0, w, h);

    if (item.paperStyle === 'keycard') {

      baseGrad.addColorStop(0, '#cfd4d6');

      baseGrad.addColorStop(1, '#9ea6aa');

    } else {

      baseGrad.addColorStop(0, '#d8cfb8');

      baseGrad.addColorStop(0.5, '#cbbd9f');

      baseGrad.addColorStop(1, '#b5a484');

    }

    ctx.fillStyle = baseGrad;

    ctx.fillRect(14, 14, w - 28, h - 28);



    // 2. Procedural Paper Fiber Grain & Crease Lines

    ctx.strokeStyle = 'rgba(65, 52, 36, 0.08)';

    ctx.lineWidth = 1;

    for (var i = 0; i < 180; i++) {

      var fx = rng.range(18, w - 18);

      var fy = rng.range(18, h - 18);

      ctx.beginPath();

      ctx.moveTo(fx, fy);

      ctx.lineTo(fx + rng.range(-14, 14), fy + rng.range(-4, 4));

      ctx.stroke();

    }



    // Horizontal fold creases

    ctx.strokeStyle = 'rgba(40, 32, 22, 0.22)';

    ctx.beginPath();

    ctx.moveTo(16, h * 0.34);

    ctx.lineTo(w - 16, h * 0.34 + 3);

    ctx.moveTo(16, h * 0.67);

    ctx.lineTo(w - 16, h * 0.67 - 2);

    ctx.stroke();



    // 3. Coffee Ring & Blood / Spore Stains

    if (item.stainType === 'blood_and_coffee' || item.stainType === 'water_damage') {

      // Coffee mug ring

      var ringX = w * 0.76;

      var ringY = h * 0.74;

      var ringR = 58;

      ctx.strokeStyle = 'rgba(88, 54, 24, 0.28)';

      ctx.lineWidth = 4.5;

      ctx.beginPath();

      ctx.arc(ringX, ringY, ringR, 0.2, Math.PI * 1.92);

      ctx.stroke();



      // Dried crimson blood spatter at corner

      if (item.stainType === 'blood_and_coffee') {

        for (var b = 0; b < 9; b++) {

          var bx = w * 0.82 + rng.range(-38, 28);

          var by = h * 0.18 + rng.range(-25, 42);

          var br = rng.range(4, 22);

          ctx.fillStyle = 'rgba(84, 16, 14, 0.52)';

          ctx.beginPath();

          ctx.arc(bx, by, br, 0, Math.PI * 2);

          ctx.fill();

        }

      }

    }



    // 4. Clinical Header Stamp & Classification Box

    ctx.strokeStyle = '#2d261e';

    ctx.lineWidth = 2;

    ctx.strokeRect(36, 36, w - 72, h - 72);



    ctx.fillStyle = '#231f1a';

    ctx.fillRect(36, 36, w - 72, 54);



    ctx.fillStyle = '#d8cfb8';

    ctx.font = 'bold 13px "Share Tech Mono", monospace';

    ctx.fillText(item.category.toUpperCase(), 52, 58);



    ctx.font = '11px "Share Tech Mono", monospace';

    ctx.fillStyle = '#a89f8a';

    ctx.fillText('DATE: ' + item.date + '  //  REF: ' + item.badgeCode, 52, 78);



    // Red "QUARANTINE EVIDENCE" rubber stamp

    ctx.save();

    ctx.translate(w - 135, 118);

    ctx.rotate(-0.14);

    ctx.strokeStyle = 'rgba(138, 28, 24, 0.68)';

    ctx.lineWidth = 2.5;

    ctx.strokeRect(-64, -18, 128, 34);

    ctx.fillStyle = 'rgba(138, 28, 24, 0.68)';

    ctx.font = 'bold 12px "Share Tech Mono", monospace';

    ctx.textAlign = 'center';

    ctx.fillText('QUARANTINE LOG', 0, 4);

    ctx.restore();



    // 5. Document Title & Wrapped Typewriter Body Text

    ctx.fillStyle = '#1e1914';

    ctx.font = 'bold 20px "Cinzel", Georgia, serif';

    ctx.fillText(item.title, 52, 134);



    ctx.strokeStyle = 'rgba(45, 38, 30, 0.45)';

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(52, 148);

    ctx.lineTo(w - 52, 148);

    ctx.stroke();



    // Optional embedded Polaroid vignette if paperStyle === 'polaroid'

    var textStartY = 182;

    if (item.paperStyle === 'polaroid') {

      this._drawEmbeddedPolaroidArt(ctx, 130, 165, 300, 210);

      textStartY = 415;

    }



    ctx.fillStyle = '#221d17';

    ctx.font = '15px "Special Elite", "Courier New", monospace';

    this._wrapText(ctx, item.body, 54, textStartY, w - 108, 24);



    ctx.restore();

  };



  TacticalItemInspector.prototype._drawEmbeddedPolaroidArt = function (ctx, x, y, w, h) {

    ctx.save();

    ctx.fillStyle = '#ece6d8';

    ctx.fillRect(x, y, w, h + 34);

    ctx.fillStyle = '#181c1e';

    ctx.fillRect(x + 12, y + 12, w - 24, h - 12);



    // Stylized dusk lake & silhouettes of David & Maya

    var skyGrad = ctx.createLinearGradient(x, y + 12, x, y + h);

    skyGrad.addColorStop(0, '#2a363b');

    skyGrad.addColorStop(0.6, '#6c5643');

    skyGrad.addColorStop(1, '#1b211e');

    ctx.fillStyle = skyGrad;

    ctx.fillRect(x + 12, y + 12, w - 24, h - 12);



    // Silhouettes

    ctx.fillStyle = '#0e1112';

    ctx.beginPath();

    ctx.arc(x + w * 0.44, y + h * 0.56, 11, 0, Math.PI * 2);

    ctx.arc(x + w * 0.56, y + h * 0.60, 9.5, 0, Math.PI * 2);

    ctx.fill();

    ctx.fillRect(x + w * 0.44 - 12, y + h * 0.56 + 11, 24, 42);

    ctx.fillRect(x + w * 0.56 - 10, y + h * 0.60 + 10, 20, 38);



    ctx.restore();

  };



  TacticalItemInspector.prototype._wrapText = function (ctx, text, x, y, maxWidth, lineHeight) {

    var paragraphs = String(text || '').split('\n');

    var curY = y;

    for (var p = 0; p < paragraphs.length; p++) {

      var words = paragraphs[p].split(' ');

      var line = '';

      for (var n = 0; n < words.length; n++) {

        var testLine = line + words[n] + ' ';

        var metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && n > 0) {

          ctx.fillText(line, x, curY);

          line = words[n] + ' ';

          curY += lineHeight;

        } else {

          line = testLine;

        }

      }

      ctx.fillText(line, x, curY);

      curY += lineHeight;

    }

  };



  // ==========================================================================

  // [SECTION 6] HYPERFRAMES CINEMATIC DIRECTOR, B-ROLL & CRT/VHS COMPOSITOR

  // ==========================================================================



  function CinematicDirector(soundSynth, qualityProfile) {

    this.sound = soundSynth;

    this.quality = qualityProfile || QUALITY_PRESETS.high;



    // Letterbox state

    this.letterboxCurrent = 0;

    this.letterboxTarget = 0;



    // Active chapter title sequence

    this.activeChapter = null;



    // Active B-Roll archival flashcard

    this.activeCollage = null;



    // Camera shake & focus impulse state

    this.cameraImpulse = {

      trauma: 0,

      zoomBonus: 0,

      targetZoomBonus: 0,

      focusTimer: 0,

      offsetX: 0,

      offsetY: 0

    };



    // Glitch & CRT state

    this.glitchIntensity = 0;

    this.glitchTimer = 0;

    this.crtEnabled = false;

    this.time = 0;



    // Dialogue state

    this.dialogue = {

      active: false,

      speakerKey: 'david',

      fullText: '',

      visibleChars: 0,

      charTimer: 0,

      duration: 4.0,

      elapsed: 0,

      emotion: 'neutral'

    };

    this._dialogueBoxEl = null;

    this._dialogueNameEl = null;

    this._dialogueRoleEl = null;

    this._dialogueTextEl = null;

  }



  CinematicDirector.prototype._ensureDialogueDOM = function () {

    if (typeof document === 'undefined' || this._dialogueBoxEl) return;

    injectSurvivalHorrorStyles();



    this._dialogueBoxEl = document.createElement('div');

    this._dialogueBoxEl.className = 'bloom-dialogue-box';



    var header = document.createElement('div');

    header.className = 'bloom-dialogue-header';



    this._dialogueNameEl = document.createElement('span');

    this._dialogueRoleEl = document.createElement('span');

    this._dialogueRoleEl.className = 'bloom-dialogue-role';



    header.appendChild(this._dialogueNameEl);

    header.appendChild(this._dialogueRoleEl);



    this._dialogueTextEl = document.createElement('div');

    this._dialogueTextEl.className = 'bloom-dialogue-text';



    this._dialogueBoxEl.appendChild(header);

    this._dialogueBoxEl.appendChild(this._dialogueTextEl);



    var parent = document.getElementById('hud') || document.body;

    parent.appendChild(this._dialogueBoxEl);

  };



  /**

   * Triggers a Hyperframes-style Chapter Title Sequence (supports 1..5 or custom object).

   */

  CinematicDirector.prototype.playChapterIntro = function (specOrNumber) {

    var preset = typeof specOrNumber === 'number' || typeof specOrNumber === 'string'

      ? CHAPTER_PRESETS[specOrNumber]

      : specOrNumber;



    var base = preset || CHAPTER_PRESETS[1];

    this.activeChapter = {

      chapterNumber: base.chapterNumber || 'CHAPTER I',

      title: base.title || 'THE BLOOM',

      subtitle: base.subtitle || 'QUARANTINE ZONE',

      timestamp: base.timestamp || 'OCT 14 // 02:18 HRS',

      epigraph: base.epigraph || '',

      collageType: base.collageType || 'evac_map',

      duration: base.duration || 6.2,

      elapsed: 0,

      lastTypedIndex: 0

    };



    this.letterboxTarget = 0.125;

    if (this.sound) this.sound.playChapterBoom();

  };



  /**

   * Displays diegetic typewriter dialogue with speaker nameplate & audio hooks.

   * Also mirrors text into `#sub` if present so existing engine logic stays in sync.

   */

  CinematicDirector.prototype.showDialogue = function (speaker, text, duration, emotion) {

    this._ensureDialogueDOM();

    var key = String(speaker || 'david').toLowerCase();

    var profile = SPEAKER_PROFILES[key] || {

      name: String(speaker || 'SURVIVOR').toUpperCase(),

      role: 'TRANSMISSION',

      color: '#d4c5a9',

      accent: '#8c7a5b',

      pitchHz: 175

    };



    this.dialogue.active = true;

    this.dialogue.speakerKey = key;

    this.dialogue.profile = profile;

    this.dialogue.fullText = String(text || '');

    this.dialogue.visibleChars = 0;

    this.dialogue.charTimer = 0;

    this.dialogue.duration = duration || Math.max(3.2, this.dialogue.fullText.length * 0.055 + 1.8);

    this.dialogue.elapsed = 0;

    this.dialogue.emotion = emotion || 'neutral';



    if (this._dialogueBoxEl) {

      this._dialogueBoxEl.style.setProperty('--speaker-color', profile.color);

      this._dialogueBoxEl.style.setProperty('--speaker-accent', profile.accent);

      this._dialogueNameEl.textContent = profile.name;

      this._dialogueRoleEl.textContent = profile.role + (emotion ? ' // ' + String(emotion).toUpperCase() : '');

      this._dialogueTextEl.textContent = '';

      this._dialogueBoxEl.classList.add('active');

    }



    var legacySub = typeof document !== 'undefined' ? document.getElementById('sub') : null;

    if (legacySub) {

      legacySub.textContent = profile.name + ': ' + this.dialogue.fullText;

    }

  };



  /**

   * Triggers a standalone Archival Collage B-Roll flashback overlay.

   */

  CinematicDirector.prototype.showArchivalCollage = function (collageType, duration) {

    this.activeCollage = {

      type: collageType || 'family_polaroid',

      duration: duration || 3.8,

      elapsed: 0

    };

    if (this.sound) this.sound.playPaperRustle();

  };



  /**

   * Triggers dynamic camera shake and focal zoom impulse (enemy_spotted, nancy_panic, safe_room, hit).

   */

  CinematicDirector.prototype.triggerCameraImpulse = function (type, intensity) {

    var power = clamp(intensity !== undefined ? intensity : 0.65, 0, 1);

    if (type === 'enemy_spotted') {

      this.cameraImpulse.trauma = Math.min(1.0, this.cameraImpulse.trauma + power * 0.45);

      this.cameraImpulse.targetZoomBonus = 0.08 * power;

      this.cameraImpulse.focusTimer = 1.3;

    } else if (type === 'nancy_panic') {

      this.cameraImpulse.trauma = Math.min(1.0, this.cameraImpulse.trauma + power * 0.65);

      this.cameraImpulse.targetZoomBonus = 0.05 * power;

      this.cameraImpulse.focusTimer = 1.6;

    } else if (type === 'safe_room') {

      this.cameraImpulse.targetZoomBonus = -0.04;

      this.cameraImpulse.focusTimer = 2.2;

    } else {

      this.cameraImpulse.trauma = Math.min(1.0, this.cameraImpulse.trauma + power * 0.8);

    }

  };



  CinematicDirector.prototype.triggerGlitch = function (intensity, duration) {

    this.glitchIntensity = clamp(intensity !== undefined ? intensity : 0.7, 0, 1);

    this.glitchTimer = duration !== undefined ? duration : 0.45;

  };



  CinematicDirector.prototype.update = function (dt) {

    var stepDt = clamp(dt || 0.016, 0.001, 0.1);

    this.time += stepDt;



    // 1. Update camera trauma & focal zoom

    if (this.cameraImpulse.focusTimer > 0) {

      this.cameraImpulse.focusTimer -= stepDt;

      if (this.cameraImpulse.focusTimer <= 0) {

        this.cameraImpulse.targetZoomBonus = 0;

      }

    }

    this.cameraImpulse.zoomBonus = lerp(this.cameraImpulse.zoomBonus, this.cameraImpulse.targetZoomBonus, stepDt * 4.5);



    if (this.cameraImpulse.trauma > 0) {

      this.cameraImpulse.trauma = Math.max(0, this.cameraImpulse.trauma - stepDt * 1.4);

      var shake = this.quality.reducedMotion ? 0 : (this.cameraImpulse.trauma * this.cameraImpulse.trauma * 14);

      this.cameraImpulse.offsetX = Math.sin(this.time * 43.0) * shake;

      this.cameraImpulse.offsetY = Math.cos(this.time * 37.0) * shake * 0.75;

    } else {

      this.cameraImpulse.offsetX = 0;

      this.cameraImpulse.offsetY = 0;

    }



    // 2. Update glitch timer

    if (this.glitchTimer > 0) {

      this.glitchTimer -= stepDt;

      if (this.glitchTimer <= 0) this.glitchIntensity = 0;

    }



    // 3. Update typewriter dialogue reveal

    if (this.dialogue.active) {

      this.dialogue.elapsed += stepDt;

      if (this.dialogue.visibleChars < this.dialogue.fullText.length) {

        this.dialogue.charTimer += stepDt;

        var charInterval = 0.028;

        while (this.dialogue.charTimer >= charInterval && this.dialogue.visibleChars < this.dialogue.fullText.length) {

          this.dialogue.charTimer -= charInterval;

          this.dialogue.visibleChars++;

          var ch = this.dialogue.fullText.charAt(this.dialogue.visibleChars - 1);

          if (ch !== ' ' && this.dialogue.visibleChars % 2 === 1 && this.sound) {

            this.sound.playTypewriterClick(this.dialogue.profile.pitchHz);

          }

        }

        if (this._dialogueTextEl) {

          this._dialogueTextEl.textContent = this.dialogue.fullText.slice(0, this.dialogue.visibleChars);

        }

      }

      if (this.dialogue.elapsed >= this.dialogue.duration) {

        this.dialogue.active = false;

        if (this._dialogueBoxEl) {

          this._dialogueBoxEl.classList.remove('active');

        }

      }

    }



    // 4. Update active chapter card

    if (this.activeChapter) {

      this.activeChapter.elapsed += stepDt;

      var subLen = this.activeChapter.subtitle.length;

      var typed = Math.min(subLen, Math.floor((this.activeChapter.elapsed - 0.6) * 24));

      if (typed > this.activeChapter.lastTypedIndex && typed > 0) {

        this.activeChapter.lastTypedIndex = typed;

        if (typed % 2 === 0 && this.sound) {

          this.sound.playTypewriterClick(210);

        }

      }



      if (this.activeChapter.elapsed >= this.activeChapter.duration) {

        this.activeChapter = null;

        this.letterboxTarget = 0;

      }

    }



    // 5. Smooth letterbox interpolation

    this.letterboxCurrent = lerp(this.letterboxCurrent, this.letterboxTarget, stepDt * 4.2);



    // 6. Update standalone archival collage

    if (this.activeCollage) {

      this.activeCollage.elapsed += stepDt;

      if (this.activeCollage.elapsed >= this.activeCollage.duration) {

        this.activeCollage = null;

      }

    }

  };



  /**

   * Renders CRT/VHS lines, Archival Collage B-Roll, Letterbox bars, and Chapter Cards onto `#oc`.

   */

  CinematicDirector.prototype.render = function (ctx, width, height) {

    if (!ctx) return;

    ctx.save();



    // 1. Optional CRT / VHS Tracking Lines (active during chapter intro, collage, or glitch)

    if (this.quality.enableCRTScanlines && (this.crtEnabled || this.activeChapter || this.activeCollage || this.glitchIntensity > 0.05)) {

      this._renderCRTDistress(ctx, width, height);

    }



    // 2. Standalone or Chapter-embedded Archival Collage B-Roll

    if (this.activeCollage) {

      var uCol = this.activeCollage.elapsed / this.activeCollage.duration;

      var colAlpha = uCol < 0.15 ? (uCol / 0.15) : (uCol > 0.82 ? (1 - uCol) / 0.18 : 1.0);

      this._renderArchivalCollageFrame(ctx, width, height, this.activeCollage.type, colAlpha * 0.88);

    } else if (this.activeChapter && this.activeChapter.elapsed > 0.4 && this.activeChapter.elapsed < this.activeChapter.duration - 0.6) {

      var uChapCol = (this.activeChapter.elapsed - 0.4) / (this.activeChapter.duration - 1.0);

      var chapColAlpha = Math.sin(clamp(uChapCol, 0, 1) * Math.PI) * 0.34;

      this._renderArchivalCollageFrame(ctx, width, height, this.activeChapter.collageType, chapColAlpha);

    }



    // 3. Cinema Aspect-Ratio Letterbox Bars

    if (this.letterboxCurrent > 0.002) {

      var barH = Math.round(height * this.letterboxCurrent);

      ctx.fillStyle = '#040506';

      ctx.fillRect(0, 0, width, barH);

      ctx.fillRect(0, height - barH, width, barH);



      ctx.strokeStyle = 'rgba(145, 138, 118, 0.22)';

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.moveTo(0, barH + 0.5);

      ctx.lineTo(width, barH + 0.5);

      ctx.moveTo(0, height - barH - 0.5);

      ctx.lineTo(width, height - barH - 0.5);

      ctx.stroke();

    }



    // 4. Hyperframes-Style Chapter Title Sequence

    if (this.activeChapter) {

      this._renderChapterTitleSequence(ctx, width, height, this.activeChapter);

    }



    // 5. Glitch Horizontal Slice Tear

    if (this.glitchIntensity > 0.02 && !this.quality.reducedMotion) {

      this._renderGlitchBars(ctx, width, height, this.glitchIntensity);

    }



    ctx.restore();

  };



  CinematicDirector.prototype._renderChapterTitleSequence = function (ctx, w, h, chap) {

    var u = chap.elapsed / chap.duration;

    var alpha = u < 0.16 ? (u / 0.16) : (u > 0.82 ? (1 - u) / 0.18 : 1.0);

    alpha = clamp(alpha, 0, 1);



    ctx.save();

    // Dark cinema backdrop vignette

    var bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.08, w * 0.5, h * 0.5, w * 0.65);

    bgGrad.addColorStop(0, 'rgba(6, 8, 8, ' + (alpha * 0.58).toFixed(3) + ')');

    bgGrad.addColorStop(1, 'rgba(2, 3, 4, ' + (alpha * 0.88).toFixed(3) + ')');

    ctx.fillStyle = bgGrad;

    ctx.fillRect(0, 0, w, h);



    var cx = w * 0.5;

    var cy = h * 0.46;



    // Top timestamp telemetry

    ctx.textAlign = 'center';

    ctx.font = '11px "Share Tech Mono", monospace';

    ctx.fillStyle = 'rgba(165, 178, 146, ' + (alpha * 0.72).toFixed(3) + ')';

    ctx.fillText(chap.timestamp, cx, cy - 68);



    // Chapter Roman Numeral

    ctx.font = 'bold 14px "Share Tech Mono", monospace';

    ctx.fillStyle = 'rgba(204, 184, 138, ' + (alpha * 0.88).toFixed(3) + ')';

    ctx.fillText('— ' + chap.chapterNumber + ' —', cx, cy - 42);



    // Main Title with subtle chromatic aberration split

    ctx.font = 'bold 42px "Cinzel", Georgia, serif';

    var jitterX = (!this.quality.reducedMotion && Math.random() < 0.18) ? (Math.random() - 0.5) * 2.5 : 0;



    if (this.quality.enableChromaticAberration) {

      ctx.fillStyle = 'rgba(195, 55, 48, ' + (alpha * 0.42).toFixed(3) + ')';

      ctx.fillText(chap.title, cx - 2.2 + jitterX, cy);

      ctx.fillStyle = 'rgba(72, 165, 148, ' + (alpha * 0.42).toFixed(3) + ')';

      ctx.fillText(chap.title, cx + 2.2 + jitterX, cy);

    }



    ctx.fillStyle = 'rgba(236, 232, 220, ' + (alpha * 0.96).toFixed(3) + ')';

    ctx.fillText(chap.title, cx + jitterX, cy);



    // Horizontal divider line expanding from center

    var lineHalfW = Math.min(220, chap.elapsed * 140);

    ctx.strokeStyle = 'rgba(168, 156, 128, ' + (alpha * 0.55).toFixed(3) + ')';

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(cx - lineHalfW, cy + 18);

    ctx.lineTo(cx + lineHalfW, cy + 18);

    ctx.stroke();



    // Typewriter Location Subtitle

    var visibleSub = chap.subtitle.slice(0, Math.max(0, chap.lastTypedIndex));

    ctx.font = '13px "Share Tech Mono", monospace';

    ctx.fillStyle = 'rgba(192, 202, 188, ' + (alpha * 0.9).toFixed(3) + ')';

    ctx.fillText(visibleSub, cx, cy + 40);



    // Epigraph quote

    if (chap.epigraph && chap.elapsed > 1.4) {

      var epAlpha = clamp((chap.elapsed - 1.4) / 0.8, 0, 1) * alpha;

      ctx.font = 'italic 14px "Special Elite", Georgia, serif';

      ctx.fillStyle = 'rgba(168, 162, 146, ' + (epAlpha * 0.78).toFixed(3) + ')';

      ctx.fillText(chap.epigraph, cx, cy + 72);

    }



    ctx.restore();

  };



  /**

   * Renders procedural Archival Collage B-Roll cards (Polaroids, Evacuation Maps, Dossiers).

   */

  CinematicDirector.prototype._renderArchivalCollageFrame = function (ctx, w, h, collageType, alpha) {

    if (alpha <= 0.01) return;

    ctx.save();

    ctx.globalAlpha = clamp(alpha, 0, 1);



    var cardW = 310;

    var cardH = 220;

    var cx = w * 0.74;

    var cy = h * 0.34;



    ctx.translate(cx, cy);

    ctx.rotate(0.055);



    // Paper backing

    ctx.fillStyle = '#d4cbb8';

    ctx.fillRect(-cardW * 0.5, -cardH * 0.5, cardW, cardH);

    ctx.strokeStyle = 'rgba(20, 18, 15, 0.7)';

    ctx.lineWidth = 2;

    ctx.strokeRect(-cardW * 0.5 + 6, -cardH * 0.5 + 6, cardW - 12, cardH - 12);



    if (collageType === 'evac_map') {

      // Sector 4 Quarantine Evacuation Grid

      ctx.fillStyle = '#1b2220';

      ctx.fillRect(-cardW * 0.5 + 14, -cardH * 0.5 + 14, cardW - 28, cardH - 52);



      ctx.strokeStyle = 'rgba(132, 165, 142, 0.38)';

      ctx.lineWidth = 1;

      for (var gx = -120; gx <= 120; gx += 30) {

        ctx.beginPath();

        ctx.moveTo(gx, -cardH * 0.5 + 14);

        ctx.lineTo(gx, cardH * 0.5 - 38);

        ctx.stroke();

      }

      // Red quarantine cordon circle

      ctx.strokeStyle = 'rgba(195, 52, 44, 0.82)';

      ctx.lineWidth = 2;

      ctx.beginPath();

      ctx.arc(10, -12, 46, 0, Math.PI * 2);

      ctx.stroke();



      ctx.fillStyle = '#241e18';

      ctx.font = 'bold 11px "Share Tech Mono", monospace';

      ctx.fillText('SECTOR 4 // EVAC ROUTE BLOCKED', -cardW * 0.5 + 18, cardH * 0.5 - 18);

    } else if (collageType === 'medical_dossier') {

      ctx.fillStyle = '#211d1a';

      ctx.font = 'bold 12px "Share Tech Mono", monospace';

      ctx.fillText('SAINT JUDE // MYCOLOGY AUTOPSY', -cardW * 0.5 + 18, -cardH * 0.5 + 32);



      // Petri dish spore sketch

      ctx.strokeStyle = '#3d4f34';

      ctx.lineWidth = 1.6;

      ctx.beginPath();

      ctx.arc(0, 6, 48, 0, Math.PI * 2);

      ctx.stroke();

      for (var r = 0; r < 12; r++) {

        var ang = (r / 12) * Math.PI * 2;

        ctx.beginPath();

        ctx.moveTo(0, 6);

        ctx.lineTo(Math.cos(ang) * 42, 6 + Math.sin(ang) * 42);

        ctx.stroke();

      }

    } else {

      // Family Polaroid / Quarantine Flyer

      ctx.fillStyle = '#182022';

      ctx.fillRect(-cardW * 0.5 + 18, -cardH * 0.5 + 16, cardW - 36, cardH - 58);

      ctx.fillStyle = '#2a221b';

      ctx.font = '12px "Special Elite", monospace';

      ctx.fillText('“Find Nancy. Stay near the light.”', -cardW * 0.5 + 22, cardH * 0.5 - 18);

    }



    ctx.restore();

  };



  CinematicDirector.prototype._renderCRTDistress = function (ctx, w, h) {

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';

    for (var y = 0; y < h; y += 4) {

      ctx.fillRect(0, y, w, 1.5);

    }



    // Drifting VHS horizontal tracking band

    var bandY = ((this.time * 55) % (h + 80)) - 40;

    var grad = ctx.createLinearGradient(0, bandY - 18, 0, bandY + 18);

    grad.addColorStop(0, 'rgba(200, 215, 195, 0)');

    grad.addColorStop(0.5, 'rgba(200, 215, 195, 0.055)');

    grad.addColorStop(1, 'rgba(200, 215, 195, 0)');

    ctx.fillStyle = grad;

    ctx.fillRect(0, bandY - 18, w, 36);

    ctx.restore();

  };



  CinematicDirector.prototype._renderGlitchBars = function (ctx, w, h, intensity) {

    ctx.save();

    var slices = Math.ceil(intensity * 6);

    for (var i = 0; i < slices; i++) {

      var sy = Math.random() * h;

      var sh = 4 + Math.random() * 18;

      var offset = (Math.random() - 0.5) * 28 * intensity;

      ctx.fillStyle = i % 2 === 0

        ? 'rgba(185, 52, 44, ' + (intensity * 0.22).toFixed(3) + ')'

        : 'rgba(135, 175, 95, ' + (intensity * 0.20).toFixed(3) + ')';

      ctx.fillRect(offset, sy, w, sh);

    }

    ctx.restore();

  };



  // ==========================================================================

  // [SECTION 7] CREEPING FUNGAL VEIN OVERLAY & P5.JS VOLUMETRIC ATMOSPHERE

  // ==========================================================================



  function VolumetricAtmosphereSystem(qualityProfile) {

    this.quality = qualityProfile || QUALITY_PRESETS.high;

    this._p5Instance = null;

    this._maxParticles = 200;

    this._particles = new Array(this._maxParticles);

    this._fogRibbons = new Array(6);

    this._veinBranches = [];

    this.time = 0;



    this.env = {

      windX: 14.0,

      windY: 3.5,

      infection: 0.2,

      cameraX: 0,

      cameraY: 0

    };



    this._initPools();

  }



  VolumetricAtmosphereSystem.prototype._initPools = function () {

    var rng = new SeededRNG('BLOOM_ATMOS_2026');

    for (var i = 0; i < this._maxParticles; i++) {

      var r = rng.next();

      var type = r < 0.5 ? 'spore' : (r < 0.82 ? 'ash' : 'mote');

      this._particles[i] = {

        type: type,

        x: rng.range(0, 1920),

        y: rng.range(0, 1080),

        vx: rng.range(-10, 16),

        vy: type === 'ash' ? rng.range(10, 26) : rng.range(-12, 8),

        radius: type === 'mote' ? rng.range(2.2, 4.4) : rng.range(1.0, 2.4),

        phase: rng.range(0, Math.PI * 2),

        freq: rng.range(0.7, 2.2),

        alpha: rng.range(0.16, 0.55),

        depth: rng.range(0.4, 1.2)

      };

    }



    for (var f = 0; f < this._fogRibbons.length; f++) {

      this._fogRibbons[f] = {

        x: rng.range(0, 1600),

        yRatio: (f + 0.5) / this._fogRibbons.length,

        rx: rng.range(280, 520),

        ry: rng.range(85, 165),

        speed: rng.range(8, 20) * (f % 2 === 0 ? 1 : -1),

        alpha: rng.range(0.032, 0.068)

      };

    }



    // Precompute screen-corner creeping fungal vein geometry for infection > 40%

    for (var c = 0; c < 16; c++) {

      this._veinBranches.push({

        corner: c % 4,

        angleOffset: rng.range(-0.42, 0.42),

        lengthRatio: rng.range(0.14, 0.32),

        wobbleFreq: rng.range(2.0, 5.0),

        wobbleAmp: rng.range(4.0, 12.0)

      });

    }

  };



  /**

   * Optional p5.js Instance-Mode mounting. Creates at most ONE transparent p5 canvas

   * with `pointer-events: none`.

   */

  VolumetricAtmosphereSystem.prototype.mountP5 = function (containerEl, P5Ctor) {

    if (this._p5Instance) return true;

    var P5 = P5Ctor || (typeof global !== 'undefined' ? global.p5 : null);

    if (!P5 || typeof document === 'undefined') return false;



    var host = containerEl || document.getElementById('ov') || document.body;

    var self = this;



    this._p5Instance = new P5(function (p) {

      p.setup = function () {

        var w = window.innerWidth || 1280;

        var h = window.innerHeight || 720;

        var cnv = p.createCanvas(w, h);

        if (cnv && cnv.elt) {

          cnv.elt.id = 'bloom-p5-atmosphere';

          cnv.elt.style.position = 'fixed';

          cnv.elt.style.top = '0';

          cnv.elt.style.left = '0';

          cnv.elt.style.pointerEvents = 'none';

          cnv.elt.style.zIndex = '12';

        }

        p.noStroke();

      };



      p.windowResized = function () {

        p.resizeCanvas(window.innerWidth || 1280, window.innerHeight || 720);

      };



      p.draw = function () {

        p.clear();

        var dt = Math.min(0.1, (p.deltaTime || 16.67) * 0.001);

        self.renderCanvas2D(p.drawingContext, p.width, p.height, dt);

      };

    }, host);



    return true;

  };



  /**

   * Renders volumetric fog ribbons, spores, ash embers, bioluminescent motes,

   * and creeping corner fungal veins onto any 2D Canvas context (`#oc` or p5).

   */

  VolumetricAtmosphereSystem.prototype.renderCanvas2D = function (ctx, width, height, dt) {

    if (!ctx || width <= 0 || height <= 0) return;

    var stepDt = clamp(dt || 0.016, 0.001, 0.1);

    var motionMult = this.quality.reducedMotion ? 0.15 : 1.0;

    this.time += stepDt * motionMult;



    var budget = Math.min(this._maxParticles, this.quality.particleBudget || 95);

    var fogCount = Math.min(this._fogRibbons.length, this.quality.fogRibbons || 4);



    ctx.save();



    // 1. Volumetric Fog Ribbons (screen blend)

    ctx.globalCompositeOperation = 'screen';

    for (var f = 0; f < fogCount; f++) {

      var rib = this._fogRibbons[f];

      rib.x += (rib.speed + this.env.windX * 0.3) * stepDt * motionMult;

      var spanW = width + rib.rx * 2;

      var dx = (((rib.x - this.env.cameraX * 0.35) % spanW) + spanW) % spanW - rib.rx;

      var dy = rib.yRatio * height + Math.sin(this.time * 0.4 + f) * 18;



      var fGrad = ctx.createRadialGradient(dx, dy, 8, dx, dy, rib.rx);

      fGrad.addColorStop(0, 'rgba(116, 128, 120, ' + rib.alpha.toFixed(3) + ')');

      fGrad.addColorStop(0.55, 'rgba(72, 82, 76, ' + (rib.alpha * 0.45).toFixed(3) + ')');

      fGrad.addColorStop(1, 'rgba(30, 36, 34, 0)');



      ctx.fillStyle = fGrad;

      ctx.beginPath();

      ctx.ellipse(dx, dy, rib.rx, rib.ry, 0, 0, Math.PI * 2);

      ctx.fill();

    }



    // 2. Spores, Ash Embers & Bioluminescent Infection Motes

    ctx.globalCompositeOperation = 'source-over';

    var t = this.time;

    var inf = this.env.infection;



    for (var i = 0; i < budget; i++) {

      var pt = this._particles[i];

      var curlX = Math.sin(t * pt.freq + pt.phase) * 10.0;

      var curlY = Math.cos(t * pt.freq * 0.85 + pt.phase) * 7.0;



      pt.x += (pt.vx + this.env.windX * 0.4 + curlX) * stepDt * motionMult;

      pt.y += (pt.vy + this.env.windY * 0.25 + curlY) * stepDt * motionMult;



      var sx = (((pt.x - this.env.cameraX * pt.depth) % width) + width) % width;

      var sy = (((pt.y - this.env.cameraY * pt.depth) % height) + height) % height;

      var a = pt.alpha * (0.65 + 0.35 * Math.sin(t * pt.freq * 1.4 + pt.phase));



      if (pt.type === 'spore') {

        ctx.fillStyle = 'rgba(176, 188, 134, ' + a.toFixed(3) + ')';

        ctx.beginPath();

        ctx.arc(sx, sy, pt.radius, 0, Math.PI * 2);

        ctx.fill();

      } else if (pt.type === 'ash') {

        ctx.fillStyle = 'rgba(148, 142, 136, ' + (a * 0.72).toFixed(3) + ')';

        ctx.fillRect(sx, sy, pt.radius * 1.3, pt.radius * 0.85);

      } else {

        // Bioluminescent infection mote

        var moteA = a * (0.35 + inf * 0.65);

        ctx.fillStyle = 'rgba(172, 186, 68, ' + moteA.toFixed(3) + ')';

        ctx.beginPath();

        ctx.arc(sx, sy, pt.radius * 0.7, 0, Math.PI * 2);

        ctx.fill();



        ctx.fillStyle = 'rgba(118, 142, 48, ' + (moteA * 0.22).toFixed(3) + ')';

        ctx.beginPath();

        ctx.arc(sx, sy, pt.radius * 2.2, 0, Math.PI * 2);

        ctx.fill();

      }

    }



    // 3. Creeping Fungal Vein Border Overgrowth when infection > 40%

    if (this.quality.enableFungalVeins && inf > 0.4) {

      var veinGrowth = clamp((inf - 0.4) / 0.6, 0, 1);

      this._renderCreepingFungalVeins(ctx, width, height, veinGrowth);

    }



    ctx.restore();

  };



  VolumetricAtmosphereSystem.prototype._renderCreepingFungalVeins = function (ctx, w, h, growth) {

    ctx.save();

    var corners = [

      { x: 0, y: 0, baseAng: Math.PI * 0.25 },

      { x: w, y: 0, baseAng: Math.PI * 0.75 },

      { x: w, y: h, baseAng: -Math.PI * 0.75 },

      { x: 0, y: h, baseAng: -Math.PI * 0.25 }

    ];



    var diag = Math.hypot(w, h);

    for (var i = 0; i < this._veinBranches.length; i++) {

      var vb = this._veinBranches[i];

      var c = corners[vb.corner];

      var maxLen = diag * vb.lengthRatio * growth;

      var segs = 8;

      var step = maxLen / segs;



      ctx.strokeStyle = i % 2 === 0

        ? 'rgba(58, 74, 38, ' + (0.45 * growth).toFixed(3) + ')'

        : 'rgba(92, 42, 34, ' + (0.38 * growth).toFixed(3) + ')';

      ctx.lineWidth = 2.2 * (1 - (i % 3) * 0.2);



      ctx.beginPath();

      var px = c.x;

      var py = c.y;

      ctx.moveTo(px, py);

      for (var s = 1; s <= segs; s++) {

        var ang = c.baseAng + vb.angleOffset + Math.sin(s * 0.9 + this.time * 0.8) * 0.18;

        px += Math.cos(ang) * step;

        py += Math.sin(ang) * step;

        ctx.lineTo(px, py);

      }

      ctx.stroke();

    }

    ctx.restore();

  };



  // ==========================================================================

  // [SECTION 8] PUBLIC FAÇADE & GLOBAL ATTACHMENT (window.BloomMegaUI)

  // ==========================================================================



  var _quality = QUALITY_PRESETS.high;

  var _sound = new DiegeticSoundSynth();

  var _bioMonitor = new DiegeticBioMonitor(_sound, _quality);

  var _inspector = new TacticalItemInspector(_sound);

  var _director = new CinematicDirector(_sound, _quality);

  var _atmosphere = new VolumetricAtmosphereSystem(_quality);

  var _initialized = false;



  var BloomMegaUI = {

    version: '2.5.0-BLOOM',



    /**

     * Initializes DOM bindings, scoped survival-horror CSS, and optional p5 instance.

     */

    init: function (options) {

      var opts = options || {};

      if (opts.quality) {

        this.setQuality(opts.quality, opts.reducedMotion);

      }

      if (typeof opts.onSound === 'function') {

        _sound.externalHook = opts.onSound;

      }

      if (opts.useP5Atmosphere) {

        _atmosphere.mountP5(opts.atmosphereContainer, opts.P5Constructor);

      }

      _bioMonitor.mount();

      _initialized = true;

      return this;

    },



    /**

     * Updates quality preset ('low' | 'medium' | 'high') and accessibility reducedMotion flag.

     */

    setQuality: function (tierName, reducedMotion) {

      var base = QUALITY_PRESETS[tierName] || QUALITY_PRESETS.high;

      _quality = {

        tier: base.tier,

        particleBudget: base.particleBudget,

        fogRibbons: base.fogRibbons,

        enableCRTScanlines: base.enableCRTScanlines,

        enableChromaticAberration: base.enableChromaticAberration,

        enableFungalVeins: base.enableFungalVeins,

        veinSegments: base.veinSegments,

        ecgSampleRate: base.ecgSampleRate,

        reducedMotion: Boolean(reducedMotion !== undefined ? reducedMotion : base.reducedMotion)

      };

      _bioMonitor.quality = _quality;

      _director.quality = _quality;

      _atmosphere.quality = _quality;

      return this;

    },



    /**

     * Plays a Chapter Intro title sequence (accepts chapter number 1..5 or custom spec).

     */

    playChapterIntro: function (specOrChapterNum) {

      if (!_initialized) this.init();

      _director.playChapterIntro(specOrChapterNum);

      return this;

    },



    /**

     * Displays diegetic typewriter dialogue for David, Nancy, Maya, Radio, or System.

     */

    showDialogue: function (speaker, text, duration, emotion) {

      if (!_initialized) this.init();

      _director.showDialogue(speaker, text, duration, emotion);

      return this;

    },



    /**

     * Opens the interactive 2.5D Tactical Item & Lore Inspector modal.

     */

    inspectItem: function (itemSpecOrPresetId) {

      if (!_initialized) this.init();

      _inspector.inspect(itemSpecOrPresetId);

      return this;

    },



    closeInspector: function () {

      _inspector.close();

      return this;

    },



    /**

     * Displays an Archival Collage B-Roll card ('evac_map' | 'medical_dossier' | 'family_polaroid' | 'quarantine_flyer').

     */

    showArchivalCollage: function (collageType, duration) {

      if (!_initialized) this.init();

      _director.showArchivalCollage(collageType, duration);

      return this;

    },



    /**

     * Updates David's & Nancy's live ECG monitors, stamina/trust telemetry, and Geiger infection state.

     */

    updateHUD: function (gameState, dt) {

      if (!_initialized) this.init();

      _bioMonitor.update(gameState, dt);

      _director.update(dt);

      if (gameState) {

        if (gameState.infection !== undefined) {

          _atmosphere.env.infection = clamp(

            gameState.infection > 1 ? gameState.infection / 100 : gameState.infection,

            0,

            1

          );

        }

        if (gameState.camX !== undefined) _atmosphere.env.cameraX = gameState.camX;

        if (gameState.camY !== undefined) _atmosphere.env.cameraY = gameState.camY;

      }

      return this;

    },



    /**

     * Renders the screen-space atmospheric particles (if not using p5), creeping fungal veins,

     * archival B-roll, letterboxing, and chapter title cards onto `#oc` (or supplied ctx).

     */

    renderOverlay: function (dt, targetCtx) {

      if (!_initialized) this.init();

      var ctx = targetCtx;

      if (!ctx && typeof document !== 'undefined') {

        var oc = document.getElementById('oc') || document.getElementById('c');

        if (oc && typeof oc.getContext === 'function') {

          ctx = oc.getContext('2d');

        }

      }

      if (!ctx) return this;



      var dpr = (typeof global.DPR !== 'undefined' && global.DPR > 0) ? global.DPR : 1;

      var w = (typeof global.W !== 'undefined' && global.W > 0) ? global.W : (ctx.canvas.width / dpr);

      var h = (typeof global.H !== 'undefined' && global.H > 0) ? global.H : (ctx.canvas.height / dpr);



      var hasP5 = _atmosphere._p5Instance || (typeof document !== 'undefined' && !!document.getElementById('bloom-p5-atmosphere'));

      if (!hasP5) {

        _atmosphere.renderCanvas2D(ctx, w, h, dt || 0.016);

      } else if (_atmosphere.env.infection > 0.05) {

        var growth = clamp((_atmosphere.env.infection - 0.05) / 0.95, 0, 1);

        _atmosphere._renderCreepingFungalVeins(ctx, w, h, growth);

      }



      _director.render(ctx, w, h);

      return this;

    },



    /**

     * Triggers screen-space VHS/chromatic glitch slice bars.

     */

    triggerGlitch: function (intensity, duration) {

      _director.triggerGlitch(intensity, duration);

      return this;

    },



    /**

     * Triggers a camera impulse ('enemy_spotted' | 'nancy_panic' | 'safe_room' | 'hit').

     */

    triggerCameraImpulse: function (type, intensity) {

      _director.triggerCameraImpulse(type, intensity);

      return this;

    },



    /**

     * Returns current camera shake offset and focal zoom bonus for integration with `setWorld()`.

     */

    getCameraTransformOffset: function () {

      return {

        offsetX: _director.cameraImpulse.offsetX,

        offsetY: _director.cameraImpulse.offsetY,

        zoomBonus: _director.cameraImpulse.zoomBonus

      };

    },



    /**

     * Projects world isometric coordinates (x, y, z) to screen space matching engine convention.

     */

    projectIso: function (x, y, z) {

      var isoX = typeof global.isx === 'function' ? global.isx(x, y) : (x - y) * 32;

      var isoY = typeof global.isy === 'function' ? global.isy(x, y, z) : (x + y) * 16 - (z || 0) * 32;

      return { x: isoX, y: isoY };

    },



    classes: {

      SeededRNG: SeededRNG,

      DiegeticSoundSynth: DiegeticSoundSynth,

      DiegeticBioMonitor: DiegeticBioMonitor,

      TacticalItemInspector: TacticalItemInspector,

      CinematicDirector: CinematicDirector,

      VolumetricAtmosphereSystem: VolumetricAtmosphereSystem

    },



    presets: {

      QUALITY: QUALITY_PRESETS,

      CHAPTERS: CHAPTER_PRESETS,

      ITEMS: ITEM_PRESETS,

      SPEAKERS: SPEAKER_PROFILES

    }

  };



  // Attach non-destructively to window.BloomMegaUI

  global.BloomMegaUI = Object.assign(global.BloomMegaUI || {}, BloomMegaUI);

})(typeof window !== 'undefined' ? window : globalThis);