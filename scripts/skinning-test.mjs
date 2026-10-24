import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browserSession} from './browser.mjs';
import {binaryFBX} from './fixtures.mjs';
await mkdir('artifacts/skinning', {recursive:true});
const session=await browserSession();
const shaderErrors=[];
session.page.on('console', msg => { if (/Shader Error|VALIDATE_STATUS|not compiled|INVALID_OPERATION/i.test(msg.text())) shaderErrors.push(msg.text()); });
try {
  const {page}=session;
  for (const version of [7400,7500,7700]) {
    const data=[...binaryFBX(version,12)];
    const result=await page.evaluate(async({data,version})=>{
      const t=window.studioTest;
      await t.load([{name:`twelve-weights-${version}.fbx`,data:new Uint8Array(data)}]);
      let mesh;t.source.root.traverse(m=>{if(m.isSkinnedMesh)mesh=m;});
      if(!mesh)throw Error('FBX skeleton did not import');
      const before=mesh.getVertexPosition(0,new t.THREE.Vector3());
      mesh.skeleton.bones[11].position.x+=6.5;
      t.source.root.updateMatrixWorld(true);
      const after=mesh.getVertexPosition(0,new t.THREE.Vector3());
      t.sourceView.render();
      return {bones:mesh.skeleton.bones.length,sets:Object.keys(mesh.geometry.attributes).filter(k=>/^weights_/.test(k)).length+1,delta:after.x-before.x,w:mesh.geometry.attributes.weights_2.getW(0)};
    },{data,version});
    assert.equal(result.bones,12);
    assert.equal(result.sets,3);
    assert.ok(Math.abs(result.w-12/78)<1e-6);
    assert.ok(Math.abs(result.delta-1)<1e-5);
  }
  const result=await page.evaluate(async()=>{
    const t=window.studioTest,T=t.THREE,root=new T.Group(),bones=[];
    for(let i=0;i<12;i++){const b=new T.Bone();b.name=`AuthoredInfluence${i}`;root.add(b);bones.push(b);}
    const g=new T.SphereGeometry(.7,24,16),count=g.attributes.position.count;
    for(let s=0;s<3;s++){
      const joints=new Uint16Array(count*4),weights=new Float32Array(count*4);
      for(let v=0;v<count;v++)for(let k=0;k<4;k++){
        const bone=s*4+k;joints[v*4+k]=bone;weights[v*4+k]=bone===11?.6:.4/11;
      }
      g.setAttribute(s?`joints_${s}`:'skinIndex',new T.BufferAttribute(joints,4));
      g.setAttribute(s?`weights_${s}`:'skinWeight',new T.BufferAttribute(weights,4));
    }
    const mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial({color:0xe89545,side:T.DoubleSide}));
    root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
    const bytes=await t.exportGLB(root);
    await t.load([{name:'twelve-weights.glb',data:bytes}]);
    window.skinGLB=bytes;
    let imported;t.source.root.traverse(m=>{if(m.isSkinnedMesh)imported=m;});
    imported.skeleton.bones[11].rotation.z=.9;
    t.source.root.updateMatrixWorld(true);imported.skeleton.update();
    // CPU positions form an independently rendered unskinned reference.
    const geometry=imported.geometry.clone(),positions=geometry.attributes.position;
    for(let v=0;v<positions.count;v++){
      const p=imported.getVertexPosition(v,new T.Vector3());positions.setXYZ(v,p.x,p.y,p.z);
    }
    positions.needsUpdate=true;
    for(const name of Object.keys(geometry.attributes))if(/skin|joints_|weights_/.test(name))geometry.deleteAttribute(name);
    const reference=new T.Group();reference.add(new T.Mesh(geometry,new T.MeshBasicMaterial({color:0xe89545,side:T.DoubleSide})));
    t.resultView.setModel(reference,new T.Box3(new T.Vector3(-.7,-.7,-.7),new T.Vector3(.7,.7,.7)));
    // Reuse exact holder/camera transforms so only CPU/GPU skinning can differ.
    t.resultView.holder.scale.copy(t.sourceView.holder.scale);
    t.resultView.holder.position.copy(t.sourceView.holder.position);
    t.resultView.sync(t.sourceView);t.sourceView.render();
    const a=t.sourceView.renderer.domElement,b=t.resultView.renderer.domElement;
    const pixels=c=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.drawImage(c,0,0,256,256);return ctx.getImageData(0,0,256,256).data;};
    const pa=pixels(a),pb=pixels(b);let mismatch=0;
    for(let i=0;i<pa.length;i+=4)if(Math.max(...[0,1,2].map(k=>Math.abs(pa[i+k]-pb[i+k])))>12)mismatch++;
    return {fraction:mismatch/(256*256),source:t.sourceView.shot(),reference:t.resultView.shot(),weights:[imported.geometry.attributes.skinWeight.getX(0),imported.geometry.attributes.weights_2.getW(0)]};
  });
  assert.ok(result.fraction<.005,`GPU/CPU pixel mismatch ${result.fraction}`);
  assert.ok(Math.abs(result.weights[1]-.6)<1e-6);
  for(const name of ['source','reference']) await writeFile(`artifacts/skinning/${name}.png`,Buffer.from(result[name].split(',')[1],'base64'));
  // Restore bind and convert; compaction must retain every joint set and GLB semantic.
  await page.evaluate(async()=>{
    const t=window.studioTest;await t.load([{name:'twelve-weights.glb',data:window.skinGLB}]);
    document.querySelector('#triangles').value='500';await t.convert();
    window.skinRoundTrip=await t.exportGLB(t.converted.root);
  });
  const preservation=await page.evaluate(async()=>{
    const t=window.studioTest,bytes=window.skinRoundTrip;
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+view.getUint32(12,true))));
    const sets=json.meshes[0].primitives[0].attributes;
    await t.load([{name:'roundtrip.glb',data:bytes}]);
    let mesh;t.source.root.traverse(m=>{if(m.isSkinnedMesh)mesh=m;});
    return {semantics:Object.keys(sets),last:mesh.geometry.attributes.weights_2.getW(0)};
  });
  assert.ok(preservation.semantics.includes('JOINTS_2')&&preservation.semantics.includes('WEIGHTS_2'));
  assert.ok(Math.abs(preservation.last-.6)<1e-6);
  assert.deepEqual(shaderErrors,[]);assert.deepEqual(session.errors,[]);
  await writeFile('artifacts/skinning/results.json',JSON.stringify({status:'PASS',fixture:'authored twelve-influence FBX and GLB, not Nikki',versions:[7400,7500,7700],gpuCpuPixelMismatch:result.fraction,preservation,shaderErrors},null,2));
  console.log(`Twelve-influence skinning: binary FBX 7400/7500/7700, GLB, CPU/GPU (${result.fraction.toFixed(6)} pixel mismatch), reduction and GLB round-trip passed.`);
}finally{await session.close();}
