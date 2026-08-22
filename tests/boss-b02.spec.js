import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';
test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});

async function startBoss(page,id){
  await page.goto(`${BASE}?boss=${id}`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await page.locator('#startBtn').tap();
  await expect(page.locator('#intro')).toHaveClass(/hidden/);
  await expect(page.locator('#turnPill')).toContainText('DU BIST DRAN');
}
async function waitPlayer(page){await expect.poll(async()=>await page.locator('#turnPill').textContent(),{timeout:18000}).toContain('DU BIST DRAN');}
async function cardInfo(page){return page.locator('#grid .card:not(.matched):not(.fogged):not(.chained)').evaluateAll(ns=>ns.map((n,i)=>({i,id:n.dataset.id,idx:n.dataset.index,flipped:n.classList.contains('flipped')})).filter(x=>!x.flipped));}
async function pair(page){
  const list=await cardInfo(page),m=new Map();
  for(const c of list){const k=c.id.replace(/-(source|target)$/,'');if(!m.has(k))m.set(k,[]);m.get(k).push(c);}
  return [...m.values()].find(a=>a.length===2);
}
async function mismatch(page){
  const list=await cardInfo(page);let a,b;
  for(let i=0;i<list.length&&!b;i++)for(let j=i+1;j<list.length;j++){if(list[i].id.replace(/-(source|target)$/,'')!==list[j].id.replace(/-(source|target)$/,'')){a=list[i];b=list[j];break;}}
  expect(a&&b,'need mismatch cards').toBeTruthy();
  await page.locator(`#grid .card[data-index="${a.idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${b.idx}"]`).tap();
  await waitPlayer(page);
}
async function match(page){
  const p=await pair(page);expect(p,'need matching pair').toBeTruthy();
  const before=Number(await page.locator('#playerScore').textContent());
  await page.locator(`#grid .card[data-index="${p[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${p[1].idx}"]`).tap();
  await expect.poll(async()=>Number(await page.locator('#playerScore').textContent()),{timeout:5000}).toBeGreaterThan(before);
  await waitPlayer(page);
}

test('Boss Mechanics B02: Roderick, Vargas, Ironhook',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});

  // Roderick: one miss creates remembered hidden cards; two matches reach attempt 3.
  await startBoss(page,4);
  await mismatch(page);await match(page);await match(page);
  await expect.poll(async()=>page.locator('#grid .card.cursed-memory').count(),{timeout:7000}).toBe(1);
  const cursed=page.locator('#grid .card.cursed-memory');
  const idsBefore=await page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
  await cursed.tap();
  await expect.poll(async()=>await page.locator('#bossAbilityTitle').textContent(),{timeout:5000}).toMatch(/ERINNERUNG|FLUCH/);
  const idsAfter=await page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
  expect(idsAfter).not.toEqual(idsBefore);

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
  await page.locator('#peekBtn').tap();
  await expect(page.locator('#grid .card.peek')).toHaveCount(2);
  const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
  expect(noOverflow).toBeTruthy();
  expect(errors).toEqual([]);
});
