import { chromium, webkit } from '@playwright/test';

const base='https://o-some.github.io/pirate-pairs/?boss=10&stage=A1&b08live=1';

async function runEngine(name,browserType){
  const browser=await browserType.launch();
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`);});
  page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));

  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bossGuideContinue').waitFor({state:'visible',timeout:12000});
  await page.locator('#bossGuideContinue').tap();
  await page.waitForTimeout(360);

  const unlocked=await page.evaluate(()=>({
    marker:document.body.dataset.inputSafety,
    introInert:document.getElementById('intro')?.hasAttribute('inert'),
    appInert:document.getElementById('app')?.hasAttribute('inert'),
    startDisabled:document.getElementById('startBtn')?.disabled,
    introResetVisible:!!document.getElementById('b08IntroReset')&&!document.getElementById('b08IntroReset').hidden,
  }));
  if(unlocked.marker!=='b08'||unlocked.introInert||unlocked.appInert||unlocked.startDisabled||!unlocked.introResetVisible){
    throw new Error(`${name}: public intro still locked ${JSON.stringify(unlocked)}`);
  }

  // Exact reported start path.
  await page.locator('#startBtn').tap();
  await page.locator('#intro').waitFor({state:'hidden',timeout:7000});
  await page.waitForTimeout(1900);
  const first=page.locator('#grid .card').first();
  await first.tap();
  await page.waitForTimeout(140);
  if(!(await first.evaluate(el=>el.classList.contains('flipped'))))throw new Error(`${name}: public Varkos start did not enable cards`);

  // Existing top-right game reset after start.
  await page.locator('#restartBtn').tap();
  await page.waitForTimeout(220);
  const reset=await page.evaluate(()=>({
    progress:document.getElementById('progress')?.textContent?.trim(),
    player:document.getElementById('playerScore')?.textContent?.trim(),
    ai:document.getElementById('aiScore')?.textContent?.trim(),
    flipped:document.querySelectorAll('#grid .card.flipped').length,
  }));
  if(reset.progress!=='0 / 8'||reset.player!=='0'||reset.ai!=='0'||reset.flipped!==0)throw new Error(`${name}: public header reset failed ${JSON.stringify(reset)}`);

  // Guaranteed reset before fight start.
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bossGuideContinue').tap();
  await page.waitForTimeout(360);
  await page.locator('#b08IntroReset').waitFor({state:'visible'});
  await page.locator('#b08IntroReset').tap();
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#bossGuideContinue').waitFor({state:'visible',timeout:7000});

  if(errors.length)throw new Error(`${name}: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: PUBLIC start + card input + both reset paths OK`);
}

await runEngine('Chromium',chromium);
await runEngine('WebKit',webkit);
console.log('LIVE B08 iPhone input smoke passed in Chromium and WebKit');
