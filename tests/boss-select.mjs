import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path,'utf8');
const guide = read('public/pirate-pairs-boss-guide-b05.js');
const core = read('public/pirate-pairs-b04.js');
const css = read('public/pirate-pairs-b10-boss-select.css');

assert.match(core,/new URLSearchParams\(location\.search\)\.get\('boss'\)/,'B04 must remain the canonical boss query owner');
assert.match(core,/requestedBoss\s*>=\s*1\s*&&\s*requestedBoss\s*<=\s*BOSSES\.length/,'B04 must validate direct boss IDs');

assert.match(guide,/BOSS-AUSWAHL 1–10/,'roadmap must be presented as a free boss selector');
assert.match(guide,/id="bossPreviewPlay"/,'boss preview needs a dedicated play action');
assert.match(guide,/url\.searchParams\.set\('boss',String\(id\)\)/,'play action must route through the existing boss query contract');
assert.match(guide,/url\.searchParams\.set\('bossPick','1'\)/,'boss selection must mark the one-shot guide-skip navigation');
assert.match(guide,/navigationParams\.get\('bossPick'\)==='1'/,'selected boss reload must recognize the one-shot guide skip');
assert.match(guide,/history\.replaceState\(\{\},'',cleanUrl\)/,'bossPick helper flag must be removed without another reload');
assert.doesNotMatch(guide,/searchParams\.(?:delete|set)\('stage'/,'free boss selection must not overwrite or remove the active language stage');
assert.match(guide,/Karten und Punkte starten für dieses Duell neu/,'preview must explain the fresh-duel behavior');
assert.match(guide,/beliebig oft wählen/,'preview must explain repeatable boss selection');

assert.match(css,/body\.boss-free-select \.boss-road-item\.past/,'free-selection CSS must neutralize chronological past styling');
assert.match(css,/\.boss-road-item\.past \.boss-road-num::after\{[\s\S]*display:none!important/,'free selection must not mislabel earlier IDs as defeated');
assert.match(css,/\.boss-preview-play/,'play CTA must have a dedicated touch-friendly visual contract');

assert.doesNotMatch(guide,/cards\s*=|scores\s*=|matchedPairs\s*=/,'boss selector UI must not own gameplay state');

console.log('Pirate Pairs free boss selection contract: PASS');