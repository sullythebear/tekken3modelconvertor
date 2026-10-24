import {readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserSession} from './browser.mjs';
import {silhouetteComparison} from './render-metrics.mjs';
import {unzipSync} from 'fflate';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readTIM} from '../src/core/ps1.js';
const out=process.env.ART_OUTPUT??'artifacts/art-director';await mkdir(out,{recursive:true});
const session=await browserSession(),{page}=session;
page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS/.test(m.text()))session.errors.push(m.text());});
const results=[];
try {
 const models=process.env.ART_MODELS?.split(',')??['synthetic',...(process.env.NIKKI_DIR?['nikki']:[])];
 for(const model of models){
  if(model==='crest')await page.evaluate(async()=>{const t=window.studioTest;await t.load([{name:'crest.glb',data:await t.syntheticCharacter({hairstyle:'crest',facialRig:true})}]);});
  else if(model==='synthetic')await page.evaluate(async()=>{const t=window.studioTest;await t.load([{name:'authored.glb',data:await t.syntheticCharacter()}]);});
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
   await page.selectOption('#art-preset',preset);if(process.env.ART_RECONSTRUCTION)await page.evaluate(stage=>window.studioTest.setReconstruction(stage),process.env.ART_RECONSTRUCTION);await page.click('#convert');
   await page.waitForFunction(()=>!document.querySelector('#convert').disabled,null,{timeout:300000});
   if(!await page.evaluate(()=>!!window.studioTest.converted))throw Error(await page.locator('#status').innerText());
   if(process.env.ART_OPTIMIZE==='1'){await page.click('#optimize-candidate');await page.waitForFunction(()=>!document.querySelector('#convert').disabled,null,{timeout:300000});if(!await page.evaluate(()=>!!window.studioTest.converted.optimization))throw Error(await page.locator('#status').innerText());}
   const silhouettes=[];
   for(const [name,angle]of [['front',0],['side',Math.PI/2],['left-side',-Math.PI/2],['right-side',Math.PI/2],['back',Math.PI],['three-quarter',Math.PI/4]]){
    const shots=await page.evaluate(angle=>{const t=window.studioTest;t.sourceView.reset(angle);t.resultView.sync(t.sourceView);return [t.sourceView.shot(),t.resultView.shot()];},angle);
    for(const [i,kind]of ['source','prepared'].entries())await writeFile(`${dir}/${name}-${kind}.png`,Buffer.from(shots[i].split(',')[1],'base64'));
    silhouettes.push({view:name,...await silhouetteComparison(page)});
   }
   const face=await page.evaluate(()=>{const t=window.studioTest,T=t.THREE,b=t.source.skeleton.mapping.head;if(!b)return null;const target=b.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.075,.06));t.sourceView.controls.target.copy(target);t.sourceView.camera.position.copy(target).add(new T.Vector3(0,.025,.62));t.sourceView.controls.update();t.resultView.sync(t.sourceView);return[t.sourceView.shot(),t.resultView.shot()];});
   if(face)for(const [i,kind]of ['source','prepared'].entries())await writeFile(`${dir}/face-${kind}.png`,Buffer.from(face[i].split(',')[1],'base64'));
   for(const [name,offset,targetKind]of [['face-side',[.62,.025,0],'head'],['face-quarter',[.44,.025,.44],'head'],['hair-close',[0,.02,.95],'hair'],['boots-close',[0,.08,.85],'boots'],['left-boot-close',[0,.04,.65],'leftFoot'],['right-boot-close',[0,.04,.65],'rightFoot']]){
    const shots=await page.evaluate(({offset,targetKind})=>{const t=window.studioTest,T=t.THREE,bone=t.source.skeleton.mapping[targetKind==='hair'?'head':targetKind],target=bone?bone.getWorldPosition(new T.Vector3()):new T.Vector3(0,.22,.03);if(targetKind==='head')target.add(new T.Vector3(0,.075,.06));if(targetKind==='hair')target.add(new T.Vector3(0,-.025,.02));if(/Foot/.test(targetKind))target.y+=.13;t.sourceView.controls.target.copy(target);t.sourceView.camera.position.copy(target).add(new T.Vector3(...offset));t.sourceView.controls.update();t.resultView.sync(t.sourceView);return[t.sourceView.shot(),t.resultView.shot()];},{offset,targetKind});
    for(const [i,kind]of ['source','prepared'].entries())await writeFile(`${dir}/${name}-${kind}.png`,Buffer.from(shots[i].split(',')[1],'base64'));
   }
   const wires=await page.evaluate(()=>{const t=window.studioTest,materials=new Set();for(const root of [t.source.root,t.atlas?.root??t.converted.root])root.traverse(m=>{if(m.isMesh)for(const mat of (Array.isArray(m.material)?m.material:[m.material]))materials.add(mat);});const old=[...materials].map(m=>[m,m.wireframe]);try{for(const [m]of old)m.wireframe=true;t.sourceView.reset(0);t.resultView.sync(t.sourceView);return[t.sourceView.shot(),t.resultView.shot()];}finally{for(const [m,w]of old)m.wireframe=w;}});
   for(const [i,kind]of ['source','prepared'].entries())await writeFile(`${dir}/wireframe-${kind}.png`,Buffer.from(wires[i].split(',')[1],'base64'));
   const motion=await page.evaluate(()=>{
    const t=window.studioTest,root=t.atlas?.root??t.converted.root,saved=[],shots=[];
    root.traverse(b=>{if(b.isBone)saved.push([b,b.quaternion.clone()]);});t.sourceView.reset(0);t.resultView.sync(t.sourceView);
    try {const metrics=t.deformationProbe(t.source.root,t.source.skeleton,pose=>{
      for(const [b]of saved){const original=t.source.root.getObjectByName(b.name);if(original)b.quaternion.copy(original.quaternion);}
      root.updateMatrixWorld(true);root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});shots.push({pose,source:t.sourceView.shot(),prepared:t.resultView.shot()});if(pose==='face-motion'&&t.source.skeleton.mapping.head){const target=t.source.skeleton.mapping.head.getWorldPosition(new t.THREE.Vector3()).add(new t.THREE.Vector3(0,.075,.06));t.sourceView.controls.target.copy(target);t.sourceView.camera.position.copy(target).add(new t.THREE.Vector3(0,.025,.62));t.sourceView.controls.update();t.resultView.sync(t.sourceView);shots.push({pose:'face-motion-close',source:t.sourceView.shot(),prepared:t.resultView.shot()});t.sourceView.reset(0);t.resultView.sync(t.sourceView);}
    },{extended:true});return {metrics,shots};}finally{for(const [b,q]of saved)b.quaternion.copy(q);root.updateMatrixWorld(true);root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});}
   });
   for(const shot of motion.shots)for(const kind of ['source','prepared'])await writeFile(`${dir}/${shot.pose}-${kind}.png`,Buffer.from(shot[kind].split(',')[1],'base64'));
   const report=await page.evaluate(()=>window.studioTest.report());
   if(process.env.ART_DIAGNOSTIC){const diagnostics=await page.evaluate(()=>{const t=window.studioTest,T=t.THREE,results=[];for(const [kind,root]of [['source',t.source.root],['converted',t.converted.root]])root.traverse(m=>{if(!m.isMesh)return;const mats=(Array.isArray(m.material)?m.material:[m.material]).map(m=>m.name);if(!mats.some(n=>/head/i.test(n)&&!/hair|faceacc/i.test(n)))return;const p=m.geometry.attributes.position,index=m.geometry.index;let maxSkinDelta=0,maxEdge=0;for(let v=0;v<p.count;v++){const q=new T.Vector3().fromBufferAttribute(p,v),posed=m.getVertexPosition(v,new T.Vector3());maxSkinDelta=Math.max(maxSkinDelta,q.distanceTo(posed));}for(let i=0;i<(index?.count??p.count);i+=3){const q=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k));for(let k=0;k<3;k++)maxEdge=Math.max(maxEdge,q[k].distanceTo(q[(k+1)%3]));}results.push({kind,mats,maxSkinDelta,maxEdge,box:new T.Box3().setFromBufferAttribute(p)});});return results;});await writeFile(`${dir}/head-diagnostics.json`,JSON.stringify(diagnostics,null,2));}

   const unbaked=await page.evaluate(()=>{const t=window.studioTest,v=t.resultView,previous=v.root;if(!t.atlas)return v.shot();v.holder.remove(previous);v.holder.add(t.converted.root);v.root=t.converted.root;try{return v.shot();}finally{v.holder.remove(t.converted.root);v.holder.add(previous);v.root=previous;}});
   await writeFile(`${dir}/front-unbaked.png`,Buffer.from(unbaked.split(',')[1],'base64'));
   if(process.env.ART_DIAGNOSTIC){const shot=await page.evaluate(()=>{const t=window.studioTest,T=t.THREE,v=t.resultView,previous=v.root,changes=[];v.holder.remove(previous);v.holder.add(t.converted.root);v.root=t.converted.root;t.converted.root.traverse(m=>{if(!m.isMesh)return;changes.push([m,m.visible,m.material]);const names=(Array.isArray(m.material)?m.material:[m.material]).map(m=>m.name).join(' ');m.visible=/head/i.test(names)&&!/hair|faceacc/i.test(names);if(m.visible)m.material=new T.MeshNormalMaterial({side:T.DoubleSide});});t.configureSkinning(t.converted.root);const target=t.source.skeleton.mapping.head?.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.075,.06));if(target){v.controls.target.copy(target);v.camera.position.copy(target).add(new T.Vector3(0,.025,.62));v.controls.update();}try{return v.shot();}finally{for(const [m,visible,material]of changes){if(m.material!==material)for(const mat of (Array.isArray(m.material)?m.material:[m.material]))mat.dispose();m.visible=visible;m.material=material;}v.holder.remove(t.converted.root);v.holder.add(previous);v.root=previous;}});await writeFile(`${dir}/face-normal-diagnostic.png`,Buffer.from(shot.split(',')[1],'base64'));}

   await writeFile(`${dir}/pre-export.json`,JSON.stringify(report,null,2));
   const download=page.waitForEvent('download',{timeout:60000}).catch(async e=>{throw Error(e.message+' | '+await page.locator('#status').innerText());});await page.click('#export');await(await download).saveAs(`${dir}/preparation.t3prep`);
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
  if(model==='synthetic'&&!process.env.ART_RECONSTRUCTION){
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
