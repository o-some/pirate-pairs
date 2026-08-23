import fs from 'node:fs';
const path='public/pirate-pairs-b04.js';
let src=fs.readFileSync(path,'utf8');
const from=`  async function plantBomb(){\n    const royal=isRoyalChaos(),persistent=isPersistentBrax(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));`;
const to=`  async function plantBomb(){\n    const generation=gameGeneration,royal=isRoyalChaos(),persistent=isPersistentBrax(),opts=available().filter(i=>!fogged.has(i)&&!chained.has(i));`;
if(!src.includes(from))throw new Error('Missing Brax plantBomb generation anchor');
src=src.replace(from,to);
fs.writeFileSync(path,src);
const test='tests/ability-lifecycle.mjs';
let t=fs.readFileSync(test,'utf8');
if(!t.includes("plantBomb must own a generation guard")){
  t=t.replace("assert.match(core,/bombExpiresAt=persistent\\?null/,'Brax trap must not expire by attempt counter');", "assert.match(core,/async function plantBomb\\(\\)\\{\\s*const generation=gameGeneration/,'plantBomb must own a generation guard');\nassert.match(core,/bombExpiresAt=persistent\\?null/,'Brax trap must not expire by attempt counter');");
}
fs.writeFileSync(test,t);
console.log('Brax generation guard fixed.');
