import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test('live Pirate Pairs stable card emblem on mobile', async ({ page, request }) => {
  test.setTimeout(180000);
  const consoleErrors = [];
  const badResponses = [];

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  const liveUrl = 'https://o-some.github.io/pirate-pairs/';

  let ready = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    await page.goto(liveUrl, { waitUntil: 'networkidle' });
    ready = await page.locator('#grid .crest').first().evaluate(el => {
      const style = getComputedStyle(el);
      return style.backgroundImage.includes('card-emblem.svg') && style.fontSize === '0px';
    }).catch(() => false);
    if (ready) break;
    await page.waitForTimeout(5000);
  }
  expect(ready, 'Published page never exposed the stable SVG card emblem').toBeTruthy();

  await expect(page).toHaveTitle(/Pirate Pairs/);
  await expect(page.locator('#grid .card')).toHaveCount(16);

  const emblemResponse = await request.get(`${liveUrl}assets/card-emblem.svg`);
  expect(emblemResponse.status()).toBe(200);
  expect(emblemResponse.headers()['content-type'] || '').toContain('image/svg+xml');

  const emblemCssResponse = await request.get(`${liveUrl}pirate-pairs-card-emblem.css`);
  expect(emblemCssResponse.status()).toBe(200);

  const crestState = await page.locator('#grid .crest').first().evaluate(el => {
    const style = getComputedStyle(el);
    return {
      fontSize: style.fontSize,
      color: style.color,
      backgroundImage: style.backgroundImage,
      text: el.textContent,
    };
  });

  // The legacy Unicode glyph may remain in DOM for backwards compatibility,
  // but it must never render. The visible center is exclusively our SVG.
  expect(crestState.text).toContain('☸');
  expect(crestState.fontSize).toBe('0px');
  expect(crestState.color).toBe('rgba(0, 0, 0, 0)');
  expect(crestState.backgroundImage).toContain('card-emblem.svg');

  const noHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  );
  expect(noHorizontalOverflow).toBeTruthy();

  await page.locator('#startBtn').tap();
  const first = page.locator('#grid .card').first();
  await first.tap();
  await page.waitForTimeout(70);
  await expect(first).toHaveClass(/flipped/);
  expect(await first.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');

  await page.locator('#restartBtn').tap();
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  await page.waitForTimeout(1500);
  await expect(page.locator('#peekBtn')).toBeDisabled();

  expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  expect(badResponses, `HTTP errors: ${badResponses.join(' | ')}`).toEqual([]);
});
