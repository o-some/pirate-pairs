import { chromium, webkit } from 'playwright';

const BASE='http://localhost:4321/pirate-pairs/';

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const pairRoot=id=>String(id||'').replace(/-(source|target)$/,'');

async function dismissGuideAndStart(page){
  await page.waitForSelector('#bossGuideStart');
  await page.locator('#bossGuideContinue').click();
  await page.waitForFunction(()=>!document.querySelector('#bossGuideStart'));
  await page.waitForSelector('#intro:not(.hidden)');
  await page.locator('#startBtn').click();
  await page.waitForFunction(()=>document.querySelector('#intro')?.classList.contains('hidden'));
  await page.waitForSelector('.card');
}

async function waitPlayer(page){
  await page.waitForFunction(()=>{
    const result=document.querySelector('#result');
    if(result&&!result.classList.contains('hidden'))return true;
    const turn=(document.querySelector('#turnPill')?.textContent||'').trim();
    const banner=document.querySelector('#bossAbilityBanner');
    return turn==='DU BIST DRAN' && !banner?.classList.contains('show');
  },null,{timeout:15000});
}

async function chooseAttempt(page,{match=false}={}){
  await waitPlayer(page);
  const choice=await page.evaluate(({match})=>{
    const nodes=[...document.querySelectorAll('.card:not(.matched)')]
      .filter(el=>el.getAttribute('aria-disabled')!=='true'&&!el.classList.contains('flipped'))
      .map(el=>({index:Number(el.dataset.index),id:el.dataset.id,root:String(el.dataset.id||'').replace(/-(source|target)$/,'')}));
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      if((nodes[i].root===nodes[j].root)===match)return [nodes[i].index,nodes[j].index];
    }
    return null;
  },{match});
  assert(choice,`No ${match?'matching':'mismatching'} pair available`);
  await page.locator(`.card[data-index="${choice[0]}"]`).click();
  await page.locator(`.card[data-index="${choice[1]}"]`).click();
  return choice;
}

async function testBrax(browserType,label){
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

  await page.goto(`${BASE}?boss=2&stage=A1`,{waitUntil:'networkidle'});
  await page.waitForSelector('link[data-b09="visual"]');
  await page.waitForSelector('#bossGuideStart');
  await page.locator('#bossGuideContinue').click();
  await page.waitForFunction(()=>!document.querySelector('#bossGuideStart'));

  const introSizes=await page.evaluate(()=>({
    title:parseFloat(getComputedStyle(document.querySelector('#introTitle')).fontSize),
    copy:parseFloat(getComputedStyle(document.querySelector('#introCopy')).fontSize),
    abilityTitle:parseFloat(getComputedStyle(document.querySelector('.boss-power b')).fontSize),
    abilityCopy:parseFloat(getComputedStyle(document.querySelector('.boss-power span:not(.boss-brief-note)')).fontSize),
    note:parseFloat(getComputedStyle(document.querySelector('.boss-brief-note')).fontSize),
  }));
  assert(introSizes.title>=24,`${label}: intro title too small ${introSizes.title}`);
  assert(introSizes.copy>=12,`${label}: intro copy too small ${introSizes.copy}`);
  assert(introSizes.abilityTitle>=16.5,`${label}: ability title too small ${introSizes.abilityTitle}`);
  assert(introSizes.abilityCopy>=11.5,`${label}: ability copy too small ${introSizes.abilityCopy}`);
  assert(introSizes.note>=9.5,`${label}: boss note too small ${introSizes.note}`);

  await page.locator('#startBtn').click();
  await page.waitForFunction(()=>document.querySelector('#intro')?.classList.contains('hidden'));
  await page.waitForSelector('.card');

  await chooseAttempt(page,{match:false});
  await waitPlayer(page);
  await chooseAttempt(page,{match:false});
  await waitPlayer(page);
  await chooseAttempt(page,{match:true});

  await page.waitForSelector('.card.bomb-armed .boss-marker',{timeout:12000});
  const bomb=await page.evaluate(()=>{
    const marker=document.querySelector('.card.bomb-armed .boss-marker');
    const card=marker?.closest('.card');
    if(!marker||!card)return null;
    const mr=marker.getBoundingClientRect(),cr=card.getBoundingClientRect();
    return {
      ratio:mr.width/cr.width,
      bg:getComputedStyle(marker).backgroundImage,
      cardTransform:getComputedStyle(card).transform,
    };
  });
  assert(bomb,`${label}: bomb marker missing`);
  assert(bomb.ratio>=.70,`${label}: bomb too small ratio ${bomb.ratio}`);
  assert(/pirate-dynamite-barrel\.svg/.test(bomb.bg),`${label}: production explosive SVG not active: ${bomb.bg}`);

  const svgResponse=await page.request.get(`${BASE}assets/pirate-dynamite-barrel.svg`);
  assert(svgResponse.ok(),`${label}: explosive SVG HTTP ${svgResponse.status()}`);
  assert(errors.length===0,`${label}: errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${label}: Brax large explosive + readable intro OK`);
}

async function testBossDockAndPreview(browserType,label,viewport){
  const browser=await browserType.launch();
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});

  await page.goto(`${BASE}?boss=10&stage=A1`,{waitUntil:'networkidle'});
  await dismissGuideAndStart(page);
  await page.waitForSelector('.boss-road-item.b07-current-boss .boss-road-live-sprite',{timeout:10000});

  const sprite=await page.evaluate(()=>{
    const top=document.querySelector('#bossDuelSprite');
    const active=document.querySelector('.boss-road-item.b07-current-boss');
    const bottom=active?.querySelector('.boss-road-live-sprite');
    return {
      top:top?.currentSrc||top?.src||'',
      bottom:bottom?.currentSrc||bottom?.src||'',
      naturalWidth:bottom?.naturalWidth||0,
      source:bottom?.dataset.source||'',
      activeId:active?.dataset.bossId||'',
    };
  });
  assert(sprite.activeId==='10',`${label}: active boss not Varkos`);
  assert(sprite.top&&sprite.bottom&&sprite.top===sprite.bottom,`${label}: bottom sprite differs from top\nTOP ${sprite.top}\nBOTTOM ${sprite.bottom}`);
  assert(sprite.naturalWidth>0,`${label}: bottom active sprite not decoded`);
  assert(sprite.source==='duel-sprite',`${label}: active sprite not sourced from duel portrait`);

  await page.locator('.boss-road-item.b07-current-boss').click();
  await page.waitForSelector('#bossPreview:not(.hidden)');
  await page.waitForTimeout(220);
  const previewSizes=await page.evaluate(()=>({
    title:parseFloat(getComputedStyle(document.querySelector('#bossPreviewName')).fontSize),
    powerTitle:parseFloat(getComputedStyle(document.querySelector('.boss-preview-power b')).fontSize),
    powerCopy:parseFloat(getComputedStyle(document.querySelector('.boss-preview-power p')).fontSize),
    status:parseFloat(getComputedStyle(document.querySelector('.boss-preview-status')).fontSize),
  }));
  assert(previewSizes.title>=24,`${label}: preview title too small ${previewSizes.title}`);
  assert(previewSizes.powerTitle>=16,`${label}: preview ability title too small ${previewSizes.powerTitle}`);
  assert(previewSizes.powerCopy>=12,`${label}: preview ability copy too small ${previewSizes.powerCopy}`);
  assert(previewSizes.status>=9,`${label}: preview status too small ${previewSizes.status}`);
  await page.locator('.boss-preview-close-main').click();
  await page.waitForFunction(()=>document.querySelector('#bossPreview')?.classList.contains('hidden'));

  await waitPlayer(page);
  const first=page.locator('.card:not(.matched):not([aria-disabled="true"])').first();
  await first.click();
  await page.waitForFunction(()=>document.querySelector('.card.flipped'));

  const overflow=await page.evaluate(()=>({
    horizontal:document.documentElement.scrollWidth-window.innerWidth,
    vertical:document.documentElement.scrollHeight-window.innerHeight,
  }));
  assert(overflow.horizontal<=2,`${label}: horizontal overflow ${overflow.horizontal}`);
  assert(overflow.vertical<=4,`${label}: vertical page overflow ${overflow.vertical}`);

  await page.locator('#restartBtn').click();
  await page.waitForFunction(()=>document.querySelectorAll('.card.flipped').length===0 && document.querySelector('#playerScore')?.textContent==='0');
  assert(errors.length===0,`${label}: errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${label}: exact active boss sprite + readable preview + flip/reset OK`);
}

await testBrax(chromium,'Chromium 390x844');
await testBrax(webkit,'WebKit 390x844');
await testBossDockAndPreview(chromium,'Chromium 390x844',{width:390,height:844});
await testBossDockAndPreview(webkit,'WebKit 390x844',{width:390,height:844});
await testBossDockAndPreview(webkit,'WebKit 375x667',{width:375,height:667});
console.log('B09 visual smoke passed');
