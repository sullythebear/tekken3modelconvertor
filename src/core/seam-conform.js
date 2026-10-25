import * as THREE from 'three';import {geometryEdges} from './mesh-integrity.js';
// Conform only measured, already-coincident anatomical interfaces. This splits
// existing triangles; it cannot cap a garment opening or bridge empty space.
export function conformAnatomicalSeams(root){
 root.updateWorldMatrix(true,true);const meshes=[],vertices=[],allowed=(a,b)=>a==='head'&&b==='spine'||b==='head'&&a==='spine'||a==='hips'&&/^(left|right)LowerLeg$/.test(b)||b==='hips'&&/^(left|right)LowerLeg$/.test(a);
 root.traverse(m=>{if(!m.isMesh||!m.geometry.index)return;const g=m.geometry,p=g.attributes.position,data=geometryEdges(g),meta=m.userData.studioRegions??[],role=t=>meta.find(r=>t*3>=r.start&&t*3<r.start+r.count)?.role??'unknown',edges=data.boundaries.map(e=>({...e,role:role(e.triangle)}));meshes.push({m,g,edges});for(const e of edges)for(const v of [e.a,e.b])vertices.push({m,g,v,role:e.role,point:new THREE.Vector3().fromBufferAttribute(p,v).applyMatrix4(m.matrixWorld)});});
 const box=new THREE.Box3().setFromObject(root),tolerance=Math.max(1e-8,box.getSize(new THREE.Vector3()).length()*1e-6);let splits=0,unavailableSkin=0,addedBones=0;
 for(const {m,g,edges}of meshes){const additions=[],edgePoints=new Map(),inverse=m.matrixWorld.clone().invert(),sets=Object.keys(g.attributes).filter(n=>n==='skinIndex'||/^joints_\d+$/.test(n)).map(n=>[n,n==='skinIndex'?'skinWeight':n.replace('joints_','weights_')]).filter(([j,w])=>g.attributes[w]);
  for(const e of edges){const a=new THREE.Vector3().fromBufferAttribute(g.attributes.position,e.a).applyMatrix4(m.matrixWorld),b=new THREE.Vector3().fromBufferAttribute(g.attributes.position,e.b).applyMatrix4(m.matrixWorld),line=new THREE.Line3(a,b),length=a.distanceTo(b);if(length<tolerance*4)continue;const matches=[];
   for(const v of vertices){if(!allowed(e.role,v.role))continue;const t=line.closestPointToPointParameter(v.point,false);if(t<=tolerance/length||t>=1-tolerance/length||line.at(t,new THREE.Vector3()).distanceTo(v.point)>tolerance||matches.some(x=>Math.abs(x.t-t)*length<tolerance))continue;
    const mapped=new Map();let valid=true;
    if(sets.length&&v.m.isSkinnedMesh&&m.isSkinnedMesh){for(const [j,w]of Object.keys(v.g.attributes).filter(n=>n==='skinIndex'||/^joints_\d+$/.test(n)).map(n=>[n,n==='skinIndex'?'skinWeight':n.replace('joints_','weights_')])){if(!v.g.attributes[w])continue;for(let k=0;k<v.g.attributes[j].itemSize;k++){const weight=v.g.attributes[w].getComponent(v.v,k);if(weight<=0)continue;const bone=v.m.skeleton.bones[v.g.attributes[j].getComponent(v.v,k)],initial=m.skeleton.bones.indexOf(bone);let id=initial;
      if(id<0&&bone&&m.bindMatrix.elements.every((n,i)=>Math.abs(n-v.m.bindMatrix.elements[i])<1e-5)){
       const match=m.skeleton.bones.findIndex(b=>b.name===bone.name&&b.matrixWorld.elements.every((n,i)=>Math.abs(n-bone.matrixWorld.elements[i])<1e-5));
       if(match>=0)id=match;else{const sourceIndex=v.g.attributes[j].getComponent(v.v,k),skeleton=new THREE.Skeleton([...m.skeleton.bones,bone],[...m.skeleton.boneInverses,v.m.skeleton.boneInverses[sourceIndex].clone()]);m.bind(skeleton,m.bindMatrix.clone());id=skeleton.bones.length-1;addedBones++;}
      }
      if(id<0){valid=false;break;}mapped.set(id,(mapped.get(id)??0)+weight);}}}else if(sets.length)valid=false;
    if(!valid){unavailableSkin++;continue;}const values={};for(const [name,attr]of Object.entries(g.attributes))values[name]=Array.from({length:attr.itemSize},(_,k)=>attr.getComponent(e.a,k)*(1-t)+attr.getComponent(e.b,k)*t);
    values.position=v.point.clone().applyMatrix4(inverse).toArray();if(sets.length){const influences=[...mapped].sort((a,b)=>b[1]-a[1]),capacity=sets.reduce((n,[j])=>n+g.attributes[j].itemSize,0);if(influences.length>capacity){unavailableSkin++;continue;}let offset=0;for(const[j,w]of sets)for(let k=0;k<g.attributes[j].itemSize;k++,offset++){values[j][k]=influences[offset]?.[0]??0;values[w][k]=influences[offset]?.[1]??0;}}
    const id=g.attributes.position.count+additions.length;additions.push(values);matches.push({t,id});
   }
   if(matches.length)edgePoints.set(e.a+':'+e.b,matches.sort((a,b)=>a.t-b.t));
  }
  if(!additions.length)continue;const output=[],ranges=[];
  for(const [groupIndex,group]of g.groups.entries()){const start=output.length;for(let t=group.start;t<group.start+group.count;t+=3){const original=Array.from(g.index.array.slice(t,t+3));let tris=[original];for(let k=0;k<3;k++){const a=original[k],b=original[(k+1)%3],forward=edgePoints.get(a+':'+b),back=edgePoints.get(b+':'+a),points=forward??back?.slice().reverse();if(!points)continue;let current=a;for(const {id}of points){const i=tris.findIndex(tri=>tri.includes(current)&&tri.includes(b));if(i<0)continue;const tri=tris[i],opposite=tri.find(v=>v!==current&&v!==b);tris.splice(i,1,[current,id,opposite],[id,b,opposite]);current=id;splits++;}}for(const tri of tris)output.push(...tri);}ranges.push({...group,start,count:output.length-start});if(m.userData.studioRegions?.[groupIndex])Object.assign(m.userData.studioRegions[groupIndex],{start,count:output.length-start});}
  for(const[name,a]of Object.entries(g.attributes)){const array=new a.array.constructor((a.count+additions.length)*a.itemSize);array.set(a.array);const attr=new THREE.BufferAttribute(array,a.itemSize,a.normalized);for(let n=0;n<additions.length;n++)for(let k=0;k<a.itemSize;k++)attr.setComponent(a.count+n,k,additions[n][name][k]);g.setAttribute(name,attr);}g.setIndex(output);g.clearGroups();for(const r of ranges)g.addGroup(r.start,r.count,r.materialIndex);g.computeVertexNormals();
 }
 return {splitTriangles:splits,unavailableSkin,addedBones,tolerance,policy:'Only coincident head/torso and garment/leg interfaces; UVs interpolated on their own material, categorical bone identities mapped explicitly'};
}
