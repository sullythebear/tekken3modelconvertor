// Fallbacks apply only when source material links are absent. Original data stays in metadata.
import * as THREE from 'three';
import {forEachInfluence} from './skinning.js';
const basename = n => n.replaceAll('\\','/').split('/').pop();
export function textureRole(name) {
  const n = basename(name).toLowerCase().replace(/\.[^.]+$/, '');
  if (/normal|(?:^|_)n(?:_|$)|strandsn$/.test(n)) return 'normal';
  if (/tangent/.test(n)) return 'tangent';
  if (/opacity|alpha|transparen|strands$/.test(n)) return 'opacity';
  if (/metal|rough|mask|(?:^|_)m(?:_|$)|(?:^|_)(?:orm|mra|srmo)(?:_|$)/.test(n)) return 'mask';
  if (/specular|(?:^|_)s(?:_|$)/.test(n)) return 'specular';
  return 'diffuse';
}
export function materialFamily(name) {
  const tokens=basename(name).replace(/\.[^.]+$/,'').toLowerCase().split('_').filter(Boolean);
  if(['mi','m','t'].includes(tokens[0]))tokens.shift();
  while(tokens.length&&['d','n','m','s','baked','revised','alt','under','strands','strandsn','tangent','srmo','orm','mra'].includes(tokens.at(-1)))tokens.pop();
  return tokens.join('');
}
export function resolveMaterialFile(materialName, files, role='diffuse') {
  const family=materialFamily(materialName), choices=files.filter(f=>textureRole(f.name)===role&&materialFamily(f.name)===family);
  if(choices.length===1)return choices[0];
  if(role==='normal'&&choices.length>1&&files.some(f=>textureRole(f.name)==='opacity'&&/strands/i.test(f.name)&&materialFamily(f.name)===family)) {
    const strands=choices.filter(f=>/strandsn/i.test(f.name));if(strands.length===1)return strands[0];
  }
  if(!choices.length&&role==='diffuse'&&/eyelash/i.test(materialName)) {
    const lashes=files.filter(f=>textureRole(f.name)==='diffuse'&&/eyelash/i.test(f.name));
    if(lashes.length===1)return lashes[0];
  }
  return null;
}
function proxyColor(material) {
  if(!/^MI_/i.test(material.name))return;
  material.userData.t3csSourceAppearance ??= {color:material.color?.toArray(),vertexColors:material.vertexColors,specular:material.specular?.toArray(),shininess:material.shininess};
  material.color?.setRGB(1,1,1);
  material.vertexColors=false;
}
async function fill(material, files, load, warnings) {
  if(material.map)return false;
  const diffuse=resolveMaterialFile(material.name,files);
  if(!diffuse)return false;
  proxyColor(material);
  material.map=await load(diffuse,'diffuse');
  const normal=resolveMaterialFile(material.name,files,'normal'),specular=resolveMaterialFile(material.name,files,'specular');
  if(!material.normalMap&&normal)material.normalMap=await load(normal,'normal');
  if(!material.specularMap&&specular)material.specularMap=await load(specular,'specular');
  const opacity=resolveMaterialFile(material.name,files,'opacity');
  if(!material.alphaMap&&opacity){material.alphaMap=await load(opacity,'opacity');material.alphaTest=.2;material.side=THREE.DoubleSide;warnings.push(`${material.name}: inferred green-channel strand opacity from ${opacity.name}; verify against the source shader.`);}
  if(/eyelash/i.test(material.name)&&!material.alphaMap){
    material.alphaMap=await load(diffuse,'opacity');material.alphaTest=.15;material.side=THREE.DoubleSide;
    material.color?.setRGB(.018,.009,.006);
    warnings.push(`${material.name}: inferred eyelash green-channel cutout and dark fibre tint from grayscale texture; verify visually.`);
  }
  material.needsUpdate=true;
  material.userData.t3csTextureResolution={method:'material-family-fallback',diffuse:diffuse.name,normal:normal?.name,specular:specular?.name,opacity:opacity?.name};
  warnings.push(`Material-family fallback: ${material.name} → ${diffuse.name}; source shader links are absent. Unreal proxy tint/vertex masks are excluded from albedo rendering; data preserved.`);
  return true;
}
export async function resolveFallbackMaterials(root, files, load, warnings) {
  const meshes=[];root.traverse(m=>{if(m.isMesh)meshes.push(m);});
  for(const mesh of meshes) {
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const base=materials[0];
    if(materials.length===1&&!base.map&&/eyeteeth/i.test(base.name)&&mesh.skeleton) {
      const names=['iris','sclera','teeth'].map(role=>base.name.replace(/eyeteeth/i,role==='teeth'?'Teeth':`Eye_${role}`));
      if(names.every(name=>resolveMaterialFile(name,files))) {
        const replacements=names.map(name=>{const m=base.clone();m.name=name;return m;});
        for(const m of replacements)await fill(m,files,load,warnings);
        const geometry=mesh.geometry,index=geometry.index,total=index?.count??geometry.attributes.position.count;
        const labels=[];
        for(let t=0;t<total;t+=3){
          const score={iris:0,sclera:0,teeth:0};let sum=0;
          for(let k=0;k<3;k++)forEachInfluence(mesh,index?index.getX(t+k):t+k,(bone,w)=>{
            const name=mesh.skeleton.bones[bone].name;sum+=w;
            if(/pupil/i.test(name))score.iris+=w;
            else if(/_eye$/i.test(name))score.sclera+=w;
            else if(/teeth|tongue|jaw/i.test(name))score.teeth+=w;
          });
          if(!Object.values(score).some(s=>s>sum*.02))throw Error(`${base.name}: cannot separate eye/teeth source triangles anatomically`);
          labels.push(score.iris>sum*.02?0:score.sclera>sum*.02?1:2);
        }
        geometry.clearGroups();
        const order=[];
        for(let role=0;role<3;role++) {
          const start=order.length;
          for(let t=0;t<labels.length;t++)if(labels[t]===role)for(let k=0;k<3;k++)order.push(index?index.getX(t*3+k):t*3+k);
          geometry.addGroup(start,order.length-start,role);
        }
        geometry.setIndex(order);
        const irisUV = [Infinity, Infinity, -Infinity, -Infinity], uv = geometry.attributes.uv;
        for(let t=0;t<labels.length;t++) if(labels[t]===0) for(let k=0;k<3;k++) {
          const v=index?index.getX(t*3+k):t*3+k,u=uv.getX(v),y=uv.getY(v);
          irisUV[0]=Math.min(irisUV[0],u);irisUV[1]=Math.min(irisUV[1],y);irisUV[2]=Math.max(irisUV[2],u);irisUV[3]=Math.max(irisUV[3],y);
        }
        const width=irisUV[2]-irisUV[0],height=irisUV[3]-irisUV[1];
        if(width>.01&&height>.01&&width<.5&&height<.5) {
          for(const slot of ['map','normalMap']) if(replacements[0][slot]) {
            const tex=replacements[0][slot].clone();tex.repeat.set(1/width,1/height);tex.offset.set(-irisUV[0]/width,-irisUV[1]/height);tex.updateMatrix();replacements[0][slot]=tex;
          }
          replacements[0].userData.t3csTextureResolution.uvRemap={bounds:irisUV,method:'inferred iris subchart to full baked iris texture'};
          warnings.push(`${base.name}: compact pupil-weighted UV chart mapped to full iris images; source UV buffers preserved.`);
        }
        replacements[0].specular?.setRGB(.02,.02,.02);
        replacements[0].shininess=80;
        replacements[0].userData.t3csTextureResolution.specularApproximation="low iris highlight; clear eye shell provides corneal reflection";
        mesh.material=replacements;
        warnings.push(`${base.name}: eye iris, sclera and teeth separated using source pupil/eye/teeth/tongue skin influences; original positions, UVs and weights preserved.`);
        continue;
      }
    }
    for(const material of materials){
      await fill(material,files,load,warnings);
      if(!material.map&&/^MI_/i.test(material.name)&&/eyeshell/i.test(material.name)){
        proxyColor(material);material.transparent=true;material.opacity=.08;material.depthWrite=false;material.shininess=100;mesh.renderOrder=1;
        material.userData.t3csTextureResolution={method:'untextured-eye-shell-fallback',assumption:'transparent corneal cover'};
        warnings.push(`${material.name}: untextured eye shell approximated as transparent corneal cover; verify against the source shader.`);
      }
    }
  }
}
