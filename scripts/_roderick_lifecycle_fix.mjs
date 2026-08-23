import fs from 'node:fs';

const corePath='public/pirate-pairs-b04.js';
let core=fs.readFileSync(corePath,'utf8');

const oldCast="  async function castMemoryCurse(){const opts=available().filter(i=>playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));if(opts.length<2){await banner('RODERICK SUCHT DEINE ERINNERUNG','Er braucht mindestens zwei bekannte, verdeckte Karten für seinen Fluch.','curse',650);return false;}clearCurse();const i=shuffle(opts)[0];cursedCardId=cards[i].id;const el=cardEl(i);el?.classList.add('curse-forming');await banner('RODERICKS FLUCH!','Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere Erinnerung.','curse',1000);await waitForHelpClosed();el?.classList.remove('curse-forming');el?.classList.add('cursed-memory');return true;}";
const newCast="  async function castMemoryCurse(){const opts=available().filter(i=>playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));if(opts.length<1){await banner('RODERICK SUCHT DEINE ERINNERUNG','Er braucht mindestens eine bekannte, verdeckte Karte für seinen Fluch.','curse',650);return false;}clearCurse();const i=shuffle(opts)[0];cursedCardId=cards[i].id;const el=cardEl(i);el?.classList.add('curse-forming');await banner('RODERICKS FLUCH!','Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere verdeckte Karte.','curse',1000);await waitForHelpClosed();el?.classList.remove('curse-forming');el?.classList.add('cursed-memory');return true;}";
if(!core.includes(oldCast))throw new Error('Roderick cast anchor missing');
core=core.replace(oldCast,newCast);

const oldTrigger="  async function triggerMemoryCurse(triggerIndex){if(cards[triggerIndex]?.id!==cursedCardId)return;clearCurse();const known=available().filter(i=>i!==triggerIndex&&playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));if(!known.length){await banner('FLUCH GEBROCHEN','Roderick findet keine weitere bekannte Karte zum Verschieben.','curse',600);return;}const from=shuffle(known)[0];const targets=available().filter(i=>i!==triggerIndex&&i!==from&&!fogged.has(i)&&!chained.has(i));if(!targets.length)return;const to=shuffle(targets)[0];await banner('VERFLUCHTE ERINNERUNG!','Beobachte: Roderick verschiebt eine andere Karte, die du bereits kanntest.','curse',720);await animateSwap(from,to,'curse');await banner('ERINNERUNG VERSCHOBEN','Die verfluchte Bewegung ist abgeschlossen.','curse',520);}";
const newTrigger="  async function triggerMemoryCurse(triggerIndex){if(cards[triggerIndex]?.id!==cursedCardId)return;clearCurse();const known=available().filter(i=>i!==triggerIndex&&playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));const fallback=available().filter(i=>i!==triggerIndex&&!fogged.has(i)&&!chained.has(i));const pool=known.length?known:fallback;if(!pool.length){await banner('FLUCH GEBROCHEN','Roderick findet keine andere verdeckte Karte zum Verschieben.','curse',600);return;}const from=shuffle(pool)[0];const targets=available().filter(i=>i!==triggerIndex&&i!==from&&!fogged.has(i)&&!chained.has(i));if(!targets.length)return;const to=shuffle(targets)[0];await banner('VERFLUCHTE ERINNERUNG!',known.length?'Beobachte: Roderick verschiebt bevorzugt eine Karte, die du bereits kanntest.':'Beobachte: Roderick verschiebt eine andere verdeckte Karte.','curse',720);await animateSwap(from,to,'curse');await banner('ERINNERUNG VERSCHOBEN','Die verfluchte Bewegung ist abgeschlossen.','curse',520);}";
if(!core.includes(oldTrigger))throw new Error('Roderick trigger anchor missing');
core=core.replace(oldTrigger,newTrigger);
fs.writeFileSync(corePath,core);

const indexPath='src/pages/index.astro';
let index=fs.readFileSync(indexPath,'utf8');
index=index.replace(
  "introCopy: 'Roderick markiert eine Karte, die du bereits gesehen hast. Öffnest du sie erneut, verschiebt er sichtbar eine andere bekannte Karte und bringt dein Gedächtnis durcheinander.'",
  "introCopy: 'Roderick markiert eine Karte, die du bereits gesehen hast. Öffnest du sie erneut, verschiebt er sichtbar eine andere verdeckte Karte – bevorzugt eine, die du ebenfalls schon kennst.'"
);
index=index.replace(
  "description: 'Alle drei deiner Versuche verflucht Roderick eine bereits bekannte verdeckte Karte. Öffnest du sie erneut, verschiebt er sichtbar eine andere bekannte Karte.'",
  "description: 'Alle drei deiner Versuche verflucht Roderick eine bereits bekannte verdeckte Karte. Öffnest du sie erneut, verschiebt er eine andere verdeckte Karte – bevorzugt eine bekannte Erinnerung.'"
);
fs.writeFileSync(indexPath,index);
console.log('Roderick lifecycle reliability fix applied.');
