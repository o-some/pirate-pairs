import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';

async function waitForPlayer(page){
  await expect.poll(async()=>{
    const turn=(await page.locator('#turnPill').textContent())||'';
    const bannerClass=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
    const transient=await page.locator('#grid .card.boss-swap-a,#grid .card.boss-swap-b,#grid .card.corvin-shifting,#grid .card.bomb-targeting,#grid .card.chain-forming').count();
    const faceUp=await page.locator('#grid .card.flipped:not(.matched)').count();
    return turn==='DU BIST DRAN'&&!bannerClass.includes('show')&&transient===0&&faceUp===0;
  },{timeout:20000}).toBe(true);
}

async function gridIds(page){
  return page.locator('#grid .card').evaluateAll(nodes=>nodes.map(node=>node.dataset.id));
}

async function assertNoPageOverflow(page){
  const dimensions=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    scrollHeight:document.documentElement.scrollHeight,
    clientHeight:document.documentElement.clientHeight,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight+2);
}

async function runCoreGuideFlow(page){
  const consoleErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto(BASE,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);

  // First-start guide owns focus and isolates the existing game/intro beneath it.
  const startGuide=page.locator('#bossGuideStart');
  await expect(startGuide).toBeVisible();
  await expect(page.locator('#bossGuideTitle')).toHaveText('Jeder Boss spielt anders');
  await expect(page.locator('#bossGuideContinue')).toBeFocused();
  expect(await page.locator('#app').evaluate(el=>el.inert)).toBe(true);
  expect(await page.locator('#intro').evaluate(el=>el.inert)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.locator('#bossGuideContinue')).toBeFocused();
  await page.locator('#bossGuideContinue').click();
  await expect(startGuide).toHaveCount(0,{timeout:2000});
  expect(await page.locator('#app').evaluate(el=>el.inert)).toBe(false);
  expect(await page.locator('#intro').evaluate(el=>el.inert)).toBe(false);

  // Existing boss intro is now the explicit per-boss ability explainer.
  await expect(page.locator('#intro')).toBeVisible();
  await expect(page.locator('#intro .boss-power small')).toHaveText('SO SPIELT DIESER BOSS');
  await expect(page.locator('#bossPowerName')).toHaveText('Decktausch');
  await expect(page.locator('#bossPowerCopy')).toContainText('Kai');
  await expect(page.locator('#startBtn')).toHaveText('OK · DUELL STARTEN');
  await expect(page.locator('#startBtn')).toBeFocused();

  // Bottom area is now the 10-boss route + the original Muschelblick button.
  await expect(page.locator('.skillbar .skill-copy')).toHaveCount(0);
  await expect(page.locator('#bossRoadmap .boss-road-item')).toHaveCount(10);
  await expect(page.locator('#bossRoadmap .boss-road-item.current')).toHaveCount(1);
  await expect(page.locator('#bossRoadmap .boss-road-item[data-boss-id="1"]')).toHaveAttribute('aria-current','step');
  expect(await page.locator('#bossRoadmap .boss-road-item').evaluateAll(nodes=>nodes.every(node=>node.tagName==='BUTTON'&&!node.hasAttribute('role')))).toBe(true);
  await expect(page.locator('#peekBtn')).toHaveAttribute('aria-label','Muschelblick einmal einsetzen');

  // Preview a future boss; current duel, URL and deck must remain unchanged.
  const urlBefore=page.url();
  const bossBefore=(await page.locator('#bossName').textContent())||'';
  const idsBefore=await gridIds(page);
  await page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]').click();
  await expect(page.locator('#bossPreview')).toBeVisible();
  await expect(page.locator('#bossPreviewName')).toHaveText('Piratenkönig Varkos');
  await expect(page.locator('#bossPreviewPower')).toHaveText('Königliches Chaos');
  await expect(page.locator('#bossPreviewCopy')).toContainText('PHASE I');
  await expect(page.locator('.boss-preview-close-main')).toBeFocused();
  expect(await page.locator('#app').evaluate(el=>el.inert)).toBe(true);
  expect(page.url()).toBe(urlBefore);
  expect((await page.locator('#bossName').textContent())||'').toBe(bossBefore);
  expect(await gridIds(page)).toEqual(idsBefore);
  await page.keyboard.press('Escape');
  await expect(page.locator('#bossPreview')).toHaveClass(/hidden/);
  expect(await page.locator('#app').evaluate(el=>el.inert)).toBe(false);
  expect(await gridIds(page)).toEqual(idsBefore);

  // Start real gameplay. The original B04 listener on the moved Muschelblick button must still work.
  await page.locator('#startBtn').click();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await waitForPlayer(page);
  await page.locator('#peekBtn').click();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2,{timeout:1500});
  await page.waitForTimeout(1500);
  await expect(page.locator('#grid .card.peek')).toHaveCount(0);
  await expect(page.locator('#peekBtn')).toBeDisabled();
  await expect(page.locator('#peekBtn')).toHaveText('VERBRAUCHT');

  // Normal card flip still starts immediately after the UI-only dock rewrite.
  const first=page.locator('#grid .card:not(.matched)').first();
  await first.click();
  await expect(first).toHaveClass(/flipped/,{timeout:700});

  await assertNoPageOverflow(page);
  expect(consoleErrors).toEqual([]);
}

test.describe('Boss Guide B05 — iPhone 390×844 touch',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('start guide, boss explainer, roadmap preview and gameplay regression',async({page})=>{
    await runCoreGuideFlow(page);
  });
});

test.describe('Boss Guide B05 — compact 375×667 touch',()=>{
  test.use({viewport:{width:375,height:667},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  test('remains compact and functional',async({page})=>{
    await runCoreGuideFlow(page);
  });
});

test.describe('Boss Guide B05 — direct later-boss route',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('centers the current boss when opened with ?boss=10',async({page})=>{
    await page.goto(`${BASE}?boss=10`,{waitUntil:'networkidle'});
    await expect(page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]')).toHaveAttribute('aria-current','step');
    await expect.poll(async()=>page.locator('#bossRoadmap').evaluate((rail)=>{
      const current=rail.querySelector('.boss-road-item.current');
      if(!current)return false;
      const r=rail.getBoundingClientRect(),c=current.getBoundingClientRect();
      return c.left>=r.left-1&&c.right<=r.right+1;
    }),{timeout:4000}).toBe(true);
    await expect(page.locator('#bossName')).toContainText('Varkos');
  });
});
