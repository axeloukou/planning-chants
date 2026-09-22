/* Canevas partagé : même géométrie en édition, en projection et dans les aperçus. */
(function(root){
const WIDTH=1280,HEIGHT=720;
function scaleFor(width,height){return Math.max(.05,Math.min(width/WIDTH,height/HEIGHT));}
function fit(rootNode){
  if(!rootNode||!rootNode.clientWidth)return {small:false};
  let smallest=100;
  const handles=[...rootNode.querySelectorAll('.presentation-resize-handle')];
  const handleStyles=handles.map(h=>h.getAttribute('style'));
  handles.forEach(h=>h.style.setProperty('display','none','important'));
  const blocks=[...rootNode.querySelectorAll('.presentation-editable')];
  // Rétablir la taille demandée avant chaque mesure ; pas de réduction cumulative.
  for(const el of blocks){
    if(el.dataset.editMedia==='1')continue;
    const style=getComputedStyle(el);
    const requested=Number(el.dataset.acpRequested)||parseFloat(style.fontSize)||40;
    if(!el.dataset.acpRequested)el.dataset.acpRequested=String(requested);
    el.style.setProperty('font-size',requested+'px','important');
    el.style.setProperty('--pfont',requested+'px');
  }
  const canvasRect=rootNode.getBoundingClientRect();
  const scale=canvasRect.width/WIDTH||1;
  for(const el of blocks){
    if(getComputedStyle(el).display==='none')continue;
    const style=getComputedStyle(el),overlay=style.position==='absolute';
    if(el.dataset.editMedia==='1')continue;
    const isTitle=['title','subtitle'].includes(el.dataset.editRole);
    if(!overlay){
      if(el.dataset.editRole==='body')el.style.maxHeight='440px';
      else if(isTitle)el.style.maxHeight=el.dataset.editRole==='subtitle'?'64px':'116px';
      el.style.minHeight='0';el.style.flexShrink='1';
    }
    el.style.overflow='hidden';el.style.overflowWrap='anywhere';
    let requested=Number(el.dataset.acpRequested)||40;
    const fits=()=>el.scrollHeight<=el.clientHeight+1&&el.scrollWidth<=el.clientWidth+1;
    if(!fits()){
      let low=1,high=requested;
      for(let i=0;i<10;i++){const mid=(low+high)/2;el.style.setProperty('font-size',mid+'px','important');el.style.setProperty('--pfont',mid+'px');if(fits())low=mid;else high=mid;}
      const size=Math.max(1,Math.floor(low));el.style.setProperty('font-size',size+'px','important');el.style.setProperty('--pfont',size+'px');smallest=Math.min(smallest,size);
    }else smallest=Math.min(smallest,requested);
  }
  // Supprimer également les anciennes zones défilantes imbriquées.
  for(const node of rootNode.querySelectorAll('[style]')){if(/auto|scroll/.test(node.style.overflowY||'')||/auto|scroll/.test(node.style.overflow||'')){node.style.overflow='hidden';node.style.overflowY='hidden';}}
  handles.forEach((h,i)=>{if(handleStyles[i]===null)h.removeAttribute('style');else h.setAttribute('style',handleStyles[i]);});
  return {small:smallest<26,minimum:smallest};
}
const api={WIDTH,HEIGHT,scaleFor,fit};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ACPSlideFit=api;
})(typeof window!=='undefined'?window:globalThis);
