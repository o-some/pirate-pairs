import fs from 'node:fs';
const corePath='public/pirate-pairs-b04.js';
const indexPath='src/pages/index.astro';
let core=fs.readFileSync(corePath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');
if(core.includes('const isPerWordKai')&&index.includes("triggerMode: 'each-word'")){
  console.log('Kai each-word trigger already applied.');
  process.exit(0);
}
function rep(from,to,label){if(!core.includes(from))throw new Error(`Missing Kai anchor: ${label}`);core=core.replace(from,to);}
rep(
`  const isPersistentAzrak = () => bossId()===9 && ability()?.type==='shadow' && ability()?.persistent===true;\n  const cadenceForAbility = a => bossId()===1 && a?.type==='swap' ? 1 : Math.max(1,Number(a?.everyPlayerAttempts||3));`,
`  const isPersistentAzrak = () => bossId()===9 && ability()?.type==='shadow' && ability()?.persistent===true;\n  const isPerWordKai = () => bossId()===1 && ability()?.type==='swap' && ability()?.triggerMode==='each-word';\n  const cadenceForAbility = a => Math.max(1,Number(a?.everyPlayerAttempts||3));`,
'Kai trigger helper');
rep(
`    if(isPersistentBrax()||isPersistentAzrak()){lock=true;setTurnUi();try{await ensurePersistentAbility();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}return;}\n    const a=ability();if(!a?.type||a.type==='none')return;`,
`    if(isPersistentBrax()||isPersistentAzrak()){lock=true;setTurnUi();try{await ensurePersistentAbility();}finally{if(generation===gameGeneration){lock=false;setTurnUi();}}return;}\n    if(isPerWordKai())return;\n    const a=ability();if(!a?.type||a.type==='none')return;`,
'disable duplicate Kai turn trigger');
rep(
`    reveal(i,'player');selected.push(i);\n    if(isPersistentBrax()&&bombIndex==null&&!gameOver)`,
`    reveal(i,'player');selected.push(i);\n    if(isPerWordKai()&&available().length>=2&&!gameOver){lock=true;setTurnUi();await swapHiddenCards();if(generation!==gameGeneration)return;}\n    if(isPersistentBrax()&&bombIndex==null&&!gameOver)`,
'Kai per word trigger');
fs.writeFileSync(corePath,core);

const from=`        description: 'Nach jedem deiner abgeschlossenen Versuche tauscht Kai zwei verdeckte Karten sichtbar miteinander. Folge der Bewegung genau.',\n        everyPlayerAttempts: 1,`;
const to=`        description: 'Nach jeder von dir aufgedeckten Wortkarte tauscht Kai zwei andere noch verdeckte Karten sichtbar miteinander. Die offene Karte bleibt sicher liegen.',\n        triggerMode: 'each-word',\n        everyPlayerAttempts: 1,`;
if(!index.includes(from))throw new Error('Missing Kai config anchor');
index=index.replace(from,to);
fs.writeFileSync(indexPath,index);

const testPath='tests/ability-lifecycle.mjs';
let test=fs.readFileSync(testPath,'utf8');
test=test.replace(
`assert.match(index,/bossId: 1,[\\s\\S]*?type: 'swap',[\\s\\S]*?everyPlayerAttempts: 1,/,'Kai must trigger after every completed player attempt');`,
`assert.match(index,/bossId: 1,[\\s\\S]*?type: 'swap',[\\s\\S]*?triggerMode: 'each-word'/,'Kai must be configured for every revealed word');\nassert.match(core,/if\\(isPerWordKai\\(\\)\\)&&available\\(\\)\\.length>=2[\\s\\S]*?await swapHiddenCards\\(\\)/,'Kai must swap after each player word reveal');\nassert.match(core,/if\\(isPerWordKai\\(\\)\\)return;/,'Kai must not also fire from the generic turn cadence');`);
fs.writeFileSync(testPath,test);
console.log('Kai each-word trigger applied.');
