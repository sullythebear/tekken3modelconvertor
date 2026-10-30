import * as THREE from 'three';import {readNUD} from './nud.js';import {readNUT} from './nut.js';import {readBON} from './bone.js';import {ttt2Role} from './roles.js';import {configureTTT2Blend}from'./material-preview.js';
const wrap=(v)=>({1:THREE.RepeatWrapping,2:THREE.MirroredRepeatWrapping,3:THREE.ClampToEdgeWrapping})[v];
// No game files are read implicitly: all dependencies are supplied local records.
export function importTTT2(files,model){
 const data=readNUD(model.data),warnings=['TTT2 files readable does not establish character identity or complete outfit. Original item database, part packs, variant conditions and skeleton identity remain unverified.','TTT2 preview uses provisional diffuse material interpretation, not the game shaders. No Jin/gameplay validation.'],textures=new Map(),nuts=files.filter(f=>/\.nut$/i.test(f.name)),bons=files.filter(f=>/\.bon$/i.test(f.name));
 if(bons.length>1)throw Error('TTT2: select exactly one matching BON skeleton, not multiple costumes/skeletons');
 let decodedPixels=0;
 for(const file of nuts)for(const tex of readNUT(file.data).textures){if(textures.has(tex.id))throw Error(`TTT2: ambiguous duplicate NUT texture ID ${tex.id}`);decodedPixels+=tex.width*tex.height;if(decodedPixels>33554432)throw Error('TTT2: combined decoded texture memory limit exceeded');textures.set(tex.id,tex);}
 const bon=bons.length?readBON(bons[0].data):null,root=new THREE.Group();root.name=model.name;root.userData.ttt2={units:'metres',sourceUnits:'millimetres',axis:'Y-up, +Z forward (upstream)',assemblyStatus:{identity:'unverified',outfit:'unverified',parts:'unresolved',sourceVisualReview:'not-reviewed',gameplay:'not-tested'},materialFidelity:'provisional-diffuse',animationImport:'unsupported',boneMetadataScale:bon?.scale,sourceBoneRange:data.boneRange,sourceVersion:data.version};
 const bones=bon?.bones.map((b,i)=>{const n=new THREE.Bone();n.name=b.name||`bone_${i}`;n.position.fromArray(b.translation).multiplyScalar(.001);n.quaternion.setFromEuler(new THREE.Euler(...b.rotation,'ZYX'));n.userData.ttt2SourceScale=b.scale;const role=ttt2Role(b.name);if(role)n.userData.t3csRole=role;return n;})??[];
 for(let i=0;i<bones.length;i++){const p=bon.bones[i].parent;if(p<0)root.add(bones[i]);else bones[p].add(bones[i]);}
 if(bon?.bones.some(b=>b.scale.some(s=>s!==1)))warnings.push('BON scale arrays preserved as metadata; upstream world matrices omit them. Dynamic helper/scale behaviour is not validated.');
 root.updateMatrixWorld(true);const skeleton=bones.length?new THREE.Skeleton(bones):null;if(skeleton)skeleton.calculateInverses();
 let anyWeights=false;
 try{for(const [mi,mesh]of data.meshes.entries())for(const [pi,p]of mesh.polys.entries()){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.positions.map(v=>v*.001),3));if(p.normals.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(p.normals,3));g.setIndex(p.indices);if(!p.normals.length)g.computeVertexNormals();
  for(let i=0;i<p.uv.length;i++)g.setAttribute(i?`uv${i}`:'uv',new THREE.Float32BufferAttribute(p.uv[i],2));if(p.colours.length)g.setAttribute('color',new THREE.Float32BufferAttribute(p.colours,4));
  const m=p.materials[0],material=new THREE.MeshStandardMaterial({name:`${mesh.name}/primitive_${pi}`,roughness:1,metalness:0,vertexColors:!!p.colours.length,side:THREE.DoubleSide});material.userData.ttt2={materials:p.materials,shaderInterpretation:'first-slot diffuse provisional',sourceMesh:mi,sourcePrimitive:pi};
  // Preserve every material/texture descriptor, but do not mistake auxiliary slots for diffuse.
  if(p.materials.length>1)warnings.push(`${material.name}: ${p.materials.length} shader layers preserved as metadata; only first layer previewed.`);
  const slot=m?.textures[0];if(slot){const t=textures.get(slot.id);if(!t)warnings.push(`${material.name}: missing NUT texture ID ${slot.id}; untextured preview.`);else {const texture=new THREE.DataTexture(t.rgba,t.width,t.height,THREE.RGBAFormat);texture.name=`TTT2_GIDX_${t.id}`;texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.wrapS=wrap(slot.wrapS)??THREE.ClampToEdgeWrapping;texture.wrapT=wrap(slot.wrapT)??THREE.ClampToEdgeWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;material.map=texture;if(!wrap(slot.wrapS)||!wrap(slot.wrapT))warnings.push(`${material.name}: unknown sampler wrap; clamped preview.`);}}
  if(m?.alphaTest&&m.alphaFunc!==7){material.alphaTest=Math.max(1/255,Math.min(1,m.ref/255));warnings.push(`${material.name}: alpha-test comparator ${m.alphaFunc} approximated as >= reference.`);}
  const blend=configureTTT2Blend(material,m);material.userData.ttt2.blendInterpretation=blend;
  if(m&&(m.src||m.dst))warnings.push(`${material.name}: native src=0x${m.src.toString(16)}, dst=0x${m.dst.toString(16)}, cull=0x${m.cull.toString(16)}; ${blend} diffuse preview; complete shader/cull semantics unverified.`);
  let skinned=!!p.joints.length;
  if(skinned&&!skeleton)throw Error('TTT2: weighted NUD requires a matching BON skeleton; add it to the selected local files');
  if(skinned){anyWeights=true;const count=p.positions.length/3,weights=p.weights.slice(),indices=p.joints.slice();for(let v=0;v<count;v++){let sum=0;for(let k=0;k<4;k++){const at=v*4+k;if(weights[at]>0&&indices[at]>=bones.length)throw Error('TTT2: weighted bone index exceeds BON hierarchy');if(!weights[at])indices[at]=0;sum+=weights[at];}if(sum<=0)throw Error('TTT2: vertex has no positive skin influences');for(let k=0;k<4;k++)weights[v*4+k]/=sum;}g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));}
  else if(mesh.singleBind>=0)warnings.push(`${material.name}: unweighted singleBind ${mesh.singleBind} retained in metadata; rigid local-space animation unverified.`);
  const node=skinned?new THREE.SkinnedMesh(g,material):new THREE.Mesh(g,material);node.name=`${mesh.name}_${pi}`;node.userData.ttt2={singleBind:mesh.singleBind,boneFlag:mesh.boneFlag,sourceCenterMm:mesh.center,sourceSphereMm:mesh.sphere,sortBias:mesh.sortBias,sourceMesh:mi,sourcePrimitive:pi,vtype:p.vtype,uvtype:p.uvtype,strip:p.strip,layout:p.layout};root.add(node);if(skinned){root.updateMatrixWorld(true);node.bind(skeleton,new THREE.Matrix4());}
 }
 if(bon&&!anyWeights)warnings.push('BON hierarchy present but NUD has no explicit skin weights; no guessed rigid skinning applied.');
 if(!nuts.length)warnings.push('No NUT supplied: textures are missing, not successfully converted.');
 return {root,animations:[],warnings};
 }catch(e){root.traverse(n=>{n.geometry?.dispose();if(n.material){n.material.map?.dispose();n.material.dispose();}});throw e;}
}
