(() => {
  const gameNode=document.getElementById('game-data');
  const bossNode=document.getElementById('boss-data');
  if(!gameNode||!bossNode)return;

  const STAGES=['A1','A2','B1','B2','C1','C2'];
  const STAGE_DATA={
    A1:{title:'Grundstufe',copy:'Einfache Alltagswörter',memory:0,forget:0,delay:0,vocabulary:[
      {id:'ship',source:'Schiff',target:'ship',category:'a1'},
      {id:'island',source:'Insel',target:'island',category:'a1'},
      {id:'sun',source:'Sonne',target:'sun',category:'a1'},
      {id:'water',source:'Wasser',target:'water',category:'a1'},
      {id:'apple',source:'Apfel',target:'apple',category:'a1'},
      {id:'dog',source:'Hund',target:'dog',category:'a1'},
      {id:'house',source:'Haus',target:'house',category:'a1'},
      {id:'bread',source:'Brot',target:'bread',category:'a1'},
    ]},
    A2:{title:'Alltagsstufe',copy:'Reisen, Schule und Alltag',memory:.02,forget:.01,delay:25,vocabulary:[
      {id:'station',source:'Bahnhof',target:'station',category:'a2'},
      {id:'journey',source:'Reise',target:'journey',category:'a2'},
      {id:'school',source:'Schule',target:'school',category:'a2'},
      {id:'breakfast',source:'Frühstück',target:'breakfast',category:'a2'},
      {id:'pay',source:'bezahlen',target:'pay',category:'a2'},
      {id:'visit',source:'besuchen',target:'visit',category:'a2'},
      {id:'friendly',source:'freundlich',target:'friendly',category:'a2'},
      {id:'tomorrow',source:'morgen',target:'tomorrow',category:'a2'},
    ]},
    B1:{title:'Fortgeschritten',copy:'Meinungen, Erfahrungen und Ziele',memory:.04,forget:.02,delay:50,vocabulary:[
      {id:'decision',source:'Entscheidung',target:'decision',category:'b1'},
      {id:'experience',source:'Erfahrung',target:'experience',category:'b1'},
      {id:'possibility',source:'Möglichkeit',target:'possibility',category:'b1'},
      {id:'opinion',source:'Meinung',target:'opinion',category:'b1'},
      {id:'explain',source:'erklären',target:'explain',category:'b1'},
      {id:'achieve',source:'erreichen',target:'achieve',category:'b1'},
      {id:'improve',source:'verbessern',target:'improve',category:'b1'},
      {id:'responsible',source:'verantwortlich',target:'responsible',category:'b1'},
    ]},
    B2:{title:'Selbstständig',copy:'Komplexere Gedanken und Zusammenhänge',memory:.06,forget:.03,delay:75,vocabulary:[
      {id:'challenge',source:'Herausforderung',target:'challenge',category:'b2'},
      {id:'impact',source:'Auswirkung',target:'impact',category:'b2'},
      {id:'prerequisite',source:'Voraussetzung',target:'prerequisite',category:'b2'},
      {id:'convince',source:'überzeugen',target:'convince',category:'b2'},
      {id:'consider',source:'berücksichtigen',target:'consider',category:'b2'},
      {id:'reliable',source:'zuverlässig',target:'reliable',category:'b2'},
      {id:'handle',source:'bewältigen',target:'handle',category:'b2'},
      {id:'connection',source:'Zusammenhang',target:'connection',category:'b2'},
    ]},
    C1:{title:'Kompetent',copy:'Nuancen und anspruchsvolle Begriffe',memory:.08,forget:.04,delay:100,vocabulary:[
      {id:'perception',source:'Wahrnehmung',target:'perception',category:'c1'},
      {id:'insight',source:'Erkenntnis',target:'insight',category:'c1'},
      {id:'sustainability',source:'Nachhaltigkeit',target:'sustainability',category:'c1'},
      {id:'differentiate',source:'differenzieren',target:'differentiate',category:'c1'},
      {id:'emphasize',source:'hervorheben',target:'emphasize',category:'c1'},
      {id:'far-reaching',source:'weitreichend',target:'far-reaching',category:'c1'},
      {id:'presuppose',source:'voraussetzen',target:'presuppose',category:'c1'},
      {id:'comprehensible',source:'nachvollziehbar',target:'comprehensible',category:'c1'},
    ]},
    C2:{title:'Meisterstufe',copy:'Sehr präzise und abstrakte Begriffe',memory:.10,forget:.05,delay:120,vocabulary:[
      {id:'ambiguity',source:'Mehrdeutigkeit',target:'ambiguity',category:'c2'},
      {id:'interaction',source:'Wechselwirkung',target:'interaction',category:'c2'},
      {id:'impartial',source:'unvoreingenommen',target:'impartial',category:'c2'},
      {id:'unequivocal',source:'unmissverständlich',target:'unequivocal',category:'c2'},
      {id:'illustrate',source:'veranschaulichen',target:'illustrate',category:'c2'},
      {id:'refute',source:'widerlegen',target:'refute',category:'c2'},
      {id:'coherent',source:'folgerichtig',target:'coherent',category:'c2'},
      {id:'subtle',source:'unterschwellig',target:'subtle',category:'c2'},
    ]},
  };

  const params=new URLSearchParams(location.search);
  const requested=(params.get('stage')||'').toUpperCase();
  let stored='';
  try{stored=(localStorage.getItem('piratePairsStage')||'').toUpperCase();}catch{}
  const stage=STAGES.includes(requested)?requested:STAGES.includes(stored)?stored:'A1';
  const stageIndex=STAGES.indexOf(stage);
  const stageData=STAGE_DATA[stage];

  try{localStorage.setItem('piratePairsStage',stage);}catch{}
  if(params.get('stage')!==stage){
    const url=new URL(location.href);
    url.searchParams.set('stage',stage);
    history.replaceState({},'',url);
  }

  let game,bossData;
  try{game=JSON.parse(gameNode.textContent||'{}');bossData=JSON.parse(bossNode.textContent||'{}');}catch{return;}
  game.vocabulary=stageData.vocabulary;
  game.stage=stage;
  game.stageTitle=stageData.title;
  game.stageCopy=stageData.copy;
  game.stageOrder=STAGES;
  gameNode.textContent=JSON.stringify(game);

  if(Array.isArray(bossData.bosses)){
    bossData.bosses=bossData.bosses.map(raw=>{
      const b={...raw};
      const baseMemory=Number(raw.memoryStrength??.61);
      const baseForget=Number(raw.forgetChance??.12);
      const baseDelay=Number(raw.thinkingDelay??720);
      b.memoryStrength=Math.min(.995,Math.max(.2,baseMemory+stageData.memory));
      b.forgetChance=Math.max(.005,Math.min(.5,baseForget-stageData.forget));
      b.thinkingDelay=Math.max(360,baseDelay-stageData.delay);
      return b;
    });
    bossData.stage=stage;
    bossNode.textContent=JSON.stringify(bossData);

    // Only the active boss selector applies, so the browser does not eagerly fetch
    // all ten portraits. The local SVG is a second layer and remains visible when
    // the immutable remote PNG is unavailable.
    const style=document.createElement('style');
    style.id='b07-current-boss-portrait-fallback';
    style.textContent=bossData.bosses.map(b=>{
      const primary=String(b.image||'').replace(/"/g,'\\"');
      const fallback=String(b.fallback||'').replace(/"/g,'\\"');
      const layers=[primary&&`url("${primary}")`,fallback&&`url("${fallback}")`,'radial-gradient(circle at 50% 38%, #18566a, #072d42 74%)'].filter(Boolean).join(', ');
      return `body[data-boss-id="${b.bossId}"] #bossRoadmap .boss-road-item[data-boss-id="${b.bossId}"].b07-current-boss .boss-road-num{background-image:${layers}!important}`;
    }).join('\n');
    document.head.appendChild(style);
  }

  document.body.dataset.languageStage=stage;
  document.body.dataset.stageIndex=String(stageIndex);
  window.__PIRATE_PAIRS_STAGE__={stage,stageIndex,stages:STAGES,meta:stageData};

  // B08 — iOS/Safari input safety.
  // B05 uses `inert` to isolate its first-start guide and boss preview. Safari can
  // keep an element non-interactive for a render turn after the guide closes. The
  // repeated release below is deliberately idempotent and never changes gameplay.
  function installInputSafety(){
    const app=document.getElementById('app');
    const intro=document.getElementById('intro');
    const result=document.getElementById('result');
    const help=document.getElementById('help');
    const startBtn=document.getElementById('startBtn');
    const restartBtn=document.getElementById('restartBtn');
    if(!intro||!startBtn)return;

    const nodes=[app,intro,result,help].filter(Boolean);
    const guideOpen=()=>{
      const guide=document.getElementById('bossGuideStart');
      return !!guide&&!guide.classList.contains('hidden')&&guide.getAttribute('aria-hidden')!=='true';
    };
    const previewOpen=()=>{
      const preview=document.getElementById('bossPreview');
      return !!preview&&!preview.classList.contains('hidden')&&preview.getAttribute('aria-hidden')!=='true';
    };
    const clearInert=(node,{aria=true}={})=>{
      if(!node)return;
      try{node.inert=false;}catch{}
      node.removeAttribute('inert');
      if(aria)node.removeAttribute('aria-hidden');
      node.style.pointerEvents='';
    };
    const release=()=>{
      // While the read-only boss preview is open, B05 intentionally owns modal isolation.
      if(previewOpen())return;
      // The first-start guide itself already blocks pointer input. Keeping the boss intro
      // inert underneath it is unnecessary and is the iOS failure mode this hotfix avoids.
      clearInert(intro,{aria:!guideOpen()});
      if(!guideOpen())nodes.forEach(node=>clearInert(node));
    };
    const settle=()=>{
      release();
      requestAnimationFrame(()=>{
        release();
        requestAnimationFrame(release);
      });
      window.setTimeout(release,220);
    };

    // A reset control outside all inert-able containers remains reachable even before
    // the boss intro has been started. In active gameplay the normal header reset remains.
    let safeReset=document.getElementById('b08IntroReset');
    if(!safeReset){
      safeReset=document.createElement('button');
      safeReset.id='b08IntroReset';
      safeReset.type='button';
      safeReset.setAttribute('aria-label','Duell neu starten');
      safeReset.textContent='↻';
      document.body.appendChild(safeReset);
      const style=document.createElement('style');
      style.id='b08-input-safety-style';
      style.textContent=`
        #b08IntroReset{position:fixed;z-index:175;right:max(14px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(240,203,111,.78);border-radius:50%;background:linear-gradient(180deg,rgba(87,25,36,.98),rgba(27,15,28,.99));color:#ffe39b;box-shadow:inset 0 1px rgba(255,242,190,.15),0 8px 20px rgba(0,0,0,.36);font:900 23px/1 system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        #b08IntroReset[hidden]{display:none!important}
        #intro:not(.hidden) #startBtn{pointer-events:auto!important;touch-action:manipulation!important;position:relative;z-index:3}
      `;
      document.head.appendChild(style);
    }
    const syncReset=()=>{
      const visible=!intro.classList.contains('hidden')&&!guideOpen()&&!previewOpen();
      safeReset.hidden=!visible;
    };
    safeReset.addEventListener('click',()=>{
      const url=new URL(location.href);
      location.replace(url.toString());
    });

    startBtn.disabled=false;
    startBtn.removeAttribute('aria-disabled');
    startBtn.addEventListener('pointerdown',settle,true);
    startBtn.addEventListener('touchstart',settle,{capture:true,passive:true});
    restartBtn?.addEventListener('pointerdown',settle,true);
    restartBtn?.addEventListener('touchstart',settle,{capture:true,passive:true});

    const observer=new MutationObserver(()=>{
      settle();
      syncReset();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden','inert']});

    document.body.dataset.inputSafety='b08';
    settle();
    syncReset();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installInputSafety,{once:true});
  else installInputSafety();
})();
