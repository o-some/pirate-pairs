import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';
test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

const pairKey=id=>String(id||'').replace(/-(source|target)$/,'');

async function waitPlayer(page){
  await expect.poll(async()=>{
    const turn=(await page.locator('#turnPill').textContent())||'';
    const peekDisabled=await page.locator('#peekBtn').isDisabled();
    const peekText=(await page.locator('#peekBtn').textContent())||'';
    const bannerClass=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
    const transient=await page.locator('#grid .card.boss-swap-a,#grid .card.boss-swap-b,#grid .card.corvin-shifting,#grid .card.bomb-targeting,#grid .card.chain-forming').count();
    const faceUp=await page.locator('#grid .card.flipped:not(.matched)').count();
    return turn==='DU BIST DRAN'&&!bannerClass.includes('show')&&transient===0&&faceUp===0&&(!peekDisabled||peekText.includes('VERBRAUCHT'));
  },{timeout:20000}).toBe(true);
}

async function startVarkos(page){
  await page.goto(`${BASE}?boss=10`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('#bossName')).toContainText('Varkos');
  await expect(page.locator('#introBossSprite')).toHaveAttribute('src',/boss-10-piratenkoenig-varkos\.png/);
  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await waitPlayer(page);
  await expect(page.locator('body')).toHaveAttribute('data-varkos-phase','1');
  await expect(page.locator('.varkos-phase-inline')).toContainText('PHASE I');
}

async function playableCards(page,{excludeBomb=false}={}){
  const selector='#grid .card:not(.matched):not(.fogged):not(.chained):not(.shadowed)';
  return page.locator(selector).evaluateAll((nodes,opts)=>nodes.map(n=>({
    id:n.dataset.id,
    idx:Number(n.dataset.index),
    flipped:n.classList.contains('flipped'),
    bomb:n.classList.contains('bomb-armed'),
  })).filter(x=>!x.flipped&&(!opts.excludeBomb||!x.bomb)),{excludeBomb});
}

async function findPair(page,options={}){
  const list=await playableCards(page,options),groups=new Map();
  for(const card of list){const key=pairKey(card.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(card);}
  return [...groups.values()].find(group=>group.length===2);
}

async function progress(page){
  const text=(await page.locator('#progress').textContent())||'0 / 8';
  return Number(text.split('/')[0].trim());
}

async function matchPair(page,{excludeBomb=false,waitForPlayer=true}={}){
  await waitPlayer(page);
  const p=await findPair(page,{excludeBomb});
  expect(p,'need a playable translation pair').toBeTruthy();
  const before=await progress(page);
  await page.locator(`#grid .card[data-index="${p[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${p[1].idx}"]`).tap();
  await expect.poll(()=>progress(page),{timeout:10000}).toBe(before+1);
  if(waitForPlayer&&before+1<8)await waitPlayer(page);
  return p;
}

async function ids(page){return page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));}

test('Boss Mechanics B04: Piratenkönig Varkos three-phase fight',async({page})=>{
  test.setTimeout(300000);
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  await startVarkos(page);

  // Phase I: after two completed player attempts, Varkos visibly swaps hidden cards.
  await matchPair(page);
  const phase1Before=await ids(page);
  await matchPair(page);
  const phase1After=await ids(page);
  expect(phase1After).not.toEqual(phase1Before);
  await expect(page.locator('body')).toHaveAttribute('data-varkos-phase','1');

  // Third secured pair starts Phase II and immediately arms the first Crown Bomb.
  await matchPair(page);
  await expect(page.locator('body')).toHaveAttribute('data-varkos-phase','2');
  await expect(page.locator('.varkos-phase-inline')).toContainText('PHASE II');
  await expect(page.locator('#grid .card.bomb-armed')).toHaveCount(1,{timeout:6000});
  await expect(page.locator('#grid .card.chained')).toHaveCount(0);

  // Open the bomb as part of its real pair: -1 then +1 for the pair, while Varkos gets +1.
  const bomb=page.locator('#grid .card.bomb-armed').first();
  const bombId=await bomb.getAttribute('data-id');
  const bombIdx=Number(await bomb.getAttribute('data-index'));
  const all=await playableCards(page);
  const mate=all.find(c=>c.idx!==bombIdx&&pairKey(c.id)===pairKey(bombId));
  expect(mate,'bomb card must still have its translation mate').toBeTruthy();
  const playerBeforeBomb=Number(await page.locator('#playerScore').textContent());
  const bossBeforeBomb=Number(await page.locator('#aiScore').textContent());
  const progressBeforeBomb=await progress(page);
  await page.locator(`#grid .card[data-index="${bombIdx}"]`).tap();
  await expect.poll(async()=>Number(await page.locator('#aiScore').textContent()),{timeout:5000}).toBe(bossBeforeBomb+1);
  await expect(page.locator(`#grid .card[data-index="${bombIdx}"]`)).toHaveClass(/flipped/,{timeout:5000});
  await page.locator(`#grid .card[data-index="${mate.idx}"]`).tap();
  await expect.poll(()=>progress(page),{timeout:10000}).toBe(progressBeforeBomb+1);
  await waitPlayer(page);
  expect(Number(await page.locator('#playerScore').textContent())).toBe(playerBeforeBomb);
  await expect(page.locator('#grid .card.bomb-armed')).toHaveCount(0);

  // Phase II alternates rather than stacking: next hazard is exactly two Crown Chains.
  await expect(page.locator('#grid .card.chained')).toHaveCount(2,{timeout:5000});
  const chained=page.locator('#grid .card.chained').first();
  await expect(chained).toHaveAttribute('aria-disabled','true');
  await chained.evaluate(el=>el.click());
  await expect(chained).not.toHaveClass(/flipped/);

  // Fifth secured pair starts Phase III and immediately performs a formation shift.
  const phase3Before=await ids(page);
  await matchPair(page);
  const phase3After=await ids(page);
  await expect(page.locator('body')).toHaveAttribute('data-varkos-phase','3');
  await expect(page.locator('.varkos-phase-inline')).toContainText('PHASE III');
  expect(phase3After).not.toEqual(phase3Before);
  await expect(page.locator('#grid .card.chained')).toHaveCount(0);
  await expect(page.locator('#grid .card.bomb-armed')).toHaveCount(0);

  // Restart during the next Phase III shift: stale async work must not mutate the fresh deck.
  const p=await findPair(page);
  expect(p,'need pair before restart race test').toBeTruthy();
  await page.locator(`#grid .card[data-index="${p[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${p[1].idx}"]`).tap();
  await expect.poll(async()=>await page.locator('#bossAbilityTitle').textContent(),{timeout:7000}).toMatch(/VARKOS ZERREISST/);
  await page.locator('#restartBtn').evaluate(el=>el.click());
  await waitPlayer(page);
  const restartedIds=await ids(page);
  await page.waitForTimeout(1900);
  expect(await ids(page)).toEqual(restartedIds);
  await expect(page.locator('body')).toHaveAttribute('data-varkos-phase','1');
  await expect(page.locator('#playerScore')).toHaveText('0');
  await expect(page.locator('#aiScore')).toHaveText('0');

  // Existing Tula skill still works after the final-boss restart path.
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  await page.waitForTimeout(1450);
  await expect(page.locator('#grid .card.peek')).toHaveCount(0);

  // Finish the full final fight with safe real pairs; avoid armed bombs rather than triggering them again.
  while(await progress(page)<8){
    const before=await progress(page);
    const finalAttempt=before===7;
    await matchPair(page,{excludeBomb:true,waitForPlayer:!finalAttempt});
  }
  await expect(page.locator('#result')).not.toHaveClass(/hidden/,{timeout:6000});
  await expect(page.locator('#resultTitle')).toContainText('Varkos');
  await expect(page.locator('#resultTag')).toContainText('PIRATENKÖNIG BESIEGT');
  await expect(page.locator('#resultModalNote')).toContainText('ALLE 10 BOSSE BESIEGT');

  const noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
  expect(noHorizontalOverflow).toBeTruthy();
  expect(errors).toEqual([]);
});
