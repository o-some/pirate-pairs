(() => {
  const topSprite=document.getElementById('bossDuelSprite');
  const rail=document.getElementById('bossRoadmap');
  if(!topSprite||!rail)return;

  const activeBossId=()=>String(document.body.dataset.bossId||'1');
  let scheduled=0;

  function topSpriteSource(){
    return topSprite.currentSrc||topSprite.getAttribute('src')||topSprite.src||'';
  }

  function syncActivePortrait(){
    scheduled=0;
    const id=activeBossId();
    const source=topSpriteSource();

    rail.querySelectorAll('.boss-road-item').forEach(item=>{
      const active=item.dataset.bossId===id;
      item.querySelectorAll('.boss-road-live-sprite').forEach(img=>{
        if(!active)img.remove();
      });
      if(!active)return;

      const medallion=item.querySelector('.boss-road-num');
      if(!medallion||!source)return;

      let image=medallion.querySelector('.boss-road-live-sprite');
      if(!image){
        image=document.createElement('img');
        image.className='boss-road-live-sprite';
        image.alt='';
        image.setAttribute('aria-hidden','true');
        image.decoding='async';
        image.draggable=false;
        medallion.appendChild(image);
      }

      if(image.getAttribute('src')!==source)image.src=source;
      image.dataset.source='duel-sprite';
      item.dataset.b09Portrait='duel-sprite';
    });
  }

  function scheduleSync(){
    if(scheduled)return;
    scheduled=requestAnimationFrame(syncActivePortrait);
  }

  topSprite.addEventListener('load',scheduleSync);
  topSprite.addEventListener('error',()=>setTimeout(scheduleSync,0));

  new MutationObserver(scheduleSync).observe(topSprite,{
    attributes:true,
    attributeFilter:['src','data-fallback'],
  });

  new MutationObserver(scheduleSync).observe(document.body,{
    attributes:true,
    attributeFilter:['data-boss-id'],
  });

  new MutationObserver(scheduleSync).observe(rail,{
    childList:true,
    subtree:true,
  });

  scheduleSync();
  setTimeout(scheduleSync,250);
  setTimeout(scheduleSync,900);
})();
