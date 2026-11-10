export function installProductStart({example}){
 const host=document.createElement('section');host.className='product-start';host.id='product-start';
 host.innerHTML='<div><strong>Welkom bij Tekken 3 Conversion Studio</strong><p>Zet je 3D-personage om naar een klassieke PlayStation 1-stijl.</p></div><button id="start-import">Model importeren</button><button id="start-project">Project openen</button><button id="start-example">Voorbeeld bekijken</button><a href="docs/product/GEBRUIKERSHANDLEIDING.html" target="_blank" rel="noopener">Handleiding</a><button id="start-dismiss" aria-label="Introductie sluiten">×</button>';
 document.querySelector('.preview-bar').before(host);
 let dismissed=false;try{dismissed=localStorage.getItem('t3cs-start-dismissed')==='1';}catch{}host.hidden=dismissed;
 document.querySelector('#start-dismiss').onclick=()=>{host.hidden=true;try{localStorage.setItem('t3cs-start-dismissed','1');}catch{}};
 document.querySelector('#start-import').onclick=()=>document.querySelector('#import').click();
 document.querySelector('#start-project').onclick=()=>document.querySelector('#project-open').click();
 document.querySelector('#start-example').onclick=example;
 new MutationObserver(()=>{if(document.querySelector('#project-name').textContent!=='Naamloos personage')host.hidden=true;}).observe(document.querySelector('#project-name'),{childList:true,subtree:true});
}
