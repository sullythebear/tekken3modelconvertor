import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {SurfaceIndex,triangleRecord} from '../src/core/surface.js';import {sourceRecords} from '../src/core/projected-topology.js';import {traceEyeAperture} from '../src/core/eye-aperture.js';
import {snapshotProjectMapping,restoreProjectMapping,exportSkeletonMapping,analyzeSkeleton} from '../src/core/skeleton.js';
import {surfaceConnectivity} from '../src/core/surface-connectivity.js';
test('Visible eye intersection follows the measured eye surface instead of four interior controls',()=>{
 const face=new SurfaceIndex(sourceRecords(new THREE.PlaneGeometry(3,3),null,triangleRecord)),eyes=new SurfaceIndex(sourceRecords(new THREE.SphereGeometry(.3,64,32).translate(0,0,-.1),null,triangleRecord));
 const ring=traceEyeAperture(face,eyes,new THREE.Vector3(),{x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1),radius:1,eyeSpacing:1});assert.equal(ring.length,12);for(const p of ring){assert.ok(Math.abs(Math.hypot(p.x,p.y)-Math.sqrt(.08))<.004);assert.ok(Math.abs(p.z)<1e-8);}
});
test('Project snapshots preserve ambiguous automatic roles and explicit null overrides without weakening mapping export',()=>{
 const root=new THREE.Group();for(let i=0;i<2;i++){const b=new THREE.Bone();b.name='Head';root.add(b);}assert.ok(analyzeSkeleton(root).report.ambiguous.length);assert.throws(()=>exportSkeletonMapping(root),/ambiguous/);
 const snapshot=JSON.parse(JSON.stringify(snapshotProjectMapping(root)));root.children[0].userData.t3csRole=null;restoreProjectMapping(root,snapshot);assert.ok(analyzeSkeleton(root).report.ambiguous.length);assert.equal(Object.hasOwn(root.children[0].userData,'t3csRole'),false);
 root.children[0].userData.t3csRole=null;const explicit=snapshotProjectMapping(root);delete root.children[0].userData.t3csRole;restoreProjectMapping(root,explicit);assert.equal(root.children[0].userData.t3csRole,null);
 assert.throws(()=>restoreProjectMapping(root,{...explicit,overrides:[{index:999,role:'head'}]}),/override/);assert.equal(root.children[0].userData.t3csRole,null);
});
test('Geometric connectivity crosses duplicated UV seams but not disconnected garment layers',()=>{
 const a=[new THREE.Vector3(0,0,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0)],b=[a[1].clone(),new THREE.Vector3(1,1,0),a[2].clone()],c=a.map(p=>p.clone().add(new THREE.Vector3(0,0,.1)));
 const result=surfaceConnectivity([triangleRecord(a),triangleRecord(b),triangleRecord(c)]);assert.equal(result.components.length,2);assert.equal(result.loops.length,2);assert.deepEqual(result.components.map(c=>c.records.length).sort(),[1,2]);
});
test('Quality-limited anatomical optimization reports an unmet request instead of deleting protected facial detail',async()=>{
 const {optimizeGameCandidate}=await import('../src/core/game-optimization.js');const {inspectScene}=await import('../src/core/importer.js');const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),new THREE.MeshStandardMaterial({name:'Head'}));mesh.userData.studioRegions=[{role:'head'}];root.add(mesh);
 const r=await optimizeGameCandidate({root,stats:inspectScene(root),settings:{triangles:900},warnings:[],quality:{}},{triangles:80});assert.ok(r.stats.triangles>80);assert.equal(r.optimization.budgetMet,false);assert.equal(r.gameVerified,false);assert.ok(r.optimization.losses[0].lockedVertices>0);assert.equal(r.optimization.losses[0].protectedMinimum,240);
});

test('Typed simplifier indices produce a real BufferAttribute and cannot discard generated cards',async()=>{
 const {subsetSurface}=await import('../src/core/projected-topology.js');const g=new THREE.PlaneGeometry(),indices=new Uint32Array(g.index.array),out=subsetSurface(g,indices);assert.equal(out.index.count,indices.length);assert.ok(out.index.isBufferAttribute);for(let i=0;i<indices.length;i++)for(let k=0;k<3;k++)assert.equal(out.attributes.position.getComponent(out.index.getX(i),k),g.attributes.position.getComponent(indices[i],k));
});

test('Explicit eyelid corrections take precedence over automatic source-eye intersection',async()=>{
 const {reconstructAnatomicalFace}=await import('../src/core/anatomical-face.js');const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshStandardMaterial());root.add(mesh);
 const corrections={FACIAL_C_NoseTip:[0,.05,1]};for(const [side,sign]of [['L',1],['R',-1]]){
  for(const [suffix,x,y]of [['UpperA1',.2,.25],['UpperA3',.4,.25],['LowerA3',.4,.15],['LowerA1',.2,.15]])corrections[`FACIAL_${side}_Eyelid${suffix}`]=[x*sign,y,.9];
  root.add(new THREE.Mesh(new THREE.SphereGeometry(.3,24,16).translate(sign*.3,.2,.8),new THREE.MeshStandardMaterial({name:'Eye_sclera'})));
 }
 const result=reconstructAnatomicalFace(mesh,mesh.geometry,mesh.material,{corrections,referenceRoot:root,textureSize:8});assert.ok(result.geometry,result.reason);assert.equal(result.featureLoops.length,2);assert.ok(result.featureLoops.every(f=>f.manualContour&&!f.eyeSurfaceIntersection&&f.vertices===4));
});

test('Already small cards retain all triangles and alpha instead of passing an invalid larger reduction target',async()=>{
 const {MeshoptSimplifier}=await import('meshoptimizer');await MeshoptSimplifier.ready;const {reconstructHairCards}=await import('../src/core/hair-volume.js');const g=new THREE.PlaneGeometry(),material=new THREE.MeshStandardMaterial({alphaTest:.2,transparent:true}),r=reconstructHairCards(g,material,MeshoptSimplifier);
 assert.equal(r.triangles,2);assert.equal(r.geometry.index.count,6);assert.equal(r.material.alphaTest,.2);assert.equal(r.material.transparent,true);for(let i=0;i<g.index.count;i++)for(let k=0;k<2;k++)assert.equal(r.geometry.attributes.uv.getComponent(r.geometry.index.getX(i),k),g.attributes.uv.getComponent(g.index.getX(i),k));
});

test('An already low-poly opaque hairstyle is retained instead of inflated by dense volume sampling',async()=>{
 const {reconstructHairVolume}=await import('../src/core/hair-volume.js');const g=new THREE.ConeGeometry(.2,.7,12),material=new THREE.MeshStandardMaterial(),before=g.attributes.position.array.slice(),r=reconstructHairVolume(g,material);
 assert.equal(r.sourceRetained,true);assert.equal(r.triangles,g.index.count/3);assert.deepEqual(r.geometry.attributes.position.array,before);assert.notEqual(r.geometry,g);assert.deepEqual(g.attributes.position.array,before);
});

test('A foot sharing a dark Hair material is segmented by its anatomical skin weights, not reconstructed as hair',async()=>{
 const {convertCharacter}=await import('../src/core/converter.js');const {inspectScene}=await import('../src/core/importer.js');const root=new THREE.Group(),head=new THREE.Bone(),foot=new THREE.Bone();head.name='Head';head.position.y=1.8;foot.name='LeftFoot';root.add(head,foot);
 const g=new THREE.BoxGeometry(.2,.15,.4,2,2,2),n=g.attributes.position.count,j=new Uint16Array(n*4),w=new Float32Array(n*4);for(let i=0;i<n;i++){j[i*4]=1;w[i*4]=1;}g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(j,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));
 const mesh=new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial({name:'Hair'}));root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton([head,foot]));const source={root,stats:inspectScene(root),warnings:[]};const r=await convertCharacter(source,{triangles:300,headPriority:2,error:.05,art:{preset:'authentic'}});
 assert.ok(r.report.every(p=>p.region==='leftFoot'));assert.ok(r.report.every(p=>!/hair volume|inset support/.test(p.reconstruction.method)));assert.ok(r.stats.triangles<=source.stats.triangles);
});

test('Protected regional allocation spends only the remaining budget and reports genuine minimum overflow',async()=>{
 const {allocateBudget}=await import('../src/core/converter.js');const parts=[{triangles:1000,importance:8},{triangles:600,importance:4},{triangles:200,importance:1}];
 const a=allocateBudget(parts,900,[240,140,30]);assert.equal(a.reduce((n,v)=>n+v,0),900);assert.ok(a[0]>=240&&a[1]>=140&&a[2]>=30);
 const limited=allocateBudget(parts,300,[240,140,30]);assert.deepEqual(limited,[240,140,30]);assert.throws(()=>allocateBudget(parts,900,[1001,0,0]),/Invalid/);
});

test('Garment segmentation uses corrected anatomical bone roles on unnamed rigs',async()=>{
 const {shortGarmentTriangles}=await import('../src/core/garment-segmentation.js');const {boneSemantic}=await import('../src/core/skeleton.js');const root=new THREE.Group(),hip=new THREE.Bone(),knee=new THREE.Bone();hip.name='joint_a';knee.name='joint_b';hip.userData.t3csRole='leftUpperLeg';knee.userData.t3csRole='leftLowerLeg';hip.position.y=1;knee.position.y=.5;root.add(hip,knee);
 const geometry=new THREE.BoxGeometry(.4,.15,.2).translate(0,.9,0),mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());root.add(mesh);root.updateMatrixWorld(true);mesh.skeleton=new THREE.Skeleton([hip,knee]);const selected=shortGarmentTriangles(mesh,geometry,{start:0,count:geometry.index.count},boneSemantic);assert.equal(selected.size,geometry.index.count/3);
});
