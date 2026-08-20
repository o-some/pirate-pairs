(() => {
  const body=document.body,grid=document.getElementById('grid'),turnPill=document.getElementById('turnPill');
  const playerScore=document.getElementById('playerScore'),aiScore=document.getElementById('aiScore');
  const result=document.getElementById('result'),resultTitle=document.getElementById('resultTitle'),peekBtn=document.getElementById('peekBtn');
  if(!body||!grid)return;
  body.classList.add('pirate-pairs-v2');

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced){
    const ambient=document.createElement('div');ambient.className='pp-ambient';ambient.setAttribute('aria-hidden','true');
    const count=window.matchMedia('(max-width:719px)').matches?7:12;
    for(let i=0;i<count;i++){
      const b=document.createElement('i');b.className='pp-bubble';
      b.style.setProperty('--x',`${6+((i*17)%91)}%`);b.style.setProperty('--s',`${5+(i%4)*3}px`);
      b.style.setProperty('--d',`${10+(i%5)*2.4}s`);b.style.setProperty('--delay',`${-((i*1.7)%10)}s`);
      b.style.setProperty('--drift',`${(i%2?1:-1)*(8+(i%4)*6)}px`);ambient.appendChild(b);
    }
    body.prepend(ambient);
  }

  const burstNear=(el,owner='player',count=10)=>{
    if(!el||reduced)return;const r=el.getBoundingClientRect(),burst=document.createElement('span');
    burst.className='pp-burst';burst.style.setProperty('--cx',`${r.left+r.width/2}px`);burst.style.setProperty('--cy',`${r.top+r.height/2}px`);
    burst.style.setProperty('--burst-color',owner==='ai'?'#f18a76':'#7df0be');
    for(let i=0;i<count;i++){const p=document.createElement('i');p.style.setProperty('--a',`${(360/count)*i+(i%3)*7}deg`);p.style.setProperty('--r',`${26+(i%5)*7}px`);burst.appendChild(p)}
    body.appendChild(burst);setTimeout(()=>burst.remove(),850);
  };

  const syncTurn=()=>{
    const ai=Boolean(turnPill?.classList.contains('ai'));body.classList.toggle('ai-thinking',ai);
    document.querySelector('.fighter:not(.enemy)')?.classList.toggle('active',!ai);
    document.querySelector('.fighter.enemy')?.classList.toggle('active',ai);
  };

  const lastClass=new WeakMap();
  const prepareCards=()=>{[...grid.querySelectorAll('.card')].forEach((card,i)=>{if(card.dataset.fxReady==='1')return;card.dataset.fxReady='1';card.style.setProperty('--deal-delay',`${Math.min(i,15)*26}ms`);lastClass.set(card,card.className)})};
  const pulseScore=(node,owner)=>{if(!node)return;node.classList.remove('score-bump');void node.offsetWidth;node.classList.add('score-bump');burstNear(owner==='ai'?document.querySelector('.fighter.enemy .portrait'):document.querySelector('.fighter:not(.enemy) .portrait'),owner,owner==='ai'?9:13);setTimeout(()=>node.classList.remove('score-bump'),620)};

  let oldPlayer=Number(playerScore?.textContent||0),oldAi=Number(aiScore?.textContent||0);
  const scoreObserver=new MutationObserver(()=>{
    const p=Number(playerScore?.textContent||0),a=Number(aiScore?.textContent||0);
    if(p>oldPlayer)pulseScore(playerScore,'player');if(a>oldAi)pulseScore(aiScore,'ai');oldPlayer=p;oldAi=a;
  });
  if(playerScore)scoreObserver.observe(playerScore,{childList:true,characterData:true,subtree:true});
  if(aiScore)scoreObserver.observe(aiScore,{childList:true,characterData:true,subtree:true});

  const gridObserver=new MutationObserver(records=>{
    prepareCards();let hasPeek=false;
    for(const card of grid.querySelectorAll('.card'))if(card.classList.contains('peek'))hasPeek=true;
    body.classList.toggle('peek-active',hasPeek);
    for(const record of records){
      if(record.type!=='attributes'||record.attributeName!=='class')continue;
      const card=record.target;if(!(card instanceof HTMLElement)||!card.classList.contains('card'))continue;
      const before=record.oldValue??lastClass.get(card)??'',now=card.className;
      if(!before.includes('matched')&&card.classList.contains('matched')){
        card.classList.remove('match-pop');void card.offsetWidth;card.classList.add('match-pop');burstNear(card,card.classList.contains('kai')?'ai':'player',10);setTimeout(()=>card.classList.remove('match-pop'),700);
      }
      if(before.includes('flipped')&&!card.classList.contains('flipped')&&!card.classList.contains('matched')){
        card.classList.remove('wrong-pair');void card.offsetWidth;card.classList.add('wrong-pair');setTimeout(()=>card.classList.remove('wrong-pair'),420);
      }
      if(!before.includes('flipped')&&card.classList.contains('flipped')&&body.classList.contains('ai-thinking')){
        card.classList.remove('ai-pick');void card.offsetWidth;card.classList.add('ai-pick');setTimeout(()=>card.classList.remove('ai-pick'),520);
      }
      lastClass.set(card,now);
    }
  });
  gridObserver.observe(grid,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['class']});
  if(turnPill)new MutationObserver(syncTurn).observe(turnPill,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

  if(result){let hidden=result.classList.contains('hidden');new MutationObserver(()=>{
    const next=result.classList.contains('hidden');if(hidden&&!next){const title=resultTitle?.textContent||'',win=title.includes('geschlagen');body.classList.toggle('result-win',win);body.classList.toggle('result-loss',!win&&!title.includes('Unentschieden'));if(win)burstNear(result.querySelector('.mini-logo'),'player',20)}
    if(next)body.classList.remove('result-win','result-loss');hidden=next;
  }).observe(result,{attributes:true,attributeFilter:['class']})}

  peekBtn?.addEventListener('click',()=>{if(!peekBtn.disabled){body.classList.add('peek-active');setTimeout(()=>body.classList.remove('peek-active'),1750)}});
  prepareCards();syncTurn();
})();
