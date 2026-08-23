import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { webkit } from 'playwright';

const port = 4321;
const route = `http://127.0.0.1:${port}/pirate-pairs?boss=2&stage=A1`;
const readinessRoute = `http://127.0.0.1:${port}/pirate-pairs`;
let serverLog = '';

// Launch Astro directly instead of going through the npm dev script. The npm
// script already carries a --host flag; passing a second one can make the
// listening address ambiguous on CI runners.
const server = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
  env: { ...process.env, CI: '1' },
});
server.stdout?.on('data', chunk => { serverLog += chunk.toString(); });
server.stderr?.on('data', chunk => { serverLog += chunk.toString(); });

const stopServer = () => {
  if (!server.pid) return;
  try {
    if (process.platform !== 'win32') process.kill(-server.pid, 'SIGTERM');
    else server.kill('SIGTERM');
  } catch {
    // The process may already have exited; the test result is still valid.
  }
};

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(readinessRoute, { redirect: 'follow' });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Astro is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(`Astro dev server did not become ready.\n${serverLog}`);
}

let browser;
try {
  await waitForServer();
  browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });

  const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.ok(response?.ok(), `WebKit route failed with ${response?.status()}`);
  await page.waitForSelector('.card', { timeout: 10000 });
  await page.waitForSelector('#bossRoadmap .boss-road-item.b07-current-boss', { timeout: 10000 });
  await page.waitForFunction(
    () => ['primary', 'fallback'].includes(document.body.dataset.b09BossArtSource || ''),
    null,
    { timeout: 15000 },
  );

  const art = await page.evaluate(() => {
    const body = document.body;
    const top = document.getElementById('bossDuelSprite');
    const currentTile = document.querySelector('#bossRoadmap .boss-road-item.b07-current-boss .boss-road-num');
    return {
      bossId: body.dataset.bossId,
      source: body.dataset.b09BossArtSource,
      topSrc: top?.getAttribute('src') || '',
      resolvedVar: body.style.getPropertyValue('--pp-b09-current-boss-art'),
      tileBackground: currentTile ? getComputedStyle(currentTile).backgroundImage : '',
      bossNameSize: parseFloat(getComputedStyle(document.getElementById('bossName')).fontSize),
      abilityCopySize: parseFloat(getComputedStyle(document.getElementById('bossAbilityCopy')).fontSize),
      noHorizontalOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  });

  assert.equal(art.bossId, '2', 'WebKit smoke must exercise Kapitän Brax');
  assert.ok(['primary', 'fallback'].includes(art.source), `active boss art did not resolve: ${art.source}`);
  assert.ok(art.topSrc && art.resolvedVar.includes(art.topSrc), 'top portrait and active roadmap must share the same resolved URL');
  assert.ok(art.tileBackground && art.tileBackground !== 'none', 'active roadmap portrait must render an image');
  assert.ok(art.bossNameSize >= 13, `boss name is too small on phone WebKit: ${art.bossNameSize}px`);
  assert.ok(art.abilityCopySize >= 8.5, `boss ability copy is too small on phone WebKit: ${art.abilityCopySize}px`);
  assert.equal(art.noHorizontalOverflow, true, 'B09 must not introduce horizontal mobile overflow');

  // The first-start guide and intro CTA intentionally use continuous
  // presentation animation. Invoke their existing click handlers directly so
  // Playwright's stability heuristic does not turn unrelated animation into a
  // false negative. The board interaction below remains a real WebKit touch.
  const guideContinue = page.locator('#bossGuideContinue');
  if (await guideContinue.count() && await guideContinue.isVisible()) {
    await guideContinue.evaluate(button => button.click());
  }
  const startButton = page.locator('#startBtn');
  await startButton.evaluate(button => button.click());
  await page.waitForFunction(() => document.getElementById('intro')?.classList.contains('hidden'), null, { timeout: 5000 });

  // Cards also carry continuous visual polish animation. A locator click waits
  // forever for a mathematically stable box, so use WebKit's real touchscreen
  // at the live card center instead. This keeps the smoke representative of an
  // iPhone tap without disabling production animation for the test.
  const firstCard = page.locator('.card').first();
  const cardBox = await firstCard.boundingBox();
  assert.ok(cardBox, 'first card must have a tappable mobile bounding box');
  await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.waitForFunction(() => document.querySelector('.card')?.classList.contains('flipped'), null, { timeout: 5000 });

  await page.evaluate(() => document.querySelector('.card')?.classList.add('bomb-armed'));
  const barrel = await page.locator('.card').first().locator('.boss-marker').evaluate(marker => {
    const style = getComputedStyle(marker);
    return {
      backgroundImage: style.backgroundImage,
      width: parseFloat(style.width),
      height: parseFloat(style.height),
    };
  });
  assert.match(barrel.backgroundImage, /powder-barrel\.svg/, 'WebKit must render the premium powder-barrel marker');
  assert.ok(barrel.width >= 40 && barrel.height >= 40, `powder barrel is not visibly sized: ${barrel.width}×${barrel.height}`);

  assert.deepEqual(runtimeErrors, [], `WebKit emitted runtime errors:\n${runtimeErrors.join('\n')}`);
  await context.close();
  console.log(`Pirate Pairs B09 WebKit smoke: PASS (${art.source} boss art)`);
} finally {
  await browser?.close().catch(() => {});
  stopServer();
}
