(() => {
  const body = document.body;
  const grid = document.getElementById('grid');
  const turnPill = document.getElementById('turnPill');
  const playerScore = document.getElementById('playerScore');
  const aiScore = document.getElementById('aiScore');
  const toast = document.getElementById('toast');
  const result = document.getElementById('result');
  const resultTitle = document.getElementById('resultTitle');
  const peekBtn = document.getElementById('peekBtn');
  const restartBtn = document.getElementById('restartBtn');
  const startBtn = document.getElementById('startBtn');
  const againBtn = document.getElementById('againBtn');
  const tulaSprite = document.getElementById('tulaDuelSprite');
  const resultTulaSprite = document.getElementById('resultTulaSprite');

  if (!body || !grid) return;
  body.classList.add('pirate-pairs-v2', 'pirate-pairs-v4');

  // Runtime assets are intentionally pinned, but keep the old local SVGs as a
  // last-resort fallback so a remote image failure can never break the game UI.
  document.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error', () => {
      const fallback = img.dataset.fallback;
      if (fallback && img.src !== fallback && img.dataset.fallbackUsed !== '1') {
        img.dataset.fallbackUsed = '1';
        img.src = fallback;
      }
    });
  });

  // Preload Tula reaction sprites without blocking first paint.
  if (tulaSprite) {
    ['neutral', 'happy', 'surprised', 'celebrating'].forEach(key => {
      const src = tulaSprite.dataset[key];
      if (src) { const image = new Image(); image.src = src; }
    });
  }

  let spriteTimer = 0;
  function spriteSource(node, pose) {
    return node?.dataset?.[pose] || node?.dataset?.neutral || node?.src || '';
  }
  function setTulaPose(pose = 'neutral', duration = 0) {
    if (!tulaSprite) return;
    window.clearTimeout(spriteTimer);
    const src = spriteSource(tulaSprite, pose);
    if (src && tulaSprite.src !== src) tulaSprite.src = src;
    tulaSprite.classList.remove('sprite-reaction');
    void tulaSprite.offsetWidth;
    if (pose !== 'neutral') tulaSprite.classList.add('sprite-reaction');
    if (duration > 0) {
      spriteTimer = window.setTimeout(() => {
        const neutral = spriteSource(tulaSprite, 'neutral');
        if (neutral) tulaSprite.src = neutral;
        tulaSprite.classList.remove('sprite-reaction');
      }, duration);
    }
  }

  function syncTurn() {
    const ai = Boolean(turnPill?.classList.contains('ai'));
    body.classList.toggle('ai-thinking', ai);
    document.querySelector('.fighter:not(.enemy)')?.classList.toggle('active', !ai);
    document.querySelector('.fighter.enemy')?.classList.toggle('active', ai);
  }

  // Touch feedback is intentionally applied to the card face only. Never set
  // transform here: the core game owns rotateY() and must react immediately.
  function prepareCards() {
    grid.querySelectorAll('.card').forEach(card => {
      if (card.dataset.v4Ready === '1') return;
      card.dataset.v4Ready = '1';
      const down = () => {
        if (!card.classList.contains('matched') && !card.classList.contains('flipped')) {
          card.classList.add('tap-feedback');
        }
      };
      const up = () => card.classList.remove('tap-feedback');
      card.addEventListener('pointerdown', down, { passive: true });
      card.addEventListener('pointerup', up, { passive: true });
      card.addEventListener('pointercancel', up, { passive: true });
      card.addEventListener('pointerleave', up, { passive: true });
    });
  }

  const lastClass = new WeakMap();
  function snapshotCards() {
    grid.querySelectorAll('.card').forEach(card => {
      if (!lastClass.has(card)) lastClass.set(card, card.className);
    });
  }

  const gridObserver = new MutationObserver(records => {
    prepareCards();
    snapshotCards();
    body.classList.toggle('peek-active', Boolean(grid.querySelector('.card.peek')));

    for (const record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'class') continue;
      const card = record.target;
      if (!(card instanceof HTMLElement) || !card.classList.contains('card')) continue;

      const before = record.oldValue || lastClass.get(card) || '';
      const now = card.className;

      if (!before.includes('matched') && card.classList.contains('matched')) {
        card.classList.add('match-feedback');
        window.setTimeout(() => card.classList.remove('match-feedback'), 470);
      }

      if (before.includes('flipped') && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
        card.classList.add('wrong-feedback');
        window.setTimeout(() => card.classList.remove('wrong-feedback'), 330);
      }

      if (!before.includes('flipped') && card.classList.contains('flipped') && body.classList.contains('ai-thinking')) {
        card.classList.add('ai-pick');
        window.setTimeout(() => card.classList.remove('ai-pick'), 380);
      }

      lastClass.set(card, now);
    }
  });
  gridObserver.observe(grid, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class'] });

  if (turnPill) {
    new MutationObserver(syncTurn).observe(turnPill, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  let oldPlayer = Number(playerScore?.textContent || 0);
  let oldAi = Number(aiScore?.textContent || 0);
  const scoreObserver = new MutationObserver(() => {
    const player = Number(playerScore?.textContent || 0);
    const ai = Number(aiScore?.textContent || 0);

    if (player > oldPlayer) {
      playerScore?.classList.add('score-bump');
      setTulaPose('happy', 900);
      window.setTimeout(() => playerScore?.classList.remove('score-bump'), 380);
    }
    if (ai > oldAi) {
      aiScore?.classList.add('score-bump');
      setTulaPose('surprised', 900);
      window.setTimeout(() => aiScore?.classList.remove('score-bump'), 380);
    }
    oldPlayer = player;
    oldAi = ai;
  });
  if (playerScore) scoreObserver.observe(playerScore, { childList: true, characterData: true, subtree: true });
  if (aiScore) scoreObserver.observe(aiScore, { childList: true, characterData: true, subtree: true });

  if (toast) {
    new MutationObserver(() => {
      const text = toast.textContent || '';
      if (text.startsWith('Kein Paar')) setTulaPose('surprised', 700);
      if (text.startsWith('Kai liegt daneben')) setTulaPose('happy', 620);
    }).observe(toast, { childList: true, characterData: true, subtree: true });
  }

  if (result) {
    let wasHidden = result.classList.contains('hidden');
    new MutationObserver(() => {
      const hidden = result.classList.contains('hidden');
      if (wasHidden && !hidden) {
        const title = resultTitle?.textContent || '';
        const pose = title.includes('geschlagen') ? 'celebrating' : title.includes('Unentschieden') ? 'happy' : 'surprised';
        const src = spriteSource(resultTulaSprite, pose);
        if (resultTulaSprite && src) resultTulaSprite.src = src;
        setTulaPose(pose, 0);
      }
      if (hidden && !wasHidden) {
        const neutral = spriteSource(resultTulaSprite, 'neutral');
        if (resultTulaSprite && neutral) resultTulaSprite.src = neutral;
        setTulaPose('neutral');
      }
      wasHidden = hidden;
    }).observe(result, { attributes: true, attributeFilter: ['class'] });
  }

  peekBtn?.addEventListener('click', () => {
    if (!peekBtn.disabled) body.classList.add('peek-active');
  });
  restartBtn?.addEventListener('click', () => setTulaPose('neutral'));
  startBtn?.addEventListener('click', () => setTulaPose('neutral'));
  againBtn?.addEventListener('click', () => setTulaPose('neutral'));

  prepareCards();
  snapshotCards();
  syncTurn();
})();
