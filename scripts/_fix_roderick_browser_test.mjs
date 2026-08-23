import fs from 'node:fs';
const path='tests/ability-lifecycle-browser.mjs';
let src=fs.readFileSync(path,'utf8');
const old=`await startBoss(4);\nfor(let i=0;i<8 && await page.locator('#grid .card.cursed-memory').count()===0;i++)await mismatchOne();\nassert.ok(await page.locator('#grid .card.cursed-memory').count()>0,'Roderick memory curse did not activate across two cadence windows');\nawait helpPreserves('#grid .card.cursed-memory');`;
const next=`await startBoss(4);\nawait matchOne();await matchOne();await matchOne();\nawait page.waitForSelector('#grid .card.cursed-memory',{state:'attached',timeout:10000});\nassert.equal(await page.locator('#grid .card.cursed-memory').count(),1,'Roderick must arm exactly one curse on his third player attempt');\nawait helpPreserves('#grid .card.cursed-memory');`;
if(!src.includes(old))throw new Error('Roderick browser-test anchor missing');
src=src.replace(old,next);
fs.writeFileSync(path,src);
console.log('Roderick browser test made deterministic.');
