import {mkdir,writeFile} from 'node:fs/promises';
import {browserSession} from './browser.mjs';
const out='artifacts/ui-redesign/before';await mkdir(out,{recursive:true});
const session=await browserSession({presentation:'standard'});try{
 const {page}=session;const inventory=await page.evaluate(()=>[...document.querySelectorAll('button,input,select,textarea,output')].filter(n=>n.id).map(n=>({id:n.id,tag:n.tagName.toLowerCase(),type:n.type,label:n.labels?.[0]?.textContent.trim()||n.textContent.trim().slice(0,130)||n.id,value:n.value,checked:n.checked??null,hidden:n.hidden})));await writeFile('docs/ui/CONTROL_INVENTORY.json',JSON.stringify(inventory,null,2)+'\n');
 await page.evaluate(async()=>{const t=window.studioTest;await t.load([{name:'Studio-example.glb',data:await t.syntheticCharacter()}]);});await page.click('#convert');await page.waitForFunction(()=>window.studioTest.converted&&!document.querySelector('#convert').disabled);
 for(const [width,height] of [[1366,768],[1920,1080],[2560,1440]]){await page.setViewportSize({width,height});await page.screenshot({path:`${out}/${width}x${height}.png`});}
 await writeFile(out+'/result.json',JSON.stringify({status:'PASS',sourceCommit:'32455421ecb64574ae84730aff46dc06c64e3734',controlCount:inventory.length,model:'Authored synthetic character; no private assets',errors:session.errors},null,2));console.log('Baseline controls and three screenshot sizes saved',inventory.length);
}finally{await session.close();}
