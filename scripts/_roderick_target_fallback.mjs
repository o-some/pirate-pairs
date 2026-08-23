import fs from 'node:fs';

const corePath='public/pirate-pairs-b04.js';
let core=fs.readFileSync(corePath,'utf8');
const old="  async function castMemoryCurse(){const opts=available().filter(i=>playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));if(opts.length<1){await banner('RODERICK SUCHT DEINE ERINNERUNG','Er braucht mindestens eine bekannte, verdeckte Karte für seinen Fluch.','curse',650);return false;}clearCurse();const i=shuffle(opts)[0];cursedCardId=cards[i].id;const el=cardEl(i);el?.classList.add('curse-forming');await banner('RODERICKS FLUCH!','Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere verdeckte Karte.','curse',1000);await waitForHelpClosed();el?.classList.remove('curse-forming');el?.classList.add('cursed-memory');return true;}";
const next="  async function castMemoryCurse(){const known=available().filter(i=>playerSeen.has(cards[i].id)&&!fogged.has(i)&&!chained.has(i));const fallback=available().filter(i=>!fogged.has(i)&&!chained.has(i));const opts=known.length?known:fallback;if(!opts.length)return false;clearCurse();const i=shuffle(opts)[0];cursedCardId=cards[i].id;const el=cardEl(i);el?.classList.add('curse-forming');await banner('RODERICKS FLUCH!',known.length?'Eine bereits bekannte Karte wurde verflucht. Öffnest du sie, verschiebt er eine andere verdeckte Karte.':'Keine bekannte Karte war verfügbar – Roderick verflucht stattdessen eine andere verdeckte Karte.','curse',1000);await waitForHelpClosed();el?.classList.remove('curse-forming');el?.classList.add('cursed-memory');return true;}";
if(!core.includes(old))throw new Error('Roderick fallback target anchor missing');
core=core.replace(old,next);
fs.writeFileSync(corePath,core);

const indexPath='src/pages/index.astro';
let index=fs.readFileSync(indexPath,'utf8');
index=index.replace(
  "description: 'Alle drei deiner Versuche verflucht Roderick eine bereits bekannte verdeckte Karte. Öffnest du sie erneut, verschiebt er eine andere verdeckte Karte – bevorzugt eine bekannte Erinnerung.'",
  "description: 'Alle drei deiner Versuche verflucht Roderick bevorzugt eine bereits bekannte verdeckte Karte. Ist keine verfügbar, nimmt er eine andere freie Karte. Beim Auslösen verschiebt er bevorzugt eine bekannte Erinnerung.'"
);
fs.writeFileSync(indexPath,index);
console.log('Roderick fallback target applied.');
