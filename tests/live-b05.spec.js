import { test, expect } from '@playwright/test';

const LIVE='https://o-some.github.io/pirate-pairs/';

async function openDeployedB05(page,suffix=''){
  const deadline=Date.now()+120000;
  let lastError='';
  while(Date.now()<deadline){
    try{
      await page.goto(`${LIVE}${suffix}${suffix?'&':'?'}qa=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:25000});
      const hasGuide=await page.locator('#bossGuideStart').count();
      const hasCss=await page.locator('link[href*="pirate-pairs-boss-guide-b05.css"]').count();
      const hasJs=await page.locator('script[src*="pirate-pairs-boss-guide-b05.js"]').count();
      if(hasGuide===1&&hasCss===1&&hasJs===1)return;
      lastError=`guide=${hasGuide}, css=${hasCss}, js=${hasJs}`;
    }catch(error){lastError=String(error);}
    await page.waitForTimeout(8000);
  }
  throw new Error(`B05 not deployed within live-smoke window: ${lastError}`);
}

async function waitPlayer(page){
  await expect.poll(async()=>{
    const turn=(await page.locator('#turnPill').textContent())||'';
    const banner=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
    const faceUp=await page.locator('#grid .card.flipped:not(.matched)').count();
    return turn==='DU BIST DRAN'&&!banner.includes('show')&&faceUp===0;
  },{timeout:20000}).toBe(true);
}

async function assertNoPageOverflow(page){
  const d=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));
  expect(d.sw).toBeLessThanOrEqual(d.cw+1);
  expect(d.sh).toBeLessThanOrEqual(d.ch+2);
}

for(const viewport of [
  {name:'390x844',width:390,height:844,scale:3},
  {name:'375x667',width:375,height:667,scale:2},
]){
  test.describe(`live B05 ${viewport.name}`,()=>{
    test.use({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:viewport.scale,isMobile:true,hasTouch:true});
    test('guide, boss explanation, roadmap preview and gameplay are live',async({page})=>{
      test.setTimeout(210000);
      const errors=[];
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      page.on('pageerror',error=>errors.push(String(error)));

      await openDeployedB05(page);
      await expect(page.locator('#grid .card')).toHaveCount(16);
      await expect(page.locator('#bossGuideTitle')).toHaveText('Jeder Boss spielt anders');
      await expect(page.locator('#bossGuideContinue')).toBeFocused();
      expect(await page.locator('#app').evaluate(el=>el.inert)).toBe(true);
      await page.locator('#bossGuideContinue').click();
      await expect(page.locator('#bossGuideStart')).toHaveCount(0,{timeout:2500});

      await expect(page.locator('#intro')).toBeVisible();
      await expect(page.locator('#intro .boss-power small')).toHaveText('SO SPIELT DIESER BOSS');
      await expect(page.locator('#bossPowerName')).toHaveText('Decktausch');
      await expect(page.locator('#startBtn')).toHaveText('OK · DUELL STARTEN');
      await expect(page.locator('#bossRoadmap .boss-road-item')).toHaveCount(10);
      await expect(page.locator('.skillbar .skill-copy')).toHaveCount(0);

      await page.locator('#startBtn').click();
      await waitPlayer(page);
      const beforeUrl=page.url();
      const beforeBoss=(await page.locator('#bossName').textContent())||'';
      const beforeIds=await page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));

      const varkos=page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]');
      await varkos.click();
      await expect(page.locator('#bossPreview')).toBeVisible();
      await expect(page.locator('#bossPreviewName')).toHaveText('Piratenkönig Varkos');
      await expect(page.locator('#bossPreviewPower')).toHaveText('Königliches Chaos');
      await expect(page.locator('.boss-preview-close-main')).toBeFocused();
      expect((await page.locator('#bossName').textContent())||'').toBe(beforeBoss);
      expect(await page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).toEqual(beforeIds);
      expect(new URL(page.url()).pathname).toBe(new URL(beforeUrl).pathname);
      await page.keyboard.press('Escape');
      await expect(page.locator('#bossPreview')).toHaveClass(/hidden/);
      await expect(varkos).toBeFocused();

      await page.locator('#peekBtn').click();
      await expect(page.locator('#grid .card.peek')).toHaveCount(2,{timeout:1500});
      await page.waitForTimeout(1500);
      await expect(page.locator('#grid .card.peek')).toHaveCount(0);
      await expect(page.locator('#peekBtn')).toBeDisabled();

      const first=page.locator('#grid .card:not(.matched)').first();
      await first.click();
      await expect(first).toHaveClass(/flipped/,{timeout:700});
      await assertNoPageOverflow(page);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('live B05 direct final boss',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('boss 10 is selected and visible in the roadmap',async({page})=>{
    test.setTimeout(150000);
    await openDeployedB05(page,'?boss=10');
    await expect(page.locator('#bossName')).toContainText('Varkos');
    const current=page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]');
    await expect(current).toHaveAttribute('aria-current','step');
    await expect.poll(async()=>page.locator('#bossRoadmap').evaluate(rail=>{
      const item=rail.querySelector('.boss-road-item.current');
      if(!item)return false;
      const a=rail.getBoundingClientRect(),b=item.getBoundingClientRect();
      return b.left>=a.left-1&&b.right<=a.right+1;
    }),{timeout:5000}).toBe(true);
  });
});
