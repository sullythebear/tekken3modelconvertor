import assert from 'node:assert/strict';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {browserSession} from './browser.mjs';
const out=process.env.LANDMARK_OUTPUT??'artifacts/landmark-editor';await mkdir(out,{recursive:true});
const session=await browserSession(),{page}=session,results=[];
async function download(button,file){const pending=page.waitForEvent('download');await page.click(button);await(await pending).saveAs(file);}
try{
 for(const model of [...(process.env.NIKKI_DIR?['nikki']:[]),'crest']){
  if(model==='crest')await page.evaluate(async()=>{const t=window.studioTest;await t.load([{name:'crest.glb',data:await t.syntheticCharacter({hairstyle:'crest',facialRig:true})}]);});
  else{const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await walk(f);else if(/\.(fbx|tga)$/i.test(f))files.push(f);}}await walk(process.env.NIKKI_DIR);await page.setInputFiles('#files',files);await page.waitForFunction(()=>window.studioTest.source&&!document.querySelector('#import').disabled,null,{timeout:300000});}
  await page.uncheck('#art-live');const panel=page.locator('details').filter({has:page.locator('#face-landmark')});if(await panel.getAttribute('open')===null)await panel.locator('summary').click();await page.selectOption('#face-landmark','FACIAL_C_NoseTip');await page.click('#face-landmark-pick');
  const click=await page.evaluate(()=>{const t=window.studioTest,T=t.THREE,v=t.sourceView;let bone;t.source.root.traverse(b=>{if(b.isBone&&b.name==='FACIAL_C_NoseTip')bone=b;});if(!bone)throw Error('Missing authored/source nose');const p=bone.getWorldPosition(new T.Vector3());v.controls.target.copy(p);v.camera.position.copy(p).add(new T.Vector3(0,0,.6));v.controls.update();v.render();const q=p.clone().project(v.camera),r=v.renderer.domElement.getBoundingClientRect();return{x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};});
  await page.mouse.click(click.x,click.y);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved FACIAL_C_NoseTip'));
  const profileFile=`${out}/${model}-profile.json`;await download('#art-save',profileFile);const profile=JSON.parse(await readFile(profileFile,'utf8')).settings;
  assert.ok(profile.faceLandmarks.FACIAL_C_NoseTip.every(Number.isFinite));
  const selected=await page.evaluate(name=>{let found;window.studioTest.source.root.traverse(m=>{if(m.isMesh&&m.name===name)found={name:m.name,materials:(Array.isArray(m.material)?m.material:[m.material]).map(m=>m.name)};});return found;},profile.faceLandmarkMesh);
  assert.ok(selected);assert.ok(/head|face/i.test(selected.name+' '+selected.materials.join(' ')));assert.ok(!/faceacc|hair|eye/i.test(selected.materials.join(' ')));
  if(model==='crest'){
   const project=`${out}/${model}-private-project.zip`;await download('#project-save',project);await page.click('#face-landmark-reset');await page.setInputFiles('#project-file',project);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Project restored'));
  }else{await page.click('#face-landmark-reset');await page.selectOption('#art-preset','classic');await page.setInputFiles('#art-profile-file',profileFile);await page.waitForFunction(()=>document.querySelector('#art-preset').value==='authentic');}

  await download('#art-save',`${out}/${model}-restored-profile.json`);const restored=JSON.parse(await readFile(`${out}/${model}-restored-profile.json`,'utf8')).settings;assert.deepEqual(restored.faceLandmarks,profile.faceLandmarks);assert.equal(restored.faceLandmarkMesh,profile.faceLandmarkMesh);
  results.push({model,status:'PASS',selected,finiteNoseCorrection:true,projectRoundTrip:model==='crest',profileRoundTrip:true});
 }
 if(session.errors.length)throw Error(session.errors.join('\n'));
 await writeFile(`${out}/results.json`,JSON.stringify({results,gameVerified:false},null,2));console.log(results);
}finally{await session.close();}
