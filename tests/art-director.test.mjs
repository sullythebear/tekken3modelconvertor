import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {artSettings,reconstructClusters,shapeRegion,ART_PRESETS,landmarkDrift,artRegion} from '../src/core/art-director.js';
import {artAtlasLayout,pixelateRGBA,stagingTIMLayout,artTextureColors} from '../src/core/art-atlas.js';
import {readStudioProject,writeStudioProject} from '../src/core/studio-project.js';
import {zipSync,strToU8} from 'fflate';
import {planRegionMaterials} from '../src/core/region-materials.js';
import {removeOccludedShells} from '../src/core/occlusion.js';
test('Art presets are distinct and malformed controls are rejected',()=>{
 assert.equal(new Set(Object.values(ART_PRESETS).map(p=>JSON.stringify(p))).size,3);
 assert.throws(()=>artSettings({face:101}));assert.throws(()=>artSettings({corrections:{head:{scale:4}}}));
});
test('Explicit region corrections override material heuristics without changing automatic hair detection',()=>{
 assert.equal(artRegion('head','Hair'),'hair');assert.equal(artRegion('manual:head','Hair'),'head');assert.equal(artRegion('manual:arms','Head'),'arms');
});
test('Project round-trip retains binary assets, regional corrections and material state; unsafe entries fail',()=>{
 const art=artSettings({corrections:{head:{scale:1.05}},regions:{hair:3}}),data=new Uint8Array([0,1,255]);
 const project=readStudioProject(writeStudioProject([{name:'model.fbx',data}],{art,preset:'authentic',mapping:{fixture:true},materials:[{name:'skin',alphaTest:.2}]}));
 assert.deepEqual(project.records[0].data,data);assert.equal(project.art.regions.hair,3);assert.equal(project.materials[0].alphaTest,.2);
 assert.throws(()=>readStudioProject(zipSync({'../escape':data})),/Unexpected/);
 assert.throws(()=>readStudioProject(zipSync({'project.json':strToU8(JSON.stringify({schema:'t3cs-project/1',files:['missing.fbx'],art}))})),/missing/);
});
test('Facial drift is independent of the original preview normalization transform',()=>{
 const root=new THREE.Group(),head=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());head.material.name='Head';root.add(head);
 const bone=new THREE.Bone();bone.name='FACIAL_C_NoseTip';bone.position.set(.5,.5,.5);root.add(bone);
 const result=root.clone(true),holder=new THREE.Group();holder.scale.setScalar(.01);holder.position.set(3,2,1);holder.add(root);holder.updateMatrixWorld(true);
 assert.ok(landmarkDrift(root,result).maxDistance<1e-10);
});
test('Regional UV crop preserves exact source texture coordinates and leaves source buffers unchanged',()=>{
 const g=new THREE.PlaneGeometry(),uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,.2+uv.getX(i)*.3,.4+uv.getY(i)*.2);
 const sourceUV=uv.array.slice(),texture=new THREE.Texture();texture.offset.set(.1,.05);texture.repeat.set(.8,.9);texture.updateMatrix();
 const material=new THREE.MeshBasicMaterial({map:texture});material.name='Body';const mesh=new THREE.Mesh(g,material);
 const part={mesh,g,indices:g.index.array,role:'leftLowerLeg',material,materialIndex:0};planRegionMaterials([part]);
 const c=part.uvCrop;assert.ok(c);part.material.map.updateMatrix();
 for(let i=0;i<uv.count;i++){
  const old=texture.transformUv(new THREE.Vector2(uv.getX(i),uv.getY(i)));
  const actual=part.material.map.transformUv(new THREE.Vector2((uv.getX(i)-c.minU)/c.spanU,(uv.getY(i)-c.minV)/c.spanV));
  assert.ok(old.distanceTo(actual)<1e-6);
 }
 assert.deepEqual(uv.array,sourceUV);assert.equal(mesh.material.length,1);
});
test('Shell cleanup removes hidden inner faces but retains outer, opposite-facing and distant surfaces',()=>{
 const make=(distance,reverse=false)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,0,0,distance,1,0,distance,0,1,distance],3));g.setIndex(reverse?[0,1,2,3,5,4]:[0,1,2,3,4,5]);return g;};
 const near=make(.01),before=near.attributes.position.array.slice(),r=removeOccludedShells(near,near.index.array);
 assert.equal(r.removed,1);assert.deepEqual([...r.indices],[3,4,5]);assert.deepEqual(near.attributes.position.array,before);
 for(const g of [make(1),make(.01,true)])assert.equal(removeOccludedShells(g,g.index.array).removed,0);
});
test('Mixed 4/8-bit staging textures cannot overlap each other or the separate palette area',()=>{
 const r=stagingTIMLayout([{width:128,height:128,colors:256},{width:128,height:128,colors:16},...Array.from({length:12},()=>({width:128,height:128,colors:256}))]);
 for(const a of r){assert.ok(a.x+a.wordWidth<=768);assert.ok(a.y+a.height<=480);}
 for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],b=r[j];assert.ok(a.x+a.wordWidth<=b.x||b.x+b.wordWidth<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
});
test('Surface reconstruction rebuilds connectivity while feature anchors stay individually indexed',()=>{
 const g=new THREE.SphereGeometry(1,128,96),before=g.attributes.position.array.slice();
 const mask=new Uint8Array(g.attributes.position.count);mask[20]=1;
 const r=reconstructClusters(g,500,{featureMask:mask,art:artSettings({preset:'classic'}),role:'head',material:'head'});
 assert.ok(r.indices.length<g.index.count);assert.ok(r.indices.length>0);assert.ok(r.indices.includes(20)||!g.index.array.includes(20));
 assert.deepEqual(g.attributes.position.array,before);assert.ok(Number.isFinite(r.maxDistance));
});
test('Body shaping edits geometry; adaptive atlases reserve larger face tiles and pixelation changes real pixels',()=>{
 const g=new THREE.SphereGeometry(1,10,10),before=g.attributes.position.array.slice();shapeRegion(g,artSettings({angular:100,stylization:100}),'spine','Body');assert.notDeepEqual(g.attributes.position.array,before);
 const materials=['Head','Body','Hair','Eye','Teeth','Lashes'].map(name=>({name})),layout=artAtlasLayout(materials,256,artSettings());
 assert.ok(layout[0].side>layout[3].side);
 for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++){const a=layout[i],b=layout[j];assert.ok(a.x+a.side<=b.x||b.x+b.side<=a.x||a.y+a.side<=b.y||b.y+b.side<=a.y);}
 const data=new Uint8Array([117,123,129,0,132,147,161,255]);const out=pixelateRGBA(data,100,true);assert.notDeepEqual(out,data);assert.equal(out[3],0);assert.equal(out[7],255);
});

test('Source-diffuse body charts retain RGB555 color variation without taking texels from protected face or eye tiles',()=>{
 const art=artSettings(),body=new THREE.MeshBasicMaterial(),face=new THREE.MeshBasicMaterial(),eye=new THREE.MeshBasicMaterial();body.name='Body_torso_rebaked';face.name='Head_anatomical';eye.name='Eye_iris';const materials=[body,face,eye],before=artAtlasLayout(materials,512,art);assert.equal(artTextureColors(body.name,art,body),16);body.userData.t3csSurfaceDiffuse={sourceNormals:true,static:true};assert.equal(artTextureColors(body.name,art,body),256);assert.deepEqual(artAtlasLayout(materials,512,art),before);assert.equal(artTextureColors(face.name,art,face),256);assert.equal(artTextureColors(eye.name,art,eye),16);
});
