import { test, expect } from '@playwright/test';

const LIVE = 'https://o-some.github.io/pirate-pairs/';

async function openV5(page) {
  let ready = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    await page.goto(`${LIVE}?v5check=${Date.now()}`, { waitUntil: 'networkidle' });
    ready = await page.locator('link[href*="pirate-pairs-compact-v5.css"]').count().then(n => n === 1);
    if (ready) break;
    await page.waitForTimeout(5000);
  }
  expect(ready, 'GitHub Pages never exposed the compact V5 stylesheet').toBeTruthy();
  await expect(page.locator('#grid .card')).toHaveCount(16);
}

async function findPair(page) {
  const ids = await page.locator('#grid .card').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  const groups = new Map();
  ids.forEach((id, index) => {
    const key = id.replace(/-(source|target)$/, '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  return [...groups.values()].find(indexes => indexes.length === 2);
}

async function assertNoPageScroll(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollHeight, `${label}: vertical page should fit without scrolling`).toBeLessThanOrEqual(metrics.clientHeight + 2);
}

test('live Pirate Pairs compact premium V5 mobile QA', async ({ browser }) => {
  test.setTimeout(180000);

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const badResponses = [];
  const consoleErrors = [];
  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await openV5(page);
  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await assertNoPageScroll(page, '390x844');

  const turnBadge = await page.locator('#turnPill').evaluate(el => ({
    background: getComputedStyle(el).backgroundImage,
    border: getComputedStyle(el).borderTopColor,
    shadow: getComputedStyle(el).boxShadow,
    skull: getComputedStyle(el, '::before').content,
  }));
  expect(turnBadge.background).not.toBe('none');
  expect(turnBadge.shadow).not.toBe('none');
  expect(turnBadge.skull).not.toBe('none');

  const material = await page.locator('#grid .card').first().evaluate(card => {
    const back = card.querySelector('.back');
    const front = card.querySelector('.front');
    const word = card.querySelector('.word');
    const bs = getComputedStyle(back);
    const fs = getComputedStyle(front);
    const ws = getComputedStyle(word);
    return {
      cardRatio: getComputedStyle(card).aspectRatio,
      backBg: bs.backgroundImage,
      backShadow: bs.boxShadow,
      frontBg: fs.backgroundImage,
      frontShadow: fs.boxShadow,
      wordBg: ws.backgroundImage,
      wordBorder: ws.borderTopWidth,
    };
  });
  expect(material.backBg.split('gradient').length).toBeGreaterThan(5);
  expect(material.frontBg.split('gradient').length).toBeGreaterThan(5);
  expect(material.backShadow).not.toBe('none');
  expect(material.frontShadow).not.toBe('none');
  expect(material.wordBg).not.toBe('none');
  expect(material.wordBorder).toBe('1px');

  const pair = await findPair(page);
  expect(pair).toBeTruthy();
  const first = page.locator('#grid .card').nth(pair[0]);
  const second = page.locator('#grid .card').nth(pair[1]);

  await first.tap();
  await page.waitForTimeout(70);
  await expect(first).toHaveClass(/flipped/);
  expect(await first.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');

  await second.tap();
  await expect.poll(async () => Number(await page.locator('#playerScore').textContent()), { timeout: 2600 }).toBe(1);
  await expect(first).toHaveClass(/matched/);
  await expect(second).toHaveClass(/matched/);

  const unavailable = await first.evaluate(el => ({
    opacity: Number(getComputedStyle(el).opacity),
    filter: getComputedStyle(el).filter,
    pointerEvents: getComputedStyle(el).pointerEvents,
    cursor: getComputedStyle(el).cursor,
  }));
  expect(unavailable.opacity).toBeLessThanOrEqual(.5);
  expect(unavailable.filter).toContain('grayscale');
  expect(unavailable.pointerEvents).toBe('none');
  expect(unavailable.cursor).toBe('not-allowed');

  await page.locator('#restartBtn').tap();
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  await page.waitForTimeout(1500);
  await expect(page.locator('#peekBtn')).toBeDisabled();

  expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(badResponses, `HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);
  await context.close();

  const compactContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const compactPage = await compactContext.newPage();
  await openV5(compactPage);
  await compactPage.locator('#startBtn').tap();
  await expect(compactPage.locator('#intro')).toHaveClass(/hidden/);
  await assertNoPageScroll(compactPage, '375x667');
  await compactContext.close();
});
