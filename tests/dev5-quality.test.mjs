import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {refineSurfaceCurvature}from'../src/core/curvature-topology.js';import{insertPoint}from'../src/core/anatomical-face.js';import{filteredRGBA,resampleDataMap}from'../src/core/texture-filter.js';import{simplifyCardComponents}from'../src/core/card-optimization.js';import{MeshoptSimplifier}from'meshoptimizer';import{facialLandmarkLocks}from'../src/core/landmarks.js';
const patch=()=>({points:[[-.5,0],[.5,0],[.5,1],[-.5,1]].map(p=>new THREE.Vector2(...p)),triangles:[[0,1,2],[0,2,3]],constraints:[[0,1],[1,2],[2,3],[3,0]]});
test('Curvature refinement adds conforming points to a curved chord while retaining explicit chart borders',()=>{
 const p=patch(),r=refineSurfaceCurvature(p.points,p.triangles,q=>({point:new THREE.Vector3(Math.sin(q.x),q.y,Math.cos(q.x))}),insertPoint,{constraints:p.constraints,tolerance:.05,maxInsertions:20});assert.ok(r.inserted>0);assert.ok(p.triangles.length>2);
 let area=0;const edges=new Set();for(const t of p.triangles){const [a,b,c]=t.map(i=>p.points[i]);area+=Math.abs(b.clone().sub(a).cross(c.clone().sub(a)))/2;for(let k=0;k<3;k++)edges.add([t[k],t[(k+1)%3]].sort((a,b)=>a-b).join(','));}assert.ok(Math.abs(area-1)<1e-8);for(const e of p.constraints)assert.ok(edges.has(e.sort((a,b)=>a-b).join(',')));
});
test('Planar surfaces gain no arbitrary subdivision and discontinuous correspondences are not treated as curvature',()=>{
 const p=patch(),before=JSON.stringify(p.triangles),r=refineSurfaceCurvature(p.points,p.triangles,q=>({point:new THREE.Vector3(q.x,q.y,0)}),insertPoint,{constraints:p.constraints,tolerance:.01});assert.equal(r.inserted,0);assert.equal(JSON.stringify(p.triangles),before);
 const q=patch(),jump=refineSurfaceCurvature(q.points,q.triangles,p=>({point:new THREE.Vector3(p.x,p.y,Math.abs(p.x)<.01?100:0)}),insertPoint,{constraints:q.constraints,tolerance:.01});assert.equal(jump.inserted,0);assert.ok(jump.discontinuousSamples>0);
});
test('Opacity and normal RGB survive unused zero alpha; diffuse filtering still excludes transparent black',()=>{
 const image={width:2,height:1,data:new Uint8Array([128,200,255,0,128,200,255,0])};assert.deepEqual(filteredRGBA(image,[[.5,.5]],{alphaWeighted:false}),[128,200,255,0]);assert.deepEqual(filteredRGBA(image,[[.5,.5]]),[0,0,0,0]);
 const original=image.data.slice(),small=resampleDataMap(image,1);assert.deepEqual([...small.data],[128,200,255,255]);assert.deepEqual(image.data,original);
});
test('Data-map downsampling preserves average channels instead of premultiplying unused alpha',()=>{
 const image={width:4,height:4,data:new Uint8Array(64)};for(let i=0;i<16;i++)image.data.set([i%2?255:0,128,255,0],i*4);const r=resampleDataMap(image,1);assert.ok(Math.abs(r.data[0]-128)<=1);assert.equal(r.data[1],128);assert.equal(r.data[2],255);assert.equal(r.data[3],255);
});
test('Card simplification cannot connect separate sheets and retains source attributes',async()=>{
 await MeshoptSimplifier.ready;const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js'),g=mergeGeometries([new THREE.PlaneGeometry(1,1,8,8).translate(-2,0,0),new THREE.PlaneGeometry(1,1,8,8).translate(2,0,0)]),before=g.attributes.position.array.slice(),r=simplifyCardComponents(g,new Uint32Array(g.index.array),MeshoptSimplifier,{target:8,errorLimit:.02,mask:new Uint8Array(g.attributes.position.count)});
 assert.equal(r.report.components,2);assert.ok(r.indices.length<g.index.count);for(let t=0;t<r.indices.length;t+=3){const signs=[0,1,2].map(k=>Math.sign(g.attributes.position.getX(r.indices[t+k])));assert.ok(signs.every(s=>s===signs[0]),'Independent sheets joined');}assert.deepEqual(g.attributes.position.array,before);
});
test('Facial locks search the actual material partition, not a closer eye or tooth in another group',()=>{
 const mesh=new THREE.Mesh(),bone=new THREE.Bone();bone.name='FACIAL_C_NoseTip';bone.position.set(0,0,.01);mesh.add(bone);mesh.skeleton={bones:[bone]};mesh.updateMatrixWorld(true);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.1,-.1,0,.1,-.1,0,0,0,0,0,0,.01,.01,0,.01,0,.01,.01],3));g.setIndex([0,1,2,3,4,5]);const r=facialLandmarkLocks(mesh,g,'Head',new Uint32Array([0,1,2]));assert.ok(r);assert.ok(r.mask[2]);assert.equal(r.mask[3],0);
});

test('Measured garment creases cross UV duplicates but flat tessellation does not become a protected seam',async()=>{
 const {creaseFeatures}=await import('../src/core/crease-features.js');const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,0,1,0,0,0,1,0,-1,0,0,1,0,0,0,0,1],3));g.setIndex([0,1,2,3,5,4]);const r=creaseFeatures(g);assert.equal(r.report.selectedEdges,1);for(const i of [0,1,3,4])assert.equal(r.mask[i],1);assert.equal(r.mask[2],0);assert.equal(r.mask[5],0);assert.equal(creaseFeatures(new THREE.PlaneGeometry(2,2,8,8)).report.selectedEdges,0);
});
test('Garment feature protection remains spatially limited and respects its finite allocation',async()=>{
 const {creaseFeatures}=await import('../src/core/crease-features.js');const r=creaseFeatures(new THREE.BoxGeometry(2,2,2),{maxEdges:2,lowerFraction:.6});assert.ok(r.report.selectedEdges<=2);assert.ok(r.points.every(p=>p[1]<=1));assert.ok(r.report.availableEdges>=r.report.selectedEdges);
});
test('Closed mouth geometry uses a measured lip centre instead of projecting through the source mouth gap',async()=>{
 const {reconstructAnatomicalFace}=await import('../src/core/anatomical-face.js');const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshStandardMaterial()),corrections={FACIAL_C_NoseTip:[0,.05,1],FACIAL_C_Chin:[0,-.6,.8],FACIAL_L_LipCorner:[.2,-.2,.95],FACIAL_R_LipCorner:[-.2,-.2,.95],FACIAL_C_LipUpper:[0,-.15,.98],FACIAL_C_LipLower:[0,-.25,.96]};for(const [side,sign]of[['L',1],['R',-1]])for(const [suffix,x,y]of[['UpperA1',.2,.25],['UpperA3',.4,.25],['LowerA3',.4,.15],['LowerA1',.2,.15]])corrections[`FACIAL_${side}_Eyelid${suffix}`]=[sign*x,y,.9];
 const r=reconstructAnatomicalFace(mesh,mesh.geometry,mesh.material,{corrections,textureSize:8}),mouth=r.contourPoints.find(c=>c.name==='mouth'),mean=mouth.points.reduce((p,v)=>p.add(new THREE.Vector3(...v)),new THREE.Vector3()).multiplyScalar(1/mouth.points.length),p=r.geometry.attributes.position;assert.match(r.mouthTextureMode,/local lip UV/);assert.ok(Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).distanceTo(mean)).some(d=>d<1e-6));
});
test('Mixed skin assignments do not receive permissive UV-seam relaxation',async()=>{
 await MeshoptSimplifier.ready;const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js'),a=new THREE.PlaneGeometry(1,1,4,4).translate(-.5,0,0),b=new THREE.PlaneGeometry(1,1,4,4).translate(.5,0,0),g=mergeGeometries([a,b]),n=g.attributes.position.count,j=new Uint16Array(n*4),w=new Float32Array(n*4);for(let i=0;i<n;i++){j[i*4]=i<a.attributes.position.count?0:1;w[i*4]=1;}g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(j,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));const r=simplifyCardComponents(g,new Uint32Array(g.index.array),MeshoptSimplifier,{target:8,errorLimit:.02,mask:new Uint8Array(n)});assert.equal(r.report.components,1);assert.ok(r.report.deformationSeamLocks>0);assert.ok(r.report.losses.every(p=>!p.relaxedUV&&p.fallback));
});
