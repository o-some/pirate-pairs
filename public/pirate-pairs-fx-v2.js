(() => {
  const body = document.body;
  const grid = document.getElementById('grid');
  const turnPill = document.getElementById('turnPill');
  const playerScore = document.getElementById('playerScore');
  const aiScore = document.getElementById('aiScore');
  const result = document.getElementById('result');
  const resultTitle = document.getElementById('resultTitle');
  const peekBtn = document.getElementById('peekBtn');
  if (!body || !grid) return;

  body.classList.add('pirate-pairs-v2');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduced) {
    const ambient = document.createElement('div');
    ambient.className = 'pp-ambient';
    ambient.setAttribute('aria-hidden', 'true');
    const count = window.matchMedia('(max-width:719px)').matches ? 4 : 7;
    for (let i = 0; i < count; i++) {
      const bubble = document.createElement('i');
      bubble.className = 'pp-bubble';
      bubble.style.setProperty('--x', `${8 + ((i * 19) % 84)}%`);
      bubble.style.setProperty('--s', `${5 + (i % 3) * 3}px`);
      bubble.style.setProperty('--d', `${13 + (i % 4) * 2.8}s`);
      bubble.style.setProperty('--delay', `${-((i * 2.1) % 11)}s`);
      bubble.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (8 + (i % 3) * 5)}px`);
      ambient.appendChild(bubble);
    }
    body.prepend(ambient);
  }

  const burstNear = (el, owner = 'player', count = 6) => {
    if (!el || reduced) return;
    const rect = el.getBoundingClientRect();
    const burst = document.createElement('span');
    burst.className = 'pp-burst';
    burst.style.setProperty('--cx', `${rect.left + rect.width / 2}px`);
    burst.style.setProperty('--cy', `${rect.top + rect.height / 2}px`);
    burst.style.setProperty('--burst-color', owner === 'ai' ? '#ef816d' : '#65d8a3');
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('i');
      const angle = (Math.PI * 2 * i) / count;
      const radius = 18 + (i % 3) * 7;
      dot.style.setProperty('--dx', `${Math.cos(angle) * radius}px`);
      dot.style.setProperty('--dy', `${Math.sin(angle) * radius}px`);
      burst.appendChild(dot);
    }
    body.appendChild(burst);
    setTimeout(() => burst.remove(), 560);
  };

  const syncTurn = () => {
    const ai = Boolean(turnPill?.classList.contains('ai'));
    body.classList.toggle('ai-thinking', ai);
    document.querySelector('.fighter:not(.enemy)')?.classList.toggle('active', !ai);
    document.querySelector('.fighter.enemy')?.classList.toggle('active', ai);
  };

  grid.addEventListener('pointerdown', event => {
    const card = event.target.closest('.card');
    if (!card || card.classList.contains('matched')) return;
    card.classList.add('tap-feedback');
    setTimeout(() => card.classList.remove('tap-feedback'), 120);
  }, { passive: true });

  const lastClass = new WeakMap();
  const rememberCards = () => {
    grid.querySelectorAll('.card').forEach(card => {
      if (!lastClass.has(card)) lastClass.set(card, card.className);
    });
  };

  const pulseScore = (node, owner) => {
    if (!node) return;
    node.classList.remove('score-bump');
    void node.offsetWidth;
    node.classList.add('score-bump');
    burstNear(owner === 'ai' ? document.querySelector('.fighter.enemy .portrait') : document.querySelector('.fighter:not(.enemy) .portrait'), owner, owner === 'ai' ? 4 : 6);
    setTimeout(() => node.classList.remove('score-bump'), 380);
  };

  let oldPlayer = Number(playerScore?.textContent || 0);
  let oldAi = Number(aiScore?.textContent || 0);
  const scoreObserver = new MutationObserver(() => {
    const nextPlayer = Number(playerScore?.textContent || 0);
    const nextAi = Number(aiScore?.textContent || 0);
    if (nextPlayer > oldPlayer) pulseScore(playerScore, 'player');
    if (nextAi > oldAi) pulseScore(aiScore, 'ai');
    oldPlayer = nextPlayer;
    oldAi = nextAi;
  });
  if (playerScore) scoreObserver.observe(playerScore, { childList: true, characterData: true, subtree: true });
  if (aiScore) scoreObserver.observe(aiScore, { childList: true, characterData: true, subtree: true });

  const gridObserver = new MutationObserver(records => {
    body.classList.toggle('peek-active', Boolean(grid.querySelector('.card.peek')));
    for (const record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'class') continue;
      const card = record.target;
      if (!(card instanceof HTMLElement) || !card.classList.contains('card')) continue;
      const before = record.oldValue ?? lastClass.get(card) ?? '';

      if (!before.includes('matched') && card.classList.contains('matched')) {
        card.classList.add('match-pop');
        burstNear(card, card.classList.contains('kai') ? 'ai' : 'player', 5);
        setTimeout(() => card.classList.remove('match-pop'), 520);
      } else if (before.includes('flipped') && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
        card.classList.add('wrong-pair');
        setTimeout(() => card.classList.remove('wrong-pair'), 340);
      } else if (!before.includes('flipped') && card.classList.contains('flipped') && body.classList.contains('ai-thinking')) {
        card.classList.add('ai-pick');
        setTimeout(() => card.classList.remove('ai-pick'), 420);
      }
      lastClass.set(card, card.className);
    }
    rememberCards();
  });
  gridObserver.observe(grid, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class'] });

  if (turnPill) new MutationObserver(syncTurn).observe(turnPill, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  if (result) {
    let hidden = result.classList.contains('hidden');
    new MutationObserver(() => {
      const nextHidden = result.classList.contains('hidden');
      if (hidden && !nextHidden) {
        const title = resultTitle?.textContent || '';
        const won = title.includes('geschlagen');
        body.classList.toggle('result-win', won);
        body.classList.toggle('result-loss', !won && !title.includes('Unentschieden'));
        if (won) burstNear(result.querySelector('.mini-logo'), 'player', 8);
      }
      if (nextHidden) body.classList.remove('result-win', 'result-loss');
      hidden = nextHidden;
    }).observe(result, { attributes: true, attributeFilter: ['class'] });
  }

  peekBtn?.addEventListener('click', () => {
    if (!peekBtn.disabled) {
      body.classList.add('peek-active');
      setTimeout(() => {
        if (!grid.querySelector('.card.peek')) body.classList.remove('peek-active');
      }, 1550);
    }
  });

  rememberCards();
  syncTurn();
})();