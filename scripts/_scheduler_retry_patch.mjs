import fs from 'node:fs';
const path='public/pirate-pairs-b04.js';
let src=fs.readFileSync(path,'utf8');
const next=`const every=cadenceForAbility(a);const lastSuccess=Math.max(0,lastAbilityAttempt);if(!playerAttempts||playerAttempts-lastSuccess<every)return;lock=true;setTurnUi();let triggered=false;`;
if(src.includes(next)){
  console.log('Retry-safe cadence scheduler already applied.');
  process.exit(0);
}
const old=`const every=cadenceForAbility(a);if(!playerAttempts||playerAttempts%every!==0||lastAbilityAttempt===playerAttempts)return;lock=true;setTurnUi();let triggered=false;`;
if(!src.includes(old))throw new Error('Missing shared cadence scheduler anchor');
src=src.replace(old,next);
fs.writeFileSync(path,src);
console.log('Retry-safe cadence scheduler applied.');
