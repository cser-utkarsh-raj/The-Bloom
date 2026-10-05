/* =============================================================================
   13-world-detail.js — SAFE PORT FROM CLAUDE'S BLOOM ENHANCEMENTS
   -----------------------------------------------------------------------------
   Only the non-conflicting WORLD DETAIL portion is ported here.

   Included:
   - grime / cracks / wear / blood flecks baked into existing floor textures
   - non-solid litter/debris props scattered on existing levels
   - slightly darker ambience
   - no level dimensions, objectives, enemy spawning, collision or pathfinding changes

   Intentionally NOT included:
   - legacy city generator / BUILD layout replacement
   - duplicate UI/mobile system
   - duplicate audio/camera/combat/hallucination systems already present in 09-enhancements.js
   ========================================================================== */
(function () {
'use strict';

const GL = typeof globalThis !== 'undefined' ? globalThis : window;
if (GL.__BLOOM_WORLD_C) return;
GL.__BLOOM_WORLD_C = 1;

const wc = {};
const warnC = (tag, e) => {
  if (wc[tag]) return;
  wc[tag] = 1;
  try { console.warn('[BLOOM+World]', tag, (e && e.message) || e); } catch (_) {}
};

const sd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* --------------------------------------------------------------------------
   FLOOR GRIME
   -------------------------------------------------------------------------- */
function grime() {
  if (typeof TEX === 'undefined') return;

  for (const name in TEX) {
    TEX[name].forEach((c, vi) => {
      if (c._bloomGrime || !c.getContext) return;
      c._bloomGrime = 1;

      const g = c.getContext('2d');
      const r = sd(500 + vi * 17 + name.length * 31);
      const outdoor = /grass|park|road|walk|waste|dash|zebra|conc|plaza/.test(name);

      g.save();

      // Existing tiles are diamond/isometric textures. Keep grime inside the tile.
      g.beginPath();
      g.moveTo(33, 0);
      g.lineTo(66, 17);
      g.lineTo(33, 34);
      g.lineTo(0, 17);
      g.closePath();
      g.clip();

      // Dark wear/stains.
      for (let i = 0; i < 3; i++) {
        g.fillStyle = `rgba(0,0,0,${.08 + r() * .1})`;
        g.beginPath();
        g.ellipse(
          r() * 60 + 3,
          r() * 28 + 3,
          3 + r() * 7,
          1.5 + r() * 3,
          0, 0, 6.3
        );
        g.fill();
      }

      // Fine cracks.
      g.strokeStyle = 'rgba(0,0,0,.22)';
      g.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        let x = r() * 60 + 3;
        let y = r() * 28 + 3;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += (r() - .3) * 8;
          y += (r() - .5) * 5;
          g.lineTo(x, y);
        }
        g.stroke();
      }

      // Dirt/wear on grass and parks.
      if (/grass|park/.test(name)) {
        for (let i = 0; i < 2; i++) {
          g.fillStyle = 'rgba(120,98,52,.14)';
          g.beginPath();
          g.ellipse(
            r() * 60 + 3,
            r() * 28 + 3,
            4 + r() * 5,
            2 + r() * 2,
            0, 0, 6.3
          );
          g.fill();
        }
      }

      // Road wear.
      if (/^road$/.test(name)) {
        g.strokeStyle = 'rgba(0,0,0,.28)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(5, r() * 30 + 2);
        g.lineTo(60, r() * 30 + 2);
        g.stroke();
      }

      // Occasional dark/red biological stains.
      if (r() < (outdoor ? .2 : .28)) {
        g.fillStyle = 'rgba(70,10,8,.38)';
        for (let i = 0; i < 4; i++) {
          g.fillRect(
            r() * 58 + 4,
            r() * 26 + 4,
            1 + r() * 2,
            1 + r() * 2
          );
        }
      }

      g.restore();
    });
  }
}

GL.__BLOOM_GRIME = grime;

// makeTextures() runs during boot, after this script. Wrap it so newly-created
// textures always receive the detail pass.
try {
  if (typeof makeTextures === 'function') {
    const originalMakeTextures = GL.makeTextures;
    GL.makeTextures = function () {
      const result = originalMakeTextures.apply(this, arguments);
      try { grime(); } catch (e) { warnC('grime', e); }
      return result;
    };
  }
  grime();
} catch (e) {
  warnC('grime0', e);
}

/* --------------------------------------------------------------------------
   NON-SOLID LITTER
   -------------------------------------------------------------------------- */
try {
  if (typeof def === 'function' && typeof PD !== 'undefined') {
    // Deliberately non-solid. It cannot block movement or alter pathfinding.
    def('litter', .5, .5, p => {
      const v = p.v | 0;

      // Paper.
      if (v === 0) {
        decalRect(p.x, p.y, .34, .24, '#cfc8b4', .85);
        decalRect(p.x + .2, p.y + .14, .3, .22, '#b6af9a', .85);
      }

      // Broken glass.
      else if (v === 1) {
        decalRect(p.x, p.y, .12, .08, '#7f9ea6', .7);
        decalRect(p.x + .2, p.y + .1, .1, .1, '#7f9ea6', .7);
        decalRect(p.x + .08, p.y + .22, .14, .07, '#9bbcc4', .7);
        glowDot(
          p.x + .15, p.y + .15, .05, 3, '#cfe8ee',
          .25 + .3 * Math.max(0, Math.sin(T * 3 + p.x * 7))
        );
      }

      // Blood smear.
      else if (v === 2) {
        groundEll(p.cx, p.cy, .55, '#3a0a0a', null, .5, 2);
        groundEll(p.cx + .15, p.cy - .1, .3, '#4a1010', null, .45, 2);
      }

      // Rubble / small debris.
      else if (v === 3) {
        bx(p.x + .1, p.y + .1, 0, .16, .07, '#2a2420');
        bx(p.x + .3, p.y + .2, 0, .15, .07, '#3a332c');
      }

      // Dirt / broken material.
      else if (v === 4) {
        decalRect(p.x, p.y, .22, .16, '#4a3a24', .8);
        decalRect(p.x + .25, p.y + .12, .18, .14, '#3a2e1c', .8);
        decalRect(p.x + .1, p.y + .28, .2, .12, '#5a4a2c', .8);
      }

      // Small vegetation fragment.
      else {
        bx(p.x + .2, p.y + .2, 0, .1, .22, '#3a5a3a');
      }
    }, { solid: false });
  }
} catch (e) {
  warnC('litter-def', e);
}

/* --------------------------------------------------------------------------
   SCATTER ON EXISTING LEVELS
   -------------------------------------------------------------------------- */
function scatter(L) {
  if (!L || !L.floor || !L.add) return;

  // Keep density bounded on the large L3/L5 maps.
  const n = Math.min(320, (L.w * L.h / 38) | 0);
  const indoor = {
    wood: 1,
    dark: 1,
    carpet: 1,
    tile: 1,
    lino: 1
  };

  for (let i = 0, k = 0; i < n && k < n * 6; k++) {
    const x = 1 + Math.random() * (L.w - 2);
    const y = 1 + Math.random() * (L.h - 2);
    const row = L.floor[y | 0];
    const mat = row && row[x | 0];

    if (!mat || L.hitSolid(x, y, .35)) continue;

    const v = indoor[mat]
      ? [0, 0, 2, 3, 1][Math.floor(Math.random() * 5)]
      : [0, 1, 2, 4, 4, 5][Math.floor(Math.random() * 6)];

    L.add('litter', x, y, { v });
    i++;
  }
}

/*
 * IMPORTANT:
 * This wraps each existing level builder only to append visual litter.
 * It does NOT change:
 *   - L.w / L.h
 *   - L.floor
 *   - spawn points
 *   - objectives
 *   - enemies
 *   - collision
 *   - pathfinding
 *   - level completion
 */
try {
  if (
    typeof BUILD !== 'undefined' &&
    Array.isArray(BUILD) &&
    typeof PD !== 'undefined' &&
    PD.litter
  ) {
    for (let i = 0; i < BUILD.length; i++) {
      const originalBuilder = BUILD[i];
      if (typeof originalBuilder !== 'function') continue;

      BUILD[i] = function () {
        const L = originalBuilder.apply(this, arguments);

        try {
          L.dark = Math.min(.8, (L.dark || .5) + .05);
          scatter(L);
        } catch (e) {
          warnC('scatter', e);
        }

        return L;
      };
    }
  }
} catch (e) {
  warnC('build', e);
}

})();