import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test('live Pirate Pairs Premium V3 instant interaction smoke', async ({ page }) => {
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
  await expect(page.locator('#grid .card')).toHaveCount(16);

  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
  expect(resources.some(url => url.includes('pirate-pairs-polish-v2.css'))).toBeTruthy();
  expect(resources.some(url => url.includes('pirate-pairs-fx-v2.js'))).toBeTruthy();

  const noHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  );
  expect(noHorizontalOverflow).toBeTruthy();

  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);

  const first = page.locator('#grid .card').first();
  await first.tap();
  await expect(first).toHaveClass(/flipped/);

  // The visible Y-rotation must start immediately. This specifically catches
  // the old Premium V2 conflict where a deal animation owned .card transform.
  await page.waitForTimeout(70);
  const motion = await first.evaluate(el => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return {
      m13: Math.abs(matrix.m13),
      m31: Math.abs(matrix.m31),
      classes: el.className,
    };
  });
  expect(motion.m13 + motion.m31, `Expected immediate Y rotation, got ${JSON.stringify(motion)}`).toBeGreaterThan(0.05);
  expect(motion.classes).not.toContain('wrong-pair');
  expect(motion.classes).not.toContain('match-pop');
  expect(motion.classes).not.toContain('ai-pick');

  const second = page.locator('#grid .card').nth(1);
  await second.tap();
  await page.waitForTimeout(1800);
  await expect(page.locator('#grid .card')).toHaveCount(16);

  await page.locator('#restartBtn').tap();
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  await page.waitForTimeout(1500);
  await expect(page.locator('#peekBtn')).toBeDisabled();

  expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(badResponses, `HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);
});
