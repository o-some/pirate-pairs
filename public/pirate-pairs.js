(() => {
  const GAME = JSON.parse(document.getElementById('game-data').textContent || '{}');
  const BOSS = JSON.parse(document.getElementById('boss-data').textContent || '{}');
  const PAIRS = Array.isArray(GAME.vocabulary) ? GAME.vocabulary : [];
  const grid = document.getElementById('grid');
  const intro = document.getElementById('intro');
  const result = document.getElementById('result');
  const help = document.getElementById('help');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const againBtn = document.getElementById('againBtn');
  const helpBtn = document.getElementById('helpBtn');
  const closeHelp = document.getElementById('closeHelp');
  const peekBtn = document.getElementById('peekBtn');
  const toast = document.getElementById('toast');
  const turnPill = document.getElementById('turnPill');
  const playerScoreEl = document.getElementById('playerScore');
  const aiScoreEl = document.getElementById('aiScore');
  const progressEl = document.getElementById('progress');
  const resultTitle = document.getElementById('resultTitle');
  const resultCopy = document.getElementById('resultCopy');
  const resultPlayer = document.getElementById('resultPlayer');
  const resultShells = document.getElementById('resultShells');
  const resultXp = document.getElementById('resultXp');
  const resultTag = document.getElementById('resultTag');

  const AI_MEMORY_CHANCE = Number(BOSS.memoryStrength ?? 0.61);
  const AI_FORGET_CHANCE = Number(BOSS.forgetChance ?? 0.12);
  const AI_THINKING_DELAY = Number(BOSS.thinkingDelay ?? 720);
  let cards = [];
  let turn = 'player';
  let selected = [];
  let lock = true;
  let scores = { player: 0, ai: 0 };
  let aiMemory = new Map();
  let peekUsed = false;
  let gameOver = false;
  let toastTimer;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = arr => {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };

  function makeDeck(){
    const deck=[];
    PAIRS.forEach((pair,pairId)=>{
      deck.push({id:`${pair.id}-source`,pairId,lang:GAME.sourceLabel || GAME.sourceLanguage?.toUpperCase() || 'SRC',word:pair.source,matched:false,owner:null});
      deck.push({id:`${pair.id}-target`,pairId,lang:GAME.targetLabel || GAME.targetLanguage?.toUpperCase() || 'DST',word:pair.target,matched:false,owner:null});
    });
    return shuffle(deck);
  }

  function render(){
    grid.innerHTML='';
    cards.forEach((card,index)=>{
      const btn=document.createElement('button');
      btn.className='card';
      btn.dataset.index=String(index);
      btn.dataset.id=card.id;
      btn.setAttribute('aria-label',`Verdeckte Memory-Karte ${index+1}`);
      btn.innerHTML=`<span class="face back"><span class="crest">☸</span></span><span class="face front"><span class="lang ${card.lang===(GAME.targetLabel || GAME.targetLanguage?.toUpperCase())?'en':''}">${card.lang}</span><span class="word">${card.word}</span><span class="matched-by"></span></span>`;
      btn.addEventListener('click',()=>onPlayerCard(index));
      grid.appendChild(btn);
    });
    updateHud();
  }

  function resetGame(showIntro=false){
    cards=makeDeck();turn='player';selected=[];lock=showIntro;scores={player:0,ai:0};aiMemory=new Map();peekUsed=false;gameOver=false;
    result.classList.add('hidden');
    peekBtn.disabled=false;peekBtn.textContent='1× EINSETZEN';
    render();setTurnUi();
    if(showIntro) intro.classList.remove('hidden'); else intro.classList.add('hidden');
  }

  function updateHud(){
    playerScoreEl.textContent=String(scores.player);aiScoreEl.textContent=String(scores.ai);
    progressEl.textContent=`${scores.player+scores.ai} / ${PAIRS.length}`;
  }

  function setTurnUi(){
    const player=turn==='player';
    turnPill.textContent=player?'DU BIST DRAN':'KAI DENKT …';
    turnPill.classList.toggle('ai',!player);
    peekBtn.disabled=peekUsed || !player || lock || selected.length>0 || gameOver;
  }

  function cardEl(index){return grid.querySelector(`.card[data-index="${index}"]`);}
  function isOpen(index){const el=cardEl(index);return el?.classList.contains('flipped') || el?.classList.contains('matched') || el?.classList.contains('peek');}

  function reveal(index,actor='player'){
    const card=cards[index]; const el=cardEl(index); if(!card||!el)return;
    el.classList.add('flipped');
    el.setAttribute('aria-label',`${card.lang}: ${card.word}`);
    if(actor==='ai' || Math.random()<AI_MEMORY_CHANCE) aiMemory.set(card.id,{pairId:card.pairId,index});
  }
  function hide(index){const el=cardEl(index);if(el&&!cards[index].matched){el.classList.remove('flipped');el.setAttribute('aria-label',`Verdeckte Memory-Karte ${index+1}`);}}
  function markMatched(indices,owner){
    indices.forEach(i=>{cards[i].matched=true;cards[i].owner=owner;const el=cardEl(i);el.classList.remove('flipped');el.classList.add('matched',owner==='ai'?'kai':'tula');const lab=el.querySelector('.matched-by');lab.textContent=owner==='player'?'✓ TULA':'☠ KAI';});
  }
  function rememberPairText(indices){
    const a=cards[indices[0]],b=cards[indices[1]];const sourceLabel=GAME.sourceLabel || GAME.sourceLanguage?.toUpperCase();const source=a.lang===sourceLabel?a:b;const target=a.lang===sourceLabel?b:a;return `${source.word} = ${target.word}`;
  }
  function showToast(text,type=''){
    clearTimeout(toastTimer);toast.textContent=text;toast.className=`toast show ${type}`.trim();toastTimer=setTimeout(()=>toast.className='toast',2100);
  }

  async function onPlayerCard(index){
    if(lock||turn!=='player'||gameOver||cards[index].matched||selected.includes(index)||isOpen(index))return;
    reveal(index,'player');selected.push(index);setTurnUi();
    if(selected.length===2){lock=true;setTurnUi();await resolveSelection('player');}
  }

  async function resolveSelection(actor){
    const [a,b]=selected;const match=cards[a].pairId===cards[b].pairId && cards[a].lang!==cards[b].lang;
    await sleep(actor==='player'?650:520);
    if(match){
      markMatched([a,b],actor);scores[actor]++;updateHud();
      const learned=rememberPairText([a,b]);showToast(actor==='player'?`✓ Stark! ${learned}`:`☠ Kai schnappt sich: ${learned}`,actor==='player'?'good':'bad');
      selected=[];lock=false;setTurnUi();
      if(checkGameEnd())return;
      if(actor==='ai'){await sleep(520);aiTurn();}
    }else{
      if(actor==='player') showToast('Kein Paar – Kai ist dran.','bad'); else showToast('Kai liegt daneben – dein Zug!','good');
      await sleep(actor==='player'?550:430);hide(a);hide(b);selected=[];turn=actor==='player'?'ai':'player';lock=false;setTurnUi();
      if(turn==='ai') {lock=true;setTurnUi();await sleep(AI_THINKING_DELAY);aiTurn();}
    }
  }

  function availableIndices(){return cards.map((c,i)=>({c,i})).filter(x=>!x.c.matched&&!isOpen(x.i)).map(x=>x.i);}
  function cleanMemory(){
    for(const [id,data] of aiMemory){if(cards[data.index]?.matched)aiMemory.delete(id);else if(Math.random()<AI_FORGET_CHANCE)aiMemory.delete(id);}
  }
  function knownPair(exclude=[]){
    const byPair=new Map();
    for(const data of aiMemory.values()){
      if(exclude.includes(data.index)||cards[data.index]?.matched||isOpen(data.index))continue;
      if(!byPair.has(data.pairId))byPair.set(data.pairId,[]);byPair.get(data.pairId).push(data.index);
    }
    for(const indexes of byPair.values()) if(indexes.length>=2) return indexes.slice(0,2);
    return null;
  }
  function rememberedMate(pairId,exclude){
    const options=[];for(const data of aiMemory.values()) if(data.pairId===pairId&&data.index!==exclude&&!cards[data.index]?.matched&&!isOpen(data.index))options.push(data.index);
    return options.length?options[0]:null;
  }
  function randomAvailable(exclude=[]){const opts=availableIndices().filter(i=>!exclude.includes(i));return opts.length?opts[Math.floor(Math.random()*opts.length)]:null;}

  async function aiTurn(){
    if(gameOver)return;turn='ai';lock=true;setTurnUi();cleanMemory();
    await sleep(360);
    const pair=knownPair();let first=pair?pair[0]:randomAvailable();
    if(first==null){lock=false;return;}
    reveal(first,'ai');selected=[first];await sleep(780);
    let second=pair?pair[1]:rememberedMate(cards[first].pairId,first);
    if(second==null||cards[second].matched||isOpen(second))second=randomAvailable([first]);
    if(second==null){lock=false;return;}
    reveal(second,'ai');selected.push(second);await resolveSelection('ai');
  }

  async function usePeek(){
    if(peekUsed||lock||turn!=='player'||selected.length||gameOver)return;
    const opts=availableIndices();if(opts.length<2)return;
    peekUsed=true;peekBtn.disabled=true;peekBtn.textContent='VERBRAUCHT';lock=true;setTurnUi();
    const picks=shuffle(opts).slice(0,2);
    picks.forEach(i=>cardEl(i)?.classList.add('peek'));
    showToast('🐚 Muschelblick: Merk dir diese beiden Karten!','good');
    await sleep(1350);picks.forEach(i=>cardEl(i)?.classList.remove('peek'));lock=false;setTurnUi();
  }

  function checkGameEnd(){
    if(scores.player+scores.ai<PAIRS.length)return false;
    gameOver=true;lock=true;setTurnUi();
    const win=scores.player>scores.ai, tie=scores.player===scores.ai;
    const shells=win?20:tie?10:5;const xp=win?60:tie?40:25;
    resultTitle.textContent=win?'Du hast Kai geschlagen!':tie?'Unentschieden auf hoher See!':'Kai gewinnt diese Runde.';
    resultCopy.textContent=win?'Pirat Kai muss die Wörterbucht räumen. Nächster Halt: Kapitän Brax.':tie?'Keiner bekommt die Bucht allein. Noch eine Runde entscheidet es.':'Kai hatte diesmal das bessere Gedächtnis. Beim nächsten Duell kennst du seine Tricks.';
    resultPlayer.textContent=String(scores.player);resultShells.textContent=`+${shells}`;resultXp.textContent=`+${xp}`;resultTag.textContent=win?'✓ BOSS BESIEGT':tie?'⚔ GLEICHSTAND':'☠ BOSS GEWINNT';
    setTimeout(()=>result.classList.remove('hidden'),900);return true;
  }

  startBtn.addEventListener('click',()=>{intro.classList.add('hidden');lock=false;setTurnUi();showToast('Finde das erste Übersetzungspaar.','good');});
  restartBtn.addEventListener('click',()=>resetGame(false));
  againBtn.addEventListener('click',()=>resetGame(false));
  peekBtn.addEventListener('click',usePeek);
  helpBtn.addEventListener('click',()=>help.classList.remove('hidden'));
  closeHelp.addEventListener('click',()=>help.classList.add('hidden'));
  help.addEventListener('click',e=>{if(e.target===help)help.classList.add('hidden')});
  resetGame(true);
})();
