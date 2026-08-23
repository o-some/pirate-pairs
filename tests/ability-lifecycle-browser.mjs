import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE=process.env.PP_BASE_URL||'http://127.0.0.1:4321/pirate-pairs/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pairKey=id=>String(id||'').replace(/-(source|target)$/,'');

async function ready(){
  await page.waitForFunction(()=>{
    const intro=document.querySelector('#intro');
    const help=document.querySelector('#help');
    const banner=document.querySelector('#bossAbilityBanner');
    const turn=document.querySelector('#turnPill')?.textContent?.trim();
    return intro?.classList.contains('hidden')&&help?.classList.contains('hidden')&&turn==='DU BIST DRAN'&&!banner?.classList.contains('show');
  },null,{timeout:20000});
}

async function startBoss(id){
  await page.goto(`${BASE}?boss=${id}`,{waitUntil:'domcontentloaded',timeout:30000});
  const guide=page.locator('#bossGuideStart');
  if(await guide.count()){
    await page.locator('#bossGuideContinue').click();
    await guide.waitFor({state:'detached',timeout:5000});
  }
  await page.waitForSelector('#startBtn',{state:'visible',timeout:15000});
  await page.click('#startBtn');
  await ready();
}

async function cardOrder(){
  return page.locator('#grid .card').evaluateAll(ns=>ns.map(n=>n.dataset.id));
}

async function availableCards(){
  return page.locator('#grid .card').evaluateAll(ns=>ns.filter(n=>
    !n.classList.contains('matched')&&
    !n.classList.contains('flipped')&&
    !n.classList.contains('fogged')&&
    !n.classList.contains('chained')&&
    !n.classList.contains('shadowed')
  ).map(n=>({id:n.dataset.id,index:n.dataset.index,classes:n.className})));
}

async function findPair(){
  const list=await availableCards();
  const groups=new Map();
  for(const c of list){const k=pairKey(c.id);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c);}
  return [...groups.values()].find(v=>v.length>=2)?.slice(0,2)||null;
}

async function findMismatch(){
  const list=await availableCards();
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(pairKey(list[i].id)!==pairKey(list[j].id))return [list[i],list[j]];
  return null;
}

async function progress(){
  return Number(((await page.textContent('#progress'))||'0').split('/')[0].trim());
}

async function matchOne(){
  await ready();
  const pair=await findPair();assert(pair,'no playable pair available');
  const before=await progress();
  await page.click(`#grid .card[data-id="${pair[0].id}"]`);
  await page.click(`#grid .card[data-id="${pair[1].id}"]`);
  await page.waitForFunction(v=>Number((document.querySelector('#progress')?.textContent||'0').split('/')[0].trim())>v,before,{timeout:15000});
  await ready();
}

async function mismatchOne(){
  await ready();
  const pair=await findMismatch();assert(pair,'no mismatch available');
  await page.click(`#grid .card[data-id="${pair[0].id}"]`);
  await page.click(`#grid .card[data-id="${pair[1].id}"]`);
  await ready();
}

async function helpPreserves(selector,attribute=null){
  const before=attribute?await page.getAttribute(selector,attribute):await page.locator(selector).count();
  await page.click('#helpBtn');
  await page.waitForSelector('#help:not(.hidden)');
  await sleep(700);
  const during=attribute?await page.getAttribute(selector,attribute):await page.locator(selector).count();
  assert.deepEqual(during,before,`help changed active boss state for ${selector}`);
  await page.click('#closeHelp');
  await ready();
  const after=attribute?await page.getAttribute(selector,attribute):await page.locator(selector).count();
  assert.deepEqual(after,before,`closing help changed active boss state for ${selector}`);
}

await startBoss(1);
const kaiBefore=await cardOrder();
const kaiCard=(await availableCards())[0];assert(kaiCard);
await page.click(`#grid .card[data-id="${kaiCard.id}"]`);
await sleep(80);
await page.click('#helpBtn');
await page.waitForSelector('#help:not(.hidden)');
await sleep(1100);
assert.deepEqual(await cardOrder(),kaiBefore,'Kai committed his swap behind the help overlay');
await page.click('#closeHelp');
await page.waitForFunction(before=>JSON.stringify([...document.querySelectorAll('#grid .card')].map(n=>n.dataset.id))!==JSON.stringify(before),kaiBefore,{timeout:10000});
console.log('Boss 1 Kai each-word + help pause: PASS');

await startBoss(2);
assert.equal(await page.locator('#grid .card.mystery-covered').count(),1,'Brax must start with exactly one mystery');
await helpPreserves('#grid .card.mystery-covered');
const oldMystery=await page.locator('#grid .card.mystery-covered').getAttribute('data-id');
await page.click(`#grid .card[data-id="${oldMystery}"]`);
await ready();
assert.equal(await page.locator('#grid .card.mystery-covered').count(),1,'Brax must immediately re-arm one mystery');
assert.notEqual(await page.locator('#grid .card.mystery-covered').getAttribute('data-id'),oldMystery,'Brax must move the mystery after it is consumed');
console.log('Boss 2 Brax persistent mystery + help: PASS');

await startBoss(3);
await matchOne();await matchOne();
assert.ok(await page.locator('#grid .card.fogged').count()>0,'Blackfinn fog did not activate');
await helpPreserves('#grid .card.fogged');
console.log('Boss 3 Blackfinn fog + help: PASS');

await startBoss(4);
for(let i=0;i<8 && await page.locator('#grid .card.cursed-memory').count()===0;i++)await mismatchOne();
assert.ok(await page.locator('#grid .card.cursed-memory').count()>0,'Roderick memory curse did not activate across two cadence windows');
await helpPreserves('#grid .card.cursed-memory');
console.log('Boss 4 Roderick curse + help: PASS');

await startBoss(5);
await matchOne();await matchOne();await matchOne();
assert.equal(await page.locator('body.tribute-active').count(),1,'Vargas tribute did not activate');
await helpPreserves('body','class');
console.log('Boss 5 Vargas tribute + help: PASS');

await startBoss(6);
await matchOne();await matchOne();await matchOne();
assert.equal(await page.locator('#grid .card.chained').count(),2,'Ironhook must chain two cards');
await helpPreserves('#grid .card.chained');
console.log('Boss 6 Ironhook chains + help: PASS');

await startBoss(7);
await matchOne();await matchOne();await matchOne();
assert.equal(await page.locator('#grid .card.cannon-target').count(),2,'Thorne must target two cards');
await helpPreserves('#grid .card.cannon-target');
console.log('Boss 7 Thorne cannon + help: PASS');

await startBoss(8);
await matchOne();await matchOne();
const corvinBefore=await cardOrder();
await matchOne();
assert.notDeepEqual(await cardOrder(),corvinBefore,'Corvin did not shift the deck');
console.log('Boss 8 Corvin line shift: PASS');

await startBoss(9);
assert.equal(await page.locator('#grid .card.shadowed').count(),1,'Azrak must start with one shadow');
await helpPreserves('#grid .card.shadowed');
const oldShadow=await page.locator('#grid .card.shadowed').getAttribute('data-id');
const azrakCard=(await availableCards())[0];assert(azrakCard);
await page.click(`#grid .card[data-id="${azrakCard.id}"]`);
await page.waitForFunction(old=>{const n=document.querySelector('#grid .card.shadowed');return !!n&&n.dataset.id!==old;},oldShadow,{timeout:10000});
assert.equal(await page.locator('#grid .card.shadowed').count(),1,'Azrak must keep exactly one moving shadow');
console.log('Boss 9 Azrak persistent moving shadow + help: PASS');

await startBoss(10);
const varkosBefore=await cardOrder();
await matchOne();await matchOne();
assert.notDeepEqual(await cardOrder(),varkosBefore,'Varkos phase-I swap did not run');
await matchOne();
assert.equal(await page.getAttribute('body','data-varkos-phase'),'2','Varkos did not transition to phase II');
assert.ok((await page.locator('#grid .card.bomb-armed').count())+(await page.locator('#grid .card.chained').count())>0,'Varkos phase-II modifier did not activate');
console.log('Boss 10 Varkos phase lifecycle: PASS');

assert.deepEqual(errors,[],`browser console/page errors: ${errors.join(' | ')}`);
await browser.close();
console.log('Pirate Pairs all boss ability browser lifecycle: PASS');
