import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test('live Pirate Pairs Premium V2 mobile smoke', async ({ page }) => {
  const badResponses = [];
  const consoleErrors = [];

  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('https://o-some.github.io/pirate-pairs/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/Pirate Pairs/);
  await expect(page.locator('body')).toHaveClass(/pirate-pairs-v2/);
  await expect(page.locator('.pp-ambient')).toHaveCount(1);
  await expect(page.locator('#grid .card')).toHaveCount(16);

  const noHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  );
  expect(noHorizontalOverflow).toBeTruthy();

  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
  expect(resources.some(url => url.includes('pirate-pairs-polish-v2.css'))).toBeTruthy();
  expect(resources.some(url => url.includes('pirate-pairs-fx-v2.js'))).toBeTruthy();

  await page.locator('#startBtn').click();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await expect(page.locator('#grid .card').first()).toHaveAttribute('data-fx-ready', '1');

  const first = page.locator('#grid .card').nth(0);
  const second = page.locator('#grid .card').nth(1);
  await first.tap();
  await expect(first).toHaveClass(/flipped/);
  await second.tap();
  await page.waitForTimeout(2400);
  await expect(page.locator('#grid .card')).toHaveCount(16);

  await page.locator('#restartBtn').tap();
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await page.locator('#peekBtn').tap();
  await expect(page.locator('body')).toHaveClass(/peek-active/);
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  await page.waitForTimeout(1500);
  await expect(page.locator('#peekBtn')).toBeDisabled();

  expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(badResponses, `HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);
});
