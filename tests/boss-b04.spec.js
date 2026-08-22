import { test, expect } from '@playwright/test';

const BASE='http://localhost:4321/pirate-pairs/';
test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const pairKey=id=>String(id||'').replace(/-(source|target)$/,'');

async function waitPlayer(page){
  await expect.poll(async()=>{
    const turn=(await page.locator('#turnPill').textContent())||'';
    const banner=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
    const open=await page.locator('#grid .card.flipped:not(.matched)').count();
    return turn==='DU BIST DRAN'&&!banner.includes('show')&&open===0;
  },{timeout:20000}).toBe(true);
}

async function cards(page){
  return page.locator('#grid .card:not(.matched)').evaluateAll(ns=>ns.map(n=>({
    id:n.dataset.id,idx:Number(n.dataset.index),flipped:n.classList.contains('flipped')
  })).filter(x=>!x.flipped));
}

async function findPair(page){
  const list=await cards(page),groups=new Map();
  for(const c of list){const key=pairKey(c.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
  return [...groups.values()].find(g=>g.length===2);
}

async function findMismatch(page){
  const list=await cards(page);
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(pairKey(list[i].id)!==pairKey(list[j].id))return [list[i],list[j]];
  return null;
}

async function match(page){
  await waitPlayer(page);
  const p=await findPair(page);expect(p).toBeTruthy();
  const before=Number(((await page.locator('#progress').textContent())||'0').split('/')[0].trim());
  await page.locator(`#grid .card[data-index="${p[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${p[1].idx}"]`).tap();
  await expect.poll(async()=>Number(((await page.locator('#progress').textContent())||'0').split('/')[0].trim()),{timeout:10000}).toBe(before+1);
  await waitPlayer(page);
}

test('B04 ordering regression: Royal Chaos resolves before Varkos reveals a card',async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(`${BASE}?boss=10`,{waitUntil:'networkidle'});
  await expect(page.locator('#bossName')).toContainText('Varkos');
  await page.locator('#startBtn').tap();
  await waitPlayer(page);

  // Attempt 1 is a match. Attempt 2 is intentionally a mismatch, so Phase-I swap is due.
  await match(page);
  const mismatch=await findMismatch(page);expect(mismatch).toBeTruthy();
  const ignored=new Set(mismatch.map(c=>String(c.idx)));

  await page.evaluate(({ignored})=>{
    window.__varkosOrder=[];
    window.__varkosIgnored=new Set(ignored);
    const banner=document.querySelector('#bossAbilityBanner');
    const title=document.querySelector('#bossAbilityTitle');
    const grid=document.querySelector('#grid');
    const record=()=>{
      const events=window.__varkosOrder;
      if(banner?.classList.contains('show')&&/VARKOS VERSCHIEBT/.test(title?.textContent||'')&&!events.includes('effect'))events.push('effect');
      const aiReveal=[...grid.querySelectorAll('.card.flipped:not(.matched)')].some(card=>!window.__varkosIgnored.has(card.dataset.index));
      if(aiReveal&&!events.includes('ai-reveal'))events.push('ai-reveal');
    };
    const observer=new MutationObserver(record);
    observer.observe(document.body,{subtree:true,attributes:true,childList:true,characterData:true,attributeFilter:['class']});
    window.__varkosObserver=observer;record();
  },{ignored:[...ignored]});

  await page.locator(`#grid .card[data-index="${mismatch[0].idx}"]`).tap();
  await page.locator(`#grid .card[data-index="${mismatch[1].idx}"]`).tap();
  await expect.poll(()=>page.evaluate(()=>window.__varkosOrder||[]),{timeout:12000}).toContain('effect');
  await expect.poll(()=>page.evaluate(()=>window.__varkosOrder||[]),{timeout:12000}).toContain('ai-reveal');
  const order=await page.evaluate(()=>window.__varkosOrder||[]);
  expect(order.indexOf('effect')).toBeGreaterThanOrEqual(0);
  expect(order.indexOf('effect')).toBeLessThan(order.indexOf('ai-reveal'));
  await page.evaluate(()=>window.__varkosObserver?.disconnect());

  // Restart while the final boss machinery has been active: fresh state must remain clean.
  await page.locator('#restartBtn').evaluate(el=>el.click());
  await waitPlayer(page);
  await expect(page.locator('body')).toHaveAttribute('data-varkos-phase','1');
  await expect(page.locator('#playerScore')).toHaveText('0');
  await expect(page.locator('#aiScore')).toHaveText('0');
  await expect(page.locator('#grid .card')).toHaveCount(16);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBeTruthy();
  expect(errors).toEqual([]);
});
