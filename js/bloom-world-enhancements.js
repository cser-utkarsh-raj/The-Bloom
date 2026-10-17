/**
 * ============================================================================
 * THE BLOOM — 2.5D WORLD, PERIMETER HORIZON, DECAL & PROP ENHANCEMENT ENGINE
 * File: bloom-world-enhancements.js
 * Version: 2.0.0-WORLD
 * ============================================================================
 * Classic browser script (IIFE attaching to window.BloomWorldEnhancements).
 * Zero ES module import/export keywords. Zero external runtime dependencies.
 *
 * Core Isometric Math:
 *   isx(x, y)    = (x - y) * 32
 *   isy(x, y, z) = (x + y) * 16 - (z || 0) * 32
 *   TW = 64, TH = 32, ZH = 32
 *   w2s(x, y, z) = [(isx(x,y) - CX) * Z + W/2, (isy(x,y,z) - CY) * Z + H/2]
 *   Sort key k   = isy(x, y, 0) + bias
 * ============================================================================
 */
(function (global) {
  'use strict';

  // ==========================================================================
  // [SECTION 1] ISOMETRIC COORDINATE MATH, DETERMINISTIC PRNG & COLOR UTILS
  // ==========================================================================

  var TW = 64;
  var TH = 32;
  var ZH = 32;

  function isx(x, y) {
    return (x - y) * 32;
  }

  function isy(x, y, z) {
    return (x + y) * 16 - (z || 0) * 32;
  }

  function w2s(x, y, z, cx, cy, zoom, sw, sh) {
    var zf = zoom || 1;
    var ix = isx(x, y);
    var iy = isy(x, y, z || 0);
    return [
      (ix - (cx || 0)) * zf + (sw || 1280) * 0.5,
      (iy - (cy || 0)) * zf + (sh || 720) * 0.5
    ];
  }

  function computeSortKey(x, y, bias) {
    return isy(x, y, 0) + (bias || 0);
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  /**
   * Deterministic Mulberry32 PRNG + 2D Spatial Hash for zero-flicker procedural detail.
   */
  function WorldRNG(seedInput) {
    this.setSeed(seedInput || 'BLOOM_WORLD_2026');
  }

  WorldRNG.prototype.setSeed = function (seedInput) {
    var str = String(seedInput);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    this._state = h || 0x85ebca6b;
  };

  WorldRNG.prototype.next = function () {
    var t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  WorldRNG.prototype.range = function (min, max) {
    return min + this.next() * (max - min);
  };

  WorldRNG.prototype.int = function (min, maxInclusive) {
    return Math.floor(this.range(min, maxInclusive + 0.99999));
  };

  WorldRNG.prototype.chance = function (prob) {
    return this.next() < prob;
  };

  WorldRNG.prototype.pick = function (arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(this.next() * arr.length)];
  };

  function hashCoords(x, y, salt) {
    var ix = Math.floor(x * 100);
    var iy = Math.floor(y * 100);
    var n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(salt || 1, 1442695041);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Checks whether an isometric world coordinate `(wx, wy)` is within the current
   * camera frustum (with a configurable pixel margin).
   */
  function isIsoPointInFrustum(wx, wy, wz, cx, cy, zoom, sw, sh, marginPx) {
    var zf = zoom || 1;
    var w = sw || 1280;
    var h = sh || 720;
    var pad = (marginPx || 260) * zf;
    var sx = (isx(wx, wy) - (cx || 0)) * zf + w * 0.5;
    var sy = (isy(wx, wy, wz || 0) - (cy || 0)) * zf + h * 0.5;
    return sx >= -pad && sx <= w + pad && sy >= -pad && sy <= h + pad;
  }

  /**
   * Detects whether `ctx` is currently in Screen Space (identity transform) or
   * already transformed by the host engine's `setWorld()`, and applies the
   * world camera transform only if needed.
   */
  function withWorldTransform(ctx, cx, cy, zoom, sw, sh, callback) {
    if (!ctx) return;
    var w = sw || (ctx.canvas ? ctx.canvas.width : 1280);
    var h = sh || (ctx.canvas ? ctx.canvas.height : 720);
    var zf = zoom || 1;
    var needsTransform = true;

    if (typeof ctx.getTransform === 'function') {
      var m = ctx.getTransform();
      // If canvas already has a non-identity translation near W/2 or scale != 1, setWorld() is active
      if (Math.abs(m.e) > 1.0 || Math.abs(m.f) > 1.0 || Math.abs(m.a - 1.0) > 0.01) {
        needsTransform = false;
      }
    }

    ctx.save();
    if (needsTransform) {
      ctx.translate(w * 0.5, h * 0.5);
      ctx.scale(zf, zf);
      ctx.translate(-(cx || 0), -(cy || 0));
    }
    callback(ctx, w, h, zf);
    ctx.restore();
  }

  // ==========================================================================
  // [SECTION 2] 2.5D ISOMETRIC PRIMITIVE GEOMETRY HELPERS (WORLD PIXEL SPACE)
  // ==========================================================================

  /**
   * Draws an isometric diamond floor tile centered at `(wx, wy, wz)` with dimensions `(wTiles, hTiles)`.
   */
  function drawIsoDiamond(ctx, wx, wy, wz, wTiles, hTiles, fillStyle, strokeStyle, lineWidth) {
    var hw = (wTiles || 1) * 0.5;
    var hh = (hTiles || 1) * 0.5;
    var x0 = isx(wx - hw, wy - hh), y0 = isy(wx - hw, wy - hh, wz);
    var x1 = isx(wx + hw, wy - hh), y1 = isy(wx + hw, wy - hh, wz);
    var x2 = isx(wx + hw, wy + hh), y2 = isy(wx + hw, wy + hh, wz);
    var x3 = isx(wx - hw, wy + hh), y3 = isy(wx - hw, wy + hh, wz);

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();

    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    }
  }

  /**
   * Draws a 3D isometric axis-aligned box centered at `(wx, wy)` with base at `wz`,
   * dimensions `(dx, dy, dz)` in tile units, and separate top, left (+Y), and right (+X) face colors.
   */
  function drawIsoBox(ctx, wx, wy, wz, dx, dy, dz, topColor, leftColor, rightColor, outlineColor) {
    var hx = dx * 0.5;
    var hy = dy * 0.5;
    var zTop = (wz || 0) + dz;
    var zBot = wz || 0;

    // Top 4 vertices
    var t0x = isx(wx - hx, wy - hy), t0y = isy(wx - hx, wy - hy, zTop);
    var t1x = isx(wx + hx, wy - hy), t1y = isy(wx + hx, wy - hy, zTop);
    var t2x = isx(wx + hx, wy + hy), t2y = isy(wx + hx, wy + hy, zTop);
    var t3x = isx(wx - hx, wy + hy), t3y = isy(wx - hx, wy + hy, zTop);

    // Bottom 3 visible front vertices (b1, b2, b3)
    var b1x = isx(wx + hx, wy - hy), b1y = isy(wx + hx, wy - hy, zBot);
    var b2x = isx(wx + hx, wy + hy), b2y = isy(wx + hx, wy + hy, zBot);
    var b3x = isx(wx - hx, wy + hy), b3y = isy(wx - hx, wy + hy, zBot);

    // Left visible face (+Y face: t3 -> t2 -> b2 -> b3)
    if (leftColor) {
      ctx.fillStyle = leftColor;
      ctx.beginPath();
      ctx.moveTo(t3x, t3y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(b2x, b2y);
      ctx.lineTo(b3x, b3y);
      ctx.closePath();
      ctx.fill();
      if (outlineColor) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Right visible face (+X face: t2 -> t1 -> b1 -> b2)
    if (rightColor) {
      ctx.fillStyle = rightColor;
      ctx.beginPath();
      ctx.moveTo(t2x, t2y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(b1x, b1y);
      ctx.lineTo(b2x, b2y);
      ctx.closePath();
      ctx.fill();
      if (outlineColor) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Top face (t0 -> t1 -> t2 -> t3)
    if (topColor) {
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(t0x, t0y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(t3x, t3y);
      ctx.closePath();
      ctx.fill();
      if (outlineColor) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Subtle top front bevel highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(t3x, t3y);
    ctx.lineTo(t2x, t2y);
    ctx.lineTo(t1x, t1y);
    ctx.stroke();
  }

  /**
   * Draws a vertical isometric cylinder (barrels, pillars, poles, trees).
   */
  function drawIsoVerticalCylinder(ctx, wx, wy, wz, radiusPx, heightZ, bodyColor, darkColor, topColor) {
    var bx = isx(wx, wy);
    var by = isy(wx, wy, wz || 0);
    var ty = isy(wx, wy, (wz || 0) + heightZ);
    var rx = radiusPx;
    var ry = radiusPx * 0.5;

    // Cylinder shaft with horizontal shading gradient
    var grad = ctx.createLinearGradient(bx - rx, ty, bx + rx, by);
    grad.addColorStop(0, bodyColor);
    grad.addColorStop(0.6, bodyColor);
    grad.addColorStop(1, darkColor);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx - rx, ty);
    ctx.lineTo(bx - rx, by);
    ctx.ellipse(bx, by, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(bx + rx, ty);
    ctx.closePath();
    ctx.fill();

    // Top cap ellipse
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.ellipse(bx, ty, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /**
   * Draws a grounded contact shadow ellipse beneath any prop.
   */
  function drawContactShadow(ctx, wx, wy, wz, rxPx, ryPx, alpha) {
    var sx = isx(wx, wy);
    var sy = isy(wx, wy, wz || 0);
    var a = alpha !== undefined ? alpha : 0.62;
    var grad = ctx.createRadialGradient(sx, sy, rxPx * 0.15, sx, sy, rxPx);
    grad.addColorStop(0, 'rgba(3, 4, 6, ' + a.toFixed(2) + ')');
    grad.addColorStop(0.65, 'rgba(3, 4, 6, ' + (a * 0.45).toFixed(2) + ')');
    grad.addColorStop(1, 'rgba(3, 4, 6, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rxPx, ryPx, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================================================
  // [SECTION 3] CHAPTER ARCHITECTURAL & ATMOSPHERIC BLUEPRINTS (CHAPTERS 1–5)
  // ==========================================================================

  var CHAPTER_CONFIGS = {
    1: {
      chapterNumber: 1,
      id: 'ch1_home_defence',
      title: 'Chapter I: Home Defence',
      defaultW: 46,
      defaultH: 36,
      perimeterWidth: 16,
      horizonColors: {
        voidOuter: '#040709',
        fogMid: '#0b1216',
        groundEdge: '#121a18',
        mistTint: 'rgba(26, 40, 44, 0.45)'
      },
      perimeterTheme: 'suburban_yard'
    },
    2: {
      chapterNumber: 2,
      id: 'ch2_face_i_loved',
      title: 'Chapter II: The Face I Loved',
      defaultW: 44,
      defaultH: 36,
      perimeterWidth: 16,
      horizonColors: {
        voidOuter: '#050609',
        fogMid: '#0e1318',
        groundEdge: '#151d1a',
        mistTint: 'rgba(38, 52, 44, 0.48)'
      },
      perimeterTheme: 'estate_courtyard'
    },
    3: {
      chapterNumber: 3,
      id: 'ch3_miles_of_silence',
      title: 'Chapter III: Miles of Silence',
      defaultW: 42,
      defaultH: 140,
      perimeterWidth: 16,
      horizonColors: {
        voidOuter: '#040608',
        fogMid: '#0c1217',
        groundEdge: '#141b20',
        mistTint: 'rgba(32, 44, 52, 0.52)'
      },
      perimeterTheme: 'coastal_highway'
    },
    4: {
      chapterNumber: 4,
      id: 'ch4_no_safe_haven',
      title: 'Chapter IV: No Safe Haven',
      defaultW: 48,
      defaultH: 42,
      perimeterWidth: 16,
      horizonColors: {
        voidOuter: '#070507',
        fogMid: '#140e12',
        groundEdge: '#1c1618',
        mistTint: 'rgba(54, 28, 32, 0.42)'
      },
      perimeterTheme: 'high_school_depot'
    },
    5: {
      chapterNumber: 5,
      id: 'ch5_point_of_no_return',
      title: 'Chapter V: The Point Of No Return',
      defaultW: 44,
      defaultH: 150,
      perimeterWidth: 18,
      horizonColors: {
        voidOuter: '#060504',
        fogMid: '#14110d',
        groundEdge: '#1e1914',
        mistTint: 'rgba(58, 44, 26, 0.48)'
      },
      perimeterTheme: 'military_corridor'
    }
  };

  /**
   * Resolves canonical 1..5 chapter number from a 0-based or 1-based index or levelInstance metadata.
   */
  function resolveChapterNumber(levelIndex, levelInstance) {
    if (levelInstance && levelInstance.chapterNumber >= 1 && levelInstance.chapterNumber <= 5) {
      return levelInstance.chapterNumber;
    }
    var idx = Number(levelIndex);
    if (!isNaN(idx)) {
      if (idx >= 1 && idx <= 5) {
        // Disambiguate 0-based vs 1-based by checking level dimensions if available
        if (levelInstance && levelInstance.h >= 120 && idx === 2) return 3;
        if (levelInstance && levelInstance.h >= 120 && idx === 4) return 5;
        if (idx === 5) return 5;
      }
      if (idx === 0) return 1;
      return clamp(idx, 1, 5);
    }
    return 1;
  }

  /**
   * Builds chapter-specific floor zones, decals, perimeter features, and 2.5D props.
   */
  function buildChapterEnhancementData(chapterNum, W, H, seedStr) {
    var cfg = CHAPTER_CONFIGS[chapterNum] || CHAPTER_CONFIGS[1];
    var rng = new WorldRNG(seedStr || ('BLOOM_WORLD_CH_' + chapterNum + '_' + W + 'x' + H));
    var decals = [];
    var props = [];
    var perimeterFeatures = [];
    var floorZones = [];

    function addDecal(type, x, y, opts) {
      var o = opts || {};
      decals.push({
        type: type,
        x: x,
        y: y,
        radius: o.radius || 0.65,
        angle: o.angle !== undefined ? o.angle : rng.range(0, Math.PI * 2),
        alpha: o.alpha !== undefined ? o.alpha : 0.75,
        variant: o.variant || 0,
        length: o.length || 1.2,
        width: o.width || 0.8,
        text: o.text || ''
      });
    }

    function addProp(type, x, y, opts) {
      var o = opts || {};
      var z = o.z || 0;
      var bias = o.bias !== undefined ? o.bias : 0;
      props.push({
        type: type,
        x: x,
        y: y,
        z: z,
        yaw: o.yaw || 0,
        scale: o.scale || 1.0,
        variant: o.variant !== undefined ? o.variant : rng.int(0, 3),
        solid: Boolean(o.solid),
        label: o.label || '',
        bias: bias,
        k: computeSortKey(x, y, bias)
      });
    }

    // ------------------------------------------------------------------------
    // CHAPTER I: HOME DEFENCE (46x36) — Suburban House & Overgrown Yard
    // ------------------------------------------------------------------------
    if (chapterNum === 1) {
      var houseX0 = 10, houseY0 = 7, houseX1 = 36, houseY1 = 27;

      floorZones.push(
        { x0: 0, y0: 0, x1: W - 1, y1: H - 1, tileType: 'grass' },
        { x0: 21, y0: 27, x1: 25, y1: H - 1, tileType: 'walk' },
        { x0: houseX0, y0: houseY0, x1: houseX1, y1: houseY1, tileType: 'wood' },
        { x0: 25, y0: 9, x1: 35, y1: 18, tileType: 'lino' } // Kitchen linoleum wing
      );

      // Shattered front foyer glass & muddy footprints entering house
      addDecal('shattered_glass', 23, 26.5, { radius: 1.1, alpha: 0.85 });
      for (var step = 0; step < 9; step++) {
        addDecal('mud_footprints', 23 + (step % 2) * 0.28, 32 - step * 0.85, {
          angle: -Math.PI * 0.5,
          alpha: 0.7 - step * 0.05
        });
      }

      // Barricaded windows along house perimeter with rain streaks
      var winCoords = [
        { x: 14, y: houseY1, yaw: 0 },
        { x: 19, y: houseY1, yaw: 0 },
        { x: 28, y: houseY1, yaw: 0 },
        { x: 33, y: houseY1, yaw: 0 },
        { x: houseX0, y: 12, yaw: 1 },
        { x: houseX0, y: 21, yaw: 1 },
        { x: houseX1, y: 14, yaw: 1 }
      ];
      for (var w = 0; w < winCoords.length; w++) {
        addProp('barricaded_window', winCoords[w].x, winCoords[w].y, {
          yaw: winCoords[w].yaw,
          bias: 6
        });
        addDecal('shattered_glass', winCoords[w].x + 0.4, winCoords[w].y + 0.4, { radius: 0.65 });
      }

      // Interior living room & kitchen horror props
      addProp('fallen_bookshelf', 13.5, 11.5, { yaw: 0.2, solid: true, bias: 4 });
      addProp('fallen_bookshelf', 16.5, 19.0, { yaw: -0.35, solid: true, bias: 4 });
      addProp('overturned_coffee_table', 18.0, 15.5, { yaw: 0.4, solid: true, bias: 3 });
      addProp('scratched_portrait', 15.0, 8.2, { bias: -4 });
      addProp('scratched_portrait', 22.0, 8.2, { bias: -4 });
      addProp('trash_bags', 33.5, 10.5, { bias: 2 });
      addProp('ammo_tin', 20.5, 14.2, { bias: 1 });
      addProp('sandbag_wall', 22.0, 25.5, { yaw: 0, bias: 4 });
      addProp('sandbag_wall', 24.2, 25.5, { yaw: 0, bias: 4 });

      // Exterior suburban front yard: fallen telephone pole & neighbor's smoking fence
      addProp('fallen_telephone_pole', 8.5, 30.5, { yaw: 0.18, solid: true, bias: 8 });
      for (var fx = 4; fx <= 42; fx += 3) {
        if (fx >= 20 && fx <= 26) continue; // Front walkway gap
        addProp('smoking_fence', fx, 34.2, { yaw: 0, bias: 5 });
      }

      // Yard puddles, spore creeps & blood drag trails
      for (var p = 0; p < 14; p++) {
        addDecal('puddle', rng.range(3, W - 3), rng.range(28, H - 2), {
          radius: rng.range(0.7, 1.45),
          alpha: 0.65
        });
      }
      addDecal('blood_trail', 22.5, 22.0, { radius: 1.1, angle: 0.8 });
      addDecal('spore_mold', 11.5, 9.5, { radius: 1.3 });
      addDecal('spore_mold', 34.0, 17.0, { radius: 1.15 });
    }

    // ------------------------------------------------------------------------
    // CHAPTER II: THE FACE I LOVED (44x36) — Master Estate & Maya Courtyard
    // ------------------------------------------------------------------------
    else if (chapterNum === 2) {
      floorZones.push(
        { x0: 0, y0: 0, x1: W - 1, y1: H - 1, tileType: 'dark' }, // Dark cherry parquet
        { x0: 10, y0: 10, x1: 34, y1: 26, tileType: 'grass' },   // Overgrown courtyard garden
        { x0: 14, y0: 14, x1: 30, y1: 22, tileType: 'walk' }     // Conservatory flagstones
      );

      // Baiting Stone Pillars in symmetric colonnade ring for Maya's boss charges
      var pillarCoords = [
        { x: 14, y: 12 }, { x: 22, y: 12 }, { x: 30, y: 12 },
        { x: 14, y: 18 },                   { x: 30, y: 18 },
        { x: 14, y: 24 }, { x: 22, y: 24 }, { x: 30, y: 24 }
      ];
      for (var pc = 0; pc < pillarCoords.length; pc++) {
        addProp('stone_pillar', pillarCoords[pc].x, pillarCoords[pc].y, {
          solid: true,
          bias: 8,
          variant: pc % 3
        });
        addDecal('spore_mold', pillarCoords[pc].x + 0.3, pillarCoords[pc].y + 0.3, {
          radius: 1.05
        });
      }

      // Shattered French doors & rain-swept conservatory glass walls
      addProp('shattered_french_door', 22, 9.5, { yaw: 0, bias: 5 });
      addProp('shattered_french_door', 22, 26.5, { yaw: 0, bias: 5 });
      addDecal('shattered_glass', 22, 10.2, { radius: 1.3 });
      addDecal('shattered_glass', 22, 25.8, { radius: 1.3 });

      for (var gx = 12; gx <= 32; gx += 4) {
        if (Math.abs(gx - 22) < 2) continue;
        addProp('conservatory_glass_wall', gx, 9.5, { yaw: 0, bias: 5 });
      }

      // Fallen marble statues & Maya's torn wedding veil caught on brambles
      addProp('fallen_marble_statue', 18.5, 17.5, { yaw: 0.45, solid: true, bias: 6 });
      addProp('fallen_marble_statue', 26.5, 19.5, { yaw: -0.6, solid: true, bias: 6 });
      addProp('torn_wedding_veil', 22.0, 18.0, { bias: 5 });

      // Creeping bioluminescent spore blooms along estate walls
      for (var sb = 0; sb < 16; sb++) {
        var bx = sb < 8 ? rng.range(4, 40) : (sb % 2 === 0 ? 5 : 39);
        var by = sb < 8 ? (sb % 2 === 0 ? 4 : 32) : rng.range(5, 31);
        addProp('wall_spore_bloom', bx, by, { bias: 3, variant: sb % 3 });
        addDecal('spore_mold', bx, by, { radius: 1.35 });
      }

      for (var cp = 0; cp < 12; cp++) {
        addDecal('puddle', rng.range(11, 33), rng.range(11, 25), { radius: rng.range(0.8, 1.5) });
      }
      addDecal('blood_trail', 21.5, 16.5, { radius: 1.25 });
    }

    // ------------------------------------------------------------------------
    // CHAPTER III: MILES OF SILENCE (42x140) — Route 101 Coastal Highway
    // ------------------------------------------------------------------------
    else if (chapterNum === 3) {
      floorZones.push(
        { x0: 0, y0: 0, x1: W - 1, y1: H - 1, tileType: 'grass' },
        { x0: 9, y0: 0, x1: 33, y1: H - 1, tileType: 'walk' },  // Paved gravel shoulders
        { x0: 12, y0: 0, x1: 30, y1: H - 1, tileType: 'road' }  // Double-lane Route 101 asphalt
      );

      // Highway centerline yellow dashes, shoulder lines, drain grates & puddles
      for (var hy = 3; hy < H - 3; hy += 4) {
        addDecal('road_marking', 21.0, hy, { variant: 0, length: 2.2 }); // Yellow center divider
        addDecal('road_marking', 12.6, hy, { variant: 1, length: 3.8 }); // Left white shoulder
        addDecal('road_marking', 29.4, hy, { variant: 1, length: 3.8 }); // Right white shoulder

        if (hy % 16 === 3) {
          addDecal('drain_grate', 13.2, hy, { radius: 0.55 });
          addDecal('drain_grate', 28.8, hy, { radius: 0.55 });
        }
      }

      // Crushed highway guardrails & emergency call boxes along both shoulders
      for (var gy = 4; gy < H - 4; gy += 5) {
        addProp('crushed_guardrail', 10.8, gy, { yaw: Math.PI * 0.5, variant: gy % 3, bias: 4 });
        addProp('crushed_guardrail', 31.2, gy, { yaw: Math.PI * 0.5, variant: (gy + 1) % 3, bias: 4 });

        if (gy % 25 === 4) {
          addProp('emergency_call_box', 9.8, gy + 1.5, { bias: 6 });
        }
      }

      // Overturned tanker trucks & 2.5D burned car hulks forming tactical highway weave
      var tankerY = [32, 78, 116];
      for (var t = 0; t < tankerY.length; t++) {
        addProp('overturned_tanker', 18 + (t % 2) * 5, tankerY[t], {
          yaw: (t % 2 === 0 ? 0.38 : -0.42),
          solid: true,
          bias: 12
        });
        addDecal('puddle', 20, tankerY[t] + 2.5, { radius: 2.1, alpha: 0.8 });
        addDecal('spore_mold', 19, tankerY[t] - 2.0, { radius: 1.8 });
      }

      for (var cy = 10; cy < H - 10; cy += 9) {
        if (Math.abs(cy - 32) < 5 || Math.abs(cy - 78) < 5 || Math.abs(cy - 116) < 5) continue;
        var laneX = rng.pick([15.5, 19.0, 23.5, 26.5]);
        addProp('burned_car_hulk', laneX + rng.range(-0.8, 0.8), cy, {
          yaw: rng.range(-0.45, 0.45),
          variant: cy % 4,
          solid: true,
          bias: 8
        });
        addDecal('shattered_glass', laneX + 1.1, cy + 0.6, { radius: 0.85 });
      }

      // Collapsed concrete highway overpasses with dripping moss
      var overpassY = [48, 96];
      for (var oy = 0; oy < overpassY.length; oy++) {
        addProp('collapsed_overpass', 21.0, overpassY[oy], { bias: 16 });
        addDecal('spore_mold', 16.0, overpassY[oy], { radius: 2.2 });
        addDecal('spore_mold', 26.0, overpassY[oy], { radius: 2.2 });
      }
    }

    // ------------------------------------------------------------------------
    // CHAPTER IV: NO SAFE HAVEN (48x42) — St. Jude's High School & Gymnasium
    // ------------------------------------------------------------------------
    else if (chapterNum === 4) {
      floorZones.push(
        { x0: 0, y0: 0, x1: W - 1, y1: H - 1, tileType: 'lino' },  // Institutional corridor tile
        { x0: 10, y0: 8, x1: 38, y1: 32, tileType: 'wood' }        // Gymnasium hardwood court
      );

      // Gymnasium painted court boundary lines & center jump circle
      addDecal('gym_court_line', 24, 20, { width: 24, length: 20 });

      // Military triage cots arranged in rows with blood trails & IV stands
      for (var row = 12; row <= 28; row += 5) {
        for (var col = 14; col <= 34; col += 6) {
          if (Math.abs(col - 24) < 3 && Math.abs(row - 20) < 3) continue;
          addProp('triage_cot', col + rng.range(-0.3, 0.3), row, {
            yaw: rng.range(-0.15, 0.15),
            variant: (row + col) % 3,
            bias: 5
          });
          if (rng.chance(0.45)) {
            addDecal('blood_trail', col + 0.5, row + 0.4, { radius: 0.85 });
          }
        }
      }

      // Barricaded cafeteria tables, FEMA disaster crates & biohazard barrels
      var barricadeSpots = [
        { x: 11, y: 14 }, { x: 11, y: 26 }, { x: 37, y: 14 }, { x: 37, y: 26 },
        { x: 20, y: 9 },  { x: 28, y: 9 },  { x: 20, y: 31 }, { x: 28, y: 31 }
      ];
      for (var bs = 0; bs < barricadeSpots.length; bs++) {
        addProp('barricaded_cafeteria_table', barricadeSpots[bs].x, barricadeSpots[bs].y, {
          yaw: bs < 4 ? Math.PI * 0.5 : 0,
          solid: true,
          bias: 6
        });
        addProp('fema_crate', barricadeSpots[bs].x + 1.2, barricadeSpots[bs].y + 0.6, { bias: 4 });
      }

      // Scrawled chalkboards, emergency red floodlights & ruptured biohazard plastic curtains
      addProp('scrawled_chalkboard', 16, 6.5, { label: 'EVAC BUSES NEVER CAME', bias: 6 });
      addProp('scrawled_chalkboard', 32, 6.5, { label: 'DO NOT OPEN THE GYM DOORS', bias: 6 });

      var floodSpots = [
        { x: 12, y: 10 }, { x: 36, y: 10 }, { x: 12, y: 30 }, { x: 36, y: 30 }
      ];
      for (var fl = 0; fl < floodSpots.length; fl++) {
        addProp('red_floodlight', floodSpots[fl].x, floodSpots[fl].y, { bias: 7 });
      }

      addProp('biohazard_plastic_curtain', 24, 7.5, { bias: 9 });
      addProp('biohazard_plastic_curtain', 24, 33.5, { bias: 9 });
      addProp('biohazard_barrel', 21.5, 7.8, { bias: 5 });
      addProp('biohazard_barrel', 26.5, 33.2, { bias: 5 });
    }

    // ------------------------------------------------------------------------
    // CHAPTER V: THE POINT OF NO RETURN (44x150) — Quarantine Sector 9 & Bunker 7
    // ------------------------------------------------------------------------
    else if (chapterNum === 5) {
      floorZones.push(
        { x0: 0, y0: 0, x1: W - 1, y1: H - 1, tileType: 'waste' },
        { x0: 10, y0: 0, x1: 34, y1: H - 1, tileType: 'tile' } // Reinforced military concrete corridor
      );

      // Massive reinforced titanium hydraulic blast door threshold at north end (y = 5.5) and south end
      addProp('bunker_blast_door', 22.0, 5.5, { solid: true, bias: 20 });

      // Anti-vehicle Dragon's Teeth tank traps, concertina razor-wire & biometric checkpoints
      for (var my = 14; my < H - 10; my += 14) {
        // Dragon's teeth rows on flanks
        addProp('dragons_teeth', 12.0, my, { bias: 5 });
        addProp('dragons_teeth', 14.2, my, { bias: 5 });
        addProp('dragons_teeth', 29.8, my, { bias: 5 });
        addProp('dragons_teeth', 32.0, my, { bias: 5 });

        // Concertina razor-wire barricades staggering the corridor
        var wireX = (my % 28 === 14) ? 18.5 : 25.5;
        addProp('concertina_wire', wireX, my + 4, { bias: 6 });
        addProp('sandbag_wall', wireX - 2.2, my + 4.5, { bias: 5 });

        // Biometric security kiosks & pulsing amber klaxons at checkpoints
        if (my % 28 === 14) {
          addProp('biometric_kiosk', 22.0, my + 7, { solid: true, bias: 8 });
          addProp('amber_klaxon', 10.5, my + 7, { bias: 9 });
          addProp('amber_klaxon', 33.5, my + 7, { bias: 9 });
        }

        // Artillery blast craters, spent brass shell casings & ammo tins
        var craterX = rng.range(14, 30);
        addDecal('blast_crater', craterX, my + 2, { radius: rng.range(1.4, 2.3) });
        addProp('shell_casings', craterX + 1.2, my + 2.8, { bias: 1 });
        if (rng.chance(0.6)) {
          addProp('ammo_tin', craterX - 1.1, my + 1.5, { bias: 2 });
          addProp('biohazard_barrel', 11.2, my + 2, { bias: 5 });
        }
      }
    }

    // Sort props once along isometric diagonal `k = isy(x, y, 0) + bias`
    props.sort(function (a, b) {
      return a.k - b.k;
    });

    // Generate non-playable Perimeter Buffer features in the [-16..W+16, -16..H+16] belt
    var belt = cfg.perimeterWidth || 16;
    var stepSize = (H > 80) ? 4 : 3;
    for (var py = -belt; py < H + belt; py += stepSize) {
      for (var px = -belt; px < W + belt; px += stepSize) {
        // Skip interior playable map
        if (px >= -0.5 && px <= W + 0.5 && py >= -0.5 && py <= H + 0.5) continue;

        var distX = px < 0 ? -px : (px > W ? px - W : 0);
        var distY = py < 0 ? -py : (py > H ? py - H : 0);
        var edgeDist = Math.max(distX, distY);
        if (edgeDist > belt) continue;

        var hVal = hashCoords(px, py, chapterNum * 97);
        var featureType = 'none';

        // Inner perimeter ring (1.5 to 4 tiles outside map border): fences, floodwalls, guardrails
        if (edgeDist >= 1.2 && edgeDist <= 4.2 && hVal > 0.25) {
          if (chapterNum === 5) featureType = 'flood_wall';
          else if (chapterNum === 4) featureType = 'chain_fence';
          else if (chapterNum === 3) featureType = 'highway_ditch_post';
          else featureType = 'silhouette_fence';
        }
        // Mid/Outer perimeter belt (4.2 to 15 tiles outside map border): dark tree lines, rocks, barbed wire
        else if (edgeDist > 4.2 && hVal > 0.38) {
          if (chapterNum === 5 && hVal > 0.62) featureType = 'barbed_wire_obstacle';
          else featureType = 'dark_tree_silhouette';
        }

        if (featureType !== 'none') {
          perimeterFeatures.push({
            x: px + (hVal - 0.5) * 1.2,
            y: py + (((hVal * 13) % 1) - 0.5) * 1.2,
            edgeDist: edgeDist,
            type: featureType,
            scale: 0.8 + (hVal * 0.55),
            k: isy(px, py, 0)
          });
        }
      }
    }

    perimeterFeatures.sort(function (a, b) {
      return a.k - b.k;
    });

    return {
      chapterNumber: chapterNum,
      config: cfg,
      width: W,
      height: H,
      perimeterWidth: belt,
      floorZones: floorZones,
      decals: decals,
      props: props,
      perimeterFeatures: perimeterFeatures,
      tileLookup: function (tx, ty) {
        var matched = null;
        for (var i = 0; i < floorZones.length; i++) {
          var z = floorZones[i];
          if (tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1) {
            matched = z.tileType;
          }
        }
        return matched;
      }
    };
  }

  // ==========================================================================
  // [SECTION 4] PERIMETER BUFFER BELT & INFINITE HORIZON FOG ROLL-OFF
  // ==========================================================================

  /**
   * Eliminates the "Black Void" outside the map by rendering:
   *  1. Full-viewport deep atmospheric horizon fill (immune to camera shake / ultra-wide aspect ratios).
   *  2. Isometric 14-18 tile non-playable Perimeter Buffer skirt (embankments, decaying asphalt, mud).
   *  3. Silhouette perimeter structures (tree lines, flood walls, barbed wire, fences).
   *  4. Seamless volumetric horizon fog roll-off around the outer perimeter.
   */
  function renderPerimeterBufferInternal(ctx, levelInstance, cameraX, cameraY, zoom, screenW, screenH) {
    if (!ctx || !levelInstance) return;
    if (!levelInstance._bloomWorldData) {
      enrichLevelInternal(levelInstance.chapterNumber || 1, levelInstance);
    }

    var data = levelInstance._bloomWorldData;
    var W = data.width;
    var H = data.height;
    var belt = data.perimeterWidth;
    var pal = data.config.horizonColors;
    var sw = screenW || (ctx.canvas ? ctx.canvas.width : 1280);
    var sh = screenH || (ctx.canvas ? ctx.canvas.height : 720);

    // Pass 1: Screen-space infinite midnight fog backdrop so raw #000000 void NEVER shows
    ctx.save();
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    var bgGrad = ctx.createRadialGradient(
      sw * 0.5, sh * 0.5, Math.min(sw, sh) * 0.1,
      sw * 0.5, sh * 0.5, Math.max(sw, sh) * 0.85
    );
    bgGrad.addColorStop(0, pal.groundEdge);
    bgGrad.addColorStop(0.55, pal.fogMid);
    bgGrad.addColorStop(1, pal.voidOuter);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-64, -64, sw + 128, sh + 128);
    ctx.restore();

    // Pass 2: World-space Isometric Perimeter Skirt, Embankments & Silhouette Features
    withWorldTransform(ctx, cameraX, cameraY, zoom, sw, sh, function (wCtx) {
      var minX = -belt;
      var maxX = W + belt;
      var minY = -belt;
      var maxY = H + belt;

      // 2A. Outer Isometric Ground Slab with Radial Falloff
      var centerIsoX = isx(W * 0.5, H * 0.5);
      var centerIsoY = isy(W * 0.5, H * 0.5, 0);
      var outerRadiusPx = Math.max(W + belt * 2, H + belt * 2) * 34;

      var skirtGrad = wCtx.createRadialGradient(
        centerIsoX, centerIsoY, Math.min(W, H) * 12,
        centerIsoX, centerIsoY, outerRadiusPx
      );
      skirtGrad.addColorStop(0, pal.groundEdge);
      skirtGrad.addColorStop(0.7, pal.fogMid);
      skirtGrad.addColorStop(1, pal.voidOuter);

      drawIsoDiamond(
        wCtx,
        W * 0.5,
        H * 0.5,
        -0.05,
        W + belt * 2.4,
        H + belt * 2.4,
        skirtGrad,
        null,
        0
      );

      // 2B. Render visible 2x2 perimeter terrain chunks outside [0..W, 0..H]
      var chunkStep = 2;
      for (var ty = minY; ty < maxY; ty += chunkStep) {
        for (var tx = minX; tx < maxX; tx += chunkStep) {
          // Skip playable map interior
          if (tx >= 0 && tx + chunkStep <= W && ty >= 0 && ty + chunkStep <= H) {
            continue;
          }
          var cxTile = tx + chunkStep * 0.5;
          var cyTile = ty + chunkStep * 0.5;
          if (!isIsoPointInFrustum(cxTile, cyTile, 0, cameraX, cameraY, zoom, sw, sh, 180)) {
            continue;
          }

          var dxOut = cxTile < 0 ? -cxTile : (cxTile > W ? cxTile - W : 0);
          var dyOut = cyTile < 0 ? -cyTile : (cyTile > H ? cyTile - H : 0);
          var outDist = Math.max(dxOut, dyOut);
          var fade = clamp(1.0 - (outDist / (belt + 1)), 0.05, 0.92);

          var h = hashCoords(tx, ty, data.chapterNumber * 31);
          var tileFill;

          if (data.chapterNumber === 3 && cxTile >= 11 && cxTile <= 31) {
            // Continuation of Route 101 decaying highway asphalt into the northern/southern mist
            tileFill = 'rgba(24, 28, 33, ' + (fade * 0.88).toFixed(2) + ')';
          } else if (data.chapterNumber === 5 && cxTile >= 10 && cxTile <= 34) {
            // Scorched military approach apron
            tileFill = 'rgba(32, 28, 24, ' + (fade * 0.85).toFixed(2) + ')';
          } else if (h > 0.5) {
            // Muddy embankment / dark earth
            tileFill = 'rgba(18, 24, 20, ' + (fade * 0.78).toFixed(2) + ')';
          } else {
            // Decaying wet turf / cracked perimeter pavement
            tileFill = 'rgba(14, 19, 22, ' + (fade * 0.75).toFixed(2) + ')';
          }

          drawIsoDiamond(
            wCtx,
            cxTile,
            cyTile,
            0,
            chunkStep,
            chunkStep,
            tileFill,
            'rgba(6, 9, 11, ' + (fade * 0.32).toFixed(2) + ')',
            0.75
          );
        }
      }

      // 2C. Render frustrated-culled Perimeter Silhouette Features (Trees, Floodwalls, Fences, Wire)
      var features = data.perimeterFeatures;
      for (var i = 0; i < features.length; i++) {
        var f = features[i];
        if (!isIsoPointInFrustum(f.x, f.y, 1.0, cameraX, cameraY, zoom, sw, sh, 220)) {
          continue;
        }
        var fFade = clamp(1.0 - (f.edgeDist / (belt + 2)), 0.12, 0.95);
        renderSinglePerimeterFeature(wCtx, f, fFade);
      }

      // 2D. Volumetric Horizon Fog Collar (blends outer perimeter into infinite midnight sky)
      var collarGrad = wCtx.createRadialGradient(
        centerIsoX, centerIsoY, Math.min(W, H) * 15,
        centerIsoX, centerIsoY, outerRadiusPx * 0.95
      );
      collarGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      collarGrad.addColorStop(0.55, pal.mistTint);
      collarGrad.addColorStop(1, pal.voidOuter);

      drawIsoDiamond(
        wCtx,
        W * 0.5,
        H * 0.5,
        0.1,
        W + belt * 2.5,
        H + belt * 2.5,
        collarGrad,
        null,
        0
      );
    });
  }

  function renderSinglePerimeterFeature(ctx, f, alpha) {
    var sx = isx(f.x, f.y);
    var sy = isy(f.x, f.y, 0);
    var sc = f.scale || 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (f.type === 'dark_tree_silhouette') {
      drawContactShadow(ctx, f.x, f.y, 0, 26 * sc, 13 * sc, 0.55);
      // Gnarled trunk
      ctx.fillStyle = '#0d1112';
      ctx.fillRect(sx - 3.5 * sc, sy - 46 * sc, 7 * sc, 46 * sc);

      // Layered dark pine/dead canopy silhouettes
      for (var layer = 0; layer < 3; layer++) {
        var ly = sy - (22 + layer * 16) * sc;
        var lw = (26 - layer * 5) * sc;
        var lh = 22 * sc;
        ctx.fillStyle = layer === 2 ? '#131c1a' : '#0b1011';
        ctx.beginPath();
        ctx.moveTo(sx, ly - lh);
        ctx.lineTo(sx + lw, ly);
        ctx.lineTo(sx - lw, ly);
        ctx.closePath();
        ctx.fill();
      }
    } else if (f.type === 'flood_wall') {
      drawIsoBox(
        ctx, f.x, f.y, 0,
        1.8, 0.55, 1.35 * sc,
        '#25282a', '#17191b', '#1d2022', 'rgba(5,6,8,0.7)'
      );
    } else if (f.type === 'chain_fence' || f.type === 'silhouette_fence') {
      drawIsoBox(
        ctx, f.x, f.y, 0,
        1.6, 0.16, 0.95 * sc,
        '#23201d', '#161412', '#1c1917', 'rgba(0,0,0,0.6)'
      );
    } else if (f.type === 'barbed_wire_obstacle') {
      ctx.strokeStyle = '#2a2d30';
      ctx.lineWidth = 1.3;
      for (var c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.ellipse(sx + c * 9 * sc, sy - 6 * sc, 8 * sc, 6 * sc, 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (f.type === 'highway_ditch_post') {
      drawIsoVerticalCylinder(ctx, f.x, f.y, 0, 3.5, 0.65, '#2b3036', '#181b1e', '#3c424a');
    }

    ctx.restore();
  }

  // ==========================================================================
  // [SECTION 5] DIEGETIC GROUND DETAILS & DECAL RENDERER
  // ==========================================================================

  /**
   * Renders procedural floor zone overlays and diegetic ground decals:
   * spore mold stains, blood splatter trails, muddy bootprints, shattered glass glints,
   * storm drain grates, reflective puddles, highway lane markings, gym court lines, and craters.
   */
  function renderDecalsInternal(ctx, levelInstance, cameraX, cameraY, zoom) {
    if (!ctx || !levelInstance) return;
    if (!levelInstance._bloomWorldData) {
      enrichLevelInternal(levelInstance.chapterNumber || 1, levelInstance);
    }

    var data = levelInstance._bloomWorldData;
    var sw = ctx.canvas ? ctx.canvas.width : 1280;
    var sh = ctx.canvas ? ctx.canvas.height : 720;
    var nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

    withWorldTransform(ctx, cameraX, cameraY, zoom, sw, sh, function (wCtx) {
      var decals = data.decals;
      for (var i = 0; i < decals.length; i++) {
        var d = decals[i];
        var margin = d.type === 'gym_court_line' ? 680 : 200;
        if (!isIsoPointInFrustum(d.x, d.y, 0, cameraX, cameraY, zoom, sw, sh, margin)) {
          continue;
        }
        drawSingleDecal(wCtx, d, nowSec);
      }
    });
  }

  function drawSingleDecal(ctx, d, nowSec) {
    var sx = isx(d.x, d.y);
    var sy = isy(d.x, d.y, 0);
    var radPx = (d.radius || 0.7) * 32;

    ctx.save();
    ctx.globalAlpha = d.alpha !== undefined ? d.alpha : 0.75;

    // 1. Reflective Water Puddle
    if (d.type === 'puddle') {
      var pGrad = ctx.createRadialGradient(sx - radPx * 0.2, sy - radPx * 0.1, 2, sx, sy, radPx);
      pGrad.addColorStop(0, 'rgba(64, 86, 98, 0.55)');
      pGrad.addColorStop(0.65, 'rgba(22, 32, 38, 0.68)');
      pGrad.addColorStop(0.92, 'rgba(10, 15, 18, 0.45)');
      pGrad.addColorStop(1, 'rgba(10, 15, 18, 0)');

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, radPx, radPx * 0.5, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Subtle rain ripple ring
      var ripple = ((nowSec * 0.65 + (d.x * 0.37)) % 1);
      ctx.strokeStyle = 'rgba(145, 175, 190, ' + ((1 - ripple) * 0.28).toFixed(2) + ')';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(sx, sy, radPx * 0.65 * ripple, radPx * 0.32 * ripple, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Spore Mold Stain & Mycelial Veins
    else if (d.type === 'spore_mold') {
      var mGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, radPx);
      mGrad.addColorStop(0, 'rgba(24, 34, 18, 0.85)');
      mGrad.addColorStop(0.6, 'rgba(42, 54, 28, 0.52)');
      mGrad.addColorStop(1, 'rgba(20, 26, 15, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, radPx, radPx * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Radiating necrotic filaments
      ctx.strokeStyle = 'rgba(74, 92, 42, 0.58)';
      ctx.lineWidth = 1.2;
      for (var v = 0; v < 7; v++) {
        var ang = (v / 7) * Math.PI * 2 + d.angle;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(ang) * radPx * 0.92, sy + Math.sin(ang) * radPx * 0.46);
        ctx.stroke();
      }

      // Glowing chartreuse spore nodes
      ctx.fillStyle = 'rgba(176, 192, 68, 0.72)';
      for (var n = 0; n < 4; n++) {
        var na = d.angle + n * 1.57;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(na) * radPx * 0.35, sy + Math.sin(na) * radPx * 0.18, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Blood Splatter Trail
    else if (d.type === 'blood_trail') {
      ctx.fillStyle = 'rgba(72, 12, 10, 0.78)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, radPx * 0.75, radPx * 0.38, d.angle * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Secondary droplets & smear
      ctx.fillStyle = 'rgba(96, 18, 14, 0.62)';
      for (var b = 1; b <= 4; b++) {
        var bx = sx + Math.cos(d.angle + b * 0.4) * (radPx * 0.25 * b);
        var by = sy + Math.sin(d.angle + b * 0.4) * (radPx * 0.14 * b);
        ctx.beginPath();
        ctx.ellipse(bx, by, Math.max(2, 7 - b * 1.2), Math.max(1.5, 4 - b * 0.7), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Muddy Footstep Impressions
    else if (d.type === 'mud_footprints') {
      ctx.fillStyle = 'rgba(28, 22, 16, 0.68)';
      ctx.beginPath();
      ctx.ellipse(sx - 3, sy - 2, 4.2, 2.2, d.angle, 0, Math.PI * 2);
      ctx.ellipse(sx + 4, sy + 3, 4.2, 2.2, d.angle, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Shattered Glass Glints
    else if (d.type === 'shattered_glass') {
      var shimmer = 0.55 + 0.35 * Math.sin(nowSec * 3.2 + d.x);
      ctx.fillStyle = 'rgba(175, 205, 218, ' + (0.48 * shimmer).toFixed(2) + ')';
      ctx.strokeStyle = 'rgba(220, 240, 250, 0.65)';
      ctx.lineWidth = 0.7;
      for (var s = 0; s < 8; s++) {
        var ga = s * 0.785 + d.angle;
        var gd = (s % 3 + 1) * (radPx * 0.24);
        var gx = sx + Math.cos(ga) * gd;
        var gy = sy + Math.sin(ga) * gd * 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy - 2.5);
        ctx.lineTo(gx + 3.5, gy + 1.5);
        ctx.lineTo(gx - 2.5, gy + 2.0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 6. Recessed Storm Drain Grate
    else if (d.type === 'drain_grate') {
      drawIsoDiamond(ctx, d.x, d.y, 0, 0.65, 0.65, '#121518', '#383e42', 1.2);
      ctx.strokeStyle = '#07080a';
      ctx.lineWidth = 1.4;
      for (var slot = -2; slot <= 2; slot++) {
        var ox = slot * 3.5;
        ctx.beginPath();
        ctx.moveTo(sx + ox - 4, sy - 2);
        ctx.lineTo(sx + ox + 4, sy + 2);
        ctx.stroke();
      }
    }

    // 7. Highway Faded Road Markings (Chapter III)
    else if (d.type === 'road_marking') {
      var color = d.variant === 0 ? 'rgba(168, 134, 48, 0.68)' : 'rgba(156, 162, 166, 0.55)';
      drawIsoDiamond(ctx, d.x, d.y, 0, 0.16, d.length || 2.0, color, null, 0);
    }

    // 8. Gymnasium Basketball Court Lines (Chapter IV)
    else if (d.type === 'gym_court_line') {
      var cw = (d.width || 24) * 0.5;
      var cl = (d.length || 20) * 0.5;
      var p0x = isx(d.x - cw, d.y - cl), p0y = isy(d.x - cw, d.y - cl, 0);
      var p1x = isx(d.x + cw, d.y - cl), p1y = isy(d.x + cw, d.y - cl, 0);
      var p2x = isx(d.x + cw, d.y + cl), p2y = isy(d.x + cw, d.y + cl, 0);
      var p3x = isx(d.x - cw, d.y + cl), p3y = isy(d.x - cw, d.y + cl, 0);

      ctx.strokeStyle = 'rgba(196, 162, 78, 0.45)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();
      ctx.stroke();

      // Half-court line & center jump circle
      var m0x = isx(d.x, d.y - cl), m0y = isy(d.x, d.y - cl, 0);
      var m1x = isx(d.x, d.y + cl), m1y = isy(d.x, d.y + cl, 0);
      ctx.beginPath();
      ctx.moveTo(m0x, m0y);
      ctx.lineTo(m1x, m1y);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(sx, sy, 68, 34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 9. Scorched Military Blast Crater (Chapter V)
    else if (d.type === 'blast_crater') {
      var cGrad = ctx.createRadialGradient(sx, sy, 3, sx, sy, radPx);
      cGrad.addColorStop(0, 'rgba(8, 7, 7, 0.92)');
      cGrad.addColorStop(0.5, 'rgba(26, 22, 18, 0.78)');
      cGrad.addColorStop(0.82, 'rgba(48, 38, 28, 0.45)');
      cGrad.addColorStop(1, 'rgba(28, 24, 20, 0)');

      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, radPx, radPx * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Radial fracture lines
      ctx.strokeStyle = 'rgba(12, 10, 9, 0.8)';
      ctx.lineWidth = 1.3;
      for (var cf = 0; cf < 6; cf++) {
        var ca = (cf / 6) * Math.PI * 2 + d.angle;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(ca) * radPx * 0.25, sy + Math.sin(ca) * radPx * 0.12);
        ctx.lineTo(sx + Math.cos(ca) * radPx * 0.95, sy + Math.sin(ca) * radPx * 0.48);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // [SECTION 6] 2.5D ARCHITECTURAL & MICRO-PROP RENDERER (DEPTH-SORTED)
  // ==========================================================================

  /**
   * Renders all frustum-visible props sorted along the isometric diagonal `k = isy(x, y, 0) + bias`.
   */
  function renderPropsInternal(ctx, levelInstance, cameraX, cameraY, zoom) {
    if (!ctx || !levelInstance) return;
    if (!levelInstance._bloomWorldData) {
      enrichLevelInternal(levelInstance.chapterNumber || 1, levelInstance);
    }

    var data = levelInstance._bloomWorldData;
    var sw = ctx.canvas ? ctx.canvas.width : 1280;
    var sh = ctx.canvas ? ctx.canvas.height : 720;
    var nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

    withWorldTransform(ctx, cameraX, cameraY, zoom, sw, sh, function (wCtx) {
      var props = data.props;
      for (var i = 0; i < props.length; i++) {
        var p = props[i];
        if (!isIsoPointInFrustum(p.x, p.y, p.z || 0, cameraX, cameraY, zoom, sw, sh, 280)) {
          continue;
        }
        drawSingleProp(wCtx, p, nowSec);
      }
    });
  }

  function drawSingleProp(ctx, p, nowSec) {
    var wx = p.x;
    var wy = p.y;
    var wz = p.z || 0;
    var sx = isx(wx, wy);
    var sy = isy(wx, wy, wz);

    ctx.save();

    switch (p.type) {
      // ----------------------------------------------------------------------
      // UNIVERSAL MICRO-PROPS
      // ----------------------------------------------------------------------
      case 'sandbag_wall': {
        drawContactShadow(ctx, wx, wy, wz, 28, 14, 0.65);
        for (var layer = 0; layer < 3; layer++) {
          for (var bag = -1; bag <= 1; bag++) {
            var bx = wx + bag * 0.36 + (layer % 2) * 0.14;
            var bz = wz + layer * 0.16;
            drawIsoBox(ctx, bx, wy, bz, 0.34, 0.24, 0.15, '#6e644e', '#4f4737', '#5c5340', '#2b261d');
          }
        }
        break;
      }

      case 'fema_crate': {
        drawContactShadow(ctx, wx, wy, wz, 22, 11, 0.68);
        drawIsoBox(ctx, wx, wy, wz, 0.72, 0.56, 0.52, '#424d3b', '#2c3427', '#364030', '#181d15');
        // White FEMA stencil crossband
        ctx.fillStyle = 'rgba(215, 220, 208, 0.65)';
        ctx.fillRect(sx - 8, sy - 12, 16, 4);
        break;
      }

      case 'trash_bags': {
        drawContactShadow(ctx, wx, wy, wz, 18, 9, 0.62);
        var offsets = [[-6, 0, 9], [5, 2, 8], [0, -3, 7.5]];
        for (var tb = 0; tb < offsets.length; tb++) {
          var ox = offsets[tb][0], oy = offsets[tb][1], r = offsets[tb][2];
          ctx.fillStyle = tb === 1 ? '#1e2428' : '#15181b';
          ctx.beginPath();
          ctx.ellipse(sx + ox, sy + oy - r * 0.4, r, r * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(180, 195, 205, 0.16)';
          ctx.beginPath();
          ctx.arc(sx + ox - 2, sy + oy - r * 0.6, r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'ammo_tin': {
        drawContactShadow(ctx, wx, wy, wz, 11, 6, 0.58);
        drawIsoBox(ctx, wx, wy, wz, 0.36, 0.22, 0.24, '#3b4a32', '#25301f', '#2f3d28', '#141a11');
        ctx.fillStyle = '#c49b38';
        ctx.fillRect(sx - 3, sy - 5, 6, 2);
        break;
      }

      case 'shell_casings': {
        ctx.fillStyle = '#b8923a';
        for (var sc = 0; sc < 7; sc++) {
          var ca = sc * 1.1 + (wx * 3);
          var cx = sx + Math.cos(ca) * (3 + sc * 2.1);
          var cy = sy + Math.sin(ca) * (1.5 + sc * 1.1);
          ctx.fillRect(cx, cy, 3.2, 1.4);
        }
        break;
      }

      case 'biohazard_barrel': {
        drawContactShadow(ctx, wx, wy, wz, 15, 8, 0.7);
        drawIsoVerticalCylinder(ctx, wx, wy, wz, 10, 0.68, '#8c6d22', '#4f3c11', '#a68229');
        // Black & crimson hazard band
        ctx.fillStyle = '#1c1814';
        ctx.fillRect(sx - 10, sy - 14, 20, 4);
        ctx.fillStyle = '#9e2a22';
        ctx.beginPath();
        ctx.arc(sx, sy - 12, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // ----------------------------------------------------------------------
      // CHAPTER I PROPS (Home Defence)
      // ----------------------------------------------------------------------
      case 'barricaded_window': {
        // Window frame & rain-streaked glass
        drawIsoBox(ctx, wx, wy, 0.25, 0.85, 0.16, 1.05, '#2b363b', '#182226', '#212d33', '#0e1316');
        // Diagonal nailed wooden barricade planks
        ctx.strokeStyle = '#543d28';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(sx - 15, sy - 28);
        ctx.lineTo(sx + 15, sy - 16);
        ctx.moveTo(sx - 14, sy - 14);
        ctx.lineTo(sx + 14, sy - 22);
        ctx.stroke();
        break;
      }

      case 'fallen_bookshelf': {
        drawContactShadow(ctx, wx, wy, wz, 30, 16, 0.72);
        drawIsoBox(ctx, wx, wy, wz, 1.35, 0.65, 0.32, '#4a3322', '#2e1f14', '#3b281b', '#17100a');
        // Scattered books on floor beside shelf
        drawIsoBox(ctx, wx + 0.55, wy + 0.4, wz, 0.22, 0.18, 0.07, '#6e2822', '#471915', '#59201b');
        drawIsoBox(ctx, wx - 0.45, wy + 0.48, wz, 0.20, 0.16, 0.07, '#294452', '#192a33', '#223844');
        break;
      }

      case 'overturned_coffee_table': {
        drawContactShadow(ctx, wx, wy, wz, 24, 12, 0.64);
        drawIsoBox(ctx, wx, wy, wz, 0.95, 0.35, 0.48, '#59412c', '#36271a', '#473322', '#1c140d');
        break;
      }

      case 'scratched_portrait': {
        drawIsoBox(ctx, wx, wy, 0.65, 0.55, 0.1, 0.65, '#3b2c1e', '#1e1710', '#2b2016', '#0d0a07');
        // Violent diagonal claw/scratch gouges across the portrait face
        ctx.strokeStyle = '#c4baa6';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy - 38);
        ctx.lineTo(sx + 6, sy - 24);
        ctx.moveTo(sx - 3, sy - 39);
        ctx.lineTo(sx + 8, sy - 26);
        ctx.stroke();
        break;
      }

      case 'fallen_telephone_pole': {
        drawContactShadow(ctx, wx, wy, wz, 56, 22, 0.68);
        drawIsoBox(ctx, wx, wy, wz, 2.8, 0.28, 0.28, '#3d3126', '#241d16', '#30261d', '#120e0b');
        // Crossarm & ceramic insulators
        drawIsoBox(ctx, wx - 1.1, wy, wz + 0.12, 0.18, 0.95, 0.14, '#4a3c2f', '#2b231b', '#382d23');
        break;
      }

      case 'smoking_fence': {
        drawContactShadow(ctx, wx, wy, wz, 24, 10, 0.55);
        drawIsoBox(ctx, wx, wy, wz, 1.4, 0.16, 0.88, '#2b231d', '#171310', '#211b16', '#0c0a08');
        // Rising ember/smoke wisp
        var smokeLift = ((nowSec * 14 + wx * 7) % 22);
        ctx.fillStyle = 'rgba(90, 96, 100, ' + ((1 - smokeLift / 22) * 0.28).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy - 28 - smokeLift, 4 + smokeLift * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // ----------------------------------------------------------------------
      // CHAPTER II PROPS (The Face I Loved — Maya Estate & Conservatory)
      // ----------------------------------------------------------------------
      case 'stone_pillar': {
        drawContactShadow(ctx, wx, wy, wz, 24, 12, 0.76);
        // Plinth base
        drawIsoBox(ctx, wx, wy, wz, 0.76, 0.76, 0.22, '#5c6063', '#383b3d', '#494d4f', '#1c1e20');
        // Fluted stone column shaft
        var colH = p.variant === 1 ? 1.35 : 1.75; // Variant 1 is battle-damaged fractured column
        drawIsoVerticalCylinder(ctx, wx, wy, wz + 0.22, 13, colH, '#686d70', '#3d4042', '#7a8084');
        if (p.variant !== 1) {
          drawIsoBox(ctx, wx, wy, wz + 0.22 + colH, 0.82, 0.82, 0.18, '#73787c', '#45484a', '#595d60', '#1c1e20');
        }
        break;
      }

      case 'shattered_french_door':
      case 'conservatory_glass_wall': {
        drawContactShadow(ctx, wx, wy, wz, 28, 12, 0.52);
        drawIsoBox(ctx, wx, wy, wz, 1.45, 0.18, 1.45, '#3b4a4e', '#1e2729', '#2b373a', '#0f1416');
        // Jagged remaining glass pane triangles
        ctx.fillStyle = 'rgba(135, 175, 188, 0.28)';
        ctx.beginPath();
        ctx.moveTo(sx - 18, sy - 42);
        ctx.lineTo(sx + 6, sy - 36);
        ctx.lineTo(sx - 12, sy - 18);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'fallen_marble_statue': {
        drawContactShadow(ctx, wx, wy, wz, 28, 14, 0.72);
        drawIsoBox(ctx, wx, wy, wz, 1.15, 0.48, 0.42, '#8c9094', '#545759', '#6e7275', '#2a2c2e');
        // Sculpted head & broken wing/drapery
        ctx.fillStyle = '#9aa0a4';
        ctx.beginPath();
        ctx.arc(sx + 16, sy - 10, 6.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'wall_spore_bloom': {
        var pulse = 0.65 + 0.35 * Math.sin(nowSec * 2.6 + wx + wy);
        var glowGrad = ctx.createRadialGradient(sx, sy - 16, 2, sx, sy - 16, 26);
        glowGrad.addColorStop(0, 'rgba(182, 198, 74, ' + (0.48 * pulse).toFixed(2) + ')');
        glowGrad.addColorStop(0.55, 'rgba(96, 122, 44, ' + (0.22 * pulse).toFixed(2) + ')');
        glowGrad.addColorStop(1, 'rgba(40, 56, 24, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(sx, sy - 16, 26, 0, Math.PI * 2);
        ctx.fill();

        // Fungal shelf fruiting bodies
        ctx.fillStyle = '#8e9942';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 16, 9, 4.5, -0.2, 0, Math.PI * 2);
        ctx.ellipse(sx + 6, sy - 11, 6.5, 3.2, 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'torn_wedding_veil': {
        drawContactShadow(ctx, wx, wy, wz, 20, 10, 0.58);
        // Thorny dark bramble bush
        ctx.strokeStyle = '#261f1a';
        ctx.lineWidth = 1.8;
        for (var br = 0; br < 8; br++) {
          var ba = (br / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(ba) * 16, sy - 8 + Math.sin(ba) * 8);
          ctx.stroke();
        }
        // Fluttering translucent white lace veil snagged on thorns
        var sway = Math.sin(nowSec * 2.2) * 3.5;
        ctx.fillStyle = 'rgba(232, 236, 242, 0.68)';
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 12);
        ctx.quadraticCurveTo(sx + 10 + sway, sy - 16, sx + 18 + sway, sy - 4);
        ctx.quadraticCurveTo(sx + 6, sy - 2, sx - 4, sy - 12);
        ctx.fill();
        break;
      }

      // ----------------------------------------------------------------------
      // CHAPTER III PROPS (Miles of Silence — Route 101 Highway)
      // ----------------------------------------------------------------------
      case 'crushed_guardrail': {
        drawContactShadow(ctx, wx, wy, wz, 22, 11, 0.58);
        drawIsoBox(ctx, wx, wy, wz, 0.22, 1.85, 0.42, '#5c646b', '#383d42', '#495057', '#1c1f22');
        break;
      }

      case 'burned_car_hulk': {
        drawContactShadow(ctx, wx, wy, wz, 44, 24, 0.78);
        var palettes = [
          ['#363e45', '#202529', '#2b3238'],
          ['#4a2f29', '#2b1b18', '#3a2420'],
          ['#384236', '#21261f', '#2d352b'],
          ['#423c32', '#26231d', '#353028']
        ];
        var cp = palettes[p.variant % palettes.length];
        // Lower rusted chassis
        drawIsoBox(ctx, wx, wy, wz + 0.12, 1.15, 2.15, 0.36, cp[0], cp[1], cp[2], '#111315');
        // Charred cabin greenhouse
        drawIsoBox(ctx, wx, wy + 0.1, wz + 0.48, 0.96, 1.12, 0.34, cp[0], '#14171a', '#191d21', '#0d0f11');
        // Wheels
        drawIsoVerticalCylinder(ctx, wx - 0.55, wy - 0.65, wz, 6, 0.22, '#16181a', '#0c0d0e', '#222528');
        drawIsoVerticalCylinder(ctx, wx + 0.55, wy - 0.65, wz, 6, 0.22, '#16181a', '#0c0d0e', '#222528');
        drawIsoVerticalCylinder(ctx, wx + 0.55, wy + 0.65, wz, 6, 0.22, '#16181a', '#0c0d0e', '#222528');
        break;
      }

      case 'overturned_tanker': {
        drawContactShadow(ctx, wx, wy, wz, 78, 38, 0.84);
        // Massive overturned cylindrical fuel trailer
        drawIsoBox(ctx, wx, wy, wz, 3.6, 1.45, 0.98, '#545b61', '#2f3438', '#3e4449', '#16181a');
        // Jackknifed tractor cab
        drawIsoBox(ctx, wx - 2.1, wy + 0.35, wz, 1.15, 1.25, 0.88, '#4f2822', '#2e1613', '#3d1e1a', '#140b09');
        // HAZMAT diamond placard
        ctx.fillStyle = '#c44b28';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 24);
        ctx.lineTo(sx + 7, sy - 17);
        ctx.lineTo(sx, sy - 10);
        ctx.lineTo(sx - 7, sy - 17);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'emergency_call_box': {
        drawContactShadow(ctx, wx, wy, wz, 14, 8, 0.65);
        drawIsoVerticalCylinder(ctx, wx, wy, wz, 3.5, 1.15, '#3b4248', '#222629', '#4c555c');
        drawIsoBox(ctx, wx, wy, wz + 0.72, 0.28, 0.28, 0.36, '#b88628', '#785618', '#966c1f', '#241b08');
        // Pulsing blue/amber locator strobe on top
        var callPulse = 0.4 + 0.6 * Math.abs(Math.sin(nowSec * 3.5));
        ctx.fillStyle = 'rgba(95, 175, 235, ' + callPulse.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy - 38, 4.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'collapsed_overpass': {
        drawContactShadow(ctx, wx, wy, wz, 110, 48, 0.85);
        // Fractured reinforced concrete highway deck slab
        drawIsoBox(ctx, wx - 3.2, wy, wz, 3.8, 2.2, 1.25, '#474c4f', '#2b2e30', '#383c3f', '#16181a');
        drawIsoBox(ctx, wx + 3.2, wy, wz, 3.8, 2.2, 1.15, '#474c4f', '#2b2e30', '#383c3f', '#16181a');
        // Hanging moss & exposed rebar rods
        ctx.strokeStyle = '#3d4f2f';
        ctx.lineWidth = 1.6;
        for (var m = -40; m <= 40; m += 10) {
          ctx.beginPath();
          ctx.moveTo(sx + m, sy - 24);
          ctx.lineTo(sx + m + 2, sy - 8);
          ctx.stroke();
        }
        break;
      }

      // ----------------------------------------------------------------------
      // CHAPTER IV PROPS (No Safe Haven — St. Jude's High School)
      // ----------------------------------------------------------------------
      case 'triage_cot': {
        drawContactShadow(ctx, wx, wy, wz, 28, 14, 0.65);
        // Olive drab canvas cot on folding aluminum frame
        drawIsoBox(ctx, wx, wy, wz + 0.14, 1.25, 0.62, 0.14, '#4c5742', '#31382a', '#3e4736', '#1b2018');
        // Bloodstain on cot canvas
        if (p.variant === 0) {
          ctx.fillStyle = 'rgba(84, 18, 16, 0.65)';
          ctx.beginPath();
          ctx.ellipse(sx, sy - 8, 9, 4.5, 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        // IV drip stand beside cot
        ctx.strokeStyle = '#7c858c';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx + 16, sy - 4);
        ctx.lineTo(sx + 16, sy - 38);
        ctx.lineTo(sx + 11, sy - 38);
        ctx.stroke();
        break;
      }

      case 'barricaded_cafeteria_table': {
        drawContactShadow(ctx, wx, wy, wz, 32, 16, 0.72);
        drawIsoBox(ctx, wx, wy, wz, 1.55, 0.35, 0.92, '#5c5248', '#38322c', '#4a423a', '#1c1916');
        break;
      }

      case 'scrawled_chalkboard': {
        drawContactShadow(ctx, wx, wy, wz, 34, 14, 0.64);
        drawIsoBox(ctx, wx, wy, wz + 0.25, 1.85, 0.16, 1.15, '#1d2e24', '#131f18', '#18261e', '#3d2c1e');
        ctx.fillStyle = 'rgba(225, 228, 220, 0.78)';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.label || 'NO SAFE HAVEN', sx, sy - 24);
        break;
      }

      case 'red_floodlight': {
        drawContactShadow(ctx, wx, wy, wz, 16, 8, 0.6);
        drawIsoVerticalCylinder(ctx, wx, wy, wz, 2.5, 1.25, '#6e5c24', '#3d3314', '#85702c');
        // Twin halogen lamp housing
        drawIsoBox(ctx, wx, wy, wz + 1.22, 0.42, 0.24, 0.22, '#2b2e30', '#181a1b', '#222426');
        // Emergency crimson volumetric halo
        var redGlow = ctx.createRadialGradient(sx, sy - 42, 2, sx, sy - 42, 46);
        redGlow.addColorStop(0, 'rgba(235, 52, 42, 0.55)');
        redGlow.addColorStop(0.5, 'rgba(185, 28, 24, 0.22)');
        redGlow.addColorStop(1, 'rgba(120, 12, 12, 0)');
        ctx.fillStyle = redGlow;
        ctx.beginPath();
        ctx.arc(sx, sy - 42, 46, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'biohazard_plastic_curtain': {
        drawIsoBox(
          ctx, wx, wy, wz,
          2.4, 0.12, 1.65,
          'rgba(155, 185, 178, 0.26)',
          'rgba(120, 148, 142, 0.22)',
          'rgba(140, 168, 162, 0.24)',
          'rgba(210, 175, 55, 0.55)'
        );
        break;
      }

      // ----------------------------------------------------------------------
      // CHAPTER V PROPS (The Point Of No Return — Sector 9 & Bunker 7)
      // ----------------------------------------------------------------------
      case 'concertina_wire': {
        drawContactShadow(ctx, wx, wy, wz, 34, 15, 0.64);
        ctx.strokeStyle = '#586066';
        ctx.lineWidth = 1.4;
        for (var ring = -3; ring <= 3; ring++) {
          ctx.beginPath();
          ctx.ellipse(sx + ring * 7, sy - 9, 8, 9, 0.15, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case 'dragons_teeth': {
        drawContactShadow(ctx, wx, wy, wz, 22, 12, 0.75);
        // Pyramidal reinforced concrete anti-tank obstacle
        var dtx = sx, dty = sy;
        ctx.fillStyle = '#45494c';
        ctx.beginPath();
        ctx.moveTo(dtx, dty - 26);
        ctx.lineTo(dtx - 16, dty);
        ctx.lineTo(dtx, dty + 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#585d61';
        ctx.beginPath();
        ctx.moveTo(dtx, dty - 26);
        ctx.lineTo(dtx + 16, dty);
        ctx.lineTo(dtx, dty + 8);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'biometric_kiosk': {
        drawContactShadow(ctx, wx, wy, wz, 20, 11, 0.74);
        drawIsoBox(ctx, wx, wy, wz, 0.65, 0.55, 1.18, '#2b3238', '#181c20', '#22282d', '#0d1012');
        // Glowing biometric retinal/palm scanner screen
        ctx.fillStyle = 'rgba(72, 195, 165, 0.78)';
        ctx.fillRect(sx - 5, sy - 28, 10, 7);
        break;
      }

      case 'amber_klaxon': {
        drawContactShadow(ctx, wx, wy, wz, 14, 8, 0.68);
        drawIsoVerticalCylinder(ctx, wx, wy, wz, 3.5, 1.35, '#2e3236', '#1a1c1e', '#3d4247');
        var kPulse = 0.35 + 0.65 * Math.abs(Math.sin(nowSec * 5.2 + wx));
        var kGrad = ctx.createRadialGradient(sx, sy - 44, 2, sx, sy - 44, 38);
        kGrad.addColorStop(0, 'rgba(245, 168, 38, ' + (0.72 * kPulse).toFixed(2) + ')');
        kGrad.addColorStop(0.5, 'rgba(215, 112, 18, ' + (0.28 * kPulse).toFixed(2) + ')');
        kGrad.addColorStop(1, 'rgba(180, 75, 10, 0)');
        ctx.fillStyle = kGrad;
        ctx.beginPath();
        ctx.arc(sx, sy - 44, 38, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'bunker_blast_door': {
        drawContactShadow(ctx, wx, wy, wz, 96, 42, 0.88);
        // Massive titanium-armored Bunker 7 hydraulic blast threshold
        drawIsoBox(ctx, wx, wy, wz, 5.2, 0.85, 2.35, '#3b4247', '#202428', '#2c3236', '#0e1012');
        // Left & Right reinforced hydraulic locking piers
        drawIsoBox(ctx, wx - 2.8, wy + 0.2, wz, 0.95, 1.15, 2.55, '#4a5258', '#282d30', '#363d42', '#111315');
        drawIsoBox(ctx, wx + 2.8, wy + 0.2, wz, 0.95, 1.15, 2.55, '#4a5258', '#282d30', '#363d42', '#111315');
        // Yellow/black industrial hazard chevron bar & "BUNKER 07" stencil
        ctx.fillStyle = '#c49628';
        ctx.fillRect(sx - 42, sy - 56, 84, 7);
        ctx.fillStyle = '#d8dce0';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BUNKER 07 // QUARANTINE SEAL', sx, sy - 34);
        break;
      }

      default: {
        drawContactShadow(ctx, wx, wy, wz, 18, 9, 0.6);
        drawIsoBox(ctx, wx, wy, wz, 0.6, 0.6, 0.5, '#3d4245', '#25282a', '#303436', '#141618');
        break;
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // [SECTION 7] LEVEL ENRICHMENT ENGINE (`enrichLevel`)
  // ==========================================================================

  /**
   * Enriches an existing levelInstance in-place with chapter-specific architectural zones,
   * floor textures, non-playable 14-18 tile perimeter buffers, decals, and depth-sorted 2.5D props.
   */
  function enrichLevelInternal(levelIndex, levelInstance) {
    var lvl = levelInstance || {};
    var chapterNum = resolveChapterNumber(levelIndex, lvl);
    var cfg = CHAPTER_CONFIGS[chapterNum] || CHAPTER_CONFIGS[1];

    var W = lvl.w || lvl.width || cfg.defaultW;
    var H = lvl.h || lvl.height || cfg.defaultH;
    lvl.w = W;
    lvl.h = H;
    lvl.chapterNumber = chapterNum;
    lvl.chapterTitle = cfg.title;

    var worldData = buildChapterEnhancementData(chapterNum, W, H, lvl.seed || ('BLOOM_WORLD_CH_' + chapterNum));
    lvl._bloomWorldData = worldData;
    lvl.decals = lvl.decals || [];
    lvl.enhancedProps = worldData.props;
    lvl.perimeterWidth = worldData.perimeterWidth;
    lvl.horizonColors = cfg.horizonColors;

    // Provide a fast floor material lookup (`wood`, `lino`, `grass`, `walk`, `dark`, `road`, `tile`, `waste`)
    lvl.getEnhancedTileType = function (tx, ty, fallbackType) {
      var override = worldData.tileLookup(tx, ty);
      return override || fallbackType || 'grass';
    };

    return lvl;
  }

  // ==========================================================================
  // [SECTION 8] PUBLIC API ATTACHMENT (`window.BloomWorldEnhancements`)
  // ==========================================================================

  var BloomWorldEnhancements = {
    version: '2.0.0-WORLD',

    /**
     * Populates a level instance with Chapter 1–5 architectural zones, decals,
     * 2.5D props, and perimeter buffer data.
     */
    enrichLevel: function (levelIndex, levelInstance) {
      return enrichLevelInternal(levelIndex, levelInstance);
    },

    /**
     * Eliminates the black void outside the map by rendering an infinite horizon fog
     * gradient and a 14–18 tile non-playable atmospheric perimeter belt.
     */
    renderPerimeterBuffer: function (ctx, levelInstance, cameraX, cameraY, zoom, screenW, screenH) {
      renderPerimeterBufferInternal(ctx, levelInstance, cameraX, cameraY, zoom, screenW, screenH);
    },

    /**
     * Renders frustum-culled diegetic ground details (puddles, spore mold, blood trails,
     * footprints, glass glints, grates, highway markings, court lines, blast craters).
     */
    renderDecals: function (ctx, levelInstance, cameraX, cameraY, zoom) {
      renderDecalsInternal(ctx, levelInstance, cameraX, cameraY, zoom);
    },

    /**
     * Renders frustum-culled 2.5D isometric props sorted by `k = isy(x, y, 0) + bias`.
     */
    renderProps: function (ctx, levelInstance, cameraX, cameraY, zoom) {
      renderPropsInternal(ctx, levelInstance, cameraX, cameraY, zoom);
    },

    /**
     * Optional helper for engines that use a unified painter's queue: returns an array of
     * `{ k, draw(ctx) }` items for visible props so they can interleave with characters/enemies.
     */
    getDepthSortedPropQueue: function (levelInstance, cameraX, cameraY, zoom, screenW, screenH) {
      if (!levelInstance) return [];
      if (!levelInstance._bloomWorldData) {
        enrichLevelInternal(levelInstance.chapterNumber || 1, levelInstance);
      }
      var props = levelInstance._bloomWorldData.props;
      var sw = screenW || 1280;
      var sh = screenH || 720;
      var nowSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
      var queue = [];

      for (var i = 0; i < props.length; i++) {
        (function (prop) {
          if (isIsoPointInFrustum(prop.x, prop.y, prop.z || 0, cameraX, cameraY, zoom, sw, sh, 280)) {
            queue.push({
              k: prop.k,
              prop: prop,
              draw: function (ctx) {
                drawSingleProp(ctx, prop, nowSec);
              }
            });
          }
        })(props[i]);
      }
      return queue;
    },

    math: {
      TW: TW,
      TH: TH,
      ZH: ZH,
      isx: isx,
      isy: isy,
      w2s: w2s,
      computeSortKey: computeSortKey
    },

    CHAPTER_CONFIGS: CHAPTER_CONFIGS
  };

  global.BloomWorldEnhancements = Object.assign(global.BloomWorldEnhancements || {}, BloomWorldEnhancements);
})(typeof window !== 'undefined' ? window : globalThis);
