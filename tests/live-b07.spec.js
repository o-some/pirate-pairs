import { test, expect } from '@playwright/test';

const BASE='https://o-some.github.io/pirate-pairs/';

async function rng(page){await page.addInitScript(()=>{Math.random=()=>0.999;});}
async function open(page,boss,stage,start=true){
  await page.goto(`${BASE}?boss=${boss}&stage=${stage}`,{waitUntil:'networkidle'});
  await expect(page.locator('#grid .card')).toHaveCount(16);
  await expect(page.locator('body')).toHaveAttribute('data-language-stage',stage);
  await expect(page.locator('#bossGuideStart')).toBeVisible();
  await page.locator('#bossGuideContinue').click();
  if(start){await page.locator('#startBtn').click();await expect(page.locator('#intro')).toHaveClass(/hidden/);}
}
async function waitReady(page,timeout=35000){
  await expect.poll(async()=>{
    const result=(await page.locator('#result').getAttribute('class'))||'';
    if(!result.includes('hidden'))return true;
    const turn=((await page.locator('#turnPill').textContent())||'').trim();
    const locked=await page.locator('#peekBtn').isDisabled();
    const banner=(await page.locator('#bossAbilityBanner').getAttribute('class'))||'';
    const splash=(await page.locator('#varkosPhaseSplash').getAttribute('class'))||'';
    const openCards=await page.locator('#grid .card.flipped:not(.matched)').count();
    const transient=await page.locator('#grid .card.boss-swap-a,#grid .card.boss-swap-b,#grid .card.corvin-shifting,#grid .card.bomb-targeting,#grid .card.chain-forming').count();
    return turn==='DU BIST DRAN'&&!locked&&!banner.includes('show')&&!splash.includes('show')&&!openCards&&!transient;
  },{timeout}).toBe(true);
}
async function info(page){return page.locator('#grid .card').evaluateAll(nodes=>nodes.map(n=>({index:Number(n.dataset.index),id:n.dataset.id||'',matched:n.classList.contains('matched'),flipped:n.classList.contains('flipped'),disabled:n.getAttribute('aria-disabled')==='true'})));}
async function choice(page){
  const cards=(await info(page)).filter(c=>!c.matched&&!c.flipped&&!c.disabled);
  const groups=new Map();
  for(const c of cards){const k=c.id.replace(/-(source|target)$/,'');const a=groups.get(k)||[];a.push(c.index);groups.set(k,a);}
  for(const a of groups.values())if(a.length>=2)return {pair:true,indexes:a.slice(0,2)};
  return cards.length>=2?{pair:false,indexes:[cards[0].index,cards[1].index]}:null;
}
async function attempt(page,ch){
  const a=page.locator(`#grid .card[data-index="${ch.indexes[0]}"]`),b=page.locator(`#grid .card[data-index="${ch.indexes[1]}"]`);
  await a.click();await expect(a).toHaveClass(/flipped/,{timeout:6000});await b.click();await expect(b).toHaveClass(/flipped|matched/,{timeout:6000});
}
async function overflow(page){return page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&document.documentElement.scrollHeight<=document.documentElement.clientHeight+2);}

test.describe('live B07 child-readable boss UI',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('Brax barrel and current boss dock are live',async({page})=>{
    test.setTimeout(120000);await rng(page);await open(page,2,'A1');await waitReady(page);
    await expect(page.locator('.boss-roadmap-head span')).toContainText('AKTUELL: BRAX');
    await expect(page.locator('#bossRoadmap .boss-road-item[data-boss-id="2"]')).toHaveClass(/b07-current-boss/);
    for(let i=0;i<3;i++){await waitReady(page);const ch=await choice(page);expect(ch?.pair).toBe(true);await attempt(page,ch);}
    await expect(page.locator('#grid .card.bomb-armed')).toHaveCount(1,{timeout:10000});
    const barrel=page.locator('#grid .card.bomb-armed').first();
    expect(await barrel.evaluate(c=>getComputedStyle(c.querySelector('.boss-marker'),'::before').content)).toContain('TNT');
    expect(await barrel.evaluate(c=>getComputedStyle(c,'::after').content)).toContain('EXPLOSIVES FASS');
    expect(await overflow(page)).toBe(true);
  });
  test('Vargas two-to-one counter is live',async({page})=>{
    test.setTimeout(120000);await rng(page);await open(page,5,'A1');await waitReady(page);
    for(let i=0;i<3;i++){await waitReady(page);const ch=await choice(page);expect(ch?.pair).toBe(true);await attempt(page,ch);}
    await expect(page.locator('#tributeCounter b')).toHaveText('2 VERSUCHE',{timeout:10000});
    await waitReady(page);const cards=(await info(page)).filter(c=>!c.matched&&!c.disabled);let mis=null;for(let i=0;i<cards.length&&!mis;i++)for(let j=i+1;j<cards.length;j++)if(cards[i].id.replace(/-(source|target)$/,'')!==cards[j].id.replace(/-(source|target)$/,'')){mis=[cards[i].index,cards[j].index];break;}
    expect(mis).not.toBeNull();await attempt(page,{pair:false,indexes:mis});
    await expect(page.locator('#tributeCounter b')).toContainText('1 VERSUCH',{timeout:6000});
  });
});

test.describe('live B07 stage and Varkos progression',()=>{
  test.use({viewport:{width:375,height:667},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  test('A2 deck and compact stage badge are live',async({page})=>{
    await rng(page);await open(page,1,'A2');await expect(page.locator('.language-stage-chip')).toHaveText('STUFE A2');
    const game=await page.locator('#game-data').evaluate(n=>JSON.parse(n.textContent||'{}'));
    expect(game.vocabulary.some(v=>v.source==='Bahnhof'&&v.target==='station')).toBe(true);
    expect(await overflow(page)).toBe(true);
  });
});

test.describe('live B07 final boss',()=>{
  test.use({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  test('Varkos phases and real A1→A2 reset work on public Pages',async({page})=>{
    test.setTimeout(240000);await rng(page);await open(page,10,'A1',false);
    await expect(page.locator('#intro')).toHaveClass(/varkos-intro-epic/);await expect(page.locator('.varkos-phase-step')).toHaveCount(3);await expect(page.locator('.varkos-phase-step[data-phase="2"]')).toContainText('FÄSSER & KETTEN');
    await page.locator('#startBtn').click();await expect(page.locator('#varkosPhaseSplash strong')).toHaveText('PHASE I',{timeout:1500});
    for(let i=0;i<28;i++){
      await waitReady(page,40000);if(!((await page.locator('#result').getAttribute('class'))||'').includes('hidden'))break;
      const ch=await choice(page);if(!ch){await page.waitForTimeout(600);continue;}await attempt(page,ch);
    }
    await expect(page.locator('#result')).not.toHaveClass(/hidden/,{timeout:25000});await expect(page.locator('#result')).toHaveClass(/stage-complete/,{timeout:6000});
    await expect(page.locator('#resultTitle')).toHaveText('WOW! DU HAST ES GESCHAFFT!');await expect(page.locator('.stage-victory-panel')).toContainText('A1 → A2');
    await page.locator('#againBtn').click();await page.waitForURL(u=>u.searchParams.get('stage')==='A2'&&u.searchParams.get('boss')==='1',{timeout:15000});
    await expect(page.locator('#bossName')).toContainText('Pirat Kai');await expect(page.locator('#playerScore')).toHaveText('0');await expect(page.locator('#progress')).toHaveText('0 / 8');
  });
});
