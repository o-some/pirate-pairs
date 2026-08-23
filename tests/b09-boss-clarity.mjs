import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('src/pages/index.astro');
const css = read('public/pirate-pairs-b09.css');
const js = read('public/pirate-pairs-b09.js');
const art = read('public/pirate-pairs-art-registry.css');
const core = read('public/pirate-pairs-b04.js');

new vm.Script(js, { filename: 'public/pirate-pairs-b09.js' });

assert.match(index, /pirate-pairs-b09\.css/, 'B09 stylesheet must be loaded');
assert.match(index, /pirate-pairs-b09\.js/, 'B09 resolver must be loaded');
assert.ok(index.indexOf('pirate-pairs-b09.css') > index.indexOf('pirate-pairs-b07.css'), 'B09 CSS must load after B07');
assert.ok(index.indexOf('pirate-pairs-b09.js') > index.indexOf('pirate-pairs-b07-ux.js'), 'B09 JS must load after the B07 UX layer');
assert.match(index, /const scriptAsset = `\$\{base\}pirate-pairs-b04\.js`/, 'B04 must remain the gameplay owner');

assert.match(css, /powder-barrel\.svg/, 'Brax/Varkos bomb state must render the powder barrel sprite');
assert.match(css, /content:"PULVERFASS"!important/, 'armed Brax marker must read as a powder barrel');
assert.match(css, /--pp-b09-current-boss-art/, 'active roadmap portrait needs the resolved B09 image variable');
assert.match(css, /#bossRoadmap#bossRoadmap \.boss-road-item\.b07-current-boss \.boss-road-num/, 'B09 must own the final active-boss roadmap selector');
assert.match(css, /#bossName\{[\s\S]*font-size:clamp\(15px,4\.1vw,20px\)!important/, 'current boss name must be materially more readable');
assert.match(css, /\.boss-ability-banner span\{[\s\S]*font-size:10px!important/, 'boss ability copy must be materially more readable');

assert.match(js, /const probe = src => new Promise/, 'B09 must probe image availability instead of layering fallbacks');
assert.match(js, /await probe\(primary\)/, 'primary boss art must be probed first');
assert.match(js, /await probe\(fallback\)/, 'fallback art must only be used after primary failure');
assert.match(js, /style\.setProperty\('--pp-b09-current-boss-art'/, 'resolved image must feed the active roadmap portrait');
assert.match(js, /'bossDuelSprite', 'introBossSprite', 'resultBossSprite'/, 'all current boss portrait surfaces must use the same resolved image');
assert.match(js, /attributeFilter: \['data-boss-id'\]/, 'resolver must follow boss progression');
assert.doesNotMatch(js, /bossPreviewImage/, 'current-boss resolver must not overwrite future-boss preview art');

assert.match(art, /\.\/assets\/abilities\/powder-barrel\.svg/, 'canonical registry must retain the local premium barrel asset');
assert.doesNotMatch(art, /boss-fallback\.svg/, 'canonical art registry must not layer a generic fallback behind transparent anime art');
assert.match(core, /a\.type==='bomb'/, 'existing bomb gameplay state must remain owned by B04');

console.log('Pirate Pairs B09 boss clarity contract: PASS');
