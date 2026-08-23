import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';

async function dismissGuide(page){
  const guide=page.locator('#bossGuideStart');
  await guide.waitFor({state:'visible'});
  await page.locator('#bossGuideContinue').click();
  await guide.waitFor({state:'detached'});
}

async function startFight(page){
  const intro=page.locator('#intro');
  await intro.waitFor({state:'visible'});
  await page.locator('#startBtn').click();
  await intro.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.getElementById('turnPill')?.textContent?.includes('DU BIST DRAN'));
}

async function assertFreshBoss(page,id,name,stage='A2'){
  await page.waitForFunction(expected=>Number(document.body.dataset.bossId)===expected,id);
  await page.locator('#intro').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('bossGuideStart'));
  assert.equal(await page.locator('#bossName').textContent(),name);
  assert.equal(await page.locator('#playerScore').textContent(),'0');
  assert.equal(await page.locator('#aiScore').textContent(),'0');
  assert.equal(await page.locator('#progress').textContent(),'0 / 8');
  assert.equal(await page.evaluate(()=>document.body.dataset.languageStage),stage);
  const url=new URL(page.url());
  assert.equal(url.searchParams.get('boss'),String(id));
  assert.equal(url.searchParams.get('stage'),stage);
  assert.equal(url.searchParams.has('bossPick'),false);
}

async function chooseBoss(page,id,name){
  const tile=page.locator(`.boss-road-item[data-boss-id="${id}"]`);
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  await page.locator('#bossPreview').waitFor({state:'visible'});
  assert.match(await page.locator('#bossPreviewName').textContent(),new RegExp(name,'i'));
  const play=page.locator('#bossPreviewPlay');
  assert.equal(await play.isVisible(),true);
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    play.click(),
  ]);
  await assertFreshBoss(page,id,name);
}

async function runFull(engine,label){
  const browser=await engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`);});

  await page.goto(`${BASE}?stage=A2&boss=1`,{waitUntil:'domcontentloaded'});
  await dismissGuide(page);
  await startFight(page);
  assert.equal(await page.locator('.boss-road-item').count(),10);
  assert.equal(await page.locator('link[data-b10-boss-select]').count(),1);
  assert.match(await page.locator('.boss-roadmap-head b').textContent(),/BOSS-AUSWAHL/);
  const kaiBg=await page.locator('.boss-road-item[data-boss-id="1"] .boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(kaiBg,/boss-01-pirat-kai\.png/);
  assert.doesNotMatch(kaiBg,/boss-fallback\.svg/);

  await chooseBoss(page,8,'Kartenmeister Corvin');
  await startFight(page);
  await chooseBoss(page,8,'Kartenmeister Corvin');
  await startFight(page);
  await chooseBoss(page,3,'Blackfinn');
  await startFight(page);

  // Revalidate the latest premium ability art in the actual runtime without
  // altering gameplay ownership: use the real visual state class on one card.
  await chooseBoss(page,2,'Kapitän Brax');
  await startFight(page);
  await page.locator('.card').first().evaluate(el=>el.classList.add('bomb-armed'));
  const barrel=await page.locator('.card').first().locator('.boss-marker').evaluate(el=>{
    const marker=el.getBoundingClientRect();
    const card=el.closest('.card')?.getBoundingClientRect();
    if(!card)return {image:getComputedStyle(el).backgroundImage,dx:999,dy:999};
    return {
      image:getComputedStyle(el).backgroundImage,
      dx:Math.abs((marker.left+marker.width/2)-(card.left+card.width/2)),
      dy:Math.abs((marker.top+marker.height/2)-(card.top+card.height/2)),
    };
  });
  assert.match(barrel.image,/powder-barrel\.svg/);
  assert.ok(barrel.dx<=1.5,`powder barrel is ${barrel.dx}px off horizontal center`);
  assert.ok(barrel.dy<=1.5,`powder barrel is ${barrel.dy}px off vertical center`);
  await page.locator('.card').first().evaluate(el=>el.classList.remove('bomb-armed'));

  await chooseBoss(page,10,'Piratenkönig Varkos');
  const varkosBg=await page.locator('.boss-road-item[data-boss-id="10"] .boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(varkosBg,/boss-10-piratenkoenig-varkos\.png/);
  assert.doesNotMatch(varkosBg,/boss-fallback\.svg/);
  await startFight(page);
  const first=page.locator('.card:not(.matched)').first();
  await first.click();
  await page.waitForTimeout(80);
  assert.equal(await first.evaluate(el=>el.classList.contains('flipped')),true);

  const overflow=await page.evaluate(()=>({
    horizontal:document.documentElement.scrollWidth-window.innerWidth,
    vertical:document.documentElement.scrollHeight-window.innerHeight,
  }));
  assert.ok(overflow.horizontal<=1,`horizontal overflow ${overflow.horizontal}px`);
  assert.ok(overflow.vertical<=4,`vertical overflow ${overflow.vertical}px`);

  await page.locator('#restartBtn').click();
  await page.locator('#intro').waitFor({state:'visible'});
  assert.equal(await page.locator('#playerScore').textContent(),'0');
  assert.equal(await page.locator('#aiScore').textContent(),'0');
  assert.equal(await page.locator('#progress').textContent(),'0 / 8');
  assert.deepEqual(errors,[]);
  console.log(`${label}: free select + repeat + back/forward + premium art + reset OK`);
  await browser.close();
}

async function runSmallPhone(){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`${BASE}?stage=A1&boss=1`,{waitUntil:'domcontentloaded'});
  await dismissGuide(page);
  await startFight(page);
  const overflow=await page.evaluate(()=>({x:document.documentElement.scrollWidth-window.innerWidth,y:document.documentElement.scrollHeight-window.innerHeight}));
  assert.ok(overflow.x<=1,`375px horizontal overflow ${overflow.x}`);
  assert.ok(overflow.y<=4,`375px vertical overflow ${overflow.y}`);
  const tile=page.locator('.boss-road-item[data-boss-id="10"]');
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  assert.equal(await page.locator('#bossPreviewPlay').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('Chromium 375x667: compact free-select UI OK');
  await browser.close();
}

await runFull(chromium,'Chromium 390x844');
await runFull(webkit,'WebKit 390x844');
await runSmallPhone();
console.log('B10 browser smoke passed');
