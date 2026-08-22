import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';
test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

async function waitPlayer(page){
  await expect.poll(async()=>({
    turn:(await page.locator('#turnPill').textContent())||'',
    peekDisabled:await page.locator('#peekBtn').isDisabled(),
  }),{timeout:18000}).toEqual({turn:'DU BIST DRAN',peekDisabled:false});
}
async function startBoss(page,id){
  await page.goto(`${BASE}?boss=${id}`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await waitPlayer(page);
}
async function cardInfo(page){return page.locator('#grid .card:not(.matched):not(.fogged):not(.chained)').evaluateAll(ns=>ns.map(n=>({id:n.dataset.id,idx:n.dataset.index,flipped:n.classList.contains('flipped')})).filter(x=>!x.flipped));}
async function pair(page){
  const list=await cardInfo(page),m=new Map();
  for(const c of list){const k=c.id.replace(/-(source|target)$/,'');if(!m.has(k))m.set(k,[]);m.get(k).push(c);}
  return [...m.values()].find(a=>a.length===2);
}
async function mismatch(page){
  await waitPlayer(page);
  const list=await cardInfo(page);let a,b;
  for(let i=0;i<list.length&&!b;i++)for(let j=i+1;j<list.length;j++){if(list[i].id.replace(/-(source|target)$/,'')!==list[j].id.replace(/-(source|target)$/,'')){a=list[i];b=list[j];break;}}
  expect(a&&b,'need mismatch cards').toBeTruthy();
  await page.locator(`#grid .card[data-index="${a.idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${b.idx}"]`).tap();
  await waitPlayer(page);
}
async function match(page){
  await waitPlayer(page);
  const p=await pair(page);expect(p,'need matching pair').toBeTruthy();
  const before=Number(await page.locator('#playerScore').textContent());
  await page.locator(`#grid .card[data-index="${p[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${p[1].idx}"]`).tap();
  await expect.poll(async()=>Number(await page.locator('#playerScore').textContent()),{timeout:7000}).toBeGreaterThan(before);
  await waitPlayer(page);
}

async function getRoderickCurse(page){
  for(let run=0;run<4;run++){
    await startBoss(page,4);
    await mismatch(page);
    await mismatch(page);
    await match(page);
    const cursed=page.locator('#grid .card.cursed-memory');
    try{
      await expect(cursed).toHaveCount(1,{timeout:5000});
      return cursed;
    }catch{
      // AI may consume all remembered hidden cards in a particular random run.
      // Restart with a fresh board; production behavior is intentionally unchanged.
    }
  }
  throw new Error('Roderick could not find a remembered hidden card across four fresh boards');
}

test('Boss Mechanics B02: Roderick, Vargas, Ironhook',async({page})=>{
  test.setTimeout(240000);
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  // Roderick: curse a genuinely remembered hidden card and visibly relocate another known card.
  const cursed=await getRoderickCurse(page);
  const idsBefore=await page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
  await cursed.tap();
  await expect.poll(async()=>await page.locator('#bossAbilityTitle').textContent(),{timeout:5000}).toMatch(/ERINNERUNG|FLUCH/);
  await expect.poll(async()=>page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id)),{timeout:5000}).not.toEqual(idsBefore);
  await waitPlayer(page);

  // Vargas: trigger tribute with 3 successful attempts, then satisfy it with a pair.
  await startBoss(page,5);
  await match(page);await match(page);await match(page);
  await expect(page.locator('body')).toHaveClass(/tribute-active/,{timeout:6000});
  const vargasBefore=Number(await page.locator('#aiScore').textContent());
  await match(page);
  await expect(page.locator('body')).not.toHaveClass(/tribute-active/);
  expect(Number(await page.locator('#aiScore').textContent())).toBe(vargasBefore);
  await expect(page.locator('#bossDuelSprite')).toHaveAttribute('data-fallback',/boss-fallback\.svg$/);

  // Ironhook: exactly 2 chained cards; raw click still cannot open them; two attempts release them.
  await startBoss(page,6);
  await match(page);await match(page);await match(page);
  await expect(page.locator('#grid .card.chained')).toHaveCount(2,{timeout:6000});
  const chained=page.locator('#grid .card.chained').first();
  await expect(chained).toHaveAttribute('aria-disabled','true');
  await chained.evaluate(el=>el.click());
  await expect(chained).not.toHaveClass(/flipped/);
  await match(page);await match(page);
  await expect(page.locator('#grid .card.chained')).toHaveCount(0,{timeout:5000});

  // Existing Tula skill and mobile layout remain intact.
  await page.locator('#restartBtn').tap();
  await waitPlayer(page);
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
  expect(noOverflow).toBeTruthy();
  expect(errors).toEqual([]);
});
