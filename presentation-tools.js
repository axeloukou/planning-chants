/* Styles de culte et régie : aucune écriture distante sans action explicite. */
const ACP_DEFAULT_THEME = { enabled:false, font:'Arial', size:48, background:'#123d32', color:'#ffffff', accent:'#efc58f', density:5 };
let acpTheme = {...ACP_DEFAULT_THEME};
let acpActivePlan = null;
let acpRegie = false;
let acpProjection = null;
let acpPendingPlan = null;
let acpBlack = false;
let acpBlank = false;
let acpTimerEnd = null;
function acpNormalizeTheme(value={}) {
    const color=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:f;
    return {enabled:!!value.enabled,font:['Arial','Georgia','Verdana'].includes(value.font)?value.font:'Arial',
        size:Math.min(64,Math.max(32,Number(value.size)||48)),density:[4,5,6].includes(Number(value.density))?Number(value.density):5,
        background:color(value.background,ACP_DEFAULT_THEME.background),color:color(value.color,ACP_DEFAULT_THEME.color),accent:color(value.accent,ACP_DEFAULT_THEME.accent)};
}
function acpSplitLyrics(text) { return [String(text || '')]; }
function acpThemeCSS(theme=acpTheme) {
    const t=acpNormalizeTheme(theme);
    if(!t.enabled)return '';
    return `#slide-content{background:${t.background}!important;color:${t.color}!important;font-family:${t.font}!important;--primary:${t.color};--accent:${t.accent};--text:${t.color};--text-light:${t.color}}#slide-content .presentation-editable{font-family:${t.font}!important;color:${t.color}!important}#slide-content [data-edit-role="title"],#slide-content [data-edit-role="subtitle"]{color:${t.accent}!important}#slide-content .presentation-lyrics{font-size:${t.size}px!important;line-height:1.35!important}#slide-content .lyric-label{color:${t.accent}!important}`;
}
function acpApplyTheme(){let s=document.getElementById('acp-theme');if(!s){s=document.createElement('style');s.id='acp-theme';document.head.appendChild(s);}s.textContent=acpThemeCSS();}
function acpStyleForm(){return `<details class="acp-style"><summary>Style du culte</summary><p>Le texte reste sur sa diapositive. Sa taille s’ajuste automatiquement à la place disponible.</p><div class="acp-fields"><label>Police<select id="acp-font"><option>Arial</option><option>Georgia</option><option>Verdana</option></select></label><label>Taille des paroles<select id="acp-size"><option value="40">40 — standard</option><option value="48">48 — grande</option><option value="56">56 — très grande</option><option value="64">64 — maximale</option></select></label><label>Fond<input type="color" id="acp-bg"></label><label>Texte<input type="color" id="acp-color"></label><label>Titres<input type="color" id="acp-accent"></label></div><p>La taille choisie est une taille maximale : elle diminue si nécessaire pour afficher tout le texte.</p><button onclick="acpSaveTheme()">Appliquer et enregistrer</button><button onclick="acpSaveTheme(true)">Style d’origine</button><span id="acp-save-status" role="status"></span></details>`;}
function acpFillForm(){for(const [id,key] of [['font','font'],['size','size'],['density','density'],['bg','background'],['color','color'],['accent','accent']]){const el=document.getElementById('acp-'+id);if(el)el.value=acpTheme[key];}}
async function acpSaveTheme(reset=false){
    if(!acpActivePlan)return;
    acpTheme=reset?{...ACP_DEFAULT_THEME}:acpNormalizeTheme({enabled:true,font:document.getElementById('acp-font').value,size:document.getElementById('acp-size').value,background:document.getElementById('acp-bg').value,color:document.getElementById('acp-color').value,accent:document.getElementById('acp-accent').value});
    const plan={...acpActivePlan,presentationTheme:{...acpTheme},updatedAtMs:Date.now()};
    acpActivePlan=plan;runtimePlanCache.set(plan.date,plan);
    if(currentPlan?.date===plan.date)currentPlan.presentationTheme=plan.presentationTheme;
    if(presentationOrderDraftPlan?.date===plan.date)presentationOrderDraftPlan.presentationTheme=plan.presentationTheme;
    upsertPlanInLocalStorage(plan);
    acpPendingPlan=null;
    const originalIndex=currentSlideIndex;
    if(acpSetupPlan) acpSetupPlan=plan;
    else acpRefreshOriginal(plan,{preserveCurrentSlide:true,notify:false});
    acpApplyTheme();acpFillForm();
    // La projection reste figée jusqu'à la commande explicite de diffusion.
    acpRenderRegie(false);
    const status=document.getElementById('acp-save-status');if(status)status.textContent='Enregistré sur cet appareil. Synchronisation…';
    const saved=await saveToFirebase(plan);
    if(status)status.textContent=saved?'Enregistré et synchronisé.':'Enregistré sur cet appareil ; synchronisation indisponible.';
}
function acpSnapshot(index=currentSlideIndex){
    const slide=presentationSlides[index];if(!slide)return null;
    const current=index===currentSlideIndex;
    const content=current?document.getElementById('slide-content').innerHTML:slide.content;
    const bg=current?document.getElementById('slide-content').style.background:'';
    return {kind:'acp-slide',content,css:Array.from(document.querySelectorAll('head style')).filter(s=>s.id!=='acp-regie-css').map(s=>s.textContent).join('\n'),theme:acpThemeCSS(),background:bg,black:current?acpBlack:false,blank:current?acpBlank:false,timerEnd:slide.type==='timer'?(current?acpTimerEnd:null):null};
}
function acpSend(win,state){if(win&&!win.closed&&state)win.postMessage(state,location.origin);}
function acpBroadcast(){acpSend(acpProjection,acpSnapshot());}
function acpOpenProjection(){
    if(!acpProjection||acpProjection.closed)acpProjection=window.open('./projection.html','acp-projector','popup,width=1280,height=720');
    if(!acpProjection){showNotification('Autorise les fenêtres supplémentaires pour ouvrir la projection.');return;}
    acpProjection.focus();acpBroadcast();
}
function acpToggleBlack(){acpBlack=!acpBlack;acpStateOnly();}
function acpToggleBlank(){acpBlank=!acpBlank;acpStateOnly();}
function acpStateOnly(){const state={kind:'acp-state',black:acpBlack,blank:acpBlank};acpSend(acpProjection,state);acpSend(document.getElementById('acp-current')?.contentWindow,state);document.getElementById('acp-black').setAttribute('aria-pressed',String(acpBlack));document.getElementById('acp-blank').setAttribute('aria-pressed',String(acpBlank));}
function acpGo(index){showSlide(Number(index));acpBroadcast();}
function acpMove(delta){acpGo(Math.min(presentationSlides.length-1,Math.max(0,currentSlideIndex+delta)));}
function acpLabel(slide,index){const title=slide.content.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);return `${index+1}. ${title?title[1].replace(/<[^>]*>/g,'').trim():slide.type}`;}
function acpRenderRegie(send=false){
    if(!acpRegie || !document.getElementById('acp-jump'))return;
    const current=document.getElementById('acp-current'),next=document.getElementById('acp-next');
    acpSend(current?.contentWindow,acpSnapshot());
    acpSend(next?.contentWindow,acpSnapshot(currentSlideIndex+1)||{kind:'acp-slide',content:'<h1>Fin du culte</h1>',css:'',theme:acpThemeCSS(),black:false,blank:false});
    const select=document.getElementById('acp-jump');select.innerHTML=presentationSlides.map((s,i)=>`<option value="${i}">${escapeHtml(acpLabel(s,i))}</option>`).join('');select.value=currentSlideIndex;
    document.getElementById('acp-count').textContent=`${currentSlideIndex+1} / ${presentationSlides.length}`;
    document.getElementById('acp-prev').disabled=currentSlideIndex===0;document.getElementById('acp-forward').disabled=currentSlideIndex>=presentationSlides.length-1;
    if(send)acpBroadcast();
}
function acpOpenRegie(){
    acpRegie=true;acpBlack=false;acpBlank=false;
    let panel=document.getElementById('acp-regie');if(!panel){panel=document.createElement('section');panel.id='acp-regie';document.body.appendChild(panel);}
    panel.hidden=false;
    panel.innerHTML=`<header><div><h1>Régie du culte</h1><p>Ouvre la projection, déplace sa fenêtre sur le vidéoprojecteur, puis active son plein écran.</p></div><button onclick="closePresentationView()">Quitter la régie</button></header><div class="acp-toolbar"><button onclick="acpOpenProjection()">Ouvrir l’écran de projection</button><button id="acp-black" aria-pressed="false" onclick="acpToggleBlack()">Écran noir</button><button id="acp-blank" aria-pressed="false" onclick="acpToggleBlank()">Masquer le contenu</button><span id="acp-link-status" role="status">Projection non ouverte</span></div><div class="acp-previews"><div><h2>Diapositive sélectionnée</h2><iframe title="Aperçu de la diapositive sélectionnée" id="acp-current" src="./projection.html?preview=1"></iframe></div><div><h2>Suivante · aperçu sans mise en page personnalisée</h2><iframe title="Aperçu du contenu suivant" id="acp-next" src="./projection.html?preview=1"></iframe></div></div><div class="acp-toolbar"><button id="acp-prev" onclick="acpMove(-1)">← Précédente</button><strong id="acp-count"></strong><button id="acp-forward" onclick="acpMove(1)">Suivante →</button><button onclick="acpBroadcast()">Diffuser la sélection</button><label>Aller à <select id="acp-jump" onchange="acpGo(this.value)"></select></label></div><div id="acp-pending" hidden role="status">Le planning a changé. La projection reste inchangée. <button onclick="acpApplyPending()">Charger les modifications</button></div>${acpStyleForm()}<p>← / → : naviguer et diffuser · B : écran noir · Échap : quitter. Les modifications de style attendent une diffusion explicite.</p>`;
    acpFillForm();acpRenderRegie();
}
function acpApplyPending(){if(!acpPendingPlan)return;const p=acpPendingPlan;acpPendingPlan=null;acpRefreshOriginal(p,{preserveCurrentSlide:true});document.getElementById('acp-pending').hidden=true;acpRenderRegie();}
const acpRefreshOriginal=refreshPresentationFromPlan;
refreshPresentationFromPlan=function(plan,options={}){
    acpPendingPlan=null;
    const result=acpRefreshOriginal(plan,options);
    if(acpRegie)acpBroadcast();
    return result;
};
const acpShowOriginal=showSlide;
showSlide=function(index){acpShowOriginal(index);acpApplyTheme();const slide=presentationSlides[currentSlideIndex];acpTimerEnd=slide?.type==='timer'?Date.now()+(slide.minutes||0)*60000:null;acpRenderRegie();};
const acpCleanupOriginal=cleanupPresentationView;
cleanupPresentationView=function(){acpMirror=false;document.body.classList.remove('acp-mirror-active');document.getElementById('presentation-display').classList.remove('acp-mirror','acp-mirror-black');acpRegie=false;acpPendingPlan=null;const panel=document.getElementById('acp-regie');if(panel)panel.remove();acpSend(acpProjection,{kind:'acp-state',black:true,blank:false});acpCleanupOriginal();};
window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.kind==='acp-ready'){
        if(event.source===acpProjection){const status=document.getElementById('acp-link-status');if(status)status.textContent='Écran de projection connecté';acpBroadcast();}
        else if(event.source===document.getElementById('acp-current')?.contentWindow||event.source===document.getElementById('acp-next')?.contentWindow)acpRenderRegie();
    }
    if(event.data?.kind==='acp-closed'&&event.source===acpProjection){const el=document.getElementById('acp-link-status');if(el)el.textContent='Projection fermée — cliquer pour la rouvrir';}
});
window.addEventListener('beforeunload',()=>{if(acpProjection&&!acpProjection.closed)acpProjection.close();});

// Préparation avant projection : l'écran dupliqué est le mode par défaut.
let acpMirror = false;
let acpSetupPlan = null;
let acpSetupOptions = null;
function acpPrepareProjection(plan,options={}) {
    acpSetupPlan=runtimePlanCache.get(plan.date)||plan;acpSetupOptions=options;
    acpActivePlan=acpSetupPlan;acpTheme=acpNormalizeTheme(acpSetupPlan.presentationTheme||{});
    let dialog=document.getElementById('acp-projection-setup');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='acp-projection-setup';document.body.appendChild(dialog);}
    dialog.innerHTML=`<h2>Prêt à projeter ?</h2><p><strong>Écran dupliqué : l’assemblée voit exactement ton écran.</strong> Termine les réglages avant de lancer la présentation.</p>${acpStyleForm()}<div class="acp-setup-actions"><button autofocus onclick="acpStartPrepared('mirror')">Projeter cet écran en plein écran</button><button onclick="acpStartPrepared('extended')">Deux écrans étendus : ouvrir la régie</button><button onclick="acpCancelSetup()">Annuler</button></div><p>En présentation : <strong>← / →</strong> pour changer de diapositive · <strong>B</strong> pour afficher/retirer l’écran noir · <strong>Échap</strong> pour quitter. Les commandes ne sont pas affichées à l’assemblée.</p><p id="acp-fullscreen-error" role="alert"></p>`;
    acpFillForm();dialog.oncancel=()=>{acpSetupPlan=null;};dialog.showModal();
}
function acpCancelSetup(){document.getElementById('acp-projection-setup').close();acpSetupPlan=null;}
async function acpStartPrepared(mode){
    const plan=acpSetupPlan;if(!plan)return;
    const opts=acpSetupOptions||{},dialog=document.getElementById('acp-projection-setup');
    if(mode==='mirror'){
        const display=document.getElementById('presentation-display');
        const previous=display.style.display;display.style.display='block';
        try {
            if(display.requestFullscreen)await display.requestFullscreen();
            else if(display.webkitRequestFullscreen)display.webkitRequestFullscreen();
            else throw new Error('unsupported');
        } catch(e){display.style.display=previous;document.getElementById('acp-fullscreen-error').textContent='Le navigateur n’a pas autorisé le plein écran. Réessaie avec ce bouton depuis un navigateur compatible.';return;}
    }
    dialog.close();dialog.remove();acpSetupPlan=null;acpMirror=mode==='mirror';acpRegie=false;
    launchPresentationFromPlan(plan,{...opts,acpReady:true,acpMode:mode});
}
function acpStartMirror(){
    acpRegie=false;acpMirror=true;
    const panel=document.getElementById('acp-regie');if(panel)panel.hidden=true;
    const display=document.getElementById('presentation-display');
    display.classList.add('acp-mirror');display.classList.remove('acp-mirror-black');
    // Les confirmations et notifications restent invisibles pendant la projection.
    document.body.classList.add('acp-mirror-active');
    hidePresentationCursor();
}
function acpMirrorBlack(){document.getElementById('presentation-display').classList.toggle('acp-mirror-black');}
