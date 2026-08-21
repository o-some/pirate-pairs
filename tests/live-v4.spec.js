import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test('live Pirate Pairs V4 premium cards and sprites', async ({ page }) => {
  test.setTimeout(180000);
  const badResponses = [];
  const consoleErrors = [];

  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const liveUrl = 'https://o-some.github.io/pirate-pairs/';

  // Pages can still be propagating immediately after the merge. Retry until the
  // actual published V4 marker is present instead of accidentally testing V3.
  let v4Ready = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    await page.goto(liveUrl, { waitUntil: 'networkidle' });
    v4Ready = await page.locator('body').evaluate(el => el.classList.contains('pirate-pairs-v4')).catch(() => false);
    if (v4Ready) break;
    await page.waitForTimeout(5000);
  }
  expect(v4Ready, 'GitHub Pages never exposed the V4 body marker').toBeTruthy();

  await expect(page).toHaveTitle(/Pirate Pairs/);
  await expect(page.locator('#grid .card')).toHaveCount(16);

  // Real Tula's Island runtime assets must be active, not the old local SVGs.
  const tula = page.locator('#tulaDuelSprite');
  const kai = page.locator('.kai-portrait img');
  await expect(tula).toHaveAttribute('src', /tula_neutral_front\.webp/);
  await expect(kai).toHaveAttribute('src', /boss-01-pirat-kai\.png/);
  await expect(tula).not.toHaveAttribute('data-fallback-used', '1');
  await expect(kai).not.toHaveAttribute('data-fallback-used', '1');
  await expect.poll(() => tula.evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
  await expect.poll(() => kai.evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();

  const backgroundHasHarbor = await page.locator('body').evaluate(el =>
    getComputedStyle(el).backgroundImage.includes('world_harbor.webp')
  );
  expect(backgroundHasHarbor).toBeTruthy();

  // Card surfaces should have material depth rather than flat blocks.
  const cardMaterial = await page.locator('#grid .card').first().evaluate(card => {
    const back = card.querySelector('.back');
    const front = card.querySelector('.front');
    const backStyle = getComputedStyle(back);
    const frontStyle = getComputedStyle(front);
    return {
      backBg: backStyle.backgroundImage,
      backShadow: backStyle.boxShadow,
      backBorder: backStyle.borderTopWidth,
      frontBg: frontStyle.backgroundImage,
      frontShadow: frontStyle.boxShadow,
      frontBorder: frontStyle.borderTopWidth,
    };
  });
  expect(cardMaterial.backBg.split('gradient').length).toBeGreaterThan(2);
  expect(cardMaterial.frontBg.split('gradient').length).toBeGreaterThan(2);
  expect(cardMaterial.backShadow).not.toBe('none');
  expect(cardMaterial.frontShadow).not.toBe('none');
  expect(cardMaterial.backBorder).toBe('2px');
  expect(cardMaterial.frontBorder).toBe('2px');

  const noHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  );
  expect(noHorizontalOverflow).toBeTruthy();

  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);

  // Find one deterministic translation pair from data-id, independent of shuffle.
  const cardIds = await page.locator('#grid .card').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  const groups = new Map();
  cardIds.forEach((id, index) => {
    const key = id.replace(/-(source|target)$/, '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });
  const pair = [...groups.values()].find(indexes => indexes.length === 2);
  expect(pair).toBeTruthy();

  const first = page.locator('#grid .card').nth(pair[0]);
  const second = page.locator('#grid .card').nth(pair[1]);

  await first.tap();
  await page.waitForTimeout(70);
  await expect(first).toHaveClass(/flipped/);
  const earlyTransform = await first.evaluate(el => getComputedStyle(el).transform);
  expect(earlyTransform).not.toBe('none');
  await expect(first).not.toHaveClass(/wrong-feedback|match-feedback|ai-pick/);

  await page.waitForTimeout(230);
  const settledTransform = await first.evaluate(el => getComputedStyle(el).transform);
  expect(settledTransform).not.toBe('none');

  await second.tap();
  await expect.poll(() => Number(page.locator('#playerScore').textContent()), { timeout: 2500 }).toBe(1);
  await expect.poll(() => tula.getAttribute('src'), { timeout: 1400 }).toContain('tula_happy.webp');

  // Restart, then verify the one-shot ability still works with the V4 visuals.
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
