import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = p => fs.readFileSync(p, 'utf8');
const art = read('public/pirate-pairs-art-registry.css');
const emblem = read('public/pirate-pairs-card-emblem.css');
const index = read('src/pages/index.astro');
const prep = read('public/pirate-pairs-b07-prep.js');

const bossFiles = [
  'boss-01-pirat-kai.png',
  'boss-02-kapitaen-brax.png',
  'boss-03-blackfinn.png',
  'boss-04-alt-kapitaen-roderick.png',
  'boss-05-piratenbaron-vargas.png',
  'boss-06-kapitaen-ironhook.png',
  'boss-07-admiral-thorne.png',
  'boss-08-kartenmeister-corvin.png',
  'boss-09-schattenfuerst-azrak.png',
  'boss-10-piratenkoenig-varkos.png',
];

const abilityFiles = [
  'deck-swap.svg',
  'powder-barrel.svg',
  'fog.svg',
  'memory-curse.svg',
  'tribute.svg',
  'chains.svg',
  'cannon.svg',
  'line-shift.svg',
  'shadow.svg',
  'royal-chaos.svg',
];

assert.match(emblem, /@import url\('\.\/pirate-pairs-art-registry\.css'\)/, 'canonical art registry must be loaded');
assert.match(index, /const bossSourceCommit = '927afa882df75ab0c74c426d822af89767b5ec38'/, 'duel UI and art registry must share the pinned anime boss source commit');

for (const file of bossFiles) {
  assert.ok(index.includes(file), `duel boss config missing ${file}`);
  assert.ok(art.includes(file), `boss art registry missing ${file}`);
}
assert.doesNotMatch(art, /boss-fallback\.svg/, 'canonical boss art must never layer the generic fallback character below transparent anime art');
assert.match(art, /background-size:contain,100% 100%!important/, 'boss route art must be fully contained');
assert.match(art, /#bossDuelSprite,#introBossSprite,#resultBossSprite,#bossPreviewImage/, 'all primary boss portrait surfaces must share the same fit contract');
assert.match(art, /object-fit:contain!important/, 'boss portraits must not crop the anime sprites');

for (const file of abilityFiles) {
  const path = `public/assets/abilities/${file}`;
  assert.ok(fs.existsSync(path), `ability sprite file missing: ${file}`);
  const sprite = read(path);
  assert.ok(Buffer.byteLength(sprite) >= 650, `ability sprite is too trivial to qualify as premium art: ${file}`);
  assert.match(sprite, /viewBox="0 0 128 128"/, `ability sprite needs a stable 128x128 viewBox: ${file}`);
  assert.ok(/<(path|g|rect|circle|polygon|ellipse)\b/.test(sprite), `ability sprite has no vector artwork: ${file}`);
  assert.ok(art.includes(`./assets/abilities/${file}`), `ability art registry missing ${file}`);
}

assert.match(art, /html body \.card \.boss-marker\{[\s\S]*left:50%!important;[\s\S]*top:50%!important;[\s\S]*inset:auto!important;[\s\S]*translate:-50% -50%!important;/, 'final art owner must use higher-specificity centered marker geometry');
assert.match(art, /html body \.card\.bomb-targeting \.boss-marker,html body \.card\.bomb-armed \.boss-marker\{background-image:url\('\.\/assets\/abilities\/powder-barrel\.svg'\)!important/, 'Brax barrel must be locked to the centered premium sprite');
assert.match(art, /body\[data-boss-ability="tribute"\]\{--pp-ability-art:url\('\.\/assets\/abilities\/tribute\.svg'\)\}/, 'non-card abilities must still have premium banner art');
assert.match(art, /\.boss-ability-banner::before/, 'ability announcements must render the same sprite family');
assert.match(art, /#intro \.boss-power::before/, 'boss intro must render the same ability sprite family');

for (let id = 1; id <= 10; id += 1) {
  const pattern = new RegExp(`html body\\[data-boss-id="${id}"\\] #bossRoadmap#bossRoadmap \\.boss-road-item\\[data-boss-id="${id}"\\]\\.b07-current-boss \\.boss-road-num`);
  assert.match(art, pattern, `current boss ${id} must have an authoritative high-specificity anime portrait override`);
}
assert.match(art, /#bossRoadmap#bossRoadmap/, 'current-boss art must outrank the legacy runtime-generated fallback selector');
assert.match(art, /background-position:center bottom,center!important/, 'boss route anime art must be fully visible and centered');

// The old B07 preparation layer still contains historical fallback data for compatibility,
// so CI must prove that the canonical registry deliberately outranks it rather than silently
// relying on stylesheet order.
assert.match(prep, /b07-current-boss/, 'legacy current-boss path changed; re-audit art ownership before merging');
assert.match(art, /FINAL OWNERSHIP SHIELD/, 'canonical art ownership shield missing');

console.log('Pirate Pairs premium art ownership: PASS');
