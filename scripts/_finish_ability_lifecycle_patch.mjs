import fs from 'node:fs';
const path='public/pirate-pairs-b04.js';
let src=fs.readFileSync(path,'utf8');
function rep(from,to,label){if(!src.includes(from))throw new Error(`Missing finish anchor: ${label}`);src=src.replace(from,to);}

rep(
`    await Promise.all([aa?.finished?.catch(()=>{}),ab?.finished?.catch(()=>{})]);if(generation!==gameGeneration)return false;[cards[a],cards[b]]=[cards[b],cards[a]];reindexMemory();render();return true;`,
`    await Promise.all([aa?.finished?.catch(()=>{}),ab?.finished?.catch(()=>{})]);await waitForHelpClosed();if(generation!==gameGeneration)return false;[cards[a],cards[b]]=[cards[b],cards[a]];reindexMemory();render();return true;`,
'swap commits after help');

rep(
`    await banner(royal?'VARKOS LEGT EINE KRONENBOMBE!':persistent?'BRAX VERDECKT EINE KARTE!':'BRAX LEGT EINE BOMBE!',royal?'Die markierte Karte ist für diesen Versuch vermint: Treffer = −1 für dich und +1 für Varkos.':persistent?'Eine Karte bleibt dauerhaft als ?-Pulverfalle markiert. Wird sie verbraucht, wählt Brax im nächsten Zug sofort eine neue.':'Merk dir die markierte Karte. Öffnest du sie: −1 für dich, +1 für Brax.',royal?'varkos phase-2 bomb':'bomb',1000);\n    el?.classList.remove('bomb-targeting');el?.classList.add('bomb-armed');if(persistent)el?.classList.add('mystery-covered');return true;`,
`    await banner(royal?'VARKOS LEGT EINE KRONENBOMBE!':persistent?'BRAX VERDECKT EINE KARTE!':'BRAX LEGT EINE BOMBE!',royal?'Die markierte Karte ist für diesen Versuch vermint: Treffer = −1 für dich und +1 für Varkos.':persistent?'Eine Karte bleibt dauerhaft als ?-Pulverfalle markiert. Wird sie verbraucht, wählt Brax sofort eine neue.':'Merk dir die markierte Karte. Öffnest du sie: −1 für dich, +1 für Brax.',royal?'varkos phase-2 bomb':'bomb',1000);\n    await waitForHelpClosed();if(generation!==gameGeneration)return false;\n    el?.classList.remove('bomb-targeting');el?.classList.add('bomb-armed');if(persistent)el?.classList.add('mystery-covered');return true;`,
'Brax arm after help');

rep(
`  async function triggerBomb(i){if(i!==bombIndex)return;const royal=isRoyalChaos(),el=cardEl(i);el?.classList.remove('bomb-armed');el?.classList.add('bomb-explode');bombIndex=null;bombExpiresAt=null;`,
`  async function triggerBomb(i){if(i!==bombIndex)return;const royal=isRoyalChaos(),el=cardEl(i);el?.classList.remove('bomb-armed','mystery-covered');el?.classList.add('bomb-explode');bombIndex=null;bombExpiresAt=null;`,
'Brax reveal consumed mystery');

rep(
`picks.forEach(i=>cardEl(i)?.classList.add('fog-forming'));await banner('BLACKFINN RUFT DEN NEBEL!',\`${'${picks.length}'} Karten sind für deinen nächsten Versuch blockiert.\`,'fog',900);picks.forEach`,
`picks.forEach(i=>cardEl(i)?.classList.add('fog-forming'));await banner('BLACKFINN RUFT DEN NEBEL!',\`${'${picks.length}'} Karten sind für deinen nächsten Versuch blockiert.\`,'fog',900);await waitForHelpClosed();picks.forEach`,
'fog commit after help');

rep(
`await banner('RODERICKS FLUCH!','Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere Erinnerung.','curse',1000);el?.classList.remove('curse-forming');`,
`await banner('RODERICKS FLUCH!','Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere Erinnerung.','curse',1000);await waitForHelpClosed();el?.classList.remove('curse-forming');`,
'curse commit after help');

rep(
`await banner(royal?'VARKOS SCHLIESST DIE KRONENKETTEN!':'IRONHOOK FESSELT DIE KARTEN!',royal?'Zwei Karten sind für diesen Versuch gesperrt. Varkos selbst kann sie weiterhin erreichen.':'Zwei Karten sind für deine nächsten 2 Versuche gesperrt. Ironhook selbst kann sie weiterhin nutzen.',royal?'varkos phase-2 chain':'chain',1050);picks.forEach`,
`await banner(royal?'VARKOS SCHLIESST DIE KRONENKETTEN!':'IRONHOOK FESSELT DIE KARTEN!',royal?'Zwei Karten sind für diesen Versuch gesperrt. Varkos selbst kann sie weiterhin erreichen.':'Zwei Karten sind für deine nächsten 2 Versuche gesperrt. Ironhook selbst kann sie weiterhin nutzen.',royal?'varkos phase-2 chain':'chain',1050);await waitForHelpClosed();picks.forEach`,
'chains commit after help');

rep(
`    await Promise.all(animations.map(a=>a?.finished?.catch(()=>{})));if(generation!==gameGeneration)return false;`,
`    await Promise.all(animations.map(a=>a?.finished?.catch(()=>{})));await waitForHelpClosed();if(generation!==gameGeneration)return false;`,
'line shift commit after help');

rep(
`await banner('AZRAK RUFT DEN SCHATTEN!',persistent?'Azrak hält dauerhaft genau eine Karte im Schatten. Nach deiner ersten Auswahl wandert der Schatten weiter.':'Eine Karte verschwindet im Schatten und ist für dich blockiert. Nach deiner ersten Karte wandert der Schatten weiter.','shadow',980);if(generation!==gameGeneration)return false;`,
`await banner('AZRAK RUFT DEN SCHATTEN!',persistent?'Azrak hält dauerhaft genau eine Karte im Schatten. Nach deiner ersten Auswahl wandert der Schatten weiter.':'Eine Karte verschwindet im Schatten und ist für dich blockiert. Nach deiner ersten Karte wandert der Schatten weiter.','shadow',980);await waitForHelpClosed();if(generation!==gameGeneration)return false;`,
'Azrak arm after help');

rep(
`oldEl?.classList.add('shadow-leaving');nextEl?.classList.add('shadow-arriving');await sleep(460);if(generation!==gameGeneration)return;`,
`oldEl?.classList.add('shadow-leaving');nextEl?.classList.add('shadow-arriving');await sleep(460);await waitForHelpClosed();if(generation!==gameGeneration)return;`,
'Azrak move after help');

rep(
`    reveal(i,'player');selected.push(i);\n    if(selected.length===1&&shadowIndex!=null&&ability()?.type==='shadow')`,
`    reveal(i,'player');selected.push(i);\n    if(isPersistentBrax()&&bombIndex==null&&!gameOver){lock=true;setTurnUi();await ensurePersistentAbility();if(generation!==gameGeneration)return;}\n    if(selected.length===1&&shadowIndex!=null&&ability()?.type==='shadow')`,
'Brax immediate rearm');

rep(
`await sleep(1350);if(generation!==gameGeneration)return;picks.forEach(i=>cardEl(i)?.classList.remove('peek'));`,
`await sleep(1350);await waitForHelpClosed();if(generation!==gameGeneration)return;picks.forEach(i=>cardEl(i)?.classList.remove('peek'));`,
'peek duration help safe');

fs.writeFileSync(path,src);

const test='tests/ability-lifecycle.mjs';
let t=fs.readFileSync(test,'utf8');
t=t.replace(
`assert.match(core,/bombExpiresAt=persistent\\?null/,'Brax trap must not expire by attempt counter');`,
`assert.match(core,/bombExpiresAt=persistent\\?null/,'Brax trap must not expire by attempt counter');\nassert.match(core,/classList\\.remove\\('bomb-armed','mystery-covered'\\)/,'consumed Brax mystery must reveal normally');\nassert.match(core,/isPersistentBrax\\(\\)&&bombIndex==null[\\s\\S]*await ensurePersistentAbility\\(\\)/,'Brax must immediately re-arm another mystery card');`);
t=t.replace(
`assert.match(core,/await waitForHelpClosed\\(\\)/,'gameplay transitions must wait for help to close');`,
`assert.match(core,/await waitForHelpClosed\\(\\)/,'gameplay transitions must wait for help to close');\nassert.ok((core.match(/await waitForHelpClosed\\(\\)/g)||[]).length>=8,'help-safe lifecycle must guard all major delayed boss transitions');`);
fs.writeFileSync(test,t);
console.log('Final ability lifecycle corrections applied.');
