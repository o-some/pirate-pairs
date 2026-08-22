(() => {
  const dataNode=document.getElementById('boss-data');
  const BOSSES=(()=>{try{return JSON.parse(dataNode?.textContent||'{}').bosses||[];}catch{return[];}})();
  if(!BOSSES.length)return;

  const gradient='radial-gradient(circle at 50% 38%, #18566a, #072d42 74%)';
  let loadGeneration=0;

  function currentBoss(){
    const id=Number(document.body.dataset.bossId||1);
    return BOSSES.find(b=>Number(b.bossId)===id)||BOSSES[0];
  }

  function ensureCurrentPortrait(){
    const b=currentBoss();
    const button=document.querySelector(`#bossRoadmap .boss-road-item[data-boss-id="${b.bossId}"]`);
    const medallion=button?.querySelector('.boss-road-num');
    if(!button||!medallion)return;

    const primary=b.image||button.dataset.bossImage||'';
    const fallback=b.fallback||button.dataset.bossFallback||'';
    const generation=++loadGeneration;
    delete button.dataset.portraitLoaded;
    button.dataset.portraitLoading='1';

    const apply=url=>{
      if(generation!==loadGeneration||!button.isConnected)return;
      medallion.style.backgroundImage=url?`url("${url}"), ${gradient}`:gradient;
      button.dataset.portraitLoaded='1';
      delete button.dataset.portraitLoading;
    };

    const probe=(url,onError)=>{
      if(!url){onError?.();return;}
      const image=new Image();
      image.decoding='async';
      image.onload=()=>apply(url);
      image.onerror=()=>onError?.();
      image.src=url;
    };

    probe(primary,()=>{
      if(fallback&&fallback!==primary)probe(fallback,()=>apply(''));
      else apply('');
    });
  }

  window.requestAnimationFrame(ensureCurrentPortrait);
  new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='data-boss-id'))window.requestAnimationFrame(ensureCurrentPortrait);
  }).observe(document.body,{attributes:true,attributeFilter:['data-boss-id']});
})();
