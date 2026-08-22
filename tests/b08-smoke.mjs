import { chromium, webkit } from '@playwright/test';

const base='http://localhost:4321/pirate-pairs/?boss=10&stage=A1';

async function openBoss(page){
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bossGuideContinue').waitFor({state:'visible'});
  await page.locator('#bossGuideContinue').click();
  await page.waitForTimeout(320);
}

async function assertUnlocked(page){
  const state=await page.evaluate(()=>({
    introInert:document.getElementById('intro')?.hasAttribute('inert'),
    appInert:document.getElementById('app')?.hasAttribute('inert'),
    inputSafety:document.body.dataset.inputSafety,
    startDisabled:document.getElementById('startBtn')?.disabled,
  }));
  if(state.inputSafety!=='b08')throw new Error(`B08 marker missing: ${JSON.stringify(state)}`);
  if(state.introInert||state.appInert||state.startDisabled)throw new Error(`UI remained locked: ${JSON.stringify(state)}`);
}

async function runEngine(name,browserType){
  const browser=await browserType.launch();
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`);});
  page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));

  // Exact user path: first guide -> Varkos intro -> start -> actual card input.
  await openBoss(page);
  await assertUnlocked(page);
  await page.locator('#startBtn').tap();
  await page.locator('#intro').waitFor({state:'hidden',timeout:5000});
  await page.waitForTimeout(1900);
  const first=page.locator('#grid .card').first();
  await first.tap();
  await page.waitForTimeout(120);
  if(!(await first.evaluate(el=>el.classList.contains('flipped'))))throw new Error(`${name}: first card did not flip after starting Varkos`);

  // Normal game reset must remain functional after the fight has started.
  await page.locator('#restartBtn').tap();
  await page.waitForTimeout(180);
  const resetState=await page.evaluate(()=>({
    progress:document.getElementById('progress')?.textContent?.trim(),
    player:document.getElementById('playerScore')?.textContent?.trim(),
    ai:document.getElementById('aiScore')?.textContent?.trim(),
    flipped:document.querySelectorAll('#grid .card.flipped').length,
  }));
  if(resetState.progress!=='0 / 8'||resetState.player!=='0'||resetState.ai!=='0'||resetState.flipped!==0)throw new Error(`${name}: header reset failed ${JSON.stringify(resetState)}`);

  // Intro reset lives outside inert-able containers and must work before duel start.
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#bossGuideContinue').click();
  await page.waitForTimeout(320);
  await page.locator('#b08IntroReset').waitFor({state:'visible'});
  const beforeNav=page.url();
  await page.locator('#b08IntroReset').tap();
  await page.waitForLoadState('domcontentloaded');
  if(page.url()!==beforeNav)throw new Error(`${name}: intro reset changed route unexpectedly`);
  await page.locator('#bossGuideContinue').waitFor({state:'visible'});

  if(errors.length)throw new Error(`${name}: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name}: start + card input + header reset + intro reset OK`);
}

await runEngine('Chromium',chromium);
await runEngine('WebKit',webkit);
console.log('B08 input smoke passed in Chromium and WebKit');
