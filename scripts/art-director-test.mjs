import {readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserSession} from './browser.mjs';
import {silhouetteComparison} from './render-metrics.mjs';
import {unzipSync} from 'fflate';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readTIM} from '../src/core/ps1.js';
const out='artifacts/art-director';await mkdir(out,{recursive:true});
const session=await browserSession(),{page}=session;
page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS/.test(m.text()))session.errors.push(m.text());});
const results=[];
try {
 const models=process.env.ART_MODELS?.split(',')??['synthetic',...(process.env.NIKKI_DIR?['nikki']:[])];
 for(const model of models){
  if(model==='synthetic')await page.evaluate(async()=>{const t=window.studioTest;await t.load([{name:'authored.glb',data:await t.syntheticCharacter()}]);});
  else if(model==='cesium'){
   const file=process.env.CESIUM_ART_REF??'artifacts/fixtures/CesiumMan.glb',bytes=await readFile(file);
   if(createHash('sha256').update(bytes).digest('hex')!=='b7001eaeea8254bd44773bcd247e78696d94169388fbb2a1800fc69434e777d9')throw Error('Cesium reference SHA mismatch');
   await page.setInputFiles('#files',file);await page.waitForFunction(()=>window.studioTest.source&&!document.querySelector('#import').disabled,null,{timeout:300000});
   await writeFile(`${out}/CESIUM-ATTRIBUTION.txt`,await readFile('artifacts/reference/ATTRIBUTION.txt'));
  }
  else {
   const names=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await walk(file);else if(/\.(fbx|tga)$/i.test(file))names.push(file);}}
   await walk(process.env.NIKKI_DIR);await page.setInputFiles('#files',names);
   await page.waitForFunction(()=>window.studioTest.source&&!document.querySelector('#import').disabled,null,{timeout:300000});
  }
  for(const preset of process.env.ART_PRESETS?.split(',')??['baseline','authentic','classic','expanded']){
   const dir=`${out}/${model}-${preset}`;await mkdir(dir,{recursive:true});
   await page.selectOption('#art-preset',preset);await page.click('#convert');
   await page.waitForFunction(()=>!document.querySelector('#convert').disabled,null,{timeout:300000});
   if(!await page.evaluate(()=>!!window.studioTest.converted))throw Error(await page.locator('#status').innerText());
   const silhouettes=[];
   for(const [name,angle]of [['front',0],['side',Math.PI/2],['back',Math.PI],['three-quarter',Math.PI/4]]){
    const shots=await page.evaluate(angle=>{const t=window.studioTest;t.sourceView.reset(angle);t.resultView.sync(t.sourceView);return [t.sourceView.shot(),t.resultView.shot()];},angle);
    for(const [i,kind]of ['source','prepared'].entries())await writeFile(`${dir}/${name}-${kind}.png`,Buffer.from(shots[i].split(',')[1],'base64'));
    silhouettes.push({view:name,...await silhouetteComparison(page)});
   }
   const face=await page.evaluate(()=>{const t=window.studioTest,T=t.THREE,b=t.source.skeleton.mapping.head;if(!b)return null;const target=b.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.075,.06));t.sourceView.controls.target.copy(target);t.sourceView.camera.position.copy(target).add(new T.Vector3(0,.025,.62));t.sourceView.controls.update();t.resultView.sync(t.sourceView);return[t.sourceView.shot(),t.resultView.shot()];});
   if(face)for(const [i,kind]of ['source','prepared'].entries())await writeFile(`${dir}/face-${kind}.png`,Buffer.from(face[i].split(',')[1],'base64'));
   const motion=await page.evaluate(()=>{
    const t=window.studioTest,root=t.atlas?.root??t.converted.root,saved=[],shots=[];
    root.traverse(b=>{if(b.isBone)saved.push([b,b.quaternion.clone()]);});t.sourceView.reset(0);t.resultView.sync(t.sourceView);
    try {const metrics=t.deformationProbe(t.source.root,t.source.skeleton,pose=>{
      for(const [b]of saved){const original=t.source.root.getObjectByName(b.name);if(original)b.quaternion.copy(original.quaternion);}
      root.updateMatrixWorld(true);root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});shots.push({pose,source:t.sourceView.shot(),prepared:t.resultView.shot()});
    });return {metrics,shots};}finally{for(const [b,q]of saved)b.quaternion.copy(q);root.updateMatrixWorld(true);root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});}
   });
   for(const shot of motion.shots)for(const kind of ['source','prepared'])await writeFile(`${dir}/${shot.pose}-${kind}.png`,Buffer.from(shot[kind].split(',')[1],'base64'));
   const report=await page.evaluate(()=>window.studioTest.report());
   const unbaked=await page.evaluate(()=>{const t=window.studioTest,v=t.resultView,previous=v.root;if(!t.atlas)return v.shot();v.holder.remove(previous);v.holder.add(t.converted.root);v.root=t.converted.root;try{return v.shot();}finally{v.holder.remove(t.converted.root);v.holder.add(previous);v.root=previous;}});
   await writeFile(`${dir}/front-unbaked.png`,Buffer.from(unbaked.split(',')[1],'base64'));
   const download=page.waitForEvent('download');await page.click('#export');await(await download).saveAs(`${dir}/preparation.t3prep`);
   const contents=unzipSync(new Uint8Array(await readFile(`${dir}/preparation.t3prep`))),glb=contents['converted.glb'];
   if(!glb||new TextDecoder().decode(glb.slice(0,4))!=='glTF')throw Error('Invalid exported art GLB');
   const timHashes=Object.fromEntries(Object.entries(contents).filter(([p])=>p.endsWith('.tim')).map(([p,b])=>[p,createHash('sha256').update(b).digest('hex')]));
   const timValidation=Object.entries(contents).filter(([p])=>p.endsWith('.tim')).map(([path,data])=>{const t=readTIM(data);return {path,width:t.width,height:t.height,colors:t.palette.length};});
   if((preset==='authentic'||preset==='expanded')&&model==='nikki'&&!timValidation.some(t=>t.colors===256&&t.width===128))throw Error('Face preservation did not export a real 8-bit face TIM');
   if(preset!=='baseline'){
    for(const id of ['preview-snap','preview-affine','preview-gouraud'])await page.check('#'+id);
    await page.screenshot({path:`${dir}/simulation.png`,fullPage:true});
    for(const id of ['preview-snap','preview-affine','preview-gouraud'])await page.uncheck('#'+id);
   }
   await writeFile(`${dir}/report.json`,JSON.stringify({model,preset,report,silhouettes,sourcePoseDiagnostics:motion.metrics,exportValidation:{glbSha256:createHash('sha256').update(glb).digest('hex'),timHashes,timValidation},visualAcceptance:'NOT ACCEPTED — human and game review required'},null,2));
   results.push({model,preset,triangles:report.conversion.stats.triangles,atlas:report.atlas?.tiles,silhouettes,quality:report.conversion.quality});
   console.log(model,preset,report.conversion.stats.triangles,silhouettes.map(s=>s.iou.toFixed(3)).join(','));
  }
  if(model==='synthetic'){
   await page.uncheck('#art-live');await page.selectOption('#art-region','head');await page.fill('#art-priority','2');await page.locator('#art-priority').dispatchEvent('change');
   const pending=page.waitForEvent('download');await page.click('#project-save');await(await pending).saveAs(`${out}/authored-project.zip`);
   await page.selectOption('#art-preset','classic');await page.setInputFiles('#project-file',`${out}/authored-project.zip`);
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Project restored'),null,{timeout:60000});
   if(await page.inputValue('#art-preset')!=='expanded'||await page.inputValue('#art-priority')!=='2')throw Error('Project did not restore art settings/corrections');
   await page.fill('#art-priority','1');await page.locator('#art-priority').dispatchEvent('change');
   await page.check('#art-live');
  }
 }
 if(process.env.ART_MODELS){try{const previous=JSON.parse(await readFile(`${out}/comparison.json`,'utf8'));results.unshift(...previous.results.filter(r=>!models.includes(r.model)));}catch(e){if(e.code!=='ENOENT')throw e;}}
 await writeFile(`${out}/comparison.json`,JSON.stringify({results,game:'NOT TESTED',authenticReferenceComparison:'NOT RUN: authentic reference geometry unavailable'},null,2));
 if(session.errors.length)throw Error(session.errors.join('\n'));
}finally{await session.close();}
