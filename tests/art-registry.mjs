import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = p => fs.readFileSync(p, 'utf8');
const art = read('public/pirate-pairs-art-registry.css');
const emblem = read('public/pirate-pairs-card-emblem.css');

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

for (const file of bossFiles) {
  assert.ok(art.includes(file), `boss art registry missing ${file}`);
}
assert.doesNotMatch(art, /boss-fallback\.svg/, 'boss route must not layer the generic fallback character below transparent anime art');
assert.match(art, /background-size:contain,100% 100%!important/, 'boss route art must be fully contained');
assert.match(art, /#bossDuelSprite,#introBossSprite,#resultBossSprite,#bossPreviewImage/, 'all primary boss portrait surfaces must share the same fit contract');
assert.match(art, /object-fit:contain!important/, 'boss portraits must not crop the anime sprites');

for (const file of abilityFiles) {
  assert.ok(fs.existsSync(`public/assets/abilities/${file}`), `ability sprite file missing: ${file}`);
  assert.ok(art.includes(`./assets/abilities/${file}`), `ability art registry missing ${file}`);
}

assert.match(art, /\.card \.boss-marker\{[\s\S]*left:50%!important;[\s\S]*top:50%!important;[\s\S]*inset:auto!important;[\s\S]*translate:-50% -50%!important;/, 'boss marker must have exactly one centered geometry contract');
assert.match(art, /\.card\.bomb-targeting \.boss-marker,.card\.bomb-armed \.boss-marker\{background-image:url\('\.\/assets\/abilities\/powder-barrel\.svg'\)!important\}/, 'Brax barrel must use the premium sprite');
assert.match(art, /body\[data-boss-ability="tribute"\]\{--pp-ability-art:url\('\.\/assets\/abilities\/tribute\.svg'\)\}/, 'non-card abilities must still have premium banner art');
assert.match(art, /\.boss-ability-banner::before/, 'ability announcements must render the same sprite family');
assert.match(art, /#intro \.boss-power::before/, 'boss intro must render the same ability sprite family');

console.log('Pirate Pairs premium art registry: PASS');
