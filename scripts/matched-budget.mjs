// Cost calibration only: no screenshots or source data are published by this runner.
import {browserSession} from './browser.mjs';import {readdir,writeFile} from 'node:fs/promises';import path from 'node:path';
const wanted=Number(process.env.MATCHED_TRIANGLES),output=process.env.MATCHED_OUTPUT;if(!wanted||!output||!process.env.NIKKI_DIR)throw Error('Matching needs a desired actual count and private local input');
const session=await browserSession(),{page}=session;
try{const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(/\.(fbx|tga)$/i.test(e.name))files.push(p);}}await walk(process.env.NIKKI_DIR);await page.setInputFiles('#files',files);await page.waitForFunction(()=>window.studioTest.source&&!document.querySelector('#import').disabled,null,{timeout:300000});await page.selectOption('#art-preset','authentic');
 let requested=wanted,best=null;const attempts=[];
 for(let i=0;i<5;i++){
  await page.evaluate(()=>{const el=document.querySelector('#triangles');el.max='20000';el.value='900';el.dispatchEvent(new Event('input'));});await page.click('#convert');await page.waitForFunction(()=>!document.querySelector('#convert').disabled,null,{timeout:300000});await page.evaluate(n=>{const el=document.querySelector('#triangles');el.max=String(Math.max(Number(el.max),n));el.value=n;el.dispatchEvent(new Event('input'));},requested);await page.click('#optimize-candidate');await page.waitForFunction(()=>!document.querySelector('#convert').disabled,null,{timeout:300000});
  const actual=await page.evaluate(()=>window.studioTest.converted.optimization.candidateTriangles),difference=Math.abs(actual-wanted),attempt={requested,actual,difference};attempts.push(attempt);console.log('Cost probe',JSON.stringify(attempt));if(!best||difference<best.difference)best=attempt;if(difference/wanted<.015)break;const next=Math.max(900,Math.min(20000,Math.round(requested*wanted/actual)));if(next===requested)break;requested=next;
 }
 await writeFile(output,JSON.stringify({wanted,best,attempts,note:'Experimental costs, not measured runtime capacities'},null,2));if(session.errors.length)throw Error(session.errors.join('\n'));
}finally{await session.close();}
