import fs from 'node:fs';
import assert from 'node:assert/strict';

const core=fs.readFileSync('public/pirate-pairs-b04.js','utf8');
const index=fs.readFileSync('src/pages/index.astro','utf8');
const css=fs.readFileSync('public/pirate-pairs-ability-lifecycle.css','utf8');

assert.match(index,/bossId: 1,[\s\S]*?type: 'swap',[\s\S]*?triggerMode: 'each-word'/,'Kai must be configured for every revealed word');
assert.match(core,/const isPerWordKai = \(\) => bossId\(\)===1[\s\S]*?triggerMode==='each-word'/,'Kai per-word policy helper missing');
assert.match(core,/if\(isPerWordKai\(\)&&available\(\)\.length>=2[\s\S]*?await swapHiddenCards\(\)/,'Kai must swap after each player word reveal');
assert.match(core,/if\(isPerWordKai\(\)\)return;/,'Kai must not also fire from the generic cadence scheduler');

assert.match(index,/bossId: 2,[\s\S]*?type: 'bomb',[\s\S]*?persistent: true,/,'Brax must keep a persistent trap');
assert.match(core,/async function plantBomb\(\)\{\s*const generation=gameGeneration/,'plantBomb must own a generation guard');
assert.match(core,/bombExpiresAt=persistent\?null/,'Brax trap must not expire by attempt counter');
assert.match(core,/classList\.remove\('bomb-armed','mystery-covered'\)/,'consumed Brax mystery must reveal normally');
assert.match(core,/isPersistentBrax\(\)&&bombIndex==null[\s\S]*await ensurePersistentAbility\(\)/,'Brax must immediately re-arm another mystery card');
assert.match(css,/card\.mystery-covered \.back::after/,'persistent Brax card needs a visible question mark');

assert.match(index,/bossId: 9,[\s\S]*?type: 'shadow',[\s\S]*?persistent: true,/,'Azrak must keep one persistent shadow');
assert.match(core,/shadowExpiresAt=persistent\?null/,'Azrak shadow must not expire by attempt counter');
assert.match(core,/async function moveShadow\(\)[\s\S]*?shadowIndex=next/,'Azrak shadow must move to another card');

for(const type of ['fog','memory-curse','tribute','chains','cannon','line-shift','royal-chaos']){
  assert.ok(index.includes(`type: '${type}'`),`missing boss ability type: ${type}`);
}
assert.match(core,/async function ensurePersistentAbility\(\)/,'persistent ability owner missing');
assert.match(core,/const every=cadenceForAbility\(a\)/,'repeatable non-persistent abilities must use the shared cadence scheduler');
assert.match(core,/if\(triggered!==false\)lastAbilityAttempt=playerAttempts/,'an ability may only record an activation after it really triggered');

assert.match(core,/if\(helpOpen\|\|lock\|\|turn!=='player'/,'card input must stop while help is open');
assert.match(core,/async function usePeek\(\)\{if\(helpOpen\|\|peekUsed/,'peek must stop while help is open');
assert.match(core,/function waitForHelpClosed\(\)/,'help pause gate missing');
assert.ok((core.match(/await waitForHelpClosed\(\)/g)||[]).length>=8,'help-safe lifecycle must guard all major delayed boss transitions');
assert.match(core,/helpBtn\?\.addEventListener\('click',openHelpPanel\)/,'help open handler missing');
assert.match(core,/closeHelp\?\.addEventListener\('click',closeHelpPanel\)/,'help close handler missing');
assert.match(core,/startBtn\?\.addEventListener\('click',async\(\)=>\{intro\.classList\.add\('hidden'\);await enterPlayerTurn\(\)/,'initial persistent boss state must arm immediately after intro');

console.log('Pirate Pairs boss ability lifecycle: PASS');
