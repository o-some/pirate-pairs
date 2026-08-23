(() => {
  const bossNode = document.getElementById('boss-data');
  if (!bossNode) return;

  let bossData;
  try {
    bossData = JSON.parse(bossNode.textContent || '{}');
  } catch {
    return;
  }

  const bosses = Array.isArray(bossData.bosses) ? bossData.bosses : [];
  if (!bosses.length) return;

  const portraitIds = ['bossDuelSprite', 'introBossSprite', 'resultBossSprite'];
  let generation = 0;

  const currentBoss = () => {
    const activeId = Number(document.body.dataset.bossId || bossData.startBossId || 1);
    return bosses.find(boss => Number(boss.bossId) === activeId) || bosses[0];
  };

  const cssUrl = src => `url("${String(src).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;

  const probe = src => new Promise(resolve => {
    if (!src) {
      resolve(false);
      return;
    }
    const image = new Image();
    let done = false;
    const finish = result => {
      if (done) return;
      done = true;
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete) finish(image.naturalWidth > 0);
  });

  function applyResolvedPortrait(boss, src, source) {
    document.body.dataset.b09BossArtSource = source;
    document.body.dataset.b09BossArtId = String(boss.bossId || '');

    if (!src) {
      document.body.style.removeProperty('--pp-b09-current-boss-art');
      return;
    }

    document.body.style.setProperty('--pp-b09-current-boss-art', cssUrl(src));

    portraitIds.forEach(id => {
      const node = document.getElementById(id);
      if (!node) return;
      node.dataset.b09ResolvedBoss = String(boss.bossId || '');
      node.dataset.b09ResolvedSource = source;
      node.dataset.fallbackUsed = source === 'fallback' ? '1' : '';
      if (node.getAttribute('src') !== src) node.setAttribute('src', src);
    });
  }

  async function syncCurrentBossArt() {
    const token = ++generation;
    const boss = currentBoss();
    const primary = String(boss.image || '');
    const fallback = String(boss.fallback || '');

    if (await probe(primary)) {
      if (token !== generation) return;
      applyResolvedPortrait(boss, primary, 'primary');
      return;
    }

    if (await probe(fallback)) {
      if (token !== generation) return;
      applyResolvedPortrait(boss, fallback, 'fallback');
      return;
    }

    if (token !== generation) return;
    applyResolvedPortrait(boss, '', 'panel');
  }

  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' && record.attributeName === 'data-boss-id')) {
      void syncCurrentBossArt();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-boss-id'] });

  ['restartBtn', 'againBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      window.setTimeout(() => void syncCurrentBossArt(), 0);
    });
  });

  window.addEventListener('pageshow', () => void syncCurrentBossArt());
  document.body.dataset.b09BossArtResolver = 'ready';
  void syncCurrentBossArt();
})();
