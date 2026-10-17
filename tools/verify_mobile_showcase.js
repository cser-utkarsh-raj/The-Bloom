import { spawn } from 'child_process';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9245;
const BASE_URL = 'http://localhost:1954';
const ARTIFACT_DIR = 'C:\\Users\\u_raj\\.gemini\\antigravity\\brain\\8bafccc0-2e38-4f00-ba84-55d02cffd3fa';

async function run() {
  console.log('[Test] Launching Headless Chrome on port ' + PORT + '...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--window-size=1280,800',
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
    // PART 1: MOBILE EMULATION TEST
    // =========================================================================
    console.log('\n--- PART 1: MOBILE TEST (iPhone 14 / Safari) ---');
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    console.log('[Test] Navigating to page on Mobile...');
    const t0 = Date.now();
    await send('Page.navigate', { url: `${BASE_URL}/?test_mobile=${Date.now()}` });
    await new Promise(r => setTimeout(r, 1200));

    const loadTime = Date.now() - t0;
    console.log(`[Test] Initial render reached in ~${loadTime}ms.`);

    const mobileCheck = await evaluate(`({
      isMobile: window.IS_MOBILE,
      p5Loaded: typeof window.p5 !== 'undefined',
      bcsOverlayExists: !!document.getElementById('bcs-container'),
      bcsOverlayDisplay: document.getElementById('bcs-container')?.style.display,
      bootShieldOpacity: document.getElementById('boot-shield')?.style.opacity,
      bootShieldDisplay: document.getElementById('boot-shield')?.style.display
    })`);
    console.log('[Test] Mobile state evaluation:', JSON.stringify(mobileCheck, null, 2));

    if (!mobileCheck.isMobile) {
      console.warn('[Warning] isMobile was not detected as true!');
    }
    console.log('[Test] p5 remote script loaded on mobile:', mobileCheck.p5Loaded ? 'YES (SHOULD BE NO/FALSE)' : 'NO (CORRECT! SAVED 3MB)');

    // Wait for character showcase canvas to draw frames
    await new Promise(r => setTimeout(r, 1500));
    await capture('verify_mobile_showcase.png');

    // Switch to Maya character in showcase
    console.log('[Test] Selecting Maya in character showcase...');
    await evaluate(`window.BloomCharacterShowcase && window.BloomCharacterShowcase.select(2)`);
    await new Promise(r => setTimeout(r, 1000));
    await capture('verify_mobile_showcase_maya.png');

    // Attempt to trigger gameplay and verify mobile blocker notice
    console.log('[Test] Attempting newRun() on mobile to verify blocker...');
    const blockedRes = await evaluate(`(() => {
      try {
        window.newRun && window.newRun();
        const blocker = document.getElementById('bcs-notice');
        return {
          gameState: window.G ? window.G.state : null,
          blockerVisible: !!blocker && blocker.style.display !== 'none',
          blockerText: blocker ? blocker.innerText : null
        };
      } catch(e) {
        return { error: e.message };
      }
    })()`);
    console.log('[Test] Blocker check:', JSON.stringify(blockedRes, null, 2));
    await capture('verify_mobile_blocker.png');

    // =========================================================================
    // PART 2: DESKTOP TEST
    // =========================================================================
    console.log('\n--- PART 2: DESKTOP TEST (1280x720) ---');
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('[Test] Navigating to page on Desktop...');
    await send('Page.navigate', { url: `${BASE_URL}/?test_desktop=${Date.now()}` });
    await new Promise(r => setTimeout(r, 1800));

    const desktopCheck = await evaluate(`({
      isMobile: window.isMobile,
      p5Loaded: typeof window.p5 !== 'undefined',
      hasCharactersButton: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('CHARACTERS'))
    })`);
    console.log('[Test] Desktop state evaluation:', JSON.stringify(desktopCheck, null, 2));

    await capture('verify_desktop_menu.png');

    // Test clicking [ CHARACTERS ] in desktop menu
    console.log('[Test] Clicking [ CHARACTERS ] button on desktop...');
    await evaluate(`window.showCharacters && window.showCharacters()`);
    await new Promise(r => setTimeout(r, 1200));
    await capture('verify_desktop_showcase.png');

    // Close showcase and test game launch
    console.log('[Test] Closing showcase and launching Chapter 1 on Desktop...');
    await evaluate(`(() => {
      if (window.BloomCharacterShowcase) window.BloomCharacterShowcase.close();
      if (window.newRun) window.newRun();
    })()`);
    await new Promise(r => setTimeout(r, 1500));
    await capture('verify_desktop_gameplay.png');

    console.log('\n--- CONSOLE ERRORS ---');
    console.log(errors.length ? errors.join('\n') : '0 errors logged!');

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
