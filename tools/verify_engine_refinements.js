import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9240;
const TARGET_URL = 'http://localhost:1954/?v=' + Date.now();

async function run() {
  console.log('[Test] Launching Headless Chrome on port ' + PORT + '...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--window-size=1280,720',
    TARGET_URL
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

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result?.result?.value;
  }

  async function screenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result?.data) {
      fs.writeFileSync(filename, Buffer.from(res.result.data, 'base64'));
      console.log(`[Screenshot] Saved ${filename}`);
    }
  }

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('[Test] Waiting for game boot...');
  await new Promise(r => setTimeout(r, 2200));

  // 1. Test Chapter 1: Volumetric Flashlight & Footsteps
  console.log('[Test] Starting Chapter 1 in gameplay...');
  await evaluate(`
    audioInit();
    G = newGame();
    startLevel(0);
    if (typeof BloomMegaUI !== 'undefined' && BloomMegaUI.director) {
      BloomMegaUI.director.activeChapter = null;
    }
    $('ov').style.display = 'none';
  `);
  await new Promise(r => setTimeout(r, 1200));

  // Move David across the floor to cast flashlight and step in decals
  console.log('[Test] Moving David in Chapter 1...');
  await evaluate(`
    keys.KeyD = true;
    keys.KeyS = true;
  `);
  await new Promise(r => setTimeout(r, 800));
  await evaluate(`
    keys.KeyD = false;
    keys.KeyS = false;
  `);
  await new Promise(r => setTimeout(r, 500));

  await screenshot('verify_refinement_flashlight_ch1.png');

  const artDir = 'C:\\Users\\u_raj\\.gemini\\antigravity\\brain\\8bafccc0-2e38-4f00-ba84-55d02cffd3fa';
  if (fs.existsSync('verify_refinement_flashlight_ch1.png') && fs.existsSync(artDir)) {
    fs.copyFileSync('verify_refinement_flashlight_ch1.png', `${artDir}\\verify_refinement_flashlight_ch1.png`);
  }

  // Check Foley Audio on Ch1
  const foleyStatusCh1 = await evaluate(`
    ({
      foleyLevel: FOLEY.level,
      hasGain: Boolean(FOLEY.gain),
      hasFilter: Boolean(FOLEY.filter),
      musicLevel: MUSIC.level
    })
  `);
  console.log('[Test] Foley Engine Status Ch1:', foleyStatusCh1);

  // 2. Test Chapter 2: Nancy crouching and Maya Pillar Destruction
  console.log('[Test] Starting Chapter 2...');
  await evaluate(`
    G = newGame();
    startLevel(1);
    if (typeof BloomMegaUI !== 'undefined' && BloomMegaUI.director) {
      BloomMegaUI.director.activeChapter = null;
    }
    $('ov').style.display = 'none';
  `);
  await new Promise(r => setTimeout(r, 1200));

  // Check Nancy crouch when David is still
  const nancyStatus = await evaluate(`
    ({
      crouch: LV.daughter ? Boolean(LV.daughter.crouch) : false,
      trust: LV.daughter ? LV.daughter.trust : 0,
      scared: LV.daughter ? LV.daughter.scared : 0
    })
  `);
  console.log('[Test] Nancy state in Ch2:', nancyStatus);

  // Check Pillar before charge
  const pillarBefore = await evaluate(`
    (function() {
      var p = LV.props.find(function(x) { return x.k === 'pillar'; });
      return p ? { cx: p.cx, cy: p.cy, fractured: Boolean(p.fractured) } : null;
    })()
  `);
  console.log('[Test] Pillar before charge:', pillarBefore);

  // Simulate Maya bull charge into pillar
  console.log('[Test] Triggering Maya charge into pillar...');
  await evaluate(`
    if (LV.boss) {
      LV.boss.awake = true;
      var pillar = LV.props.find(function(x) { return x.k === 'pillar'; });
      if (pillar) {
        LV.boss.x = pillar.cx - 0.2;
        LV.boss.y = pillar.cy - 0.2;
        LV.boss.bs = 'charge';
        LV.boss.bt = 0.5;
        LV.boss.dirx = 1;
        LV.boss.diry = 0;
        for (var step = 0; step < 5; step++) {
          LV.boss.updBoss(0.016);
        }
      }
    }
  `);
  await new Promise(r => setTimeout(r, 600));

  const pillarAfter = await evaluate(`
    (function() {
      var p = LV.props.find(function(x) { return x.k === 'pillar'; });
      return p ? { cx: p.cx, cy: p.cy, fractured: Boolean(p.fractured) } : null;
    })()
  `);
  console.log('[Test] Pillar after charge:', pillarAfter);

  await screenshot('verify_refinement_maya_pillar_ch2.png');
  if (fs.existsSync('verify_refinement_maya_pillar_ch2.png') && fs.existsSync(artDir)) {
    fs.copyFileSync('verify_refinement_maya_pillar_ch2.png', `${artDir}\\verify_refinement_maya_pillar_ch2.png`);
  }

  // 3. Test Combat Interrupt / Parry
  console.log('[Test] Testing Combat Parry / Counter-Hit Interrupt...');
  const parryResult = await evaluate(`
    (function() {
      var p = LV.player;
      var e = LV.spawnEnemy('drifter', p.x + 0.8, p.y + 0.8);
      e.wind = 0.3; // in attack windup
      p.f = Math.atan2(e.y - p.y, e.x - p.x);
      p.atkT = 0;
      p.attack(false);
      return {
        enemyStun: e.stun,
        enemyWind: e.wind,
        playerAtk: p.atkT
      };
    })()
  `);
  console.log('[Test] Parry / Interrupt Test Result:', parryResult);

  console.log('[Test] Console errors count:', errors.length);
  if (errors.length > 0) {
    console.error('[Test] Encountered errors:', errors);
  }

  chromeProc.kill();
  console.log('[Test] Complete.');
}

run().catch(err => {
  console.error('[Test] Uncaught error:', err);
  process.exit(1);
});
