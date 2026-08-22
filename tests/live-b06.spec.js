import { test, expect } from '@playwright/test';

const LIVE='https://o-some.github.io/pirate-pairs/';

async function waitForB06(page,url=LIVE){
  for(let attempt=0;attempt<20;attempt++){
    await page.goto(`${url}${url.includes('?')?'&':'?'}qa=${Date.now()}`,{waitUntil:'domcontentloaded'});
    try{
      await expect(page.locator('#bossRoadmap .boss-road-item')).toHaveCount(10,{timeout:2500});
      if(await page.locator('#peekBtn').isHidden())return;
    }catch{}
    await page.waitForTimeout(2500);
  }
  throw new Error('B06 not visible on live GitHub Pages within deployment window');
}

async function dismissIntro(page){
  if(await page.locator('#bossGuideStart').isVisible().catch(()=>false))await page.locator('#bossGuideContinue').click();
  await expect(page.locator('#intro')).toBeVisible();
  await page.locator('#startBtn').click();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
}

async function assertNoOverflow(page){
  const value=await page.evaluate(()=>({h:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,v:document.documentElement.scrollHeight<=document.documentElement.clientHeight+2}));
  expect(value.h).toBe(true);expect(value.v).toBe(true);
}

for(const config of [
  {name:'390x844',viewport:{width:390,height:844},deviceScaleFactor:3,compact:false},
  {name:'375x667',viewport:{width:375,height:667},deviceScaleFactor:2,compact:true},
]){
  test.describe(`live B06 ${config.name}`,()=>{
    test.use({viewport:config.viewport,deviceScaleFactor:config.deviceScaleFactor,isMobile:true,hasTouch:true});
    test('portrait dock is deployed and functional',async({page})=>{
      test.setTimeout(120000);
      const consoleErrors=[],pageErrors=[],badBossAssets=[];const bossResponses=new Set();
      page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
      page.on('pageerror',e=>pageErrors.push(e.message));
      page.on('response',r=>{const u=r.url();if(!u.includes('/assets/bosses/boss-'))return;if(r.status()>=400)badBossAssets.push(`${r.status()} ${u}`);else bossResponses.add(u);});

      await waitForB06(page);
      await dismissIntro(page);
      await page.waitForTimeout(800);

      await expect(page.locator('#peekBtn')).toBeHidden();
      await expect(page.locator('#bossRoadmap .boss-road-item')).toHaveCount(10);
      const initialLoaded=await page.locator('#bossRoadmap .boss-road-item[data-portrait-loaded="1"]').count();
      expect(initialLoaded).toBeGreaterThan(0);
      expect(initialLoaded).toBeLessThan(10);
      const initialRequests=bossResponses.size;
      expect(initialRequests).toBeLessThan(10);

      const firstSize=await page.locator('#bossRoadmap .boss-road-item').first().evaluate(el=>({item:el.getBoundingClientRect().width,portrait:el.querySelector('.boss-road-num')?.getBoundingClientRect().width||0}));
      if(config.compact){expect(firstSize.item).toBeLessThanOrEqual(55);expect(firstSize.portrait).toBeGreaterThanOrEqual(33);}
      else{expect(firstSize.item).toBeGreaterThanOrEqual(70);expect(firstSize.portrait).toBeGreaterThanOrEqual(52);}

      await page.locator('#bossRoadmap').evaluate(rail=>{rail.scrollLeft=rail.scrollWidth;});
      const varkos=page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]');
      await expect.poll(()=>varkos.getAttribute('data-portrait-loaded'),{timeout:6000}).toBe('1');
      const bg=await varkos.locator('.boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
      expect(bg).toContain('boss-10-piratenkoenig-varkos.png');
      expect(bossResponses.size).toBeGreaterThan(initialRequests);

      const bossBefore=(await page.locator('#bossName').textContent())||'';
      const deckBefore=await page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
      await varkos.click();
      await expect(page.locator('#bossPreviewName')).toHaveText('Piratenkönig Varkos');
      expect((await page.locator('#bossName').textContent())||'').toBe(bossBefore);
      expect(await page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).toEqual(deckBefore);
      await page.locator('.boss-preview-close-main').click();

      const card=page.locator('#grid .card:not(.matched)').first();
      await card.click();
      await expect(card).toHaveClass(/flipped/,{timeout:800});
      await assertNoOverflow(page);
      expect(badBossAssets).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
}

test.describe('live B06 direct boss 10',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('Varkos is selected, visible and portrait-backed',async({page})=>{
    await waitForB06(page,`${LIVE}?boss=10`);
    const item=page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]');
    await expect(item).toHaveAttribute('aria-current','step');
    await expect.poll(()=>item.getAttribute('data-portrait-loaded'),{timeout:6000}).toBe('1');
    const bg=await item.locator('.boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(bg).toContain('boss-10-piratenkoenig-varkos.png');
    await expect.poll(()=>page.locator('#bossRoadmap').evaluate(rail=>{const current=rail.querySelector('.boss-road-item.current');if(!current)return false;const r=rail.getBoundingClientRect(),c=current.getBoundingClientRect();return c.left>=r.left-1&&c.right<=r.right+1;}),{timeout:6000}).toBe(true);
  });
});
