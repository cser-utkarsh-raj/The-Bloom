import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9250;
const BASE_URL = 'http://localhost:1954';
const ARTIFACT_DIR = 'C:\\Users\\u_raj\\.gemini\\antigravity\\brain\\8bafccc0-2e38-4f00-ba84-55d02cffd3fa';

async function run() {
  console.log('[Test] Launching Headless Chrome on port ' + PORT + '...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--window-size=1280,720',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const page = list.find(p => p.type === 'page');

  if (!page?.webSocketDebuggerUrl) {
    console.error('[Test] Could not connect to Chrome port.');
    chromeProc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const consoleLogs = [];
  const errors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push(`[Console ${data.params.type}] ${text}`);
      if (data.params.type === 'error') {
        errors.push(text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text;
      consoleLogs.push(`[Exception] ${desc}`);
      errors.push(desc);
    }
  };

  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise(resolve => {
      const reqId = id++;
      const handler = (e) => {
        const data = JSON.parse(e.data);
        if (data.id === reqId) {
          ws.removeEventListener('message', handler);
          resolve(data);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.result?.exceptionDetails) {
      console.error('[Eval Exception]', res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text);
    }
    return res.result?.result?.value;
  }

  async function capture(filename) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.result.data, 'base64');
    fs.writeFileSync(filename, buffer);
    const destInArtifacts = `${ARTIFACT_DIR}\\${filename.split(/[\/\\]/).pop()}`;
    fs.writeFileSync(destInArtifacts, buffer);
    console.log(`[Test] Saved screenshot -> ${filename} & ${destInArtifacts}`);
  }

  await send('Page.enable');
  await send('Runtime.enable');

  try {
    // =========================================================================
    // PART 1: CHAPTER 4 NPC VERIFICATION (Patrol Officer & Survivors)
    // =========================================================================
    console.log('\n--- PART 1: LEVEL 4 NPC RIG VERIFICATION (Desktop 1280x720) ---');
    await send('Page.navigate', { url: `${BASE_URL}/?test_l4=${Date.now()}` });
    await new Promise(r => setTimeout(r, 1200));

    // Jump straight into Chapter 4
    const l4Status = await evaluate(`(() => {
      startLevel(3); // Chapter 4 index 3
      ovAnim = null;
      state = 'play';
      const ov = document.getElementById('ov'); if (ov) ov.style.display = 'none';
      const hud = document.getElementById('hud'); if (hud) hud.style.display = 'block';
      return {
        hasDrawKinematicNPC: typeof window.drawKinematicNPC === 'function',
        hasDrawNPC: typeof window.drawNPC === 'function',
        levelId: typeof LV !== 'undefined' && LV ? LV.id : null,
        npcCount: typeof LV !== 'undefined' && LV ? LV.npcs.length : 0,
        copNpc: typeof LV !== 'undefined' && LV ? LV.npcs.find(n => n.kind === 'cop') : null,
        survNpcs: typeof LV !== 'undefined' && LV ? LV.npcs.filter(n => n.kind === 'surv').length : 0
      };
    })()`);
    console.log('[Test] Chapter 4 State:', JSON.stringify(l4Status, null, 2));

    // Move camera to focus on Cop and Survivors (around x: 28, y: 14)
    await evaluate(`(() => {
      camX = isx(28, 14);
      camY = isy(28, 14, 0.5);
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await capture('verify_level4_cop_and_survivors.png');

    // Trigger a cop firing frame to verify muzzle flash and tracer
    console.log('[Test] Triggering cop shotgun firing frame...');
    await evaluate(`(() => {
      const cop = typeof LV !== 'undefined' && LV ? LV.npcs.find(n => n.kind === 'cop') : null;
      if (cop) {
        cop.fx = 0.12;
        cop.tx = 18;
        cop.ty = 20;
        cop.f = Math.atan2(20 - cop.y, 18 - cop.x);
      }
    })()`);
    await new Promise(r => setTimeout(r, 300));
    await capture('verify_level4_cop_shotgun_firing.png');

    // =========================================================================
    // PART 2: MOBILE GAMEPLAY & VISIBILITY TEST (iPhone 14 Portrait 390x844)
    // =========================================================================
    console.log('\n--- PART 2: MOBILE PLAYABLE TEST (iPhone 14: 390x844) ---');
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    const t0 = Date.now();
    await send('Page.navigate', { url: `${BASE_URL}/?test_mobile_play=${Date.now()}` });
    await new Promise(r => setTimeout(r, 1200));
    const loadTime = Date.now() - t0;
    console.log(`[Test] Mobile load reached in ~${loadTime}ms.`);

    const mobileBoot = await evaluate(`({
      isMobile: window.IS_MOBILE,
      p5Loaded: typeof window.p5 !== 'undefined',
      bootShieldOpacity: document.getElementById('boot-shield')?.style.opacity,
      hasJoy: !!document.querySelector('.m-joy'),
      hasActions: !!document.querySelector('.m-actions')
    })`);
    console.log('[Test] Mobile Boot Evaluation:', JSON.stringify(mobileBoot, null, 2));

    // Start game on mobile
    console.log('[Test] Starting game on mobile (newRun)...');
    await evaluate(`(() => {
      window.G = window.newGame();
      if (window.startLevel) window.startLevel(0);
    })()`);
    await new Promise(r => setTimeout(r, 1500));

    const mobileGameplayState = await evaluate(`({
      state: window.state,
      zoomZ: window.Z,
      dpr: window.DPR,
      playerExists: !!(window.LV && window.LV.player),
      joyDisplay: document.querySelector('.m-joy')?.style.display,
      actionsDisplay: document.querySelector('.m-actions')?.style.display,
      dodgeBtnExists: !!document.querySelector('.m-btn-dodge'),
      healBtnExists: !!document.querySelector('.m-btn-heal'),
      carryBtnExists: !!document.querySelector('.m-btn-carry'),
      pauseBtnExists: !!document.querySelector('.m-btn-pause')
    })`);
    console.log('[Test] Mobile Gameplay Evaluation:', JSON.stringify(mobileGameplayState, null, 2));

    await capture('verify_mobile_playable_portrait.png');

    // Test mobile movement pad (simulated drag)
    console.log('[Test] Simulating mobile joystick movement...');
    await evaluate(`(() => {
      if (window.keys) {
        window.keys.KeyD = true;
        window.keys.KeyW = true;
      }
    })()`);
    await new Promise(r => setTimeout(r, 800));
    await capture('verify_mobile_playable_walking.png');

    // =========================================================================
    // PART 3: MOBILE LANDSCAPE TEST (844x390)
    // =========================================================================
    console.log('\n--- PART 3: MOBILE LANDSCAPE TEST (844x390) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await evaluate(`window.resize && window.resize()`);
    await new Promise(r => setTimeout(r, 1000));

    const landscapeState = await evaluate(`({
      zoomZ: window.Z,
      dpr: window.DPR,
      joyDisplay: document.querySelector('.m-joy')?.style.display,
      actionsDisplay: document.querySelector('.m-actions')?.style.display
    })`);
    console.log('[Test] Mobile Landscape Evaluation:', JSON.stringify(landscapeState, null, 2));

    await capture('verify_mobile_playable_landscape.png');

    console.log('\n--- CONSOLE ERRORS ---');
    console.log(errors.length ? errors.join('\n') : '0 errors logged! Pure clean run.');

  } finally {
    ws.close();
    chromeProc.kill();
    console.log('[Test] Completed testing.');
  }
}

run().catch(err => {
  console.error('[Test Failed]', err);
  process.exit(1);
});
