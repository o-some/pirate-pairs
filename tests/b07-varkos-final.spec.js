import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';

test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

async function installDeterministicRng(page){
  await page.addInitScript(()=>{Math.random=()=>0.999;});
}

async function state(page){
  const resultClass=(await page.locator('#result').getAttribute('class'))||'';
  if(!resultClass.includes('hidden'))return 'result';
  const turn=((await page.locator('#turnPill').textContent())||'').trim();
  const locked=await page.locator('#peekBtn').isDisabled();
  const banner=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
  const splash=(await page.locator('#varkosPhaseSplash').getAttribute('class'))||'';
  const transient=await page.locator('#grid .card.boss-swap-a,#grid .card.boss-swap-b,#grid .card.corvin-shifting,#grid .card.bomb-targeting,#grid .card.chain-forming').count();
  const open=await page.locator('#grid .card.flipped:not(.matched)').count();
  return turn==='DU BIST DRAN'&&!locked&&!banner.includes('show')&&!splash.includes('show')&&transient===0&&open===0?'ready':'waiting';
}

async function waitState(page,timeout=35000){
  let latest='waiting';
  await expect.poll(async()=>{latest=await state(page);return latest;},{timeout}).toMatch(/^(ready|result)$/);
  return latest;
}

async function cards(page){
  return page.locator('#grid .card').evaluateAll(nodes=>nodes.map(node=>({
    index:Number(node.dataset.index),
    id:node.dataset.id||'',
    matched:node.classList.contains('matched'),
    flipped:node.classList.contains('flipped'),
    disabled:node.getAttribute('aria-disabled')==='true',
  })));
}

async function pairOrMismatch(page){
  const available=(await cards(page)).filter(card=>!card.matched&&!card.flipped&&!card.disabled);
  const groups=new Map();
  for(const card of available){
    const key=card.id.replace(/-(source|target)$/,'');
    const group=groups.get(key)||[];
    group.push(card.index);
    groups.set(key,group);
  }
  for(const group of groups.values())if(group.length>=2)return {kind:'pair',indexes:group.slice(0,2)};
  if(available.length>=2)return {kind:'mismatch',indexes:[available[0].index,available[1].index]};
  return null;
}

async function playAttempt(page,choice){
  const before=Number(((await page.locator('#progress').textContent())||'0').split('/')[0].trim())||0;
  const first=page.locator(`#grid .card[data-index="${choice.indexes[0]}"]`);
  const second=page.locator(`#grid .card[data-index="${choice.indexes[1]}"]`);
  await first.click();
  await expect(first).toHaveClass(/flipped/,{timeout:6000});
  await second.click();
  await expect(second).toHaveClass(/flipped|matched/,{timeout:6000});
  if(choice.kind==='pair'){
    await expect.poll(async()=>{
      if(await state(page)==='result')return true;
      const now=Number(((await page.locator('#progress').textContent())||'0').split('/')[0].trim())||0;
      return now>before;
    },{timeout:18000}).toBe(true);
  }
}

test('full A1 Varkos run reaches epic victory and clean A2 Boss 1 reset',async({page})=>{
  test.setTimeout(240000);
  const consoleErrors=[];
  const pageErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('pageerror',error=>pageErrors.push(error.message));
  await installDeterministicRng(page);

  await page.goto(`${BASE}?boss=10&stage=A1`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('#bossGuideStart')).toBeVisible();
  await page.locator('#bossGuideContinue').click();
  await expect(page.locator('#intro')).toHaveClass(/varkos-intro-epic/);
  await expect(page.locator('.varkos-phase-step')).toHaveCount(3);
  await expect(page.locator('.varkos-phase-step[data-phase="1"]')).toContainText('KARTENTAUSCH');
  await expect(page.locator('.varkos-phase-step[data-phase="2"]')).toContainText('FÄSSER & KETTEN');
  await expect(page.locator('.varkos-phase-step[data-phase="3"]')).toContainText('KÖNIGLICHES CHAOS');

  await page.locator('#startBtn').click();
  await expect(page.locator('#varkosPhaseSplash')).toHaveClass(/show/,{timeout:1000});
  await expect(page.locator('#varkosPhaseSplash strong')).toHaveText('PHASE I');

  let noChoice=0;
  for(let attempt=0;attempt<26;attempt++){
    const mode=await waitState(page,40000);
    if(mode==='result')break;
    const choice=await pairOrMismatch(page);
    if(!choice){
      noChoice++;
      if(noChoice>5)throw new Error(`Varkos has no playable cards: ${JSON.stringify(await cards(page))}`);
      await page.waitForTimeout(650);
      continue;
    }
    noChoice=0;
    await playAttempt(page,choice);
  }

  await expect(page.locator('#result')).not.toHaveClass(/hidden/,{timeout:25000});
  await expect(page.locator('#result')).toHaveClass(/stage-complete/,{timeout:6000});
  await expect(page.locator('#resultTitle')).toHaveText('WOW! DU HAST ES GESCHAFFT!');
  await expect(page.locator('.stage-victory-panel')).toContainText('A1 → A2');
  await expect(page.locator('#againBtn')).toHaveText('WEITER MIT STUFE A2');

  await page.locator('#againBtn').click();
  await page.waitForURL(url=>url.searchParams.get('stage')==='A2'&&url.searchParams.get('boss')==='1',{timeout:15000});
  await expect(page.locator('body')).toHaveAttribute('data-language-stage','A2');
  await expect(page.locator('#bossName')).toContainText('Pirat Kai');
  await expect(page.locator('#playerScore')).toHaveText('0');
  await expect(page.locator('#aiScore')).toHaveText('0');
  await expect(page.locator('#progress')).toHaveText('0 / 8');
  const game=await page.locator('#game-data').evaluate(node=>JSON.parse(node.textContent||'{}'));
  expect(game.vocabulary.some(item=>item.source==='Bahnhof')).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
