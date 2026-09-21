const preview=new URLSearchParams(location.search).has('preview');
const controller=window.opener||(window.parent!==window?window.parent:null);
let timerEnd=null,black=false,blank=false;
const scale=()=>{document.getElementById('stage').style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1280,innerHeight/720)})`;};
window.addEventListener('resize',scale);scale();
if(preview)document.getElementById('fullscreen').hidden=true;
document.getElementById('fullscreen').onclick=()=>document.documentElement.requestFullscreen().catch(()=>{});
function state(){document.getElementById('curtain').hidden=!black;document.getElementById('slide-content').style.visibility=blank?'hidden':'visible';document.querySelectorAll('video,audio').forEach(v=>{if(black||blank||preview)v.pause();});}
function tick(){if(!timerEnd)return;const seconds=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));document.querySelectorAll('#presentation-timer-display').forEach(el=>el.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'));}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==controller)return;
 const data=e.data;if(!data||!['acp-slide','acp-state'].includes(data.kind))return;
 if(data.kind==='acp-slide'){
  document.getElementById('source-style').textContent=data.css||'';
  document.getElementById('theme-style').textContent=data.theme||'';
  const content=document.getElementById('slide-content');content.innerHTML=data.content||'';content.style.background=data.background||'';
  timerEnd=data.timerEnd||null;
  // Aucun contrôle d'édition sur l'écran de l'assemblée.
  content.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
  content.querySelectorAll('video,audio').forEach(v=>{v.controls=!preview;v.autoplay=false;if(preview)v.muted=true;});
  if(preview)content.querySelectorAll('iframe').forEach(frame=>{const hint=document.createElement('p');hint.textContent='Vidéo — disponible sur l’écran de projection';frame.replaceWith(hint);});
 }
 black=!!data.black;blank=!!data.blank;state();tick();scale();
 if(data.kind==='acp-slide')ACPSlideFit.fit(document.getElementById('slide-content'));
});
setInterval(tick,500);
if(controller)controller.postMessage({kind:'acp-ready'},location.origin);
window.addEventListener('pagehide',()=>controller?.postMessage({kind:'acp-closed'},location.origin));

if(document.fonts?.ready)document.fonts.ready.then(()=>ACPSlideFit.fit(document.getElementById('slide-content')));
