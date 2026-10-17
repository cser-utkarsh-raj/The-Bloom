import { spawn } from 'child_process';
import fs from 'fs';

async function run() {
  console.log('[Test] Launching Headless Chrome on port 9230...');
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--window-size=1280,720',
    '--disable-gpu',
    'http://localhost:1954/?v=' + Date.now()
  ]);

  await new Promise(r => setTimeout(r, 1500));
  const list = await (await fetch('http://127.0.0.1:9230/json')).json();
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

  console.log('[Test] Inspecting MegaUI state on initial boot...');
  const initialCheck = await evalJs(`
    JSON.stringify({
      hasBloomMegaUI: typeof window.BloomMegaUI !== 'undefined',
      version: window.BloomMegaUI?.version,
      hasDavidEcg: !!document.getElementById('bloom-david-ecg'),
      hasNancyEcg: !!document.getElementById('bloom-nancy-ecg')
    })
  `);
  console.log('[Test] Initial Status:', initialCheck);

  // 1. Chapter 1 Title Sequence
  console.log('[Test] Starting Chapter 1 (Home Defence)...');
  await evalJs(`
    const shield = document.getElementById('boot-shield');
    if (shield) shield.style.display = 'none';
    if (typeof G === 'undefined' || !G) G = newGame();
    startLevel(0);
  `);
  await new Promise(r => setTimeout(r, 800));
  await takeScreenshot('verify_mega_ui_chapter1_intro.png');

  // 2. Gameplay & Diegetic Telemetry / ECG Monitor
  console.log('[Test] Waiting for Chapter 1 gameplay & bio-telemetry active...');
  await new Promise(r => setTimeout(r, 2200));
  const gameplayCheck = await evalJs(`
    JSON.stringify({
      state: state,
      hp: G?.hp,
      infect: G?.infect,
      davidEcgDrawn: document.getElementById('bloom-david-ecg')?.width,
      nancyEcgDrawn: document.getElementById('bloom-nancy-ecg')?.width
    })
  `);
  console.log('[Test] Gameplay Telemetry:', gameplayCheck);
  await takeScreenshot('verify_mega_ui_gameplay_ecg.png');

  // 3. Typewriter Dialogue System
  console.log('[Test] Triggering diegetic typewriter dialogue...');
  await evalJs(`
    say('Nancy, keep close to me. The front door is giving way.', 4500);
  `);
  await new Promise(r => setTimeout(r, 800));
  const dialogueCheck = await evalJs(`
    JSON.stringify({
      boxActive: document.querySelector('.bloom-dialogue-box')?.classList.contains('active'),
      speaker: document.querySelector('.bloom-dialogue-header span')?.textContent,
      text: document.querySelector('.bloom-dialogue-text')?.textContent
    })
  `);
  console.log('[Test] Dialogue Card:', dialogueCheck);
  await takeScreenshot('verify_mega_ui_dialogue.png');

  // 4. Tactical Item & Lore Inspector Modal
  console.log('[Test] Opening 2.5D Tactical Item Inspector...');
  await evalJs(`
    if (window.BloomMegaUI) {
      BloomMegaUI.inspectItem('note_triage');
    }
  `);
  await new Promise(r => setTimeout(r, 700));
  const inspectorCheck = await evalJs(`
    JSON.stringify({
      isOpen: document.getElementById('bloom-inspector-backdrop')?.classList.contains('open'),
      title: document.querySelector('#bloom-inspector-transcript')?.textContent?.slice(0, 40)
    })
  `);
  console.log('[Test] Inspector Modal:', inspectorCheck);
  await takeScreenshot('verify_mega_ui_inspector.png');

  // Close inspector
  console.log('[Test] Closing Tactical Inspector...');
  await evalJs(`
    if (window.BloomMegaUI) {
      BloomMegaUI.closeInspector();
    }
  `);
  await new Promise(r => setTimeout(r, 400));

  // 5. Chapter 2 Transition & Maya Mercer Boss Encounter
  console.log('[Test] Starting Chapter 2 (The Face I Loved)...');
  await evalJs(`
    startLevel(1);
  `);
  await new Promise(r => setTimeout(r, 1200));
  const chapter2Check = await evalJs(`
    JSON.stringify({
      levelId: LV?.id,
      width: LV?.w,
      height: LV?.h,
      hasBoss: !!LV?.boss,
      bossHp: LV?.boss?.hp,
      bossMax: LV?.boss?.max,
      hasMayaSprite: typeof window.drawMayaSprite === 'function',
      subOpacity: window.getComputedStyle(document.getElementById('sub')).opacity
    })
  `);
  console.log('[Test] Chapter 2 Arena Status:', chapter2Check);
  await takeScreenshot('verify_mega_ui_chapter2_maya.png');

  // Trigger Maya combat bark
  console.log('[Test] Triggering Maya dialogue bark...');
  await evalJs(`
    say('RUN, DAVID! I CANNOT HOLD MY ARMS BACK!', 4000, '#d68cff');
  `);
  await new Promise(r => setTimeout(r, 600));
  const mayaDialogueCheck = await evalJs(`
    JSON.stringify({
      boxActive: document.querySelector('.bloom-dialogue-box')?.classList.contains('active'),
      speaker: document.querySelector('.bloom-dialogue-header span')?.textContent,
      role: document.querySelector('.bloom-dialogue-role')?.textContent,
      text: document.querySelector('.bloom-dialogue-text')?.textContent
    })
  `);
  console.log('[Test] Maya Dialogue Attribution:', mayaDialogueCheck);
  await takeScreenshot('verify_mega_ui_maya_dialogue.png');

  // 6. Chapter 3 Transition & B-Roll
  console.log('[Test] Starting Chapter 3 (Miles of Silence)...');
  await evalJs(`
    startLevel(2);
  `);
  await new Promise(r => setTimeout(r, 900));
  await takeScreenshot('verify_mega_ui_chapter3_intro.png');

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
