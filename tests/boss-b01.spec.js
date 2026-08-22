import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4321/pirate-pairs/';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

async function startBoss(page, id) {
  await page.goto(`${BASE}?boss=${id}`, { waitUntil: 'networkidle' });
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
}

async function availablePairIds(page) {
  const cards = await page.locator('#grid .card:not(.matched)').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.id,
    classes: node.className,
  })));
  const groups = new Map();
  for (const card of cards) {
    if (card.classes.includes('fogged')) continue;
    const key = card.id.replace(/-(source|target)$/, '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card.id);
  }
  return [...groups.values()].find(ids => ids.length === 2) || null;
}

async function completeKnownPair(page) {
  const ids = await availablePairIds(page);
  expect(ids, 'expected an available translation pair').toBeTruthy();
  const before = Number(await page.locator('#playerScore').textContent());
  await page.locator(`#grid .card[data-id="${ids[0]}"]`).tap();
  await page.locator(`#grid .card[data-id="${ids[1]}"]`).tap();
  await expect.poll(async () => Number(await page.locator('#playerScore').textContent()), { timeout: 5000 }).toBeGreaterThan(before);
  await expect(page.locator(`#grid .card[data-id="${ids[0]}"]`)).toHaveClass(/matched/);
  return ids;
}

test('Boss mechanics B01: swap, bomb and fog', async ({ page }) => {
  test.setTimeout(120000);
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // Boss 1 — Kai: visible face-down swap after 3 player attempts.
  await startBoss(page, 1);
  await completeKnownPair(page);
  await completeKnownPair(page);
  const beforeSwap = await page.locator('#grid .card').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  await completeKnownPair(page);
  await expect.poll(async () => (await page.locator('#bossAbilityTitle').textContent()) || '', { timeout: 6000 }).toContain('PLÄTZE GETAUSCHT');
  const afterSwap = await page.locator('#grid .card').evaluateAll(nodes => nodes.map(node => node.dataset.id));
  expect(afterSwap).not.toEqual(beforeSwap);
  await expect(page.locator('#grid .card.flipped')).toHaveCount(0);

  // Existing Tula ability must remain intact.
  await page.locator('#restartBtn').tap();
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  await page.waitForTimeout(1500);
  await expect(page.locator('#peekBtn')).toBeDisabled();

  // Boss 2 — Brax: bomb transfers one battle point without changing pair progress.
  await startBoss(page, 2);
  await completeKnownPair(page);
  await completeKnownPair(page);
  await completeKnownPair(page);
  await expect(page.locator('#grid .card.bomb-armed')).toHaveCount(1, { timeout: 6000 });
  const progressBeforeBomb = await page.locator('#progress').textContent();
  const playerBeforeBomb = Number(await page.locator('#playerScore').textContent());
  const aiBeforeBomb = Number(await page.locator('#aiScore').textContent());
  await page.locator('#grid .card.bomb-armed').tap();
  await expect.poll(async () => Number(await page.locator('#aiScore').textContent()), { timeout: 3000 }).toBe(aiBeforeBomb + 1);
  await expect.poll(async () => Number(await page.locator('#playerScore').textContent()), { timeout: 3000 }).toBe(Math.max(0, playerBeforeBomb - 1));
  expect(await page.locator('#progress').textContent()).toBe(progressBeforeBomb);
  await expect(page.locator('#grid .card.flipped')).toHaveCount(1);

  // Boss 3 — Blackfinn: fog blocks player input for one attempt.
  await startBoss(page, 3);
  await completeKnownPair(page);
  await completeKnownPair(page);
  await expect.poll(async () => page.locator('#grid .card.fogged').count(), { timeout: 5000 }).toBeGreaterThan(0);
  const fogged = page.locator('#grid .card.fogged').first();
  await fogged.tap();
  await expect(fogged).not.toHaveClass(/flipped/);

  const selectable = page.locator('#grid .card:not(.matched):not(.fogged)');
  expect(await selectable.count()).toBeGreaterThanOrEqual(2);
  await selectable.nth(0).tap();
  await selectable.nth(1).tap();
  await expect.poll(async () => page.locator('#grid .card.fogged').count(), { timeout: 3500 }).toBe(0);

  const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(noHorizontalOverflow).toBeTruthy();
  expect(consoleErrors).toEqual([]);
});
