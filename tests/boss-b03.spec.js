import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';
test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

async function waitPlayer(page){
  await expect.poll(async()=>({
    turn:(await page.locator('#turnPill').textContent())||'',
    peekDisabled:await page.locator('#peekBtn').isDisabled(),
  }),{timeout:20000}).toEqual({turn:'DU BIST DRAN',peekDisabled:false});
}

async function startBoss(page,id){
  await page.goto(`${BASE}?boss=${id}`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('#bossName')).toBeVisible();
  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await waitPlayer(page);
}

async function cardInfo(page,selector='#grid .card:not(.matched):not(.fogged):not(.chained):not(.shadowed)'){
  return page.locator(selector).evaluateAll(ns=>ns.map(n=>({
    id:n.dataset.id,
    idx:Number(n.dataset.index),
    flipped:n.classList.contains('flipped'),
  })).filter(x=>!x.flipped));
}

const pairKey=id=>id.replace(/-(source|target)$/,'');

async function findPair(page){
  const list=await cardInfo(page),m=new Map();
  for(const c of list){const k=pairKey(c.id);if(!m.has(k))m.set(k,[]);m.get(k).push(c);}
  return [...m.values()].find(a=>a.length===2);
}

async function match(page){
  await waitPlayer(page);
  const p=await findPair(page);expect(p,'need matching pair').toBeTruthy();
  const before=Number(await page.locator('#playerScore').textContent());
  await page.locator(`#grid .card[data-index="${p[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${p[1].idx}"]`).tap();
  await expect.poll(async()=>Number(await page.locator('#playerScore').textContent()),{timeout:8000}).toBeGreaterThan(before);
  await waitPlayer(page);
}

async function mismatch(page,used=null){
  await waitPlayer(page);
  const list=(await cardInfo(page)).filter(c=>!used?.has(c.id));let a,b;
  for(let i=0;i<list.length&&!b;i++){
    for(let j=i+1;j<list.length;j++){
      if(pairKey(list[i].id)!==pairKey(list[j].id)){a=list[i];b=list[j];break;}
    }
  }
  expect(a&&b,'need mismatch cards').toBeTruthy();
  used?.add(a.id);used?.add(b.id);
  await page.locator(`#grid .card[data-index="${a.idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${b.idx}"]`).tap();
  await waitPlayer(page);
}

async function triggerCorvinShift(page){
  for(let run=0;run<4;run++){
    await startBoss(page,8);
    const used=new Set();
    const before=await page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
    try{
      await mismatch(page,used);
      await mismatch(page,used);
      await mismatch(page,used);
    }catch{continue;}
    const after=await page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
    if(JSON.stringify(after)!==JSON.stringify(before))return {before,after};
  }
  throw new Error('Corvin did not find a shiftable complete hidden line across four fresh boards');
}

test('Boss Mechanics B03: Thorne, Corvin, Azrak',async({page})=>{
  test.setTimeout(300000);
  const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  // Boss 7 — Thorne: two visible cannon targets; target-card mismatch awards +1.
  await startBoss(page,7);
  await match(page);await match(page);await match(page);
  await expect(page.locator('#grid .card.cannon-target')).toHaveCount(2,{timeout:7000});
  const target=page.locator('#grid .card.cannon-target').first();
  const targetId=await target.getAttribute('data-id');
  const targetIdx=Number(await target.getAttribute('data-index'));
  const candidates=await cardInfo(page,'#grid .card:not(.matched):not(.cannon-target)');
  const other=candidates.find(c=>pairKey(c.id)!==pairKey(targetId||''));
  expect(other,'need nonmatching non-target card').toBeTruthy();
  const thorneBefore=Number(await page.locator('#aiScore').textContent());
  await page.locator(`#grid .card[data-index="${targetIdx}"]`).tap();
  await page.locator(`#grid .card[data-index="${other.idx}"]`).tap();
  await expect.poll(async()=>Number(await page.locator('#aiScore').textContent()),{timeout:3500}).toBeGreaterThan(thorneBefore);
  await waitPlayer(page);
  await expect(page.locator('#grid .card.cannon-target')).toHaveCount(0);

  // Boss 8 — Corvin: a complete row/column shift changes card positions.
  const corvin=await triggerCorvinShift(page);
  expect(corvin.after).not.toEqual(corvin.before);
  await expect(page.locator('#bossName')).toContainText('Corvin');

  // Boss 9 — Azrak: one blocked card, raw click cannot open it, shadow moves after first reveal.
  await startBoss(page,9);
  await match(page);await match(page);
  await expect(page.locator('#grid .card.shadowed')).toHaveCount(1,{timeout:7000});
  const shadow=page.locator('#grid .card.shadowed').first();
  const oldShadowIdx=await shadow.getAttribute('data-index');
  await expect(shadow).toHaveAttribute('aria-disabled','true');
  await shadow.evaluate(el=>el.click());
  await expect(shadow).not.toHaveClass(/flipped/);

  const first=(await cardInfo(page))[0];
  expect(first,'need first playable card').toBeTruthy();
  await page.locator(`#grid .card[data-index="${first.idx}"]`).tap();
  await expect(page.locator(`#grid .card[data-index="${first.idx}"]`)).toHaveClass(/flipped/);
  await expect(page.locator('#grid .card.shadowed')).toHaveCount(1,{timeout:4000});
  const newShadowIdx=await page.locator('#grid .card.shadowed').first().getAttribute('data-index');
  expect(newShadowIdx).not.toBe(oldShadowIdx);

  const second=(await cardInfo(page)).find(c=>c.idx!==first.idx);
  expect(second,'need second playable card').toBeTruthy();
  await page.locator(`#grid .card[data-index="${second.idx}"]`).tap();
  await waitPlayer(page);
  await expect(page.locator('#grid .card.shadowed')).toHaveCount(0,{timeout:5000});

  // Existing Tula skill and mobile layout remain intact.
  await page.locator('#restartBtn').tap();
  await waitPlayer(page);
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  const noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
  expect(noHorizontalOverflow).toBeTruthy();
  expect(errors).toEqual([]);
});
