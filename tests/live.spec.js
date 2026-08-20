import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://o-some.github.io/pirate-pairs/';

function pairKey(id = '') {
  return id.replace(/-(source|target)$/, '');
}

test.use({ viewport: { width: 390, height: 844 } });

test('live Pirate Pairs gameplay smoke', async ({ page }) => {
  const consoleErrors = [];
  const badResponses = [];

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/pirate-pairs/') && response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
  expect(response?.status()).toBe(200);
  await expect(page.locator('#intro')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
  await expect(page.locator('img[alt="Tula"]').first()).toBeVisible();
  await expect(page.locator('img[alt="Pirat Kai"]').first()).toBeVisible();

  await page.locator('#startBtn').click();
  await page.waitForTimeout(350);
  await expect(page.locator('.card')).toHaveCount(16);

  const viewportMetrics = await page.evaluate(() => ({
    width: window.innerWidth,
    htmlWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(viewportMetrics.htmlWidth).toBeLessThanOrEqual(viewportMetrics.width);
  expect(viewportMetrics.bodyWidth).toBeLessThanOrEqual(viewportMetrics.width);

  await page.locator('#peekBtn').click();
  await expect(page.locator('#peekBtn')).toHaveText('VERBRAUCHT');
  await page.waitForTimeout(1500);

  await page.locator('#restartBtn').click();
  await expect(page.locator('#playerScore')).toHaveText('0');
  await expect(page.locator('#aiScore')).toHaveText('0');

  const cards = await page.locator('.card').evaluateAll(elements =>
    elements.map((element, index) => ({ index, id: element.dataset.id || '' })),
  );

  const groups = new Map();
  for (const card of cards) {
    const key = pairKey(card.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card.index);
  }
  const matchingPair = [...groups.values()].find(indices => indices.length === 2);
  expect(matchingPair).toBeTruthy();

  await page.locator('.card').nth(matchingPair[0]).click();
  await page.locator('.card').nth(matchingPair[1]).click();
  await expect(page.locator('#playerScore')).toHaveText('1', { timeout: 5_000 });

  await page.locator('#restartBtn').click();
  const cardsAfterRestart = await page.locator('.card').evaluateAll(elements =>
    elements.map((element, index) => ({ index, id: element.dataset.id || '' })),
  );
  let mismatch = null;
  outer: for (let i = 0; i < cardsAfterRestart.length; i += 1) {
    for (let j = i + 1; j < cardsAfterRestart.length; j += 1) {
      if (pairKey(cardsAfterRestart[i].id) !== pairKey(cardsAfterRestart[j].id)) {
        mismatch = [i, j];
        break outer;
      }
    }
  }
  expect(mismatch).toBeTruthy();

  await page.locator('.card').nth(mismatch[0]).click();
  await page.locator('.card').nth(mismatch[1]).click();
  await expect(page.locator('#turnPill')).toHaveText('KAI DENKT …', { timeout: 4_000 });
  await expect(page.locator('#turnPill')).toHaveText('DU BIST DRAN', { timeout: 20_000 });

  await page.locator('#restartBtn').click();
  await expect(page.locator('#playerScore')).toHaveText('0');
  await expect(page.locator('#aiScore')).toHaveText('0');
  await expect(page.locator('.card.matched')).toHaveCount(0);

  expect(badResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
