import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {reconstructAnatomicalFace} from '../src/core/anatomical-face.js';
import {reconstructHairVolume} from '../src/core/hair-volume.js';
import {artSettings} from '../src/core/art-director.js';
function head(){
 const geometry=new THREE.SphereGeometry(1,48,32);geometry.scale(.8,1,.8);geometry.translate(0,2,0);
 const n=geometry.attributes.position.count;geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4),4));const weights=new Float32Array(n*4);for(let i=0;i<n;i++)weights[i*4]=1;geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const material=new THREE.MeshStandardMaterial({color:0xc29577});material.name='Head';const mesh=new THREE.SkinnedMesh(geometry,material),bone=new THREE.Bone();bone.name='head';mesh.add(bone);
 const values={FACIAL_L_EyelidUpperA:[.3,2.2,.6],FACIAL_R_EyelidUpperA:[-.3,2.2,.6],FACIAL_C_NoseTip:[0,2.05,.8],FACIAL_L_LipCorner:[.2,1.7,.7],FACIAL_R_LipCorner:[-.2,1.7,.7],FACIAL_C_LipUpper:[0,1.75,.75],FACIAL_C_LipLower:[0,1.65,.75]};
 for(const [side,sign]of [['L',1],['R',-1]])for(const [suffix,x,y]of [['UpperA1',.2,2.24],['UpperA3',.4,2.24],['LowerA1',.2,2.16],['LowerA3',.4,2.16]])values[`FACIAL_${side}_Eyelid${suffix}`]=[x*sign,y,.7];
 const bones=[bone];for(const [name,p]of Object.entries(values)){const b=new THREE.Bone();b.name=name;b.position.fromArray(p);bone.add(b);bones.push(b);}mesh.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));return mesh;
}
test('Anatomical face generates explicit eye/mouth loops and a new UV chart despite overlapping source UVs',()=>{
 const mesh=head();mesh.geometry.attributes.uv.array.fill(0);
 const r=reconstructAnatomicalFace(mesh,mesh.geometry,mesh.material,{textureSize:16});
 assert.ok(r.geometry,r.reason);assert.equal(r.sourceUVIndependent,true);assert.equal(r.featureLoops.filter(f=>f.aperture).length,2);assert.equal(r.featureLoops.length,3);
 assert.ok(r.triangles>100);assert.ok(r.generatedVertices<mesh.geometry.attributes.position.count);assert.equal(r.material.map.image.width,16);
 for(const v of r.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
 for(let i=0;i<r.geometry.attributes.position.count;i++)assert.equal(r.geometry.attributes.skinWeight.getX(i),1);
});
test('Redundant eye-centre bones cannot masquerade as measured eyelid contours',()=>{const mesh=head();for(const b of mesh.skeleton.bones)if(/Eyelid(Upper|Lower)A[13]$/.test(b.name))b.name='unknown';const r=reconstructAnatomicalFace(mesh,mesh.geometry,mesh.material,{textureSize:8});assert.equal(r.geometry,null);assert.match(r.reason,/contour/);});
test('Facial corrections and hair method are validated and survive reusable profiles',()=>{const input={preset:'authentic',faceLandmarks:{FACIAL_C_Chin:[0,1.2,.3]},hairMethod:'volume'};assert.deepEqual(artSettings(JSON.parse(JSON.stringify(input))).faceLandmarks,input.faceLandmarks);assert.throws(()=>artSettings({...input,faceLandmarks:{FACIAL_C_Chin:[NaN,1,2]}}),/facial/);assert.throws(()=>artSettings({...input,hairMethod:'fake'}),/hair/);});
test('Measured hair envelope produces opaque three-dimensional geometry for a distinct authored short hairstyle',()=>{
 const g=new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI*.65);g.scale(.9,1.1,.9);g.translate(0,2,0);
 const m=new THREE.MeshStandardMaterial({color:0x382318});const r=reconstructHairVolume(g,m,{headCenter:new THREE.Vector3(0,2,0),textureSize:16});
 assert.ok(r.geometry,r.reason);assert.ok(r.triangles>20);assert.ok(r.triangles<g.index.count/3);assert.equal(r.material.alphaTest,0);for(const v of r.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
});

test('Fourteen preparation tiles reserve space and larger atlases retain actual PS1 tile dimensions',async()=>{
 const {artAtlasLayout}=await import('../src/core/art-atlas.js');const mats=['Head','Hair','Body_torso','Body_arms_left','Body_arms_right','Body_legs_left','Body_legs_right','Body_legs_left_envelope','Body_legs_right_envelope','iris','lash','sclera','teeth','eyeshell'].map(name=>({name}));
 const layout=artAtlasLayout(mats,512,artSettings());assert.equal(layout.length,14);assert.equal(layout[0].side,128);assert.equal(layout[2].side,128);assert.equal(layout[3].side,64);
 for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++){const a=layout[i],b=layout[j];assert.ok(a.x+a.side<=b.x||b.x+b.side<=a.x||a.y+a.side<=b.y||b.y+b.side<=a.y);}
});
test('Shoe envelope closes its sole and retains forward toe extent without source UV connectivity',async()=>{
 const {reconstructBootEnvelope}=await import('../src/core/boot-envelope.js');const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');const leg=new THREE.CylinderGeometry(.3,.3,2,24,18).translate(0,1.2,0),foot=new THREE.BoxGeometry(.65,.4,1.2,6,3,10).translate(0,.2,.25),g=mergeGeometries([leg,foot]),m=new THREE.MeshStandardMaterial({color:0x181818});const r=reconstructBootEnvelope(g,m,{textureSize:16});assert.ok(r.geometry,r.reason);assert.ok(r.triangles<g.index.count/3);r.geometry.computeBoundingBox();assert.ok(r.geometry.boundingBox.max.z>.75);assert.ok(r.geometry.boundingBox.min.y<.01);for(const v of r.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
});
test('Candidate stage meets a requested count without mutating the artistic mesh or claiming game verification',async()=>{
 const {optimizeGameCandidate}=await import('../src/core/game-optimization.js');const {inspectScene}=await import('../src/core/importer.js');const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),new THREE.MeshStandardMaterial());root.add(mesh);const before=mesh.geometry.index.array.slice(),artistic={root,stats:inspectScene(root),settings:{triangles:900},warnings:[],quality:{}};const r=await optimizeGameCandidate(artistic,{triangles:100});assert.ok(r.stats.triangles<=100);assert.equal(r.gameVerified,false);assert.equal(r.optimization.artisticTriangles,artistic.stats.triangles);assert.deepEqual(mesh.geometry.index.array,before);assert.notEqual(r.root.children[0].material,mesh.material);
});
test('Anatomical constrained triangulation replaces poor diagonals while retaining explicit feature edges',async()=>{const {improveTriangulation}=await import('../src/core/constrained-triangulation.js');const p=[[0,0],[3,0],[2,1],[0,1]].map(([x,y])=>new THREE.Vector2(x,y)),t=[[0,1,3],[1,2,3]];assert.ok(improveTriangulation(p,t,[]).flips>0);assert.ok(t.every(tri=>tri.includes(0)&&tri.includes(2)));const locked=[[0,1,3],[1,2,3]];assert.equal(improveTriangulation(p,locked,[[1,3]]).flips,0);assert.deepEqual(locked,[[0,1,3],[1,2,3]]);});
test('Face preservation changes generated topology, while semantic support loops survive',()=>{const mesh=head(),low=reconstructAnatomicalFace(mesh,mesh.geometry,mesh.material,{detail:10,textureSize:8}),high=reconstructAnatomicalFace(mesh,mesh.geometry,mesh.material,{detail:100,textureSize:8});assert.ok(high.triangles>low.triangles);assert.deepEqual(high.featureLoops,low.featureLoops);});
test('Physical torso rebake retains positions and creates a real front/back texture',async()=>{const {rebakeTorso}=await import('../src/core/torso-bake.js');const g=new THREE.BoxGeometry(1,2,.5,2,4,2),m=new THREE.MeshStandardMaterial({color:0xb32121}),before=g.attributes.uv.array.slice(),r=rebakeTorso(g,g,m,{side:16});assert.ok(r);assert.equal(r.material.map.image.width,32);assert.equal(r.material.map.image.height,16);assert.deepEqual(r.geometry.attributes.position.array,g.toNonIndexed().attributes.position.array);assert.deepEqual(g.attributes.uv.array,before);assert.ok(r.material.map.image.data.some((v,i)=>i%4===0&&v>0));});

test('Boot projection excludes a lowered hand outside the measured leg footprint',async()=>{
 const {reconstructBootEnvelope}=await import('../src/core/boot-envelope.js');
 const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');
 const leg=new THREE.CylinderGeometry(.3,.3,2,24,18).translate(0,1,0);
 const hand=new THREE.SphereGeometry(.2,16,12).translate(2,1.8,0);
 const projection=mergeGeometries([leg,hand]);
 const result=reconstructBootEnvelope(leg,new THREE.MeshStandardMaterial(),{projectionGeometry:projection,textureSize:8});
 assert.ok(result.geometry,result.reason);result.geometry.computeBoundingBox();
 assert.ok(result.geometry.boundingBox.max.x<.4,'A same-side hand must not become the outer boot shell');
 assert.ok(result.projectionTriangles<projection.index.count/3);
});
