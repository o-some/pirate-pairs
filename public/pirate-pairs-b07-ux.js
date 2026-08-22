(() => {
  const stageState=window.__PIRATE_PAIRS_STAGE__||{stage:'A1',stageIndex:0,stages:['A1','A2','B1','B2','C1','C2'],meta:{title:'Grundstufe',copy:'Einfache Alltagswörter'}};
  const STAGES=stageState.stages||['A1','A2','B1','B2','C1','C2'];
  const currentStage=stageState.stage||'A1';
  const bossNode=document.getElementById('boss-data');
  const BOSSES=(()=>{try{return JSON.parse(bossNode?.textContent||'{}').bosses||[];}catch{return[];}})();
  const bossById=id=>BOSSES.find(b=>Number(b.bossId)===Number(id))||BOSSES[0];
  const currentBossId=()=>Number(document.body.dataset.bossId||1);
  const turnPill=document.getElementById('turnPill');
  const grid=document.getElementById('grid');
  const intro=document.getElementById('intro');
  const startBtn=document.getElementById('startBtn');
  const result=document.getElementById('result');
  const againBtn=document.getElementById('againBtn');
  const resultTag=document.getElementById('resultTag');
  const resultTitle=document.getElementById('resultTitle');
  const resultCopy=document.getElementById('resultCopy');
  const resultNote=document.getElementById('resultModalNote');
  const levelTag=document.getElementById('levelTag');
  const bossAbilityBanner=document.getElementById('bossAbilityBanner');
  const bossAbilityTitle=document.getElementById('bossAbilityTitle');
  const bossAbilityCopy=document.getElementById('bossAbilityCopy');

  document.body.dataset.languageStage=currentStage;

  function ensureStageBadge(){
    if(!levelTag)return;
    let badge=levelTag.querySelector('.language-stage-chip');
    if(!badge){
      badge=document.createElement('em');
      badge.className='language-stage-chip';
      levelTag.appendChild(badge);
    }
    badge.textContent=`STUFE ${currentStage}`;
    badge.setAttribute('aria-label',`Schwierigkeitsstufe ${currentStage}`);
  }

  function syncIntroStage(){
    const note=document.getElementById('introModalNote');
    if(note)note.textContent=`STUFE ${currentStage} · DE → EN · 8 LERNPAARE · BOSS ${currentBossId()}`;
  }

  function removeShellHelp(){
    const peek=document.getElementById('peekBtn');
    if(peek){peek.setAttribute('aria-hidden','true');peek.tabIndex=-1;}
    document.querySelectorAll('#help p').forEach(p=>{if(/Muschelblick/i.test(p.textContent||''))p.remove();});
  }

  function forceCurrentBossPortrait(){
    const id=currentBossId();
    const b=bossById(id);
    const rail=document.getElementById('bossRoadmap');
    if(!rail||!b)return;
    rail.querySelectorAll('.boss-road-item').forEach(button=>{
      button.classList.toggle('b07-current-boss',Number(button.dataset.bossId)===id);
    });
    const current=rail.querySelector(`.boss-road-item[data-boss-id="${id}"]`);
    if(current){
      const medallion=current.querySelector('.boss-road-num');
      if(medallion&&b.image){
        medallion.style.backgroundImage=`url("${b.image}"), radial-gradient(circle at 50% 38%, #18566a, #072d42 74%)`;
        current.dataset.portraitLoaded='1';
        delete current.dataset.portraitLoading;
      }
      current.setAttribute('aria-label',`Aktueller Boss, Level ${id}: ${b.name}. Fähigkeit ${b.ability?.name||'Bossfähigkeit'}. Vorschau öffnen.`);
    }
    const header=rail.closest('.boss-roadmap-shell')?.querySelector('.boss-roadmap-head span');
    if(header)header.textContent=`AKTUELL: ${String(b.shortName||b.name).toUpperCase()}`;
  }

  function syncBossChrome(){
    ensureStageBadge();
    syncIntroStage();
    forceCurrentBossPortrait();
    syncVarkosIntro();
  }

  // Vargas — child-readable two-attempt counter. Gameplay remains owned by B04.
  const tributeCounter=document.createElement('div');
  tributeCounter.id='tributeCounter';
  tributeCounter.className='tribute-counter';
  tributeCounter.setAttribute('role','status');
  tributeCounter.setAttribute('aria-live','polite');
  tributeCounter.innerHTML='<small>VARGAS FORDERT TRIBUT</small><b>2 VERSUCHE</b><span>Finde ein Paar, sonst bekommt Vargas +1.</span>';
  document.querySelector('.turn')?.appendChild(tributeCounter);
  let tributeRemaining=2;
  let tributeReveals=0;

  function paintTributeCounter(){
    const active=document.body.classList.contains('tribute-active');
    tributeCounter.classList.toggle('show',active);
    tributeCounter.classList.toggle('last-chance',active&&tributeRemaining<=1);
    const title=tributeCounter.querySelector('b');
    const copy=tributeCounter.querySelector('span');
    if(!active)return;
    if(tributeRemaining<=1){
      if(title)title.textContent='LETZTE CHANCE · 1 VERSUCH';
      if(copy)copy.textContent='Jetzt ein Paar finden – sonst bekommt Vargas +1 Punkt!';
    }else{
      if(title)title.textContent='2 VERSUCHE';
      if(copy)copy.textContent='Finde ein Paar, sonst bekommt Vargas +1 Punkt.';
    }
  }

  let tributeWasActive=false;
  function syncTributeFromBody(){
    const active=document.body.classList.contains('tribute-active');
    if(active&&!tributeWasActive){tributeRemaining=2;tributeReveals=0;}
    if(!active){tributeReveals=0;}
    tributeWasActive=active;
    paintTributeCounter();
  }

  grid?.addEventListener('click',event=>{
    if(!document.body.classList.contains('tribute-active'))return;
    if((turnPill?.textContent||'').trim()!=='DU BIST DRAN')return;
    const card=event.target.closest('.card');
    if(!card||card.classList.contains('matched')||card.getAttribute('aria-disabled')==='true')return;
    const wasFlipped=card.classList.contains('flipped');
    window.setTimeout(()=>{
      if(!document.body.classList.contains('tribute-active'))return;
      if(wasFlipped||!card.classList.contains('flipped'))return;
      tributeReveals++;
      if(tributeReveals<2)return;
      tributeReveals=0;
      window.setTimeout(()=>{
        if(!document.body.classList.contains('tribute-active'))return;
        tributeRemaining=Math.max(1,tributeRemaining-1);
        paintTributeCounter();
      },760);
    },40);
  },true);

  // Brax / Varkos — make live banner language match the visual explosive barrel.
  function clarifyBanner(){
    if(!bossAbilityBanner?.classList.contains('show'))return;
    const title=bossAbilityTitle?.textContent||'';
    if(title==='BRAX LEGT EINE BOMBE!'){
      bossAbilityTitle.textContent='BRAX STELLT EIN EXPLOSIVES FASS AUF!';
      if(bossAbilityCopy)bossAbilityCopy.textContent='Das leuchtende Pulverfass ist gefährlich. Öffnest du diese Karte: du −1, Brax +1.';
    }else if(title==='BOMBE EXPLODIERT!'){
      bossAbilityTitle.textContent='DAS PULVERFASS EXPLODIERT!';
    }else if(title==='VARKOS LEGT EINE KRONENBOMBE!'){
      bossAbilityTitle.textContent='VARKOS STELLT EIN KRONENFASS AUF!';
      if(bossAbilityCopy)bossAbilityCopy.textContent='Das goldene Pulverfass ist für diesen Versuch gefährlich: du −1, Varkos +1.';
    }
  }

  const PHASES={
    1:{roman:'I',name:'KARTENTAUSCH',copy:'Varkos tauscht verdeckte Karten sichtbar. Folge jeder Bewegung genau.',hint:'MERKE DIR DIE NEUEN POSITIONEN'},
    2:{roman:'II',name:'FÄSSER & KETTEN',copy:'Varkos wechselt zwischen explosiven Kronenfässern und gesperrten Karten.',hint:'MEIDE FÄSSER · BEACHTE KETTEN'},
    3:{roman:'III',name:'KÖNIGLICHES CHAOS',copy:'Im Finale verschiebt Varkos nach jedem Versuch freie Karten in Reihen oder Spalten.',hint:'JETZT ZÄHLT JEDE BEWEGUNG'},
  };

  const phaseSplash=document.createElement('section');
  phaseSplash.id='varkosPhaseSplash';
  phaseSplash.className='varkos-phase-splash';
  phaseSplash.setAttribute('aria-live','assertive');
  phaseSplash.setAttribute('aria-atomic','true');
  phaseSplash.innerHTML='<div class="varkos-phase-splash-card"><small>ENDKAMPF · PIRATENKÖNIG VARKOS</small><strong></strong><b></b><p></p><span></span></div>';
  document.body.appendChild(phaseSplash);
  let phaseTimer;
  function showPhaseSplash(phase){
    if(currentBossId()!==10)return;
    const data=PHASES[phase]||PHASES[1];
    phaseSplash.querySelector('strong').textContent=`PHASE ${data.roman}`;
    phaseSplash.querySelector('b').textContent=data.name;
    phaseSplash.querySelector('p').textContent=data.copy;
    phaseSplash.querySelector('span').textContent=data.hint;
    phaseSplash.dataset.phase=String(phase);
    phaseSplash.classList.remove('show');void phaseSplash.offsetWidth;phaseSplash.classList.add('show');
    clearTimeout(phaseTimer);phaseTimer=setTimeout(()=>phaseSplash.classList.remove('show'),1650);
  }

  function syncVarkosIntro(){
    if(!intro)return;
    const isVarkos=currentBossId()===10;
    intro.classList.toggle('varkos-intro-epic',isVarkos);
    const old=intro.querySelector('.varkos-phase-plan');
    if(!isVarkos){old?.remove();return;}
    const title=document.getElementById('introTitle');
    const copy=document.getElementById('introCopy');
    if(title)title.textContent='DER ENDKAMPF BEGINNT';
    if(copy)copy.innerHTML=`Du kämpfst auf <b>Stufe ${currentStage}</b> gegen Piratenkönig Varkos. Er wechselt während des Duells durch drei klar angekündigte Phasen.`;
    let plan=old;
    if(!plan){
      plan=document.createElement('div');
      plan.className='varkos-phase-plan';
      const power=intro.querySelector('.boss-power');
      power?.insertAdjacentElement('afterend',plan);
    }
    plan.innerHTML=Object.entries(PHASES).map(([phase,data])=>`<div class="varkos-phase-step" data-phase="${phase}"><small>PHASE ${data.roman}</small><b>${data.name}</b><span>${data.copy}</span></div>`).join('');
    updateVarkosPlan();
  }

  function updateVarkosPlan(){
    const phase=Number(document.body.dataset.varkosPhase||1);
    intro?.querySelectorAll('.varkos-phase-step').forEach(step=>step.classList.toggle('active',Number(step.dataset.phase)===phase));
  }

  let lastVarkosPhase=Number(document.body.dataset.varkosPhase||1);
  startBtn?.addEventListener('click',()=>{
    if(currentBossId()===10)window.setTimeout(()=>showPhaseSplash(Number(document.body.dataset.varkosPhase||1)),120);
  });

  function handleBossMutation(mutations){
    const bossChanged=mutations.some(m=>m.type==='attributes'&&m.attributeName==='data-boss-id');
    const phaseChanged=mutations.some(m=>m.type==='attributes'&&m.attributeName==='data-varkos-phase');
    const tributeChanged=mutations.some(m=>m.type==='attributes'&&m.attributeName==='class');
    if(bossChanged)window.setTimeout(syncBossChrome,0);
    if(tributeChanged)syncTributeFromBody();
    if(phaseChanged&&currentBossId()===10){
      const next=Number(document.body.dataset.varkosPhase||1);
      updateVarkosPlan();
      if(next!==lastVarkosPhase){lastVarkosPhase=next;showPhaseSplash(next);}
    }
  }
  new MutationObserver(handleBossMutation).observe(document.body,{attributes:true,attributeFilter:['data-boss-id','data-varkos-phase','class']});
  if(bossAbilityBanner)new MutationObserver(clarifyBanner).observe(bossAbilityBanner,{attributes:true,attributeFilter:['class'],subtree:true,childList:true,characterData:true});

  function ensureStageVictoryPanel(){
    const modal=result?.querySelector('.modal');
    if(!modal)return null;
    let panel=modal.querySelector('.stage-victory-panel');
    if(!panel){
      panel=document.createElement('div');
      panel.className='stage-victory-panel';
      againBtn?.insertAdjacentElement('beforebegin',panel);
    }
    return panel;
  }

  function stageLadderHtml(completed,next){
    return STAGES.map(stage=>{
      const cls=stage===completed?'done':stage===next?'next':'';
      return `<span class="stage-ladder-step ${cls}">${stage}</span>`;
    }).join('');
  }

  function enhanceFinalVictory(){
    if(!result||result.classList.contains('hidden'))return;
    if(currentBossId()!==10||!/PIRATENKÖNIG BESIEGT/i.test(resultTag?.textContent||''))return;
    const idx=STAGES.indexOf(currentStage);
    const next=idx>=0&&idx<STAGES.length-1?STAGES[idx+1]:null;
    const restartStage=next||'A1';
    document.body.classList.add('final-victory-active');
    result.classList.add('stage-complete');
    result.dataset.nextStage=restartStage;
    if(resultTag)resultTag.textContent=`STUFE ${currentStage} GESCHAFFT`;
    if(resultTitle)resultTitle.textContent='WOW! DU HAST ES GESCHAFFT!';
    if(resultCopy)resultCopy.textContent=next
      ? `Du hast Varkos und alle zehn Bosse auf Stufe ${currentStage} besiegt. Als Nächstes wartet die schwierigere Stufe ${next}.`
      : `Du hast Varkos auf C2 besiegt und damit alle sechs Schwierigkeitsstufen gemeistert.`;
    if(againBtn)againBtn.textContent=next?`WEITER MIT STUFE ${next}`:'NEUE REISE · A1';
    if(resultNote)resultNote.textContent=next?`ALLE BOSSE WERDEN ZURÜCKGESETZT · NÄCHSTE STUFE ${next}`:'C2 GEMEISTERT · NEUE REISE AB A1';
    const panel=ensureStageVictoryPanel();
    if(panel){
      panel.innerHTML=`
        <small>${next?'NÄCHSTE SCHWIERIGKEITSSTUFE':'ALLE STUFEN GEMEISTERT'}</small>
        <b>${next?`${currentStage} → ${next}`:'C2 · MEISTERSTUFE'}</b>
        <div class="stage-ladder" aria-label="Sprachstufen A1 bis C2">${stageLadderHtml(currentStage,next)}</div>
        <p>${next?`Du startest wieder bei Pirat Kai. Bossfolge, Punkte und Spielfeld werden sauber zurückgesetzt – die Wörter und Gegner werden auf ${next} anspruchsvoller.`:'Stark! Du hast A1, A2, B1, B2, C1 und C2 geschafft. Du kannst eine neue Reise ab A1 beginnen.'}</p>`;
    }
  }

  new MutationObserver(()=>window.setTimeout(enhanceFinalVictory,0)).observe(result||document.body,{attributes:true,attributeFilter:['class'],subtree:true,childList:true,characterData:true});

  againBtn?.addEventListener('click',event=>{
    if(!result?.classList.contains('stage-complete'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next=result.dataset.nextStage||'A1';
    try{localStorage.setItem('piratePairsStage',next);}catch{}
    const url=new URL(location.href);
    url.searchParams.set('stage',next);
    url.searchParams.set('boss','1');
    location.assign(url.toString());
  },true);

  removeShellHelp();
  syncTributeFromBody();
  syncBossChrome();
})();
