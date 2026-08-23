import fs from 'node:fs';

function replaceExact(path, from, to, label) {
  const src = fs.readFileSync(path, 'utf8');
  if (!src.includes(from)) throw new Error(`Missing patch anchor: ${label}`);
  fs.writeFileSync(path, src.replace(from, to));
}

const core='public/pirate-pairs-b04.js';
const index='src/pages/index.astro';

replaceExact(core,
`  let shadowIndex=null, shadowExpiresAt=null;\n  let varkosPhase=1, varkosPhaseAction=0;`,
`  let shadowIndex=null, shadowExpiresAt=null;\n  let helpOpen=false, helpWaiters=[];\n  let varkosPhase=1, varkosPhaseAction=0;`,
'help lifecycle state');

replaceExact(core,
`  const boss = () => BOSSES[bossIndex] || BOSSES[0];\n  const ability = () => boss().ability || null;\n  const isRoyalChaos = () => ability()?.type === 'royal-chaos';`,
`  const boss = () => BOSSES[bossIndex] || BOSSES[0];\n  const ability = () => boss().ability || null;\n  const bossId = () => Number(boss().bossId || bossIndex + 1);\n  const isRoyalChaos = () => ability()?.type === 'royal-chaos';\n  const isPersistentBrax = () => bossId()===2 && ability()?.type==='bomb' && ability()?.persistent===true;\n  const isPersistentAzrak = () => bossId()===9 && ability()?.type==='shadow' && ability()?.persistent===true;\n  const cadenceForAbility = a => bossId()===1 && a?.type==='swap' ? 1 : Math.max(1,Number(a?.everyPlayerAttempts||3));`,
'ability policy helpers');

replaceExact(core,
`    if(i===bombIndex&&!c.matched)btn.classList.add('bomb-armed');`,
`    if(i===bombIndex&&!c.matched){btn.classList.add('bomb-armed');if(isPersistentBrax())btn.classList.add('mystery-covered');}`,
'Brax persistent mystery marker');

replaceExact(core,
`  function resetStates(){\n    playerAttempts=0; lastAbilityAttempt=-1; bombIndex=null; bombExpiresAt=null; fogged=new Set(); fogExpiresAt=null; cursedCardId=null; tributeActive=false; tributeDeadline=null; chained=new Set(); chainExpiresAt=null; playerSeen=new Set();\n    cannonTargets=new Set(); cannonTouched=false; cannonExpiresAt=null; shadowIndex=null; shadowExpiresAt=null;varkosPhase=1;varkosPhaseAction=0;\n    document.body.classList.remove('tribute-active');delete document.body.dataset.varkosPhase;hideBanner();\n  }`,
`  function resetStates(){\n    playerAttempts=0; lastAbilityAttempt=-1; bombIndex=null; bombExpiresAt=null; fogged=new Set(); fogExpiresAt=null; cursedCardId=null; tributeActive=false; tributeDeadline=null; chained=new Set(); chainExpiresAt=null; playerSeen=new Set();\n    cannonTargets=new Set(); cannonTouched=false; cannonExpiresAt=null; shadowIndex=null; shadowExpiresAt=null;varkosPhase=1;varkosPhaseAction=0;\n    helpOpen=false;helpWaiters.splice(0).forEach(resolve=>resolve());help?.classList.add('hidden');\n    document.body.classList.remove('tribute-active');delete document.body.dataset.varkosPhase;hideBanner();\n  }`,
'reset help safely');

replaceExact(core,
`  function setTurnUi(){const player=turn==='player';turnPill.textContent=player?'DU BIST DRAN':\`${'${bossLabel()}'} DENKT …\`;turnPill.classList.toggle('ai',!player);peekBtn.disabled=peekUsed||!player||lock||selected.length>0||gameOver;}`,
`  function setTurnUi(){const player=turn==='player';turnPill.textContent=player?'DU BIST DRAN':\`${'${bossLabel()}'} DENKT …\`;turnPill.classList.toggle('ai',!player);peekBtn.disabled=peekUsed||!player||lock||helpOpen||selected.length>0||gameOver;}`,
'help disables active controls');

replaceExact(core,
`  async function banner(title,copy,tone='',ms=900){showBanner(title,copy,tone);await sleep(ms);hideBanner();}\n  function reindexMemory(){for(const[id,data]of aiMemory){const i=cards.findIndex(c=>c.id===id);if(i<0||cards[i]?.matched)aiMemory.delete(id);else data.index=i;}}`,
`  async function banner(title,copy,tone='',ms=900){showBanner(title,copy,tone);await sleep(ms);hideBanner();}\n  function waitForHelpClosed(){if(!helpOpen)return Promise.resolve();return new Promise(resolve=>helpWaiters.push(resolve));}\n  function openHelpPanel(){if(!help||helpOpen)return;helpOpen=true;help.classList.remove('hidden');setTurnUi();}\n  function closeHelpPanel(){if(!help)return;helpOpen=false;help.classList.add('hidden');const waiters=helpWaiters.splice(0);waiters.forEach(resolve=>resolve());render();setTurnUi();}\n  function reindexMemory(){for(const[id,data]of aiMemory){const i=cards.findIndex(c=>c.id===id);if(i<0||cards[i]?.matched)aiMemory.delete(id);else data.index=i;}}`,
'help pause/resume helpers');

replaceExact(core,
`  async function plantBomb(){const royal=isRoyalChaos(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));if(!opts.length)return false;clearBomb();bombIndex=shuffle(opts)[0];bombExpiresAt=playerAttempts+(royal?1:2);const el=cardEl(bombIndex);el?.classList.add('bomb-targeting');await banner(royal?'VARKOS LEGT EINE KRONENBOMBE!':'BRAX LEGT EINE BOMBE!',royal?'Die markierte Karte ist für diesen Versuch vermint: Treffer = −1 für dich und +1 für Varkos.':'Merk dir die markierte Karte. Öffnest du sie: −1 für dich, +1 für Brax.',royal?'varkos phase-2 bomb':'bomb',1000);el?.classList.remove('bomb-targeting');el?.classList.add('bomb-armed');return true;}`,
`  async function plantBomb(){\n    const royal=isRoyalChaos(),persistent=isPersistentBrax(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));\n    if(!opts.length)return false;\n    clearBomb();bombIndex=shuffle(opts)[0];bombExpiresAt=persistent?null:playerAttempts+(royal?1:2);\n    const el=cardEl(bombIndex);el?.classList.add('bomb-targeting');\n    await banner(royal?'VARKOS LEGT EINE KRONENBOMBE!':persistent?'BRAX VERDECKT EINE KARTE!':'BRAX LEGT EINE BOMBE!',royal?'Die markierte Karte ist für diesen Versuch vermint: Treffer = −1 für dich und +1 für Varkos.':persistent?'Eine Karte bleibt dauerhaft als ?-Pulverfalle markiert. Wird sie verbraucht, wählt Brax im nächsten Zug sofort eine neue.':'Merk dir die markierte Karte. Öffnest du sie: −1 für dich, +1 für Brax.',royal?'varkos phase-2 bomb':'bomb',1000);\n    el?.classList.remove('bomb-targeting');el?.classList.add('bomb-armed');if(persistent)el?.classList.add('mystery-covered');return true;\n  }`,
'Brax persistent trap');

replaceExact(core,
`  async function castShadow(){const generation=gameGeneration;const opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));if(!opts.length)return false;clearShadow();shadowIndex=shuffle(opts)[0];shadowExpiresAt=playerAttempts+1;const el=cardEl(shadowIndex);el?.classList.add('shadow-arriving');await banner('AZRAK RUFT DEN SCHATTEN!','Eine Karte verschwindet im Schatten und ist für dich blockiert. Nach deiner ersten Karte wandert der Schatten weiter.','shadow',980);if(generation!==gameGeneration)return false;el?.classList.remove('shadow-arriving');el?.classList.add('shadowed');el?.setAttribute('aria-disabled','true');return true;}`,
`  async function castShadow(){const generation=gameGeneration,persistent=isPersistentAzrak(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));if(!opts.length)return false;clearShadow();shadowIndex=shuffle(opts)[0];shadowExpiresAt=persistent?null:playerAttempts+1;const el=cardEl(shadowIndex);el?.classList.add('shadow-arriving');await banner('AZRAK RUFT DEN SCHATTEN!',persistent?'Azrak hält dauerhaft genau eine Karte im Schatten. Nach deiner ersten Auswahl wandert der Schatten weiter.':'Eine Karte verschwindet im Schatten und ist für dich blockiert. Nach deiner ersten Karte wandert der Schatten weiter.','shadow',980);if(generation!==gameGeneration)return false;el?.classList.remove('shadow-arriving');el?.classList.add('shadowed');el?.setAttribute('aria-disabled','true');return true;}`,
'Azrak persistent shadow');

replaceExact(core,
`  async function cleanExpired(){if(bombExpiresAt!=null&&playerAttempts>=bombExpiresAt)clearBomb(true);if(fogExpiresAt!=null&&playerAttempts>=fogExpiresAt)clearFog(true);if(tributeActive&&tributeDeadline!=null&&playerAttempts>=tributeDeadline)await failTribute();if(chainExpiresAt!=null&&playerAttempts>=chainExpiresAt)clearChains(true);if(cannonExpiresAt!=null&&playerAttempts>=cannonExpiresAt)clearCannon();if(shadowExpiresAt!=null&&playerAttempts>=shadowExpiresAt)clearShadow();}\n  async function maybeAbility(){\n    if(gameOver||selected.length)return;\n    const generation=gameGeneration;\n    await cleanExpired();if(generation!==gameGeneration)return;\n    const a=ability();if(!a?.type||a.type==='none')return;\n    if(a.type==='royal-chaos'){\n      await syncVarkosPhase(true);if(generation!==gameGeneration)return;\n      const cadence=varkosPhase===1?2:1;\n      if(!playerAttempts||playerAttempts%cadence!==0||lastAbilityAttempt===playerAttempts)return;\n      lastAbilityAttempt=playerAttempts;lock=true;setTurnUi();\n      try{await runRoyalChaos();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}\n      return;\n    }\n    const every=Math.max(1,Number(a.everyPlayerAttempts||3));if(!playerAttempts||playerAttempts%every!==0||lastAbilityAttempt===playerAttempts)return;lastAbilityAttempt=playerAttempts;lock=true;setTurnUi();\n    try{if(a.type==='swap')await swapHiddenCards();else if(a.type==='bomb')await plantBomb();else if(a.type==='fog')await castFog();else if(a.type==='memory-curse')await castMemoryCurse();else if(a.type==='tribute')await startTribute();else if(a.type==='chains')await castChains();else if(a.type==='cannon')await castCannon();else if(a.type==='line-shift')await shiftLine();else if(a.type==='shadow')await castShadow();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}\n  }`,
`  async function ensurePersistentAbility(){\n    if(isPersistentBrax()){if(bombIndex==null&&available().length)return plantBomb();return true;}\n    if(isPersistentAzrak()){if(shadowIndex==null&&available().length)return castShadow();return true;}\n    return false;\n  }\n  async function cleanExpired(){if(bombExpiresAt!=null&&playerAttempts>=bombExpiresAt)clearBomb(true);if(fogExpiresAt!=null&&playerAttempts>=fogExpiresAt)clearFog(true);if(tributeActive&&tributeDeadline!=null&&playerAttempts>=tributeDeadline)await failTribute();if(chainExpiresAt!=null&&playerAttempts>=chainExpiresAt)clearChains(true);if(cannonExpiresAt!=null&&playerAttempts>=cannonExpiresAt)clearCannon();if(shadowExpiresAt!=null&&playerAttempts>=shadowExpiresAt)clearShadow();}\n  async function maybeAbility(){\n    if(gameOver||selected.length)return;\n    await waitForHelpClosed();if(gameOver||selected.length)return;\n    const generation=gameGeneration;\n    await cleanExpired();if(generation!==gameGeneration)return;\n    if(isPersistentBrax()||isPersistentAzrak()){lock=true;setTurnUi();try{await ensurePersistentAbility();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}return;}\n    const a=ability();if(!a?.type||a.type==='none')return;\n    if(a.type==='royal-chaos'){\n      await syncVarkosPhase(true);if(generation!==gameGeneration)return;\n      const cadence=varkosPhase===1?2:1;\n      if(!playerAttempts||playerAttempts%cadence!==0||lastAbilityAttempt===playerAttempts)return;\n      lock=true;setTurnUi();let triggered=false;\n      try{triggered=await runRoyalChaos();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}\n      if(triggered!==false)lastAbilityAttempt=playerAttempts;\n      return;\n    }\n    const every=cadenceForAbility(a);if(!playerAttempts||playerAttempts%every!==0||lastAbilityAttempt===playerAttempts)return;lock=true;setTurnUi();let triggered=false;\n    try{if(a.type==='swap')triggered=await swapHiddenCards();else if(a.type==='bomb')triggered=await plantBomb();else if(a.type==='fog')triggered=await castFog();else if(a.type==='memory-curse')triggered=await castMemoryCurse();else if(a.type==='tribute')triggered=await startTribute();else if(a.type==='chains')triggered=await castChains();else if(a.type==='cannon')triggered=await castCannon();else if(a.type==='line-shift')triggered=await shiftLine();else if(a.type==='shadow')triggered=await castShadow();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}\n    if(triggered!==false)lastAbilityAttempt=playerAttempts;\n  }`,
'persistent and repeatable ability lifecycle');

replaceExact(core,
`  async function onPlayerCard(i){\n    if(lock||turn!=='player'||gameOver||cards[i]?.matched||selected.includes(i)||isOpen(i))return;`,
`  async function onPlayerCard(i){\n    if(helpOpen||lock||turn!=='player'||gameOver||cards[i]?.matched||selected.includes(i)||isOpen(i))return;`,
'help card guard');

replaceExact(core,
`  async function resolveSelection(actor){\n    const generation=gameGeneration,[a,b]=selected,match=cards[a].pairId===cards[b].pairId&&cards[a].lang!==cards[b].lang;await sleep(actor==='player'?650:520);if(generation!==gameGeneration)return;`,
`  async function resolveSelection(actor){\n    const generation=gameGeneration,[a,b]=selected,match=cards[a].pairId===cards[b].pairId&&cards[a].lang!==cards[b].lang;await sleep(actor==='player'?650:520);await waitForHelpClosed();if(generation!==gameGeneration)return;`,
'pause selection under help');

replaceExact(core,
`      await sleep(actor==='player'?550:430);if(generation!==gameGeneration)return;`,
`      await sleep(actor==='player'?550:430);await waitForHelpClosed();if(generation!==gameGeneration)return;`,
'pause mismatch under help');

replaceExact(core,
`  async function aiTurn(){if(gameOver)return;const generation=gameGeneration;turn='ai';lock=true;setTurnUi();cleanMemory();await sleep(360);if(generation!==gameGeneration)return;const pair=knownPair();let first=pair?pair[0]:randomAvailable();if(first==null){await enterPlayerTurn();return;}reveal(first,'ai');selected=[first];await sleep(780);if(generation!==gameGeneration)return;let second=pair?pair[1]:rememberedMate(cards[first].pairId,first);if(second==null||cards[second].matched||isOpen(second))second=randomAvailable([first]);if(second==null){hide(first);selected=[];await enterPlayerTurn();return;}reveal(second,'ai');selected.push(second);await resolveSelection('ai');}`,
`  async function aiTurn(){if(gameOver)return;const generation=gameGeneration;turn='ai';lock=true;setTurnUi();cleanMemory();await sleep(360);await waitForHelpClosed();if(generation!==gameGeneration)return;const pair=knownPair();let first=pair?pair[0]:randomAvailable();if(first==null){await enterPlayerTurn();return;}reveal(first,'ai');selected=[first];await sleep(780);await waitForHelpClosed();if(generation!==gameGeneration)return;let second=pair?pair[1]:rememberedMate(cards[first].pairId,first);if(second==null||cards[second].matched||isOpen(second))second=randomAvailable([first]);if(second==null){hide(first);selected=[];await enterPlayerTurn();return;}reveal(second,'ai');selected.push(second);await resolveSelection('ai');}`,
'pause AI under help');

replaceExact(core,
`  async function usePeek(){if(peekUsed||lock||turn!=='player'||selected.length||gameOver)return;`,
`  async function usePeek(){if(helpOpen||peekUsed||lock||turn!=='player'||selected.length||gameOver)return;`,
'help peek guard');

replaceExact(core,
`  startBtn?.addEventListener('click',()=>{intro.classList.add('hidden');lock=false;setTurnUi();showToast(isRoyalChaos()?'Varkos kämpft in drei Phasen – beobachte seine Wechsel genau.':\`Besiege ${'${boss().name}'} und merk dir die Übersetzungen.\`,'good');});\n  restartBtn?.addEventListener('click',()=>resetGame(false));\n  againBtn?.addEventListener('click',()=>{if(lastOutcome==='win'&&BOSSES[bossIndex+1]){bossIndex++;setBossInUrl();resetGame(true);}else resetGame(false);});\n  peekBtn?.addEventListener('click',usePeek);helpBtn?.addEventListener('click',()=>help.classList.remove('hidden'));closeHelp?.addEventListener('click',()=>help.classList.add('hidden'));help?.addEventListener('click',e=>{if(e.target===help)help.classList.add('hidden');});`,
`  startBtn?.addEventListener('click',async()=>{intro.classList.add('hidden');await enterPlayerTurn();showToast(isRoyalChaos()?'Varkos kämpft in drei Phasen – beobachte seine Wechsel genau.':\`Besiege ${'${boss().name}'} und merk dir die Übersetzungen.\`,'good');});\n  restartBtn?.addEventListener('click',()=>resetGame(false));\n  againBtn?.addEventListener('click',()=>{if(lastOutcome==='win'&&BOSSES[bossIndex+1]){bossIndex++;setBossInUrl();resetGame(true);}else resetGame(false);});\n  peekBtn?.addEventListener('click',usePeek);helpBtn?.addEventListener('click',openHelpPanel);closeHelp?.addEventListener('click',closeHelpPanel);help?.addEventListener('click',e=>{if(e.target===help)closeHelpPanel();});`,
'help listeners and initial persistent abilities');

replaceExact(index,
`        description: 'Alle drei deiner Versuche tauscht Kai zwei verdeckte Karten sichtbar miteinander. Folge der Bewegung genau.',\n        everyPlayerAttempts: 3,`,
`        description: 'Nach jedem deiner abgeschlossenen Versuche tauscht Kai zwei verdeckte Karten sichtbar miteinander. Folge der Bewegung genau.',\n        everyPlayerAttempts: 1,`,
'Kai cadence config');

replaceExact(index,
`      introCopy: 'Brax legt Bomben unter verdeckte Karten. Du siehst, welche Karte vermint wird. Öffnest du sie trotzdem, verlierst du einen Punkt und Brax bekommt einen.',\n      ability: {\n        type: 'bomb',\n        name: 'Pulverfalle',\n        description: 'Alle drei deiner Versuche vermint Brax eine sichtbare Kartenposition für zwei Versuche: Treffer = −1 Punkt für dich, +1 für Brax.',\n        everyPlayerAttempts: 3,\n      },`,
`      introCopy: 'Brax hält immer genau eine Kartenposition als sichtbare ?-Pulverfalle aktiv. Wird die Falle verbraucht, markiert er im nächsten Zug sofort eine neue Karte.',\n      ability: {\n        type: 'bomb',\n        name: 'Dauerhafte Pulverfalle',\n        description: 'Eine Karte bleibt dauerhaft markiert. Öffnest du sie: −1 Punkt für dich, +1 für Brax. Danach wählt Brax sofort die nächste Falle.',\n        everyPlayerAttempts: 1,\n        persistent: true,\n      },`,
'Brax persistent config');

replaceExact(index,
`        description: 'Alle zwei deiner Versuche blockiert Azrak eine Karte für deinen nächsten Versuch. Nach deiner ersten Auswahl wandert der Schatten auf eine andere verdeckte Karte.',\n        everyPlayerAttempts: 2,`,
`        description: 'Azrak hält dauerhaft genau eine Karte im Schatten. Nach deiner ersten Auswahl wandert der Schatten auf eine andere verdeckte Karte und bleibt aktiv, bis keine freie Karte mehr übrig ist.',\n        everyPlayerAttempts: 1,\n        persistent: true,`,
'Azrak persistent config');

const emblem='public/pirate-pairs-card-emblem.css';
replaceExact(emblem,
`@import url('./pirate-pairs-art-registry.css');`,
`@import url('./pirate-pairs-art-registry.css');\n@import url('./pirate-pairs-ability-lifecycle.css');`,
'lifecycle CSS import');

fs.writeFileSync('public/pirate-pairs-ability-lifecycle.css', `/* Pirate Pairs — boss ability lifecycle visuals */\nhtml body .card.mystery-covered .back::after{\n  content:"?";position:absolute;z-index:15;right:7px;top:6px;width:22px;height:22px;display:grid;place-items:center;\n  border:1px solid rgba(255,225,139,.9);border-radius:50%;background:linear-gradient(180deg,#8b3c27,#4d211d);\n  color:#fff0ad;font:1000 15px/1 Georgia,serif;box-shadow:0 3px 8px rgba(0,0,0,.42),0 0 10px rgba(235,143,72,.25);pointer-events:none;\n}\nhtml body .card.mystery-covered.peek .front .word,html body .card.mystery-covered.flipped .front .word{opacity:0!important;text-shadow:none!important}\nhtml body .card.mystery-covered.peek .front::after,html body .card.mystery-covered.flipped .front::after{\n  content:"?";position:absolute;inset:0;display:grid;place-items:center;color:#ffe6a1;font:1000 clamp(28px,8vw,52px)/1 Georgia,serif;\n  background:radial-gradient(circle at 50% 46%,rgba(94,37,29,.9),rgba(10,33,45,.92) 68%);text-shadow:0 3px 7px rgba(0,0,0,.55);pointer-events:none;\n}\n.help:not(.hidden){touch-action:none}\n`);

fs.writeFileSync('tests/ability-lifecycle.mjs', `import fs from 'node:fs';\nimport assert from 'node:assert/strict';\nconst core=fs.readFileSync('public/pirate-pairs-b04.js','utf8');\nconst index=fs.readFileSync('src/pages/index.astro','utf8');\nconst css=fs.readFileSync('public/pirate-pairs-ability-lifecycle.css','utf8');\nassert.match(index,/bossId: 1,[\\s\\S]*?type: 'swap',[\\s\\S]*?everyPlayerAttempts: 1,/,'Kai must trigger after every completed player attempt');\nassert.match(index,/bossId: 2,[\\s\\S]*?type: 'bomb',[\\s\\S]*?persistent: true,/,'Brax must keep a persistent trap');\nassert.match(index,/bossId: 9,[\\s\\S]*?type: 'shadow',[\\s\\S]*?persistent: true,/,'Azrak must keep one persistent shadow');\nfor(const type of ['fog','memory-curse','tribute','chains','cannon','line-shift','royal-chaos'])assert.ok(index.includes(\`type: '\${type}'\`),\`missing boss ability type: \${type}\`);\nassert.match(core,/const cadenceForAbility = a => bossId\\(\\)===1/,'Kai cadence override missing');\nassert.match(core,/async function ensurePersistentAbility\\(\\)/,'persistent ability owner missing');\nassert.match(core,/bombExpiresAt=persistent\\?null/,'Brax trap must not expire by attempt counter');\nassert.match(core,/shadowExpiresAt=persistent\\?null/,'Azrak shadow must not expire by attempt counter');\nassert.match(core,/if\\(helpOpen\\|\\|lock\\|\\|turn!==\'player\'/,'card input must stop while help is open');\nassert.match(core,/async function usePeek\\(\\)\\{if\\(helpOpen\\|\\|peekUsed/,'peek must stop while help is open');\nassert.match(core,/await waitForHelpClosed\\(\\)/,'gameplay transitions must wait for help to close');\nassert.match(core,/helpBtn\\?\\.addEventListener\\('click',openHelpPanel\\)/,'help open handler missing');\nassert.match(core,/closeHelp\\?\\.addEventListener\\('click',closeHelpPanel\\)/,'help close handler missing');\nassert.match(core,/startBtn\\?\\.addEventListener\\('click',async\\(\\)=>\\{intro\\.classList\\.add\\('hidden'\\);await enterPlayerTurn\\(\\)/,'initial persistent boss state must arm immediately after intro');\nassert.match(css,/card\\.mystery-covered \\.back::after/,'persistent Brax card needs a visible question mark');\nconsole.log('Pirate Pairs boss ability lifecycle: PASS');\n`);

const workflow='.github/workflows/deploy.yml';
replaceExact(workflow,
`      - name: Verify premium art registry\n        run: node tests/art-registry.mjs\n\n      - name: Build`,
`      - name: Verify premium art registry\n        run: node tests/art-registry.mjs\n\n      - name: Verify boss ability lifecycle\n        run: node tests/ability-lifecycle.mjs && node --check public/pirate-pairs-b04.js\n\n      - name: Build`,
'ability lifecycle CI');

console.log('Ability lifecycle patch applied.');
