import * as THREE from 'three';
import {SurfaceIndex,triangleRecord} from './surface.js';
// Conservative shell cleanup. A coarse outer garment can otherwise intersect
// untouched inner skin and expose skin-coloured stripes through boots/clothes.
export function removeOccludedShells(g,indices){
 const p=g.attributes.position,triangles=[];
 for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],t=triangleRecord(ids.map(v=>new THREE.Vector3().fromBufferAttribute(p,v)));if(t){t.ids=ids;triangles.push(t);}}
 if(!triangles.length)return {indices,removed:0};
 const bvh=new SurfaceIndex(triangles),limit=bvh.root.box.getSize(new THREE.Vector3()).length()*.025,epsilon=Math.max(limit*.0001,1e-6),out=[];
 let removed=0;
 for(const t of triangles){
  const hidden=[[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]].every(weights=>{
   const point=new THREE.Vector3();t.points.forEach((p,i)=>point.addScaledVector(p,weights[i]));point.addScaledVector(t.normal,epsilon);
   const hit=bvh.raycast(point,t.normal,limit,t);return hit&&hit.triangle.normal.dot(t.normal)>.8;
  });
  if(hidden)removed++;else out.push(...t.ids);
 }
 return {indices:new Uint32Array(out),removed};
}
