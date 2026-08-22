import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';

async function installDeterministicRng(page){
  await page.addInitScript(()=>{Math.random=()=>0.999;});
}

function trackErrors(page){
  const consoleErrors=[];
  const pageErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('pageerror',error=>pageErrors.push(error.message));
  return {consoleErrors,pageErrors};
}

async function gotoGame(page,{boss=1,stage='A1',start=false}={}){
  await page.goto(`${BASE}?boss=${boss}&stage=${stage}`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('body')).toHaveAttribute('data-language-stage',stage);
  await expect(page.locator('#bossGuideStart')).toBeVisible();
  await page.locator('#bossGuideContinue').click();
  await expect(page.locator('#intro')).toBeVisible();
  if(start){
    await page.locator('#startBtn').click();
    await expect(page.locator('#intro')).toHaveClass(/hidden/);
    await waitReady(page);
  }
}

async function waitReady(page,timeout=30000){
  await expect.poll(async()=>{
    const turn=((await page.locator('#turnPill').textContent())||'').trim();
    const bannerClass=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
    const splashClass=(await page.locator('#varkosPhaseSplash').getAttribute('class'))||'';
    const transient=await page.locator('#grid .card.boss-swap-a,#grid .card.boss-swap-b,#grid .card.corvin-shifting,#grid .card.bomb-targeting,#grid .card.chain-forming').count();
    const open=await page.locator('#grid .card.flipped:not(.matched)').count();
    const resultClass=(await page.locator('#result').getAttribute('class'))||'';
    const engineLocked=await page.locator('#peekBtn').isDisabled();
    return turn==='DU BIST DRAN'&&!engineLocked&&!bannerClass.includes('show')&&!splashClass.includes('show')&&transient===0&&open===0&&resultClass.includes('hidden');
  },{timeout}).toBe(true);
}

async function progressCount(page){
  const text=(await page.locator('#progress').textContent())||'0 / 8';
  return Number(text.split('/')[0].trim())||0;
}

async function availableInfo(page){
  return page.locator('#grid .card').evaluateAll(nodes=>nodes.map(node=>({
    index:Number(node.dataset.index),
    id:node.dataset.id||'',
    matched:node.classList.contains('matched'),
    flipped:node.classList.contains('flipped'),
    disabled:node.getAttribute('aria-disabled')==='true',
    word:node.querySelector('.word')?.textContent||'',
  })));
}

async function findAvailablePair(page){
  const info=await availableInfo(page);
  const groups=new Map();
  for(const card of info){
    if(card.matched||card.flipped||card.disabled)continue;
    const key=card.id.replace(/-(source|target)$/,'');
    const list=groups.get(key)||[];
    list.push(card.index);
    groups.set(key,list);
  }
  for(const list of groups.values())if(list.length>=2)return list.slice(0,2);
  return null;
}

async function findMismatch(page){
  const cards=(await availableInfo(page)).filter(card=>!card.matched&&!card.flipped&&!card.disabled);
  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
    const a=cards[i].id.replace(/-(source|target)$/,'');
    const b=cards[j].id.replace(/-(source|target)$/,'');
    if(a!==b)return [cards[i].index,cards[j].index];
  }
  return null;
}

async function playPair(page){
  const before=await progressCount(page);
  const pair=await findAvailablePair(page);
  if(!pair)return false;
  const first=page.locator(`#grid .card[data-index="${pair[0]}"]`);
  const second=page.locator(`#grid .card[data-index="${pair[1]}"]`);
  await first.click();
  await expect(first).toHaveClass(/flipped/,{timeout:6000});
  await second.click();
  await expect.poll(async()=>{
    const resultClass=(await page.locator('#result').getAttribute('class'))||'';
    return (await progressCount(page))>before||!resultClass.includes('hidden');
  },{timeout:18000}).toBe(true);
  if(await progressCount(page)<8)await waitReady(page);
  return true;
}

async function playMismatch(page,{waitForReady=true}={}){
  const pair=await findMismatch(page);
  if(!pair)return false;
  const first=page.locator(`#grid .card[data-index="${pair[0]}"]`);
  const second=page.locator(`#grid .card[data-index="${pair[1]}"]`);
  await first.click();
  await expect(first).toHaveClass(/flipped/,{timeout:5000});
  await second.click();
  await expect(second).toHaveClass(/flipped/,{timeout:5000});
  if(waitForReady)await waitReady(page,35000);
  return true;
}

async function finishVarkos(page){
  let noOptionRetries=0;
  for(let turn=0;turn<24;turn++){
    const resultClass=(await page.locator('#result').getAttribute('class'))||'';
    if(!resultClass.includes('hidden'))break;
    await waitReady(page,35000);
    if(await playPair(page)){noOptionRetries=0;continue;}
    if(await playMismatch(page)){noOptionRetries=0;continue;}
    noOptionRetries++;
    if(noOptionRetries>4){
      const state=await availableInfo(page);
      throw new Error(`No playable Varkos cards after retries: ${JSON.stringify(state)}`);
    }
    await page.waitForTimeout(650);
  }
  await expect(page.locator('#result')).not.toHaveClass(/hidden/,{timeout:25000});
  await expect(page.locator('#result')).toHaveClass(/stage-complete/,{timeout:6000});
}

async function assertNoPageOverflow(page){
  const dimensions=await page.evaluate(()=>({
    sw:document.documentElement.scrollWidth,
    cw:document.documentElement.clientWidth,
    sh:document.documentElement.scrollHeight,
    ch:document.documentElement.clientHeight,
  }));
  expect(dimensions.sw).toBeLessThanOrEqual(dimensions.cw+1);
  expect(dimensions.sh).toBeLessThanOrEqual(dimensions.ch+2);
}

test.describe('B07 stage data and compact mobile layout',()=>{
  test.use({viewport:{width:375,height:667},deviceScaleFactor:2,isMobile:true,hasTouch:true});

  test('A1→C2 tiers use different decks and C2 remains compact',async({page})=>{
    const errors=trackErrors(page);
    await installDeterministicRng(page);

    await page.goto(`${BASE}?boss=1&stage=A1`,{waitUntil:'networkidle'});
    const a1=await page.locator('#game-data').evaluate(node=>JSON.parse(node.textContent||'{}'));
    const a1Boss=await page.locator('#boss-data').evaluate(node=>JSON.parse(node.textContent||'{}').bosses[0]);
    expect(a1.stage).toBe('A1');
    expect(a1.stageOrder).toEqual(['A1','A2','B1','B2','C1','C2']);
    expect(a1.vocabulary.some(item=>item.source==='Schiff'&&item.target==='ship')).toBe(true);

    await page.goto(`${BASE}?boss=1&stage=A2`,{waitUntil:'networkidle'});
    const a2=await page.locator('#game-data').evaluate(node=>JSON.parse(node.textContent||'{}'));
    const a2Boss=await page.locator('#boss-data').evaluate(node=>JSON.parse(node.textContent||'{}').bosses[0]);
    expect(a2.vocabulary.some(item=>item.source==='Bahnhof'&&item.target==='station')).toBe(true);
    expect(a2Boss.memoryStrength).toBeGreaterThan(a1Boss.memoryStrength);
    expect(a2Boss.thinkingDelay).toBeLessThan(a1Boss.thinkingDelay);

    await gotoGame(page,{boss:1,stage:'C2',start:true});
    const c2=await page.locator('#game-data').evaluate(node=>JSON.parse(node.textContent||'{}'));
    expect(c2.vocabulary.some(item=>item.source==='Mehrdeutigkeit'&&item.target==='ambiguity')).toBe(true);
    await expect(page.locator('.language-stage-chip')).toHaveText('STUFE C2');
    const helpText=await page.locator('#help').textContent();
    expect(helpText||'').not.toContain('Muschelblick');
    expect(await playPair(page)).toBe(true);
    await assertNoPageOverflow(page);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
});

test.describe('B07 boss clarity',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

  test('Brax uses an explosive TNT barrel and current boss is explicit below',async({page})=>{
    test.setTimeout(120000);
    const errors=trackErrors(page);
    await installDeterministicRng(page);
    await gotoGame(page,{boss:2,stage:'A1',start:true});

    const current=page.locator('#bossRoadmap .boss-road-item[data-boss-id="2"]');
    await expect(current).toHaveClass(/b07-current-boss/);
    await expect(page.locator('.boss-roadmap-head span')).toContainText('AKTUELL: BRAX');
    const bg=await current.locator('.boss-road-num').evaluate(el=>getComputedStyle(el).backgroundImage);
    expect(bg).toContain('boss-02-kapitaen-brax.png');
    expect(bg).toContain('boss-fallback.svg');

    for(let i=0;i<3;i++)expect(await playPair(page)).toBe(true);
    await expect(page.locator('#grid .card.bomb-armed')).toHaveCount(1,{timeout:8000});
    const barrel=page.locator('#grid .card.bomb-armed').first();
    const visual=await barrel.evaluate(card=>{
      const marker=card.querySelector('.boss-marker');
      return {
        markerWidth:marker?.getBoundingClientRect().width||0,
        tnt:getComputedStyle(marker,'::before').content,
        cardLabel:getComputedStyle(card,'::after').content,
      };
    });
    expect(visual.markerWidth).toBeGreaterThan(20);
    expect(visual.tnt).toContain('TNT');
    expect(visual.cardLabel).toContain('EXPLOSIVES FASS');
    await assertNoPageOverflow(page);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  test('Vargas shows 2 attempts and a clear one-attempt last chance',async({page})=>{
    test.setTimeout(120000);
    const errors=trackErrors(page);
    await installDeterministicRng(page);
    await gotoGame(page,{boss:5,stage:'A1',start:true});

    for(let i=0;i<3;i++)expect(await playPair(page)).toBe(true);
    await expect(page.locator('body')).toHaveClass(/tribute-active/,{timeout:8000});
    await expect(page.locator('#tributeCounter')).toHaveClass(/show/);
    await expect(page.locator('#tributeCounter b')).toHaveText('2 VERSUCHE');

    expect(await playMismatch(page,{waitForReady:false})).toBe(true);
    await expect(page.locator('#tributeCounter')).toHaveClass(/last-chance/,{timeout:5000});
    await expect(page.locator('#tributeCounter b')).toContainText('1 VERSUCH');
    await assertNoPageOverflow(page);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
});

test.describe('B07 epic Varkos and progression',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

  test('A1 Varkos explains phases, wins epically and restarts at A2 Boss 1',async({page})=>{
    test.setTimeout(240000);
    const errors=trackErrors(page);
    await installDeterministicRng(page);
    await gotoGame(page,{boss:10,stage:'A1',start:false});

    await expect(page.locator('#intro')).toHaveClass(/varkos-intro-epic/);
    await expect(page.locator('#introTitle')).toHaveText('DER ENDKAMPF BEGINNT');
    await expect(page.locator('.varkos-phase-step')).toHaveCount(3);
    await expect(page.locator('.varkos-phase-step[data-phase="1"]')).toContainText('KARTENTAUSCH');
    await expect(page.locator('.varkos-phase-step[data-phase="2"]')).toContainText('FÄSSER & KETTEN');
    await expect(page.locator('.varkos-phase-step[data-phase="3"]')).toContainText('KÖNIGLICHES CHAOS');
    await expect(page.locator('#bossRoadmap .boss-road-item[data-boss-id="10"]')).toHaveClass(/b07-current-boss/);
    await expect(page.locator('.boss-roadmap-head span')).toContainText('AKTUELL: VARKOS');

    await page.locator('#startBtn').click();
    await expect(page.locator('#intro')).toHaveClass(/hidden/);
    await expect(page.locator('#varkosPhaseSplash')).toHaveClass(/show/,{timeout:1000});
    await expect(page.locator('#varkosPhaseSplash strong')).toHaveText('PHASE I');
    await waitReady(page,30000);

    await finishVarkos(page);
    await expect(page.locator('#resultTitle')).toHaveText('WOW! DU HAST ES GESCHAFFT!');
    await expect(page.locator('.stage-victory-panel')).toContainText('A1 → A2');
    await expect(page.locator('#againBtn')).toHaveText('WEITER MIT STUFE A2');
    await expect(page.locator('#resultModalNote')).toContainText('NÄCHSTE STUFE A2');
    await assertNoPageOverflow(page);

    await page.locator('#againBtn').click();
    await page.waitForURL(url=>url.searchParams.get('stage')==='A2'&&url.searchParams.get('boss')==='1',{timeout:15000});
    await expect(page.locator('body')).toHaveAttribute('data-language-stage','A2');
    await expect(page.locator('#bossName')).toContainText('Pirat Kai');
    await expect(page.locator('#playerScore')).toHaveText('0');
    await expect(page.locator('#aiScore')).toHaveText('0');
    await expect(page.locator('#progress')).toHaveText('0 / 8');
    const game=await page.locator('#game-data').evaluate(node=>JSON.parse(node.textContent||'{}'));
    expect(game.vocabulary.some(item=>item.source==='Bahnhof')).toBe(true);
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  test('C2 completion is the mastery endpoint and can start a new A1 journey',async({page})=>{
    test.setTimeout(90000);
    const errors=trackErrors(page);
    await installDeterministicRng(page);
    await page.goto(`${BASE}?boss=10&stage=C2`,{waitUntil:'networkidle'});
    await expect(page.locator('#grid .card')).toHaveCount(16);
    await expect(page.locator('body')).toHaveAttribute('data-language-stage','C2');
    await expect(page.locator('#bossGuideStart')).toBeVisible();
    await page.locator('#bossGuideContinue').click();
    await expect(page.locator('#bossGuideStart')).toHaveCount(0,{timeout:3000});

    await page.evaluate(()=>{
      document.getElementById('resultTag').textContent='♛ PIRATENKÖNIG BESIEGT';
      document.getElementById('result').classList.remove('hidden');
    });
    await expect(page.locator('#result')).toHaveClass(/stage-complete/,{timeout:4000});
    await expect(page.locator('#resultTitle')).toHaveText('WOW! DU HAST ES GESCHAFFT!');
    await expect(page.locator('.stage-victory-panel')).toContainText('C2 · MEISTERSTUFE');
    await expect(page.locator('#resultCopy')).toContainText('alle sechs Schwierigkeitsstufen');
    await expect(page.locator('#againBtn')).toHaveText('NEUE REISE · A1');

    await page.locator('#againBtn').click();
    await page.waitForURL(url=>url.searchParams.get('stage')==='A1'&&url.searchParams.get('boss')==='1',{timeout:15000});
    await expect(page.locator('body')).toHaveAttribute('data-language-stage','A1');
    await expect(page.locator('#bossName')).toContainText('Pirat Kai');
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
});
