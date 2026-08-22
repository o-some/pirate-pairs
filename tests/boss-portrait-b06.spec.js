import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';

async function openGame(page,url=BASE){
  await page.goto(url,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('#bossGuideStart')).toBeVisible();
  await page.locator('#bossGuideContinue').click();
  await expect(page.locator('#intro')).toBeVisible();
  await page.locator('#startBtn').click();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
}

async function verifyLayout(page,{compact=false}={}){
  await expect(page.locator('#peekBtn')).toBeHidden();
  await expect(page.locator('#bossRoadmap .boss-road-item')).toHaveCount(10);
  const columns=await page.locator('.skillbar.boss-dock').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean));
  expect(columns).toHaveLength(1);

  const first=page.locator('#bossRoadmap .boss-road-item').first();
  const size=await first.evaluate(el=>({item:el.getBoundingClientRect().width,portrait:el.querySelector('.boss-road-num')?.getBoundingClientRect().width||0}));
  if(compact){expect(size.item).toBeLessThanOrEqual(55);expect(size.portrait).toBeGreaterThanOrEqual(33);expect(size.portrait).toBeLessThanOrEqual(36);}
  else{expect(size.item).toBeGreaterThanOrEqual(70);expect(size.portrait).toBeGreaterThanOrEqual(52);}

  const overflow=await page.evaluate(()=>({h:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,v:document.documentElement.scrollHeight<=document.documentElement.clientHeight+2}));
  expect(overflow.h).toBe(true);expect(overflow.v).toBe(true);
}

for(const config of [
  {name:'390x844',viewport:{width:390,height:844},deviceScaleFactor:3,compact:false},
  {name:'375x667',viewport:{width:375,height:667},deviceScaleFactor:2,compact:true},
]){
  test.describe(`Boss Portrait Dock B06 — ${config.name}`,()=>{
    test.use({viewport:config.viewport,deviceScaleFactor:config.deviceScaleFactor,isMobile:true,hasTouch:true});
    test('lazy-loads real portraits and keeps the dock compact',async({page})=>{
      test.setTimeout(120000);
      const consoleErrors=[],pageErrors=[],badBossAssets=[];const bossResponses=new Set();
      page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
      page.on('pageerror',e=>pageErrors.push(e.message));
      page.on('response',r=>{const u=r.url();if(!u.includes('/assets/bosses/boss-'))return;if(r.status()>=400)badBossAssets.push(`${r.status()} ${u}`);else bossResponses.add(u);});

      await openGame(page);
      await page.waitForTimeout(900);
      await verifyLayout(page,{compact:config.compact});

      const initiallyLoaded=await page.locator('#bossRoadmap .boss-road-item[data-portrait-loaded="1"]').count();
      expect(initiallyLoaded).toBeGreaterThan(0);
      expect(initiallyLoaded).toBeLessThan(10);
      const initialRequestCount=bossResponses.size;
      expect(initialRequestCount).toBeLessThan(10);

      const currentBg=await page.locator('#bossRoadmap .boss-road-item.current .boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
      expect(currentBg).toContain('/assets/bosses/boss-01-pirat-kai.png');

      await page.locator('#bossRoadmap').evaluate(rail=>{rail.scrollLeft=rail.scrollWidth;});
      await expect.poll(()=>page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]').getAttribute('data-portrait-loaded'),{timeout:5000}).toBe('1');
      const varkosBg=await page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"] .boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
      expect(varkosBg).toContain('boss-10-piratenkoenig-varkos.png');
      expect(bossResponses.size).toBeGreaterThan(initialRequestCount);

      const bossBefore=(await page.locator('#bossName').textContent())||'';
      const idsBefore=await page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
      const urlBefore=page.url();
      await page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]').click();
      await expect(page.locator('#bossPreview')).toBeVisible();
      await expect(page.locator('#bossPreviewName')).toHaveText('Piratenkönig Varkos');
      expect((await page.locator('#bossName').textContent())||'').toBe(bossBefore);
      expect(page.url()).toBe(urlBefore);
      expect(await page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).toEqual(idsBefore);
      await page.locator('.boss-preview-close-main').click();
      await expect(page.locator('#bossPreview')).toHaveClass(/hidden/);

      const card=page.locator('#grid .card:not(.matched)').first();
      await card.click();
      await expect(card).toHaveClass(/flipped/,{timeout:800});
      await verifyLayout(page,{compact:config.compact});

      expect(badBossAssets).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
}

test.describe('Boss Portrait Dock B06 — direct final boss',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('loads and centers Varkos without preloading the whole route',async({page})=>{
    await page.goto(`${BASE}?boss=10`,{waitUntil:'networkidle'});
    const item=page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]');
    await expect(item).toHaveAttribute('aria-current','step');
    await expect.poll(()=>item.getAttribute('data-portrait-loaded'),{timeout:5000}).toBe('1');
    const bg=await item.locator('.boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(bg).toContain('boss-10-piratenkoenig-varkos.png');
    await expect.poll(()=>page.locator('#bossRoadmap').evaluate(rail=>{const current=rail.querySelector('.boss-road-item.current');if(!current)return false;const r=rail.getBoundingClientRect(),c=current.getBoundingClientRect();return c.left>=r.left-1&&c.right<=r.right+1;}),{timeout:5000}).toBe(true);
  });
});
