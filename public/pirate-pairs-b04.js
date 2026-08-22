(() => {
  const GAME = JSON.parse(document.getElementById('game-data')?.textContent || '{}');
  const BOSS_DATA = JSON.parse(document.getElementById('boss-data')?.textContent || '{}');
  const PAIRS = Array.isArray(GAME.vocabulary) ? GAME.vocabulary : [];
  const BOSSES = Array.isArray(BOSS_DATA.bosses) ? BOSS_DATA.bosses : [];
  const $ = id => document.getElementById(id);
  const grid=$('grid'), intro=$('intro'), result=$('result'), help=$('help');
  const startBtn=$('startBtn'), restartBtn=$('restartBtn'), againBtn=$('againBtn'), helpBtn=$('helpBtn'), closeHelp=$('closeHelp'), peekBtn=$('peekBtn');
  const toast=$('toast'), turnPill=$('turnPill'), playerScoreEl=$('playerScore'), aiScoreEl=$('aiScore'), progressEl=$('progress');
  const resultTitle=$('resultTitle'), resultCopy=$('resultCopy'), resultPlayer=$('resultPlayer'), resultShells=$('resultShells'), resultXp=$('resultXp'), resultTag=$('resultTag'), resultNote=$('resultModalNote');
  const bossNameEl=$('bossName'), bossDuelSprite=$('bossDuelSprite'), introBossSprite=$('introBossSprite'), resultBossSprite=$('resultBossSprite');
  const levelTag=$('levelTag'), introBossTag=$('introBossTag'), introTitle=$('introTitle'), introCopy=$('introCopy'), bossPowerName=$('bossPowerName'), bossPowerCopy=$('bossPowerCopy'), modalNote=$('introModalNote');
  const bossAbilityBanner=$('bossAbilityBanner'), bossAbilityTitle=$('bossAbilityTitle'), bossAbilityCopy=$('bossAbilityCopy');
  if (!grid || !PAIRS.length || !BOSSES.length) return;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
  const requestedBoss = Number(new URLSearchParams(location.search).get('boss'));
  let bossIndex = Number.isInteger(requestedBoss) && requestedBoss>=1 && requestedBoss<=BOSSES.length ? requestedBoss-1 : Math.max(0,Math.min(BOSSES.length-1,Number(BOSS_DATA.startBossId||1)-1));

  let cards=[], turn='player', selected=[], lock=true, scores={player:0,ai:0}, matchedPairs={player:0,ai:0};
  let aiMemory=new Map(), playerSeen=new Set(), peekUsed=false, gameOver=false, toastTimer, playerAttempts=0, lastAbilityAttempt=-1, lastOutcome='loss', gameGeneration=0;
  let bombIndex=null, bombExpiresAt=null, fogged=new Set(), fogExpiresAt=null, cursedCardId=null, tributeActive=false, tributeDeadline=null, chained=new Set(), chainExpiresAt=null;
  let cannonTargets=new Set(), cannonTouched=false, cannonExpiresAt=null;
  let shadowIndex=null, shadowExpiresAt=null;
  let varkosPhase=1, varkosPhaseAction=0;

  const boss = () => BOSSES[bossIndex] || BOSSES[0];
  const ability = () => boss().ability || null;
  const isRoyalChaos = () => ability()?.type === 'royal-chaos';
  const bossLabel = () => boss().shortName || boss().name.split(' ').pop().toUpperCase();
  const cardEl = i => grid.querySelector(`.card[data-index="${i}"]`);
  const isOpen = i => { const el=cardEl(i); return !!el && (el.classList.contains('flipped')||el.classList.contains('matched')||el.classList.contains('peek')); };
  const available = () => cards.map((c,i)=>({c,i})).filter(x=>!x.c.matched&&!isOpen(x.i)).map(x=>x.i);

  function updateVarkosPhaseUi(){
    if(!isRoyalChaos()){delete document.body.dataset.varkosPhase;return;}
    document.body.dataset.varkosPhase=String(varkosPhase);
    const chip=levelTag?.querySelector('.varkos-phase-inline');
    if(chip){chip.textContent=`PHASE ${['','I','II','III'][varkosPhase]}`;chip.dataset.phase=String(varkosPhase);}
  }
  function setBossImage(node, src, name, fallback){ if(!node)return; node.dataset.fallbackUsed=''; if(fallback)node.dataset.fallback=fallback; node.src=src; node.alt=name; }
  function applyBossUi(){
    const b=boss(); document.body.dataset.bossId=String(b.bossId||bossIndex+1); document.body.dataset.bossAbility=b.ability?.type||'none';
    if(bossNameEl)bossNameEl.textContent=b.name;
    [bossDuelSprite,introBossSprite,resultBossSprite].forEach(n=>setBossImage(n,b.image,b.name,b.fallback));
    if(levelTag){levelTag.innerHTML=`<span>☠</span> LEVEL ${b.bossId} · ${b.location||b.name.toUpperCase()}`;if(b.ability?.type==='royal-chaos')levelTag.insertAdjacentHTML('beforeend','<em class="varkos-phase-inline" data-phase="1">PHASE I</em>');}
    if(introBossTag)introBossTag.textContent=`☠ LEVEL ${b.bossId} · ${b.name.toUpperCase()}`;
    if(introTitle)introTitle.textContent=b.introTitle||`${b.name} fordert dich heraus.`;
    if(introCopy)introCopy.innerHTML=b.introCopy||`Finde die passenden <b>Deutsch ↔ Englisch</b>-Paare und besiege ${b.name}.`;
    if(bossPowerName)bossPowerName.textContent=b.ability?.name||'Kein Spezialtrick';
    if(bossPowerCopy)bossPowerCopy.textContent=b.ability?.description||'Dieser Boss spielt ohne Spezialfähigkeit.';
    if(modalNote)modalNote.textContent=`DE → EN · 8 LERNPAARE · BOSS ${b.bossId}`;
    if(resultNote)resultNote.textContent=`DUELL GEGEN ${b.name.toUpperCase()}`;
    updateVarkosPhaseUi();
  }

  function makeDeck(){ const d=[]; PAIRS.forEach((p,pairId)=>{ d.push({id:`${p.id}-source`,pairId,lang:GAME.sourceLabel||'DE',word:p.source,matched:false,owner:null}); d.push({id:`${p.id}-target`,pairId,lang:GAME.targetLabel||'EN',word:p.target,matched:false,owner:null}); }); return shuffle(d); }
  function decorate(btn,c,i){
    if(c.matched){ btn.classList.add('matched',c.owner==='ai'?'kai':'tula'); btn.setAttribute('aria-disabled','true'); const lab=btn.querySelector('.matched-by'); if(lab)lab.textContent=c.owner==='player'?'✓ TULA':`☠ ${bossLabel()}`; }
    if(i===bombIndex&&!c.matched)btn.classList.add('bomb-armed');
    if(fogged.has(i)&&!c.matched){btn.classList.add('fogged');btn.setAttribute('aria-disabled','true');}
    if(c.id===cursedCardId&&!c.matched)btn.classList.add('cursed-memory');
    if(chained.has(i)&&!c.matched){btn.classList.add('chained');btn.setAttribute('aria-disabled','true');}
    if(cannonTargets.has(i)&&!c.matched)btn.classList.add('cannon-target');
    if(i===shadowIndex&&!c.matched){btn.classList.add('shadowed');btn.setAttribute('aria-disabled','true');}
  }
  function render(){
    grid.innerHTML='';
    cards.forEach((c,i)=>{
      const btn=document.createElement('button');
      btn.className='card'; btn.dataset.index=String(i); btn.dataset.id=c.id;
      btn.setAttribute('aria-label',c.matched?`${c.lang}: ${c.word}, bereits vergeben`:`Verdeckte Memory-Karte ${i+1}`);
      btn.innerHTML=`<span class="face back"><span class="crest">☸</span><span class="boss-marker" aria-hidden="true"></span></span><span class="face front"><span class="lang ${c.lang===(GAME.targetLabel||'EN')?'en':''}">${c.lang}</span><span class="word">${c.word}</span><span class="matched-by"></span></span>`;
      decorate(btn,c,i);
      if(selected.includes(i)&&!c.matched){btn.classList.add('flipped');btn.setAttribute('aria-label',`${c.lang}: ${c.word}`);}
      btn.addEventListener('click',()=>onPlayerCard(i)); grid.appendChild(btn);
    });
    updateHud();
  }
  function resetStates(){
    playerAttempts=0; lastAbilityAttempt=-1; bombIndex=null; bombExpiresAt=null; fogged=new Set(); fogExpiresAt=null; cursedCardId=null; tributeActive=false; tributeDeadline=null; chained=new Set(); chainExpiresAt=null; playerSeen=new Set();
    cannonTargets=new Set(); cannonTouched=false; cannonExpiresAt=null; shadowIndex=null; shadowExpiresAt=null;varkosPhase=1;varkosPhaseAction=0;
    document.body.classList.remove('tribute-active');delete document.body.dataset.varkosPhase;hideBanner();
  }
  function resetGame(showIntro=false){ gameGeneration++; cards=makeDeck();turn='player';selected=[];lock=showIntro;scores={player:0,ai:0};matchedPairs={player:0,ai:0};aiMemory=new Map();peekUsed=false;gameOver=false;lastOutcome='loss';resetStates();result.classList.add('hidden');peekBtn.disabled=false;peekBtn.textContent='1× EINSETZEN';applyBossUi();render();setTurnUi();showIntro?intro.classList.remove('hidden'):intro.classList.add('hidden'); }
  function updateHud(){playerScoreEl.textContent=String(scores.player);aiScoreEl.textContent=String(scores.ai);progressEl.textContent=`${matchedPairs.player+matchedPairs.ai} / ${PAIRS.length}`;}
  function setTurnUi(){const player=turn==='player';turnPill.textContent=player?'DU BIST DRAN':`${bossLabel()} DENKT …`;turnPill.classList.toggle('ai',!player);peekBtn.disabled=peekUsed||!player||lock||selected.length>0||gameOver;}
  function reveal(i,actor='player'){const c=cards[i],el=cardEl(i);if(!c||!el)return;el.classList.add('flipped');el.setAttribute('aria-label',`${c.lang}: ${c.word}`);if(actor==='player')playerSeen.add(c.id);if(actor==='ai'||Math.random()<Number(boss().memoryStrength??.61))aiMemory.set(c.id,{pairId:c.pairId,index:i});}
  function hide(i){const el=cardEl(i);if(el&&!cards[i].matched){el.classList.remove('flipped');el.setAttribute('aria-label',`Verdeckte Memory-Karte ${i+1}`);}}
  function markMatched(indices,owner){
    if(bombIndex!=null&&indices.includes(bombIndex)){bombIndex=null;bombExpiresAt=null;}
    if(shadowIndex!=null&&indices.includes(shadowIndex)){shadowIndex=null;shadowExpiresAt=null;}
    indices.forEach(i=>{
      fogged.delete(i); chained.delete(i); cannonTargets.delete(i); if(cards[i].id===cursedCardId)cursedCardId=null;
      cards[i].matched=true;cards[i].owner=owner;
      const el=cardEl(i);if(!el)return;el.classList.remove('flipped','bomb-armed','fogged','chained','cursed-memory','cannon-target','shadowed');el.classList.add('matched',owner==='ai'?'kai':'tula');el.setAttribute('aria-disabled','true');const lab=el.querySelector('.matched-by');if(lab)lab.textContent=owner==='player'?'✓ TULA':`☠ ${bossLabel()}`;
    });
  }
  function pairText(indices){const a=cards[indices[0]],b=cards[indices[1]],src=a.lang===(GAME.sourceLabel||'DE')?a:b,dst=src===a?b:a;return `${src.word} = ${dst.word}`;}
  function showToast(text,type=''){clearTimeout(toastTimer);toast.textContent=text;toast.className=`toast show ${type}`.trim();toastTimer=setTimeout(()=>toast.className='toast',2100);}
  function showBanner(title,copy,tone=''){if(!bossAbilityBanner)return;bossAbilityTitle.textContent=title;bossAbilityCopy.textContent=copy;bossAbilityBanner.className=`boss-ability-banner show ${tone}`.trim();}
  function hideBanner(){if(bossAbilityBanner)bossAbilityBanner.className='boss-ability-banner';}
  async function banner(title,copy,tone='',ms=900){showBanner(title,copy,tone);await sleep(ms);hideBanner();}
  function reindexMemory(){for(const[id,data]of aiMemory){const i=cards.findIndex(c=>c.id===id);if(i<0||cards[i]?.matched)aiMemory.delete(id);else data.index=i;}}

  async function animateSwap(a,b,tone='swap'){
    const generation=gameGeneration;
    const ea=cardEl(a),eb=cardEl(b);if(!ea||!eb)return false;const ra=ea.getBoundingClientRect(),rb=eb.getBoundingClientRect(),dx=rb.left-ra.left,dy=rb.top-ra.top;ea.classList.add(tone==='curse'?'curse-swap':'boss-swap-a');eb.classList.add(tone==='curse'?'curse-swap':'boss-swap-b');
    const opts={duration:720,easing:'cubic-bezier(.22,.75,.18,1)',fill:'forwards'};
    const aa=ea.querySelector('.back')?.animate([{transform:'translate(0,0)'},{transform:`translate(${dx*.52}px,${dy*.52}px) rotate(6deg) scale(1.035)`,offset:.52},{transform:`translate(${dx}px,${dy}px)`}],opts);
    const ab=eb.querySelector('.back')?.animate([{transform:'translate(0,0)'},{transform:`translate(${-dx*.52}px,${-dy*.52}px) rotate(-6deg) scale(1.035)`,offset:.52},{transform:`translate(${-dx}px,${-dy}px)`}],opts);
    await Promise.all([aa?.finished?.catch(()=>{}),ab?.finished?.catch(()=>{})]);if(generation!==gameGeneration)return false;[cards[a],cards[b]]=[cards[b],cards[a]];reindexMemory();render();return true;
  }
  async function swapHiddenCards(){const royal=isRoyalChaos(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));if(opts.length<2)return false;const[a,b]=shuffle(opts).slice(0,2);await banner(royal?'VARKOS VERSCHIEBT DAS DECK!':'KAI MISCHT DIE KARTEN!',royal?'Beobachte genau: Der Piratenkönig tauscht zwei verdeckte Karten sichtbar miteinander.':'Beobachte genau, welche zwei verdeckten Karten ihre Plätze tauschen.',royal?'varkos phase-1':'swap',650);const moved=await animateSwap(a,b);if(!moved)return false;await banner(royal?'KÖNIGLICHER TAUSCH BEENDET':'PLÄTZE GETAUSCHT','Die beiden Karten liegen jetzt an ihren neuen Positionen.',royal?'varkos phase-1 done':'swap done',560);return true;}

  function clearBomb(announce=false){if(bombIndex==null)return;cardEl(bombIndex)?.classList.remove('bomb-armed');bombIndex=null;bombExpiresAt=null;if(announce)showToast('Die Bombe ist ohne Treffer erloschen.','good');}
  async function plantBomb(){const royal=isRoyalChaos(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));if(!opts.length)return false;clearBomb();bombIndex=shuffle(opts)[0];bombExpiresAt=playerAttempts+(royal?1:2);const el=cardEl(bombIndex);el?.classList.add('bomb-targeting');await banner(royal?'VARKOS LEGT EINE KRONENBOMBE!':'BRAX LEGT EINE BOMBE!',royal?'Die markierte Karte ist für diesen Versuch vermint: Treffer = −1 für dich und +1 für Varkos.':'Merk dir die markierte Karte. Öffnest du sie: −1 für dich, +1 für Brax.',royal?'varkos phase-2 bomb':'bomb',1000);el?.classList.remove('bomb-targeting');el?.classList.add('bomb-armed');return true;}
  async function triggerBomb(i){if(i!==bombIndex)return;const royal=isRoyalChaos(),el=cardEl(i);el?.classList.remove('bomb-armed');el?.classList.add('bomb-explode');bombIndex=null;bombExpiresAt=null;const lost=scores.player>0?1:0;if(lost)scores.player--;scores.ai++;updateHud();await banner(royal?'KRONENBOMBE EXPLODIERT!':'BOMBE EXPLODIERT!',lost?`Du verlierst 1 Punkt. ${royal?'Varkos':'Brax'} bekommt 1 Punkt.`:`Du hattest noch keinen Punkt – ${royal?'Varkos':'Brax'} bekommt trotzdem +1.`,royal?'varkos phase-2 explode':'bomb explode',650);el?.classList.remove('bomb-explode');}

  function clearFog(announce=false){if(!fogged.size)return;fogged.forEach(i=>{const el=cardEl(i);el?.classList.remove('fogged','fog-denied');if(el&&!cards[i]?.matched&&!chained.has(i)&&i!==shadowIndex)el.removeAttribute('aria-disabled');});fogged=new Set();fogExpiresAt=null;if(announce)showToast('🌫 Der Nebel lichtet sich.','good');}
  async function castFog(){const opts=available().filter(i=>!chained.has(i));if(opts.length<3)return false;clearFog();const picks=shuffle(opts).slice(0,Math.min(3,Math.max(1,opts.length-2)));fogged=new Set(picks);fogExpiresAt=playerAttempts+1;picks.forEach(i=>cardEl(i)?.classList.add('fog-forming'));await banner('BLACKFINN RUFT DEN NEBEL!',`${picks.length} Karten sind für deinen nächsten Versuch blockiert.`,'fog',900);picks.forEach(i=>{const el=cardEl(i);el?.classList.remove('fog-forming');el?.classList.add('fogged');el?.setAttribute('aria-disabled','true');});return true;}

  function clearCurse(){if(!cursedCardId)return;grid.querySelector(`.card[data-id="${CSS.escape(cursedCardId)}"]`)?.classList.remove('cursed-memory');cursedCardId=null;}
  async function castMemoryCurse(){const opts=available().filter(i=>playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));if(opts.length<2){await banner('RODERICK SUCHT DEINE ERINNERUNG','Er braucht mindestens zwei bekannte, verdeckte Karten für seinen Fluch.','curse',650);return false;}clearCurse();const i=shuffle(opts)[0];cursedCardId=cards[i].id;const el=cardEl(i);el?.classList.add('curse-forming');await banner('RODERICKS FLUCH!','Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere Erinnerung.','curse',1000);el?.classList.remove('curse-forming');el?.classList.add('cursed-memory');return true;}
  async function triggerMemoryCurse(triggerIndex){if(cards[triggerIndex]?.id!==cursedCardId)return;clearCurse();const known=available().filter(i=>i!==triggerIndex&&playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));if(!known.length){await banner('FLUCH GEBROCHEN','Roderick findet keine weitere bekannte Karte zum Verschieben.','curse',600);return;}const from=shuffle(known)[0];const targets=available().filter(i=>i!==triggerIndex&&i!==from&&!fogged.has(i)&&!chained.has(i));if(!targets.length)return;const to=shuffle(targets)[0];await banner('VERFLUCHTE ERINNERUNG!','Beobachte: Roderick verschiebt eine andere Karte, die du bereits kanntest.','curse',720);await animateSwap(from,to,'curse');await banner('ERINNERUNG VERSCHOBEN','Die verfluchte Bewegung ist abgeschlossen.','curse',520);}

  function clearTribute(){tributeActive=false;tributeDeadline=null;document.body.classList.remove('tribute-active');}
  async function startTribute(){clearTribute();tributeActive=true;tributeDeadline=playerAttempts+2;document.body.classList.add('tribute-active');await banner('VARGAS FORDERT TRIBUT!','Du hast 2 Versuche: Finde ein Paar oder Vargas erhält +1 Punkt.','tribute',1050);return true;}
  function satisfyTribute(){if(!tributeActive)return;clearTribute();showToast('✓ Tribut abgewehrt – dein Paar rettet den Punkt.','good');}
  async function failTribute(){if(!tributeActive)return;clearTribute();scores.ai++;updateHud();await banner('TRIBUT EINGETRIEBEN!','Kein Paar in 2 Versuchen – Vargas erhält +1 Punkt.','tribute',850);}

  function clearChains(announce=false){if(!chained.size)return;const royal=isRoyalChaos();chained.forEach(i=>{const el=cardEl(i);el?.classList.remove('chained','chain-denied');if(el&&!cards[i]?.matched&&!fogged.has(i)&&i!==shadowIndex)el.removeAttribute('aria-disabled');});chained=new Set();chainExpiresAt=null;if(announce)showToast(royal?'⛓ Varkos’ Ketten brechen.':'⛓ Ironhooks Ketten brechen.','good');}
  async function castChains(){const royal=isRoyalChaos(),opts=available().filter(i=>!fogged.has(i));if(opts.length<3)return false;clearChains();const picks=shuffle(opts).slice(0,2);chained=new Set(picks);chainExpiresAt=playerAttempts+(royal?1:2);picks.forEach(i=>cardEl(i)?.classList.add('chain-forming'));await banner(royal?'VARKOS SCHLIESST DIE KRONENKETTEN!':'IRONHOOK FESSELT DIE KARTEN!',royal?'Zwei Karten sind für diesen Versuch gesperrt. Varkos selbst kann sie weiterhin erreichen.':'Zwei Karten sind für deine nächsten 2 Versuche gesperrt. Ironhook selbst kann sie weiterhin nutzen.',royal?'varkos phase-2 chain':'chain',1050);picks.forEach(i=>{const el=cardEl(i);el?.classList.remove('chain-forming');el?.classList.add('chained');el?.setAttribute('aria-disabled','true');});return true;}

  function clearCannon(announce=false){if(!cannonTargets.size)return;cannonTargets.forEach(i=>cardEl(i)?.classList.remove('cannon-target','cannon-hit'));cannonTargets=new Set();cannonTouched=false;cannonExpiresAt=null;if(announce)showToast('Thornes Zielmarken verblassen.','good');}
  async function castCannon(){const opts=available().filter(i=>!fogged.has(i)&&!chained.has(i)&&i!==shadowIndex);if(opts.length<2)return false;clearCannon();cannonTargets=new Set(shuffle(opts).slice(0,2));cannonTouched=false;cannonExpiresAt=playerAttempts+1;cannonTargets.forEach(i=>cardEl(i)?.classList.add('cannon-target'));await banner('THORNE ERÖFFNET DAS FEUER!','Zwei Karten liegen im Fadenkreuz. Nutzt du eine davon und verfehlst das Paar, erhält Thorne +1 Punkt.','cannon',1050);return true;}
  async function resolveCannon(match){if(!cannonTargets.size)return;if(match){clearCannon();showToast('✓ Kanonenbeschuss abgewehrt.','good');return;}if(cannonTouched){const hit=[...cannonTargets].find(i=>selected.includes(i));if(hit!=null)cardEl(hit)?.classList.add('cannon-hit');scores.ai++;updateHud();await banner('KANONENTREFFER!','Du hast eine Zielkarte benutzt, aber kein Paar gefunden. Thorne erhält +1 Punkt.','cannon hit',720);}clearCannon();}

  function lineCandidates(){
    const free=new Set(available().filter(i=>!fogged.has(i)&&!chained.has(i)&&i!==shadowIndex));
    const geometric=[];
    for(let r=0;r<4;r++)geometric.push([r*4,r*4+1,r*4+2,r*4+3]);
    for(let c=0;c<4;c++)geometric.push([c,c+4,c+8,c+12]);
    return geometric.map(line=>line.filter(i=>free.has(i))).filter(line=>line.length>=2);
  }
  async function shiftLine(){
    const generation=gameGeneration,royal=isRoyalChaos(),lines=lineCandidates();
    if(!lines.length){await banner(royal?'VARKOS SUCHT EINE FORMATION':'CORVIN PRÜFT DAS DECK','Keine Reihe oder Spalte besitzt noch mindestens zwei freie verdeckte Karten.',royal?'varkos phase-3':'shift',620);return false;}
    const line=shuffle(lines)[0],els=line.map(cardEl),rects=els.map(el=>el?.getBoundingClientRect());
    if(els.some(el=>!el)||rects.some(r=>!r))return false;
    await banner(royal?'VARKOS ZERREISST DIE FORMATION!':'CORVIN ORDNET DAS DECK NEU!',royal?`Beobachte die ${line.length} freien Karten: Varkos verschiebt die Formation, eroberte Karten bleiben fest.`:`Beobachte die ${line.length} freien Karten dieser Reihe oder Spalte. Eroberte Karten bleiben als Anker liegen.`,royal?'varkos phase-3':'shift',760);
    if(generation!==gameGeneration)return false;
    const animations=els.map((el,k)=>{el.classList.add('corvin-shifting');const dest=rects[(k+1)%line.length],src=rects[k],dx=dest.left-src.left,dy=dest.top-src.top;return el.querySelector('.back')?.animate([{transform:'translate(0,0)'},{transform:`translate(${dx}px,${dy}px)`}],{duration:760,easing:'cubic-bezier(.22,.75,.18,1)',fill:'forwards'});});
    await Promise.all(animations.map(a=>a?.finished?.catch(()=>{})));if(generation!==gameGeneration)return false;
    const before=line.map(i=>cards[i]);line.forEach((idx,k)=>{cards[line[(k+1)%line.length]]=before[k];});
    reindexMemory();render();await banner(royal?'KÖNIGLICHE FORMATION VERSCHOBEN':'LINIE VERSCHOBEN','Die freien Karten liegen jetzt an ihren neuen Positionen.',royal?'varkos phase-3 done':'shift done',520);return generation===gameGeneration;
  }

  function clearShadow(announce=false){if(shadowIndex==null)return;const el=cardEl(shadowIndex);el?.classList.remove('shadowed','shadow-denied','shadow-leaving','shadow-arriving');if(el&&!cards[shadowIndex]?.matched&&!fogged.has(shadowIndex)&&!chained.has(shadowIndex))el.removeAttribute('aria-disabled');shadowIndex=null;shadowExpiresAt=null;if(announce)showToast('Azraks Schatten löst sich auf.','good');}
  async function castShadow(){const generation=gameGeneration;const opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));if(!opts.length)return false;clearShadow();shadowIndex=shuffle(opts)[0];shadowExpiresAt=playerAttempts+1;const el=cardEl(shadowIndex);el?.classList.add('shadow-arriving');await banner('AZRAK RUFT DEN SCHATTEN!','Eine Karte verschwindet im Schatten und ist für dich blockiert. Nach deiner ersten Karte wandert der Schatten weiter.','shadow',980);if(generation!==gameGeneration)return false;el?.classList.remove('shadow-arriving');el?.classList.add('shadowed');el?.setAttribute('aria-disabled','true');return true;}
  async function moveShadow(){if(shadowIndex==null)return;const generation=gameGeneration,old=shadowIndex;const opts=available().filter(i=>i!==old&&!selected.includes(i)&&!fogged.has(i)&&!chained.has(i));if(!opts.length)return;const next=shuffle(opts)[0],oldEl=cardEl(old),nextEl=cardEl(next);oldEl?.classList.add('shadow-leaving');nextEl?.classList.add('shadow-arriving');await sleep(460);if(generation!==gameGeneration)return;if(oldEl&&!cards[old]?.matched&&!fogged.has(old)&&!chained.has(old))oldEl.removeAttribute('aria-disabled');oldEl?.classList.remove('shadowed','shadow-leaving');shadowIndex=next;nextEl?.classList.remove('shadow-arriving');nextEl?.classList.add('shadowed');nextEl?.setAttribute('aria-disabled','true');showToast('Der Schatten ist auf eine andere Karte gewandert.','bad');}

  function varkosPhaseForProgress(){const total=matchedPairs.player+matchedPairs.ai;return total<=2?1:total<=4?2:3;}
  async function syncVarkosPhase(announce=true){
    if(!isRoyalChaos())return;
    const next=varkosPhaseForProgress();
    if(next===varkosPhase){updateVarkosPhaseUi();return;}
    clearBomb();clearChains();varkosPhase=next;varkosPhaseAction=0;updateVarkosPhaseUi();
    if(!announce)return;
    const title=next===2?'VARKOS – PHASE II: BELAGERUNG':'VARKOS – PHASE III: KÖNIGLICHES CHAOS';
    const copy=next===2?'Jetzt wechselt Varkos kontrolliert zwischen Kronenbomben und Ketten.':'Im Finale verschiebt Varkos nach jedem deiner Versuche eine sichtbare Kartenformation.';
    await banner(title,copy,`varkos phase-${next} transition`,1150);
  }
  async function runRoyalChaos(){
    if(varkosPhase===1)return swapHiddenCards();
    if(varkosPhase===2){const useBomb=varkosPhaseAction%2===0;varkosPhaseAction++;if(useBomb){clearChains();return plantBomb();}clearBomb();return castChains();}
    return shiftLine();
  }

  async function cleanExpired(){if(bombExpiresAt!=null&&playerAttempts>=bombExpiresAt)clearBomb(true);if(fogExpiresAt!=null&&playerAttempts>=fogExpiresAt)clearFog(true);if(tributeActive&&tributeDeadline!=null&&playerAttempts>=tributeDeadline)await failTribute();if(chainExpiresAt!=null&&playerAttempts>=chainExpiresAt)clearChains(true);if(cannonExpiresAt!=null&&playerAttempts>=cannonExpiresAt)clearCannon();if(shadowExpiresAt!=null&&playerAttempts>=shadowExpiresAt)clearShadow();}
  async function maybeAbility(){
    if(gameOver||selected.length)return;
    const generation=gameGeneration;
    await cleanExpired();if(generation!==gameGeneration)return;
    const a=ability();if(!a?.type||a.type==='none')return;
    if(a.type==='royal-chaos'){
      await syncVarkosPhase(true);if(generation!==gameGeneration)return;
      const cadence=varkosPhase===1?2:1;
      if(!playerAttempts||playerAttempts%cadence!==0||lastAbilityAttempt===playerAttempts)return;
      lastAbilityAttempt=playerAttempts;lock=true;setTurnUi();
      try{await runRoyalChaos();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}
      return;
    }
    const every=Math.max(1,Number(a.everyPlayerAttempts||3));if(!playerAttempts||playerAttempts%every!==0||lastAbilityAttempt===playerAttempts)return;lastAbilityAttempt=playerAttempts;lock=true;setTurnUi();
    try{if(a.type==='swap')await swapHiddenCards();else if(a.type==='bomb')await plantBomb();else if(a.type==='fog')await castFog();else if(a.type==='memory-curse')await castMemoryCurse();else if(a.type==='tribute')await startTribute();else if(a.type==='chains')await castChains();else if(a.type==='cannon')await castCannon();else if(a.type==='line-shift')await shiftLine();else if(a.type==='shadow')await castShadow();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}
  }
  async function enterPlayerTurn(){const generation=gameGeneration;turn='player';lock=true;setTurnUi();await maybeAbility();if(generation===gameGeneration&&!gameOver){lock=false;setTurnUi();}}

  async function onPlayerCard(i){
    if(lock||turn!=='player'||gameOver||cards[i]?.matched||selected.includes(i)||isOpen(i))return;
    if(fogged.has(i)){const el=cardEl(i);el?.classList.remove('fog-denied');void el?.offsetWidth;el?.classList.add('fog-denied');showToast('🌫 Blackfinns Nebel blockiert diese Karte.','bad');return;}
    if(chained.has(i)){const el=cardEl(i);el?.classList.remove('chain-denied');void el?.offsetWidth;el?.classList.add('chain-denied');showToast(isRoyalChaos()?'⛓ Varkos’ Kronenkette hält diese Karte fest.':'⛓ Ironhooks Kette hält diese Karte fest.','bad');return;}
    if(i===shadowIndex){const el=cardEl(i);el?.classList.remove('shadow-denied');void el?.offsetWidth;el?.classList.add('shadow-denied');showToast('Azraks Schatten blockiert diese Karte.','bad');return;}
    const generation=gameGeneration,triggersBossEffect=cards[i].id===cursedCardId||bombIndex===i;
    if(triggersBossEffect){lock=true;setTurnUi();if(cards[i].id===cursedCardId)await triggerMemoryCurse(i);if(bombIndex===i)await triggerBomb(i);if(generation!==gameGeneration)return;}
    if(cannonTargets.has(i))cannonTouched=true;
    reveal(i,'player');selected.push(i);
    if(selected.length===1&&shadowIndex!=null&&ability()?.type==='shadow'){lock=true;setTurnUi();await moveShadow();if(generation!==gameGeneration)return;}
    if(selected.length===2){lock=true;setTurnUi();await resolveSelection('player');}
    else{lock=false;setTurnUi();}
  }
  async function resolveSelection(actor){
    const generation=gameGeneration,[a,b]=selected,match=cards[a].pairId===cards[b].pairId&&cards[a].lang!==cards[b].lang;await sleep(actor==='player'?650:520);if(generation!==gameGeneration)return;
    if(actor==='player'&&cannonTargets.size)await resolveCannon(match);if(generation!==gameGeneration)return;
    if(match){markMatched([a,b],actor);matchedPairs[actor]++;scores[actor]++;if(actor==='player')satisfyTribute();updateHud();const learned=pairText([a,b]);showToast(actor==='player'?`✓ Stark! ${learned}`:`☠ ${boss().name} schnappt sich: ${learned}`,actor==='player'?'good':'bad');selected=[];if(actor==='player')playerAttempts++;await cleanExpired();if(generation!==gameGeneration)return;if(checkGameEnd())return;if(actor==='ai'){lock=false;setTurnUi();await sleep(520);if(generation===gameGeneration)aiTurn();}else await enterPlayerTurn();}
    else{showToast(actor==='player'?`Kein Paar – ${boss().name} ist dran.`:`${boss().name} liegt daneben – dein Zug!`,actor==='player'?'bad':'good');await sleep(actor==='player'?550:430);if(generation!==gameGeneration)return;hide(a);hide(b);selected=[];if(actor==='player')playerAttempts++;await cleanExpired();if(generation!==gameGeneration)return;if(actor==='player'){turn='ai';lock=true;setTurnUi();await sleep(Number(boss().thinkingDelay??720));if(generation===gameGeneration)aiTurn();}else await enterPlayerTurn();}
  }

  function cleanMemory(){const chance=Number(boss().forgetChance??.12);for(const[id,d]of aiMemory){if(cards[d.index]?.matched)aiMemory.delete(id);else if(Math.random()<chance)aiMemory.delete(id);}}
  function knownPair(exclude=[]){const m=new Map();for(const d of aiMemory.values()){if(exclude.includes(d.index)||cards[d.index]?.matched||isOpen(d.index))continue;if(!m.has(d.pairId))m.set(d.pairId,[]);m.get(d.pairId).push(d.index);}for(const arr of m.values())if(arr.length>=2)return arr.slice(0,2);return null;}
  function rememberedMate(pairId,exclude){for(const d of aiMemory.values())if(d.pairId===pairId&&d.index!==exclude&&!cards[d.index]?.matched&&!isOpen(d.index))return d.index;return null;}
  function randomAvailable(exclude=[]){const opts=available().filter(i=>!exclude.includes(i));return opts.length?opts[Math.floor(Math.random()*opts.length)]:null;}
  async function aiTurn(){if(gameOver)return;const generation=gameGeneration;turn='ai';lock=true;setTurnUi();cleanMemory();await sleep(360);if(generation!==gameGeneration)return;const pair=knownPair();let first=pair?pair[0]:randomAvailable();if(first==null){await enterPlayerTurn();return;}reveal(first,'ai');selected=[first];await sleep(780);if(generation!==gameGeneration)return;let second=pair?pair[1]:rememberedMate(cards[first].pairId,first);if(second==null||cards[second].matched||isOpen(second))second=randomAvailable([first]);if(second==null){hide(first);selected=[];await enterPlayerTurn();return;}reveal(second,'ai');selected.push(second);await resolveSelection('ai');}

  async function usePeek(){if(peekUsed||lock||turn!=='player'||selected.length||gameOver)return;const generation=gameGeneration,opts=available().filter(i=>!fogged.has(i)&&!chained.has(i)&&i!==shadowIndex);if(opts.length<2)return;peekUsed=true;peekBtn.disabled=true;peekBtn.textContent='VERBRAUCHT';lock=true;setTurnUi();const picks=shuffle(opts).slice(0,2);picks.forEach(i=>cardEl(i)?.classList.add('peek'));showToast('🐚 Muschelblick: Merk dir diese beiden Karten!','good');await sleep(1350);if(generation!==gameGeneration)return;picks.forEach(i=>cardEl(i)?.classList.remove('peek'));lock=false;setTurnUi();}
  function checkGameEnd(){
    if(matchedPairs.player+matchedPairs.ai<PAIRS.length)return false;gameOver=true;lock=true;setTurnUi();const win=scores.player>scores.ai,tie=scores.player===scores.ai;lastOutcome=win?'win':tie?'tie':'loss';const shells=win?20:tie?10:5,xp=win?60:tie?40:25,b=boss(),next=BOSSES[bossIndex+1],finalBoss=Number(b.bossId)===10;
    resultTitle.textContent=win?`Du hast ${b.name} geschlagen!`:tie?'Unentschieden auf hoher See!':`${b.name} gewinnt diese Runde.`;
    resultCopy.textContent=win?(finalBoss?'Der Piratenkönig ist gefallen. Du hast alle zehn Bossduelle von Pirate Pairs gemeistert.':`${b.name} ist besiegt. ${next?`Als Nächstes wartet ${next.name}.`:'Du hast alle Bosse dieses Entwicklungs-Batches geschlagen.'}`):tie?'Keiner gewinnt das Duell. Noch eine Runde entscheidet es.':`${b.name} hatte diesmal die besseren Tricks. Beim nächsten Duell kennst du seine Mechanik.`;
    resultPlayer.textContent=String(scores.player);resultShells.textContent=`+${shells}`;resultXp.textContent=`+${xp}`;resultTag.textContent=win?(finalBoss?'♛ PIRATENKÖNIG BESIEGT':'✓ BOSS BESIEGT'):tie?'⚔ GLEICHSTAND':'☠ BOSS GEWINNT';if(againBtn)againBtn.textContent=win&&next?`⚔ WEITER ZU ${next.name.toUpperCase()}`:'↻ NOCH EIN DUELL';if(resultNote)resultNote.textContent=win&&finalBoss?'ALLE 10 BOSSE BESIEGT':win&&next?`NÄCHSTE ETAPPE: ${next.name.toUpperCase()}`:win?'ALLE BOSSE DIESES BATCHES BESIEGT':`NOCH EIN DUELL GEGEN ${b.name.toUpperCase()}`;setTimeout(()=>result.classList.remove('hidden'),900);return true;
  }
  function setBossInUrl(){const url=new URL(location.href);url.searchParams.set('boss',String(boss().bossId||bossIndex+1));history.replaceState({},'',url);}

  startBtn?.addEventListener('click',()=>{intro.classList.add('hidden');lock=false;setTurnUi();showToast(isRoyalChaos()?'Varkos kämpft in drei Phasen – beobachte seine Wechsel genau.':`Besiege ${boss().name} und merk dir die Übersetzungen.`,'good');});
  restartBtn?.addEventListener('click',()=>resetGame(false));
  againBtn?.addEventListener('click',()=>{if(lastOutcome==='win'&&BOSSES[bossIndex+1]){bossIndex++;setBossInUrl();resetGame(true);}else resetGame(false);});
  peekBtn?.addEventListener('click',usePeek);helpBtn?.addEventListener('click',()=>help.classList.remove('hidden'));closeHelp?.addEventListener('click',()=>help.classList.add('hidden'));help?.addEventListener('click',e=>{if(e.target===help)help.classList.add('hidden');});
  resetGame(true);
})();