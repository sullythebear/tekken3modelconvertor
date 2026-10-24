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
