(() => {
  const dataNode=document.getElementById('boss-data');
  const BOSSES=(()=>{try{return JSON.parse(dataNode?.textContent||'{}').bosses||[];}catch{return[];}})();
  const skillbar=document.querySelector('.skillbar');
  const peekBtn=document.getElementById('peekBtn');
  const intro=document.getElementById('intro');
  const startBtn=document.getElementById('startBtn');
  if(!BOSSES.length||!skillbar||!peekBtn||!intro)return;

  const bossById=id=>BOSSES.find(b=>Number(b.bossId)===Number(id))||BOSSES[0];
  const currentBossId=()=>Number(document.body.dataset.bossId||BOSSES[0]?.bossId||1);
  const shortName=b=>(b.shortName||b.name||`BOSS ${b.bossId}`).replace(/^PIRATENKÖNIG\s+/i,'VARKOS').replace(/^KAPITÄN\s+/i,'').slice(0,9);
  const modalBackgroundNodes=()=>[
    document.getElementById('app'),
    intro,
    document.getElementById('result'),
    document.getElementById('help'),
  ].filter(Boolean);

  function setBackgroundInert(active){
    modalBackgroundNodes().forEach(node=>{
      node.inert=active;
      if(active)node.setAttribute('aria-hidden','true');
      else node.removeAttribute('aria-hidden');
    });
  }

  function trapTab(event,overlay){
    if(event.key!=='Tab')return;
    const focusable=[...overlay.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el=>!el.closest('.hidden'));
    if(!focusable.length){event.preventDefault();return;}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }

  function enhanceBossIntro(){
    intro.classList.add('boss-explainer');
    const power=intro.querySelector('.boss-power');
    const label=power?.querySelector('small');
    if(label)label.textContent='SO SPIELT DIESER BOSS';
    if(power&&!power.querySelector('.boss-brief-note')){
      const note=document.createElement('span');
      note.className='boss-brief-note';
      note.textContent='Der Trick wird im Kampf sichtbar angekündigt – beobachte die Karten genau.';
      power.appendChild(note);
    }
    if(startBtn)startBtn.textContent='OK · DUELL STARTEN';
  }

  function createStartGuide(){
    const overlay=document.createElement('section');
    overlay.id='bossGuideStart';
    overlay.className='boss-guide-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','bossGuideTitle');
    overlay.innerHTML=`
      <div class="boss-guide-card">
        <div class="boss-guide-emblem" aria-hidden="true">♛</div>
        <span class="boss-guide-eyebrow">TULA’S ISLAND · BOSS-DUELLE</span>
        <h2 id="bossGuideTitle">Jeder Boss spielt anders</h2>
        <p>Alle zehn Piraten haben eine eigene Fähigkeit. Ihre Tricks werden sichtbar angekündigt – du kannst also reagieren, wenn du aufmerksam bleibst.</p>
        <div class="boss-guide-steps" aria-label="Bossduell Hinweise">
          <div class="boss-guide-step"><b>BEOBACHTEN</b>Animationen zeigen dir, was der Boss verändert.</div>
          <div class="boss-guide-step"><b>ANPASSEN</b>Bomben, Nebel, Ketten und mehr verändern deine Taktik.</div>
          <div class="boss-guide-step"><b>VORSCHAU</b>Unten kannst du jeden Boss und seinen Trick ansehen.</div>
        </div>
        <button class="boss-guide-cta" id="bossGuideContinue" type="button">WEITER ZUM ERSTEN BOSS</button>
        <span class="boss-guide-foot">Die Boss-Vorschau verändert dein laufendes Duell nicht.</span>
      </div>`;
    document.body.appendChild(overlay);
    const continueBtn=overlay.querySelector('#bossGuideContinue');
    setBackgroundInert(true);
    window.requestAnimationFrame(()=>continueBtn?.focus({preventScroll:true}));
    overlay.addEventListener('keydown',event=>trapTab(event,overlay));
    const close=()=>{
      if(overlay.classList.contains('hidden'))return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
      overlay.inert=true;
      setBackgroundInert(false);
      window.setTimeout(()=>{
        overlay.remove();
        startBtn?.focus({preventScroll:true});
      },180);
    };
    continueBtn?.addEventListener('click',close);
    return overlay;
  }

  function createPreview(){
    const overlay=document.createElement('section');
    overlay.id='bossPreview';
    overlay.className='boss-preview-overlay hidden';
    overlay.inert=true;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','bossPreviewName');
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`
      <div class="boss-preview-card">
        <button class="boss-preview-x" type="button" aria-label="Boss-Vorschau schließen">×</button>
        <div class="boss-preview-portrait"><img id="bossPreviewImage" alt="" decoding="async" /></div>
        <span class="boss-preview-level" id="bossPreviewLevel"></span>
        <h2 id="bossPreviewName"></h2>
        <span class="boss-preview-location" id="bossPreviewLocation"></span>
        <div class="boss-preview-power">
          <small>BOSS-FÄHIGKEIT</small>
          <b id="bossPreviewPower"></b>
          <p id="bossPreviewCopy"></p>
        </div>
        <span class="boss-preview-status" id="bossPreviewStatus"></span>
        <button class="boss-preview-close-main" type="button">OK</button>
      </div>`;
    document.body.appendChild(overlay);
    let returnFocus=null;
    const close=()=>{
      if(overlay.classList.contains('hidden'))return;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
      overlay.inert=true;
      setBackgroundInert(false);
      window.setTimeout(()=>returnFocus?.focus?.({preventScroll:true}),180);
    };
    const openFrom=trigger=>{
      returnFocus=trigger||document.activeElement;
      setBackgroundInert(true);
      overlay.inert=false;
      overlay.removeAttribute('aria-hidden');
      overlay.classList.remove('hidden');
      window.setTimeout(()=>overlay.querySelector('.boss-preview-close-main')?.focus({preventScroll:true}),180);
    };
    overlay.querySelector('.boss-preview-x')?.addEventListener('click',close);
    overlay.querySelector('.boss-preview-close-main')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      trapTab(e,overlay);
    });
    return {overlay,close,openFrom};
  }

  const preview=createPreview();

  function openPreview(b,trigger){
    const active=currentBossId();
    const image=document.getElementById('bossPreviewImage');
    if(image){
      image.onerror=()=>{if(b.fallback&&image.src!==b.fallback)image.src=b.fallback;};
      image.src=b.image||b.fallback||'';
      image.alt=b.name||`Boss ${b.bossId}`;
    }
    const level=document.getElementById('bossPreviewLevel');
    const name=document.getElementById('bossPreviewName');
    const location=document.getElementById('bossPreviewLocation');
    const power=document.getElementById('bossPreviewPower');
    const copy=document.getElementById('bossPreviewCopy');
    const status=document.getElementById('bossPreviewStatus');
    if(level)level.textContent=`LEVEL ${b.bossId} · ${Number(b.bossId)===active?'AKTUELLER BOSS':'BOSS-VORSCHAU'}`;
    if(name)name.textContent=b.name||`Boss ${b.bossId}`;
    if(location)location.textContent=b.location||'';
    if(power)power.textContent=b.ability?.name||'Kein Spezialtrick';
    if(copy)copy.textContent=b.ability?.description||'Dieser Boss besitzt keine zusätzliche Fähigkeit.';
    if(status){
      status.textContent=Number(b.bossId)===active
        ? 'Das ist dein aktuelles Duell. Schließe die Vorschau, um weiterzuspielen.'
        : Number(b.bossId)<active
          ? 'Bereits passiert · Du kannst den Trick jederzeit noch einmal nachlesen.'
          : 'Vorschau auf einen späteren Boss · Dein aktuelles Duell bleibt unverändert.';
    }
    preview.openFrom(trigger);
  }

  const shell=document.createElement('div');
  shell.className='boss-roadmap-shell';
  shell.innerHTML=`
    <div class="boss-roadmap-head"><b>BOSS-ROUTE 1–10</b><span>TIPPE FÜR FÄHIGKEIT</span></div>
    <div class="boss-roadmap" id="bossRoadmap" role="group" aria-label="Boss-Vorschau"></div>`;
  const rail=shell.querySelector('#bossRoadmap');
  const portraitGradient='radial-gradient(circle at 50% 38%, #18566a, #072d42 74%)';

  function setPortraitBackground(button,url){
    const medallion=button.querySelector('.boss-road-num');
    if(!medallion)return;
    medallion.style.backgroundImage=url?`url("${url}"), ${portraitGradient}`:portraitGradient;
  }

  function loadPortrait(button){
    if(button.dataset.portraitLoaded==='1'||button.dataset.portraitLoading==='1')return;
    const primary=button.dataset.bossImage||'';
    const fallback=button.dataset.bossFallback||'';
    if(!primary){button.dataset.portraitLoaded='1';return;}
    button.dataset.portraitLoading='1';
    const tryLoad=(url,allowFallback)=>{
      const probe=new Image();
      probe.decoding='async';
      probe.onload=()=>{
        if(!button.isConnected)return;
        setPortraitBackground(button,url);
        button.dataset.portraitLoaded='1';
        delete button.dataset.portraitLoading;
      };
      probe.onerror=()=>{
        if(allowFallback&&fallback&&fallback!==url){tryLoad(fallback,false);return;}
        delete button.dataset.portraitLoading;
        button.dataset.portraitLoaded='error';
      };
      probe.src=url;
    };
    tryLoad(primary,true);
  }

  const portraitObserver='IntersectionObserver' in window
    ? new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(!entry.isIntersecting)return;
          loadPortrait(entry.target);
          portraitObserver.unobserve(entry.target);
        });
      },{root:rail,rootMargin:'0px 96px 0px 96px',threshold:.01})
    : null;

  BOSSES.forEach(b=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='boss-road-item future';
    button.dataset.bossId=String(b.bossId);
    button.dataset.bossImage=b.image||'';
    button.dataset.bossFallback=b.fallback||'';
    button.setAttribute('aria-label',`Level ${b.bossId}: ${b.name}. Fähigkeit ${b.ability?.name||'keine'}. Vorschau öffnen.`);
    button.innerHTML=`<span class="boss-road-num">${String(b.bossId).padStart(2,'0')}</span><span class="boss-road-name">${shortName(b)}</span>`;
    setPortraitBackground(button,'');
    button.addEventListener('click',()=>openPreview(b,button));
    rail.appendChild(button);
    if(portraitObserver)portraitObserver.observe(button);
  });

  // Keep the original button node so the gameplay listener already attached by B04 remains intact.
  skillbar.replaceChildren(shell,peekBtn);
  skillbar.classList.add('boss-dock');
  peekBtn.setAttribute('aria-label','Muschelblick einmal einsetzen');

  if(!portraitObserver){
    const activeButton=rail.querySelector(`.boss-road-item[data-boss-id="${currentBossId()}"]`);
    if(activeButton)loadPortrait(activeButton);
  }

  function updateRoadmap({scroll=true}={}){
    const active=currentBossId();
    rail.querySelectorAll('.boss-road-item').forEach(btn=>{
      const id=Number(btn.dataset.bossId);
      btn.classList.toggle('current',id===active);
      btn.classList.toggle('past',id<active);
      btn.classList.toggle('future',id>active);
      if(id===active)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current');
    });
    const current=rail.querySelector(`.boss-road-item[data-boss-id="${active}"]`);
    intro.setAttribute('aria-label',`${bossById(active).name}: ${bossById(active).ability?.name||'Bossfähigkeit'}`);
    if(current&&!portraitObserver)loadPortrait(current);
    if(!scroll||!current)return;
    const target=current.offsetLeft-(rail.clientWidth-current.offsetWidth)/2;
    rail.scrollTo({left:Math.max(0,target),behavior:'smooth'});
  }

  enhanceBossIntro();
  createStartGuide();
  window.requestAnimationFrame(()=>updateRoadmap({scroll:true}));

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='data-boss-id')){
      enhanceBossIntro();
      updateRoadmap({scroll:true});
    }
  });
  observer.observe(document.body,{attributes:true,attributeFilter:['data-boss-id']});
})();