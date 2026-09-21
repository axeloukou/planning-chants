function acpCanvasScale(){const el=document.getElementById('slide-content');return el?.clientWidth?el.getBoundingClientRect().width/el.clientWidth:1;}
function acpScaleCanvas(){
 const container=document.getElementById('slide-container'),canvas=document.getElementById('slide-content');
 if(!container||!canvas)return;
 const pad=presentationEditMode?40:0;
 canvas.style.setProperty('--acp-canvas-scale',String(ACPSlideFit.scaleFor(Math.max(1,container.clientWidth-pad),Math.max(1,container.clientHeight-pad))));
}
function acpFitCurrent(){
 acpScaleCanvas();
 const result=ACPSlideFit.fit(document.getElementById('slide-content'));
 const status=document.getElementById('acp-editor-fit');
 if(status)status.textContent=result.small?'Texte ajusté : taille réduite pour conserver tout le contenu sur cette diapositive.':'Format 16:9 · Contenu ajusté sans défilement';
}
function acpSlideExcerpt(slide){
 const box=document.createElement('div');box.innerHTML=slide.content;
 return (box.querySelector('[data-edit-role="body"]')?.textContent||box.textContent||'').replace(/\s+/g,' ').trim().slice(0,120);
}
function acpResetLayout(){
 if(!confirm('Réinitialiser la position et la taille des objets de cette diapositive ? Le contenu sera conservé.'))return;
 const slide=presentationSlides[currentSlideIndex];if(!slide)return;
 pushPresentationEditorHistory('auto-layout');
 const layout=ensurePresentationSlideLayout(slide.layoutKey);
 for(const [key,value] of Object.entries(layout)){
  if(key==='extras'||key==='backgroundColor'||!value||typeof value!=='object')continue;
  const keep={};if(typeof value.textContent==='string')keep.textContent=value.textContent;if(value.hidden)keep.hidden=true;
  layout[key]=keep;
 }
 showSlide(currentSlideIndex);markPresentationEditorDirty();
}
const acpEditorShow=showSlide;
showSlide=function(index){acpEditorShow(index);acpHighlightStars();acpFitCurrent();acpRenderRegie();};
const acpEditorSync=syncPresentationEditorUi;
syncPresentationEditorUi=function(){
 acpEditorSync();
 const selected=selectedPresentationElementInfo;
 document.querySelectorAll('[data-acp-needs-selection]').forEach(el=>el.disabled=!selected);
 document.querySelectorAll('[data-acp-needs-text]').forEach(el=>el.disabled=!selected||selected.kind==='media');
 const label=document.getElementById('acp-selection-label');if(label)label.textContent=selected?(selected.kind==='media'?'Image / vidéo sélectionnée':'Texte sélectionné'):'Sélectionne un objet sur la diapositive';
 const pos=document.getElementById('acp-editor-position');if(pos)pos.textContent=`Diapositive ${currentSlideIndex+1} sur ${presentationSlides.length}`;
 acpScaleCanvas();
};
window.addEventListener('resize',()=>{if(isPresentationDisplayVisible())acpFitCurrent();});
document.addEventListener('pointerup',()=>{if(presentationEditMode)acpFitCurrent();});
document.addEventListener('input',e=>{if(e.target?.id==='presentation-font-size-range'||e.target?.id==='presentation-media-size-range')acpFitCurrent();});
document.addEventListener('click',e=>{if(e.target?.closest?.('#presentation-properties-panel'))acpFitCurrent();});
if(document.fonts?.ready)document.fonts.ready.then(()=>{if(isPresentationDisplayVisible())acpFitCurrent();});

document.addEventListener('toggle',event=>{
 if(!event.target.matches?.('.acp-tool-menu')||!event.target.open)return;
 document.querySelectorAll('.acp-tool-menu[open]').forEach(menu=>{if(menu!==event.target)menu.open=false;});
},true);
document.addEventListener('click',event=>{
 if(!event.target.closest?.('.acp-tool-menu'))document.querySelectorAll('.acp-tool-menu[open]').forEach(menu=>menu.open=false);
});

// Sortir un objet du flux ne doit pas recentrer les autres objets de la diapositive.
function acpFreezeSlideObjects(){
 const slide=presentationSlides[currentSlideIndex],canvas=document.getElementById('slide-content');
 if(!slide||!canvas)return;
 const snapshots=[...canvas.querySelectorAll('.presentation-editable')].filter(el=>getComputedStyle(el).display!=='none').map(el=>{
  const role=el.dataset.editRole;
  const current=getPresentationSlideRoleLayout(getPresentationSlideLayout(slide.layoutKey),role,{fontSize:Number(el.dataset.defaultFontSize)||48});
  return {el,role,layout:promotePresentationElementToOverlay(el,current)};
 });
 for(const {el,role,layout} of snapshots){
  setPresentationSlideRoleLayout(slide.layoutKey,role,layout);
  applyPresentationLayoutToElement(el,layout);
  if(selectedPresentationElementInfo?.element===el)selectedPresentationElementInfo.layout={...layout};
 }
 acpFitCurrent();
}

function acpHighlightStars(){
 const canvas=document.getElementById('slide-content');if(!canvas)return;
 const walker=document.createTreeWalker(canvas,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(/\*[^*]+\*/.test(n.textContent)&&!n.parentElement.closest('.lyric-label'))nodes.push(n);}
 for(const n of nodes){const span=document.createElement('span');span.innerHTML=formatPresentationEmphasis(n.textContent);n.replaceWith(...span.childNodes);}
}
