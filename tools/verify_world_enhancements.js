import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9235;
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

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 2000));

  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result?.result?.value;
  }

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result?.data) {
      fs.writeFileSync(filename, Buffer.from(res.result.data, 'base64'));
      console.log(`[Test] Saved: ${filename}`);
    }
  }

  console.log('[Test] Inspecting BloomWorldEnhancements on boot...');
  const initialCheck = await evalJs(`
    JSON.stringify({
      hasWorldEngine: typeof window.BloomWorldEnhancements !== 'undefined',
      version: window.BloomWorldEnhancements?.version,
      hasEnrichLevel: typeof window.BloomWorldEnhancements?.enrichLevel === 'function',
      hasPerimeterBuffer: typeof window.BloomWorldEnhancements?.renderPerimeterBuffer === 'function'
    })
  `);
  console.log('[Test] World Engine Status:', initialCheck);

  // 1. Chapter 1 (Home Defence)
  console.log('[Test] Starting Chapter 1...');
  await evalJs(`
    const shield = document.getElementById('boot-shield');
    if (shield) shield.style.display = 'none';
    if (typeof G === 'undefined' || !G) G = newGame();
    startLevel(0);
  `);
  await new Promise(r => setTimeout(r, 1800));
  const ch1Check = await evalJs(`
    JSON.stringify({
      levelId: LV?.id,
      width: LV?.w,
      height: LV?.h,
      enhancedPropsCount: LV?.enhancedProps?.length,
      decalsCount: LV?.decals?.length,
      horizonVoidOuter: LV?.horizonColors?.voidOuter
    })
  `);
  console.log('[Test] Chapter 1 Data:', ch1Check);
  await takeScreenshot('verify_world_ch1_home.png');

  // 2. Chapter 2 (The Face I Loved)
  console.log('[Test] Starting Chapter 2...');
  await evalJs(`
    startLevel(1);
  `);
  await new Promise(r => setTimeout(r, 1800));
  const ch2Check = await evalJs(`
    JSON.stringify({
      levelId: LV?.id,
      width: LV?.w,
      height: LV?.h,
      enhancedPropsCount: LV?.enhancedProps?.length,
      hasStonePillars: LV?.enhancedProps?.some(p => p.type === 'stone_pillar')
    })
  `);
  console.log('[Test] Chapter 2 Data:', ch2Check);
  await takeScreenshot('verify_world_ch2_maya.png');

  // 3. Chapter 3 (Miles of Silence)
  console.log('[Test] Starting Chapter 3...');
  await evalJs(`
    startLevel(2);
  `);
  await new Promise(r => setTimeout(r, 1800));
  const ch3Check = await evalJs(`
    JSON.stringify({
      levelId: LV?.id,
      width: LV?.w,
      height: LV?.h,
      enhancedPropsCount: LV?.enhancedProps?.length,
      hasOverturnedTankers: LV?.enhancedProps?.some(p => p.type === 'overturned_tanker')
    })
  `);
  console.log('[Test] Chapter 3 Data:', ch3Check);
  await takeScreenshot('verify_world_ch3_highway.png');

  // 4. Chapter 4 (No Safe Haven)
  console.log('[Test] Starting Chapter 4...');
  await evalJs(`
    startLevel(3);
  `);
  await new Promise(r => setTimeout(r, 1800));
  const ch4Check = await evalJs(`
    JSON.stringify({
      levelId: LV?.id,
      width: LV?.w,
      height: LV?.h,
      enhancedPropsCount: LV?.enhancedProps?.length,
      hasTriageCots: LV?.enhancedProps?.some(p => p.type === 'triage_cot')
    })
  `);
  console.log('[Test] Chapter 4 Data:', ch4Check);
  await takeScreenshot('verify_world_ch4_school.png');

  // 5. Chapter 5 (The Point Of No Return)
  console.log('[Test] Starting Chapter 5...');
  await evalJs(`
    startLevel(4);
  `);
  await new Promise(r => setTimeout(r, 1800));
  const ch5Check = await evalJs(`
    JSON.stringify({
      levelId: LV?.id,
      width: LV?.w,
      height: LV?.h,
      enhancedPropsCount: LV?.enhancedProps?.length,
      hasBunkerDoor: LV?.enhancedProps?.some(p => p.type === 'bunker_blast_door')
    })
  `);
  console.log('[Test] Chapter 5 Data:', ch5Check);
  await takeScreenshot('verify_world_ch5_bunker.png');

  console.log('[Test] Runtime error summary:');
  if (errors.length === 0) {
    console.log('  SUCCESS: 0 console errors detected!');
  } else {
    errors.forEach(e => console.error('  ERROR:', e));
  }

  ws.close();
  chromeProc.kill();
  console.log('[Test] Complete.');
}

run().catch(console.error);
