import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {textureRole,resolveMaterialFile,resolveFallbackMaterials} from '../src/core/material-resolution.js';
import {materialUVDomains} from '../src/core/uv-domain.js';
test('Texture channel classification separates baked normals, packed masks, opacity and tangent data from albedo',()=>{
 for(const [name,role]of [['T_Head_N_Baked.tga','normal'],['T_Face_StrandsN.tga','normal'],['T_Body_M.tga','mask'],['T_Teeth_SRMO_Baked_REVISED.tga','mask'],['T_Face_Strands.tga','opacity'],['T_Face_Tangent.tga','tangent'],['T_Head_D.tga','diffuse']])assert.equal(textureRole(name),role);
 const files=['T_Cargo_Body_D.tga','T_Cargo_Body_M.tga','T_Cargo_FaceAcc_D.tga'].map(name=>({name}));
 assert.equal(resolveMaterialFile('MI_Cargo_Body',files).name,'T_Cargo_Body_D.tga');
 assert.equal(resolveMaterialFile('MI_Cargo_FaceAcc_Alt_Under',files).name,'T_Cargo_FaceAcc_D.tga');
 assert.equal(resolveMaterialFile('MI_Cargo_Body',[...files,{name:'T_Cargo_Body_D.png'}]),null);
});
test('Fallback preserves vertex-mask attributes and explicit source maps while resolving missing material families',async()=>{
 const root=new THREE.Group(),g=new THREE.PlaneGeometry(),m=new THREE.MeshPhongMaterial({vertexColors:true,color:'blue'});
 m.name='MI_Reference_Body';g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(.5),3));root.add(new THREE.Mesh(g,m));
 const files=[{name:'T_Reference_Body_D.tga'}],warnings=[],texture=new THREE.Texture();texture.name=files[0].name;
 await resolveFallbackMaterials(root,files,async()=>texture,warnings);
 assert.equal(m.map,texture);assert.equal(m.vertexColors,false);assert.equal(m.color.getHex(),0xffffff);assert.ok(g.attributes.color);
 assert.equal(m.userData.t3csSourceAppearance.vertexColors,true);
 const explicit=m.map;await resolveFallbackMaterials(root,[{name:'T_Reference_Body_D.png'}],async()=>{throw Error('Should not replace source map');},warnings);
 assert.equal(m.map,explicit);
});
test('Whole-tile UV domains preserve translated coordinates and reject crossing unresolved repeat seams',()=>{
 const root=new THREE.Group(),g=new THREE.PlaneGeometry(),m=new THREE.MeshBasicMaterial();m.name='TranslatedLashes';
 const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)+1,uv.getY(i)+1);root.add(new THREE.Mesh(g,m));
 assert.deepEqual(materialUVDomains(root,[m]).get(m),[1,1]);assert.equal(uv.getX(0),1);
 uv.setX(0,3.5);assert.throws(()=>materialUVDomains(root,[m]),/span multiple tiles/);
});
test('Eye/teeth fallback classifies real source influences and preserves source positions, UVs and weights',async()=>{
 const root=new THREE.Group(),bones=['FACIAL_L_Pupil','FACIAL_L_Eye','FACIAL_C_TeethUpper'].map(name=>{const b=new THREE.Bone();b.name=name;root.add(b);return b;});
 const g=new THREE.BufferGeometry(),positions=[],uv=[],joints=[],weights=[];
 for(let role=0;role<3;role++)for(let k=0;k<3;k++){positions.push(role,k===1?1:0,k===2?1:0);uv.push(role===0?.4+(k===1?.2:0):.1+(k===1?.8:0),role===0?.4+(k===2?.2:0):.1+(k===2?.8:0));joints.push(role,0,0,0);weights.push(1,0,0,0);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const mat=new THREE.MeshPhongMaterial();mat.name='MI_Reference_EyeTeeth';const mesh=new THREE.SkinnedMesh(g,mat);root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));
 const files=['T_Reference_Eye_Iris_D_Baked.tga','T_Reference_Eye_Sclera_D_Baked.tga','T_Reference_Teeth_D_Baked_REVISED.tga'].map(name=>({name}));
 await resolveFallbackMaterials(root,files,async f=>{const t=new THREE.Texture();t.name=f.name;return t;},[]);
 assert.equal(mesh.material.length,3);assert.equal(g.groups.length,3);assert.equal(g.index.count,9);
 assert.deepEqual([...g.attributes.position.array],[...new Float32Array(positions)]);
 assert.deepEqual([...g.attributes.uv.array],[...new Float32Array(uv)]);
 assert.equal(mesh.material[0].map.name,files[0].name);assert.ok(mesh.material[0].map.repeat.x>4.9);
 assert.ok(mesh.material[0].userData.t3csTextureResolution.uvRemap);
});
