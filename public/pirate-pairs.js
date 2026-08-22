(() => {
  const GAME = JSON.parse(document.getElementById('game-data').textContent || '{}');
  const BOSS_DATA = JSON.parse(document.getElementById('boss-data').textContent || '{}');
  const PAIRS = Array.isArray(GAME.vocabulary) ? GAME.vocabulary : [];
  const BOSSES = Array.isArray(BOSS_DATA.bosses) && BOSS_DATA.bosses.length ? BOSS_DATA.bosses : [BOSS_DATA];

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
  const bossNameEl = document.getElementById('bossName');
  const bossDuelSprite = document.getElementById('bossDuelSprite');
  const introBossSprite = document.getElementById('introBossSprite');
  const resultBossSprite = document.getElementById('resultBossSprite');
  const levelTag = document.getElementById('levelTag');
  const introBossTag = document.getElementById('introBossTag');
  const introTitle = document.getElementById('introTitle');
  const introCopy = document.getElementById('introCopy');
  const bossPowerName = document.getElementById('bossPowerName');
  const bossPowerCopy = document.getElementById('bossPowerCopy');
  const modalNote = document.getElementById('introModalNote');
  const resultNote = document.getElementById('resultModalNote');
  const bossAbilityBanner = document.getElementById('bossAbilityBanner');
  const bossAbilityTitle = document.getElementById('bossAbilityTitle');
  const bossAbilityCopy = document.getElementById('bossAbilityCopy');

  if (!grid || !PAIRS.length || !BOSSES.length) return;

  const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const requestedBoss = Number(new URLSearchParams(window.location.search).get('boss'));
  let bossIndex = Number.isInteger(requestedBoss) && requestedBoss >= 1 && requestedBoss <= BOSSES.length
    ? requestedBoss - 1
    : Math.max(0, Math.min(BOSSES.length - 1, Number(BOSS_DATA.startBossId || 1) - 1));

  let cards = [];
  let turn = 'player';
  let selected = [];
  let lock = true;
  let scores = { player: 0, ai: 0 };
  let matchedPairs = { player: 0, ai: 0 };
  let aiMemory = new Map();
  let peekUsed = false;
  let gameOver = false;
  let toastTimer;
  let playerAttempts = 0;
  let lastAbilityAttempt = -1;
  let bombIndex = null;
  let bombExpiresAtAttempt = null;
  let fogged = new Set();
  let fogExpiresAtAttempt = null;
  let lastOutcome = 'loss';

  function currentBoss() { return BOSSES[bossIndex] || BOSSES[0]; }
  function currentAbility() { return currentBoss().ability || null; }

  function setBossImage(node, src, name) {
    if (!node) return;
    node.dataset.fallbackUsed = '';
    node.src = src;
    node.alt = name;
  }

  function applyBossUi() {
    const boss = currentBoss();
    document.body.dataset.bossId = String(boss.bossId || bossIndex + 1);
    document.body.dataset.bossAbility = boss.ability?.type || 'none';
    if (bossNameEl) bossNameEl.textContent = boss.name;
    setBossImage(bossDuelSprite, boss.image, boss.name);
    setBossImage(introBossSprite, boss.image, boss.name);
    setBossImage(resultBossSprite, boss.image, boss.name);
    if (levelTag) levelTag.innerHTML = `<span>☠</span> LEVEL ${boss.bossId} · ${boss.location || boss.name.toUpperCase()}`;
    if (introBossTag) introBossTag.textContent = `☠ LEVEL ${boss.bossId} · ${boss.name.toUpperCase()}`;
    if (introTitle) introTitle.textContent = boss.introTitle || `${boss.name} fordert dich heraus.`;
    if (introCopy) introCopy.innerHTML = boss.introCopy || `Finde die passenden <b>Deutsch ↔ Englisch</b>-Paare und besiege ${boss.name}.`;
    if (bossPowerName) bossPowerName.textContent = boss.ability?.name || 'Kein Spezialtrick';
    if (bossPowerCopy) bossPowerCopy.textContent = boss.ability?.description || 'Dieser Boss spielt ohne Spezialfähigkeit.';
    if (modalNote) modalNote.textContent = `DE → EN · 8 LERNPAARE · BOSS ${boss.bossId}`;
    if (resultNote) {
      const next = BOSSES[bossIndex + 1];
      resultNote.textContent = next ? `NÄCHSTE ETAPPE: ${next.name.toUpperCase()}` : 'BATCH 1 · DREI BOSSE FREIGESCHALTET';
    }
  }

  function makeDeck() {
    const deck = [];
    PAIRS.forEach((pair, pairId) => {
      deck.push({ id: `${pair.id}-source`, pairId, lang: GAME.sourceLabel || GAME.sourceLanguage?.toUpperCase() || 'SRC', word: pair.source, matched: false, owner: null });
      deck.push({ id: `${pair.id}-target`, pairId, lang: GAME.targetLabel || GAME.targetLanguage?.toUpperCase() || 'DST', word: pair.target, matched: false, owner: null });
    });
    return shuffle(deck);
  }

  function decorateCard(btn, card, index) {
    if (card.matched) {
      btn.classList.add('matched', card.owner === 'ai' ? 'kai' : 'tula');
      btn.setAttribute('aria-disabled', 'true');
      const lab = btn.querySelector('.matched-by');
      if (lab) lab.textContent = card.owner === 'player' ? '✓ TULA' : '☠ KAI';
    }
    if (index === bombIndex && !card.matched) btn.classList.add('bomb-armed');
    if (fogged.has(index) && !card.matched) {
      btn.classList.add('fogged');
      btn.setAttribute('aria-disabled', 'true');
    }
  }

  function render() {
    grid.innerHTML = '';
    cards.forEach((card, index) => {
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.dataset.index = String(index);
      btn.dataset.id = card.id;
      btn.setAttribute('aria-label', card.matched ? `${card.lang}: ${card.word}, bereits vergeben` : `Verdeckte Memory-Karte ${index + 1}`);
      btn.innerHTML = `<span class="face back"><span class="crest">☸</span><span class="boss-marker" aria-hidden="true"></span></span><span class="face front"><span class="lang ${card.lang === (GAME.targetLabel || GAME.targetLanguage?.toUpperCase()) ? 'en' : ''}">${card.lang}</span><span class="word">${card.word}</span><span class="matched-by"></span></span>`;
      decorateCard(btn, card, index);
      btn.addEventListener('click', () => onPlayerCard(index));
      grid.appendChild(btn);
    });
    updateHud();
  }

  function resetBossStates() {
    playerAttempts = 0;
    lastAbilityAttempt = -1;
    bombIndex = null;
    bombExpiresAtAttempt = null;
    fogged = new Set();
    fogExpiresAtAttempt = null;
    hideBossBanner();
  }

  function resetGame(showIntro = false) {
    cards = makeDeck();
    turn = 'player';
    selected = [];
    lock = showIntro;
    scores = { player: 0, ai: 0 };
    matchedPairs = { player: 0, ai: 0 };
    aiMemory = new Map();
    peekUsed = false;
    gameOver = false;
    lastOutcome = 'loss';
    resetBossStates();
    result.classList.add('hidden');
    peekBtn.disabled = false;
    peekBtn.textContent = '1× EINSETZEN';
    applyBossUi();
    render();
    setTurnUi();
    if (showIntro) intro.classList.remove('hidden'); else intro.classList.add('hidden');
  }

  function updateHud() {
    playerScoreEl.textContent = String(scores.player);
    aiScoreEl.textContent = String(scores.ai);
    progressEl.textContent = `${matchedPairs.player + matchedPairs.ai} / ${PAIRS.length}`;
  }

  function setTurnUi() {
    const player = turn === 'player';
    turnPill.textContent = player ? 'DU BIST DRAN' : `${currentBoss().shortName || currentBoss().name.split(' ').pop().toUpperCase()} DENKT …`;
    turnPill.classList.toggle('ai', !player);
    peekBtn.disabled = peekUsed || !player || lock || selected.length > 0 || gameOver;
  }

  function cardEl(index) { return grid.querySelector(`.card[data-index="${index}"]`); }
  function isOpen(index) {
    const el = cardEl(index);
    return el?.classList.contains('flipped') || el?.classList.contains('matched') || el?.classList.contains('peek');
  }

  function reveal(index, actor = 'player') {
    const card = cards[index];
    const el = cardEl(index);
    if (!card || !el) return;
    el.classList.add('flipped');
    el.setAttribute('aria-label', `${card.lang}: ${card.word}`);
    const memoryChance = Number(currentBoss().memoryStrength ?? 0.61);
    if (actor === 'ai' || Math.random() < memoryChance) aiMemory.set(card.id, { pairId: card.pairId, index });
  }

  function hide(index) {
    const el = cardEl(index);
    if (el && !cards[index].matched) {
      el.classList.remove('flipped');
      el.setAttribute('aria-label', `Verdeckte Memory-Karte ${index + 1}`);
    }
  }

  function markMatched(indices, owner) {
    if (bombIndex != null && indices.includes(bombIndex)) {
      bombIndex = null;
      bombExpiresAtAttempt = null;
    }
    indices.forEach(index => {
      fogged.delete(index);
      cards[index].matched = true;
      cards[index].owner = owner;
      const el = cardEl(index);
      if (!el) return;
      el.classList.remove('flipped', 'bomb-armed', 'fogged');
      el.classList.add('matched', owner === 'ai' ? 'kai' : 'tula');
      el.setAttribute('aria-disabled', 'true');
      const lab = el.querySelector('.matched-by');
      if (lab) lab.textContent = owner === 'player' ? '✓ TULA' : '☠ KAI';
    });
  }

  function rememberPairText(indices) {
    const a = cards[indices[0]], b = cards[indices[1]];
    const sourceLabel = GAME.sourceLabel || GAME.sourceLanguage?.toUpperCase();
    const source = a.lang === sourceLabel ? a : b;
    const target = a.lang === sourceLabel ? b : a;
    return `${source.word} = ${target.word}`;
  }

  function showToast(text, type = '') {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.className = `toast show ${type}`.trim();
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2100);
  }

  function showBossBanner(title, copy, tone = '') {
    if (!bossAbilityBanner) return;
    bossAbilityTitle.textContent = title;
    bossAbilityCopy.textContent = copy;
    bossAbilityBanner.className = `boss-ability-banner show ${tone}`.trim();
  }
  function hideBossBanner() { if (bossAbilityBanner) bossAbilityBanner.className = 'boss-ability-banner'; }
  async function bannerMoment(title, copy, tone = '', duration = 1000) {
    showBossBanner(title, copy, tone);
    await sleep(duration);
    hideBossBanner();
  }

  function availableIndices() {
    return cards.map((card, index) => ({ card, index })).filter(({ card, index }) => !card.matched && !isOpen(index)).map(({ index }) => index);
  }

  function reindexMemory() {
    for (const [id, data] of aiMemory) {
      const index = cards.findIndex(card => card.id === id);
      if (index < 0 || cards[index]?.matched) aiMemory.delete(id); else data.index = index;
    }
  }

  async function swapHiddenCards() {
    const candidates = availableIndices().filter(index => !fogged.has(index));
    if (candidates.length < 2) return false;
    const [a, b] = shuffle(candidates).slice(0, 2);
    const elA = cardEl(a), elB = cardEl(b);
    if (!elA || !elB) return false;
    await bannerMoment('KAI MISCHT DIE KARTEN!', 'Beobachte genau, welche zwei verdeckten Karten ihre Plätze tauschen.', 'swap', 720);
    const rectA = elA.getBoundingClientRect(), rectB = elB.getBoundingClientRect();
    const dx = rectB.left - rectA.left, dy = rectB.top - rectA.top;
    const backA = elA.querySelector('.back'), backB = elB.querySelector('.back');
    elA.classList.add('boss-swap-a');
    elB.classList.add('boss-swap-b');
    const options = { duration: 760, easing: 'cubic-bezier(.22,.75,.18,1)', fill: 'forwards' };
    const animA = backA?.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${dx * 0.5}px,${dy * 0.5}px) rotate(7deg) scale(1.04)`, offset: 0.52 }, { transform: `translate(${dx}px,${dy}px) rotate(0deg)` }], options);
    const animB = backB?.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${-dx * 0.5}px,${-dy * 0.5}px) rotate(-7deg) scale(1.04)`, offset: 0.52 }, { transform: `translate(${-dx}px,${-dy}px) rotate(0deg)` }], options);
    await Promise.all([animA?.finished?.catch(() => {}), animB?.finished?.catch(() => {})]);
    [cards[a], cards[b]] = [cards[b], cards[a]];
    reindexMemory();
    render();
    await bannerMoment('PLÄTZE GETAUSCHT', 'Die beiden Karten liegen jetzt an ihren neuen Positionen.', 'swap done', 620);
    return true;
  }

  function clearBomb(announce = false) {
    if (bombIndex == null) return;
    const old = bombIndex;
    bombIndex = null;
    bombExpiresAtAttempt = null;
    cardEl(old)?.classList.remove('bomb-armed');
    if (announce) showToast('Die Bombe ist ohne Treffer erloschen.', 'good');
  }

  async function plantBomb() {
    const candidates = availableIndices().filter(index => !fogged.has(index));
    if (!candidates.length) return false;
    clearBomb(false);
    const index = shuffle(candidates)[0];
    bombIndex = index;
    bombExpiresAtAttempt = playerAttempts + 2;
    const el = cardEl(index);
    if (!el) return false;
    el.classList.add('bomb-targeting');
    await bannerMoment('BRAX LEGT EINE BOMBE!', 'Merk dir die markierte Karte. Wenn du sie öffnest: −1 für dich, +1 für Brax.', 'bomb', 1050);
    el.classList.remove('bomb-targeting');
    el.classList.add('bomb-armed');
    return true;
  }

  async function triggerBomb(index) {
    const el = cardEl(index);
    if (bombIndex !== index || !el) return;
    const previousLock = lock;
    lock = true;
    setTurnUi();
    el.classList.remove('bomb-armed');
    el.classList.add('bomb-explode');
    bombIndex = null;
    bombExpiresAtAttempt = null;
    const lost = scores.player > 0 ? 1 : 0;
    if (lost) scores.player -= 1;
    scores.ai += 1;
    updateHud();
    showBossBanner('BOMBE EXPLODIERT!', lost ? 'Du verlierst 1 Punkt. Brax bekommt 1 Punkt.' : 'Du hattest noch keinen Punkt – Brax bekommt trotzdem +1.', 'bomb explode');
    await sleep(650);
    hideBossBanner();
    el.classList.remove('bomb-explode');
    lock = previousLock;
    setTurnUi();
  }

  function clearFog(announce = false) {
    if (!fogged.size) return;
    fogged.forEach(index => {
      const el = cardEl(index);
      el?.classList.remove('fogged', 'fog-denied');
      if (el && !cards[index]?.matched) el.removeAttribute('aria-disabled');
    });
    fogged = new Set();
    fogExpiresAtAttempt = null;
    if (announce) showToast('🌫 Der Nebel lichtet sich.', 'good');
  }

  async function castFog() {
    const candidates = availableIndices();
    if (candidates.length < 3) return false;
    clearFog(false);
    const maxFog = Math.min(3, Math.max(1, candidates.length - 2));
    const picks = shuffle(candidates).slice(0, maxFog);
    fogged = new Set(picks);
    fogExpiresAtAttempt = playerAttempts + 1;
    picks.forEach(index => cardEl(index)?.classList.add('fog-forming'));
    await bannerMoment('BLACKFINN RUFT DEN NEBEL!', `${picks.length} Karten sind für deinen nächsten Versuch blockiert.`, 'fog', 900);
    picks.forEach(index => {
      const el = cardEl(index);
      el?.classList.remove('fog-forming');
      el?.classList.add('fogged');
      el?.setAttribute('aria-disabled', 'true');
    });
    return true;
  }

  function cleanExpiredAbilityStates() {
    if (bombExpiresAtAttempt != null && playerAttempts >= bombExpiresAtAttempt) clearBomb(true);
    if (fogExpiresAtAttempt != null && playerAttempts >= fogExpiresAtAttempt) clearFog(true);
  }

  async function maybeTriggerBossAbility() {
    if (gameOver || selected.length) return;
    cleanExpiredAbilityStates();
    const ability = currentAbility();
    if (!ability || !ability.type || ability.type === 'none') return;
    const every = Math.max(1, Number(ability.everyPlayerAttempts || 3));
    if (playerAttempts === 0 || playerAttempts % every !== 0 || lastAbilityAttempt === playerAttempts) return;
    lastAbilityAttempt = playerAttempts;
    lock = true;
    setTurnUi();
    try {
      if (ability.type === 'swap') await swapHiddenCards();
      if (ability.type === 'bomb') await plantBomb();
      if (ability.type === 'fog') await castFog();
    } finally {
      lock = false;
      setTurnUi();
    }
  }

  async function enterPlayerTurn() {
    turn = 'player';
    lock = true;
    setTurnUi();
    await maybeTriggerBossAbility();
    if (!gameOver) { lock = false; setTurnUi(); }
  }

  async function onPlayerCard(index) {
    if (lock || turn !== 'player' || gameOver || cards[index].matched || selected.includes(index) || isOpen(index)) return;
    if (fogged.has(index)) {
      const el = cardEl(index);
      el?.classList.remove('fog-denied');
      void el?.offsetWidth;
      el?.classList.add('fog-denied');
      showToast('🌫 Blackfinns Nebel blockiert diese Karte.', 'bad');
      return;
    }
    if (bombIndex === index) await triggerBomb(index);
    reveal(index, 'player');
    selected.push(index);
    setTurnUi();
    if (selected.length === 2) { lock = true; setTurnUi(); await resolveSelection('player'); }
  }

  async function resolveSelection(actor) {
    const [a, b] = selected;
    const match = cards[a].pairId === cards[b].pairId && cards[a].lang !== cards[b].lang;
    await sleep(actor === 'player' ? 650 : 520);
    if (match) {
      markMatched([a, b], actor);
      matchedPairs[actor] += 1;
      scores[actor] += 1;
      updateHud();
      const learned = rememberPairText([a, b]);
      showToast(actor === 'player' ? `✓ Stark! ${learned}` : `☠ ${currentBoss().name} schnappt sich: ${learned}`, actor === 'player' ? 'good' : 'bad');
      selected = [];
      if (actor === 'player') playerAttempts += 1;
      cleanExpiredAbilityStates();
      if (checkGameEnd()) return;
      if (actor === 'ai') { lock = false; setTurnUi(); await sleep(520); aiTurn(); }
      else await enterPlayerTurn();
    } else {
      if (actor === 'player') showToast(`Kein Paar – ${currentBoss().name} ist dran.`, 'bad');
      else showToast(`${currentBoss().name} liegt daneben – dein Zug!`, 'good');
      await sleep(actor === 'player' ? 550 : 430);
      hide(a); hide(b); selected = [];
      if (actor === 'player') playerAttempts += 1;
      cleanExpiredAbilityStates();
      if (actor === 'player') {
        turn = 'ai'; lock = true; setTurnUi();
        await sleep(Number(currentBoss().thinkingDelay ?? 720));
        aiTurn();
      } else await enterPlayerTurn();
    }
  }

  function cleanMemory() {
    const forgetChance = Number(currentBoss().forgetChance ?? 0.12);
    for (const [id, data] of aiMemory) {
      if (cards[data.index]?.matched) aiMemory.delete(id);
      else if (Math.random() < forgetChance) aiMemory.delete(id);
    }
  }

  function knownPair(exclude = []) {
    const byPair = new Map();
    for (const data of aiMemory.values()) {
      if (exclude.includes(data.index) || cards[data.index]?.matched || isOpen(data.index)) continue;
      if (!byPair.has(data.pairId)) byPair.set(data.pairId, []);
      byPair.get(data.pairId).push(data.index);
    }
    for (const indexes of byPair.values()) if (indexes.length >= 2) return indexes.slice(0, 2);
    return null;
  }

  function rememberedMate(pairId, exclude) {
    const options = [];
    for (const data of aiMemory.values()) if (data.pairId === pairId && data.index !== exclude && !cards[data.index]?.matched && !isOpen(data.index)) options.push(data.index);
    return options.length ? options[0] : null;
  }

  function randomAvailable(exclude = []) {
    const options = availableIndices().filter(index => !exclude.includes(index));
    return options.length ? options[Math.floor(Math.random() * options.length)] : null;
  }

  async function aiTurn() {
    if (gameOver) return;
    turn = 'ai'; lock = true; setTurnUi(); cleanMemory();
    await sleep(360);
    const pair = knownPair();
    let first = pair ? pair[0] : randomAvailable();
    if (first == null) { await enterPlayerTurn(); return; }
    reveal(first, 'ai'); selected = [first]; await sleep(780);
    let second = pair ? pair[1] : rememberedMate(cards[first].pairId, first);
    if (second == null || cards[second].matched || isOpen(second)) second = randomAvailable([first]);
    if (second == null) { hide(first); selected = []; await enterPlayerTurn(); return; }
    reveal(second, 'ai'); selected.push(second); await resolveSelection('ai');
  }

  async function usePeek() {
    if (peekUsed || lock || turn !== 'player' || selected.length || gameOver) return;
    const options = availableIndices().filter(index => !fogged.has(index));
    if (options.length < 2) return;
    peekUsed = true; peekBtn.disabled = true; peekBtn.textContent = 'VERBRAUCHT'; lock = true; setTurnUi();
    const picks = shuffle(options).slice(0, 2);
    picks.forEach(index => cardEl(index)?.classList.add('peek'));
    showToast('🐚 Muschelblick: Merk dir diese beiden Karten!', 'good');
    await sleep(1350);
    picks.forEach(index => cardEl(index)?.classList.remove('peek'));
    lock = false; setTurnUi();
  }

  function checkGameEnd() {
    if (matchedPairs.player + matchedPairs.ai < PAIRS.length) return false;
    gameOver = true; lock = true; setTurnUi();
    const win = scores.player > scores.ai, tie = scores.player === scores.ai;
    lastOutcome = win ? 'win' : tie ? 'tie' : 'loss';
    const shells = win ? 20 : tie ? 10 : 5, xp = win ? 60 : tie ? 40 : 25;
    const boss = currentBoss();
    resultTitle.textContent = win ? `Du hast ${boss.name} geschlagen!` : tie ? 'Unentschieden auf hoher See!' : `${boss.name} gewinnt diese Runde.`;
    resultCopy.textContent = win ? `${boss.name} ist besiegt. ${BOSSES[bossIndex + 1] ? `Als Nächstes wartet ${BOSSES[bossIndex + 1].name}.` : 'Du hast alle Bosse dieses Entwicklungs-Batches geschlagen.'}` : tie ? 'Keiner gewinnt das Duell. Noch eine Runde entscheidet es.' : `${boss.name} hatte diesmal die besseren Tricks. Beim nächsten Duell kennst du seine Mechanik.`;
    resultPlayer.textContent = String(scores.player); resultShells.textContent = `+${shells}`; resultXp.textContent = `+${xp}`;
    resultTag.textContent = win ? '✓ BOSS BESIEGT' : tie ? '⚔ GLEICHSTAND' : '☠ BOSS GEWINNT';
    if (againBtn) againBtn.textContent = win && BOSSES[bossIndex + 1] ? `⚔ WEITER ZU ${BOSSES[bossIndex + 1].name.toUpperCase()}` : '↻ NOCH EIN DUELL';
    window.setTimeout(() => result.classList.remove('hidden'), 900);
    return true;
  }

  function setBossInUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('boss', String(currentBoss().bossId || bossIndex + 1));
    window.history.replaceState({}, '', url);
  }

  startBtn.addEventListener('click', () => {
    intro.classList.add('hidden'); lock = false; setTurnUi();
    showToast(`Besiege ${currentBoss().name} und merk dir die Übersetzungen.`, 'good');
  });
  restartBtn.addEventListener('click', () => resetGame(false));
  againBtn.addEventListener('click', () => {
    if (lastOutcome === 'win' && BOSSES[bossIndex + 1]) {
      bossIndex += 1; setBossInUrl(); resetGame(true); return;
    }
    resetGame(false);
  });
  peekBtn.addEventListener('click', usePeek);
  helpBtn.addEventListener('click', () => help.classList.remove('hidden'));
  closeHelp.addEventListener('click', () => help.classList.add('hidden'));
  help.addEventListener('click', event => { if (event.target === help) help.classList.add('hidden'); });

  resetGame(true);
})();
