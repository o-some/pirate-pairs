import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';
const bossFiles=[
  'boss-01-pirat-kai.png','boss-02-kapitaen-brax.png','boss-03-blackfinn.png',
  'boss-04-alt-kapitaen-roderick.png','boss-05-piratenbaron-vargas.png','boss-06-kapitaen-ironhook.png',
  'boss-07-admiral-thorne.png','boss-08-kartenmeister-corvin.png','boss-09-schattenfuerst-azrak.png',
  'boss-10-piratenkoenig-varkos.png',
];

async function openGame(page,url=BASE){
  await page.goto(url,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('#bossGuideStart')).toBeVisible();
  await page.locator('#bossGuideContinue').click();
  await expect(page.locator('#intro')).toBeVisible();
  await page.locator('#startBtn').click();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
}

async function verify(page,{compact=false}={}){
  await expect(page.locator('#peekBtn')).toBeHidden();
  await expect(page.locator('#bossRoadmap .boss-road-item')).toHaveCount(10);

  const columns=await page.locator('.skillbar.boss-dock').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean));
  expect(columns).toHaveLength(1);

  const backgrounds=await page.locator('#bossRoadmap .boss-road-num').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundImage));
  backgrounds.forEach((bg,index)=>{
    expect(bg).toContain(bossFiles[index]);
    expect(bg).toContain('927afa882df75ab0c74c426d822af89767b5ec38');
  });

  const sizes=await page.locator('#bossRoadmap .boss-road-item').first().evaluate(el=>({
    item:el.getBoundingClientRect().width,
    portrait:el.querySelector('.boss-road-num')?.getBoundingClientRect().width||0,
  }));
  if(compact){
    expect(sizes.item).toBeLessThanOrEqual(55);
    expect(sizes.portrait).toBeGreaterThanOrEqual(33);
    expect(sizes.portrait).toBeLessThanOrEqual(36);
  }else{
    expect(sizes.item).toBeGreaterThanOrEqual(70);
    expect(sizes.portrait).toBeGreaterThanOrEqual(52);
  }

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

  const first=page.locator('#grid .card:not(.matched)').first();
  await first.click();
  await expect(first).toHaveClass(/flipped/,{timeout:800});

  const overflow=await page.evaluate(()=>({
    horizontal:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,
    vertical:document.documentElement.scrollHeight<=document.documentElement.clientHeight+2,
  }));
  expect(overflow.horizontal).toBe(true);
  expect(overflow.vertical).toBe(true);
}

for(const config of [
  {name:'390x844',viewport:{width:390,height:844},deviceScaleFactor:3,compact:false},
  {name:'375x667',viewport:{width:375,height:667},deviceScaleFactor:2,compact:true},
]){
  test.describe(`Boss Portrait Dock B06 — ${config.name}`,()=>{
    test.use({viewport:config.viewport,deviceScaleFactor:config.deviceScaleFactor,isMobile:true,hasTouch:true});
    test('shows real portraits without the visible Muschelblick option',async({page})=>{
      test.setTimeout(120000);
      const consoleErrors=[],pageErrors=[],badBossAssets=[];const goodBossAssets=new Set();
      page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
      page.on('pageerror',e=>pageErrors.push(e.message));
      page.on('response',r=>{const u=r.url();if(!u.includes('/assets/bosses/boss-'))return;if(r.status()>=400)badBossAssets.push(`${r.status()} ${u}`);else goodBossAssets.add(u);});
      await openGame(page);
      await page.locator('#bossRoadmap').evaluate(rail=>{rail.scrollLeft=rail.scrollWidth;});
      await page.waitForTimeout(800);
      await verify(page,{compact:config.compact});
      expect(badBossAssets).toEqual([]);
      expect(goodBossAssets.size).toBeGreaterThanOrEqual(8);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
}

test.describe('Boss Portrait Dock B06 — direct final boss',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('keeps boss 10 centered and portrait-backed',async({page})=>{
    await page.goto(`${BASE}?boss=10`,{waitUntil:'networkidle'});
    const item=page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]');
    await expect(item).toHaveAttribute('aria-current','step');
    const bg=await item.locator('.boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(bg).toContain('boss-10-piratenkoenig-varkos.png');
    await expect.poll(()=>page.locator('#bossRoadmap').evaluate(rail=>{const current=rail.querySelector('.boss-road-item.current');if(!current)return false;const r=rail.getBoundingClientRect(),c=current.getBoundingClientRect();return c.left>=r.left-1&&c.right<=r.right+1;}),{timeout:5000}).toBe(true);
  });
});
