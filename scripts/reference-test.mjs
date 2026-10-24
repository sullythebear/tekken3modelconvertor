import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {browserSession} from './browser.mjs';
const commit='8f492390ddc7a2ae221a1369ef560589cf8c70fb';
const url=`https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${commit}/Models/CesiumMan/glTF-Binary/CesiumMan.glb`;
const expected='b7001eaeea8254bd44773bcd247e78696d94169388fbb2a1800fc69434e777d9';
const input='artifacts/fixtures/CesiumMan.glb',output='artifacts/reference';
await mkdir('artifacts/fixtures',{recursive:true});await mkdir(output,{recursive:true});
let bytes;
try{bytes=await readFile(input);}catch(e){
  if(e.code!=='ENOENT')throw e;
  const response=await fetch(url);assert.equal(response.ok,true,'Reference asset download failed');
  const chunks=[];let total=0;
  for await(const chunk of response.body){total+=chunk.length;if(total>16*1024*1024)throw Error('Reference asset exceeds expected size');chunks.push(chunk);}
  bytes=Buffer.concat(chunks);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);await writeFile(input,bytes);
}
assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'Cached reference asset SHA-256 mismatch');
const attribution=`Cesium Man, © 2017 Cesium, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: ${url}. Cesium logo/trademark remains Cesium's. Screenshots labelled prepared are modified by Tekken 3 Conversion Studio reduction/atlas processing. Not Nikki or Nina; not a game integration test.\n`;
await writeFile(`${output}/ATTRIBUTION.txt`,attribution);
const session=await browserSession();
try{
  const {page}=session;
  await page.evaluate(async data=>window.studioTest.load([{name:'CesiumMan.glb',data:new Uint8Array(data)}]),[...bytes]);
  const source=await page.evaluate(()=>{
    const t=window.studioTest;
    return {stats:t.source.stats,weights:t.source.weights,bones:t.source.skeleton.bones.length,clips:t.source.animations.map(c=>({name:c.name,duration:c.duration}))};
  });
  assert.equal(source.stats.triangles,4672);assert.equal(source.bones,19);assert.equal(source.stats.textures,1);assert.equal(source.stats.missingUVs,0);
  assert.equal(source.weights.invalid,0);assert.equal(source.weights.unnormalized,0);assert.equal(source.clips.length,1);
  await page.locator('#source-mapping').evaluate(e=>e.open=true);
  const mapping={hips:'Skeleton_torso_joint_1',spine:'Skeleton_torso_joint_2',head:'Skeleton_neck_joint_2',leftUpperArm:'Skeleton_arm_joint_L__4_',leftLowerArm:'Skeleton_arm_joint_L__3_',leftHand:'Skeleton_arm_joint_L__2_',rightUpperArm:'Skeleton_arm_joint_R',rightLowerArm:'Skeleton_arm_joint_R__2_',rightHand:'Skeleton_arm_joint_R__3_',leftUpperLeg:'leg_joint_L_1',leftLowerLeg:'leg_joint_L_2',leftFoot:'leg_joint_L_3',rightUpperLeg:'leg_joint_R_1',rightLowerLeg:'leg_joint_R_2',rightFoot:'leg_joint_R_3'};
  const names=await page.evaluate(()=>window.studioTest.source.skeleton.bones.map(b=>b.name));
  for(const [role,name]of Object.entries(mapping)){
    assert.ok(names.includes(name));await page.locator(`#mapping-editor select[data-role="${role}"]`).selectOption(String(names.indexOf(name)));
  }
  await page.click('#mapping-apply');await page.fill('#triangles','1100');await page.click('#convert');
  await page.waitForFunction(()=>Boolean(window.studioTest.atlas),null,{timeout:120000});
  const prepared=await page.evaluate(()=>({stats:window.studioTest.converted.stats,report:window.studioTest.report()}));
  assert.ok(prepared.stats.triangles<source.stats.triangles*.5);assert.equal(prepared.stats.invalidPositions,0);
  for(const [name,angle]of [['front',0],['side',Math.PI/2],['back',Math.PI]]){
    const shots=await page.evaluate(angle=>{const t=window.studioTest;t.sourceView.reset(angle);t.resultView.sync(t.sourceView);return [t.sourceView.shot(),t.resultView.shot()];},angle);
    for(const [i,kind]of ['original','prepared'].entries())await writeFile(`${output}/${name}-${kind}.png`,Buffer.from(shots[i].split(',')[1],'base64'));
  }
  const motion=await page.evaluate(()=>{
    const t=window.studioTest,T=t.THREE,roots=[t.source.root,t.atlas.root],mixers=roots.map(root=>new T.AnimationMixer(root));
    mixers.forEach(m=>m.clipAction(t.source.animations[0]).play());
    const results=[];
    for(const time of [0,.5,1,1.5]){
      mixers.forEach(m=>m.setTime(time));roots.forEach(r=>r.updateMatrixWorld(true));
      let maxBoneDifference=0,finite=true;
      for(const bone of t.source.skeleton.bones){const other=roots[1].getObjectByName(bone.name);maxBoneDifference=Math.max(maxBoneDifference,bone.quaternion.clone().normalize().angleTo(other.quaternion.clone().normalize()),bone.position.distanceTo(other.position));}
      for(const root of roots)root.traverse(m=>{if(m.isSkinnedMesh){m.skeleton.update();for(let v=0;v<m.geometry.attributes.position.count;v++)finite&&=m.getVertexPosition(v,new T.Vector3()).toArray().every(Number.isFinite);}});
      results.push({time,maxBoneDifference,finite});
    }
    t.sourceView.reset(0);t.resultView.sync(t.sourceView);t.sourceView.render();t.resultView.render();
    window.referenceMixers=mixers;
    return results;
  });
  assert.ok(motion.every(p=>p.finite&&p.maxBoneDifference<1e-6),JSON.stringify(motion));
  const shots=await page.evaluate(()=>[window.studioTest.sourceView.shot(),window.studioTest.resultView.shot()]);
  for(const [i,kind]of ['original','prepared'].entries())await writeFile(`${output}/animated-${kind}.png`,Buffer.from(shots[i].split(',')[1],'base64'));
  assert.deepEqual(session.errors,[]);
  await writeFile(`${output}/results.json`,JSON.stringify({status:'PASS',asset:'Cesium Man',commit,sha256:expected,attribution,source,prepared,motion,scope:'External source import, manual mapping, preparation and source animation only; no native donor/game verification'},null,2));
  console.log(`Cesium Man external regression: ${source.stats.triangles} → ${prepared.stats.triangles} triangles, 19 bones, embedded texture and 4 animation samples passed.`);
}catch(e){await session.page.screenshot({path:`${output}/failure.png`,fullPage:true});throw e;}finally{await session.close();}
