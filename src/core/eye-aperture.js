import * as THREE from 'three';
import {SurfaceIndex,triangleRecord} from './surface.js';
// Trace the visible intersection of the actual eye surface and face, rather
// than mistaking four interior rig control points for the eye's corners.
export function sourceEyeSurface(root,inverse){
 const records=[];root.updateMatrixWorld(true);root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,materials=Array.isArray(m.material)?m.material:[m.material],index=g.index,p=g.attributes.position,matrix=inverse.clone().multiply(m.matrixWorld);for(const group of g.groups.length?g.groups:[{start:0,count:index?.count??p.count,materialIndex:0}]){if(!/iris|sclera/i.test(materials[group.materialIndex]?.name??''))continue;for(let t=group.start;t<group.start+group.count;t+=3){const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(t+k):t+k).applyMatrix4(matrix)),r=triangleRecord(points);if(r)records.push(r);}}});return records.length?new SurfaceIndex(records):null;
}
export function traceEyeAperture(face,eyes,center,{x,y,z,radius,eyeSpacing,count=12}){
 if(!eyes)return null;
 const shoot=(p,surface)=>surface.raycast(p.clone().addScaledVector(z,radius*3),z.clone().negate(),radius*6);
 const visible=p=>{const eye=shoot(p,eyes);if(!eye)return null;const head=shoot(p,face);return !head||eye.point.clone().sub(head.point).dot(z)>=-radius*.0005?eye:null;};
 if(!visible(center))return null;
 const points=[];
 for(let k=0;k<count;k++){
  const direction=x.clone().multiplyScalar(Math.cos(k*2*Math.PI/count)).addScaledVector(y,Math.sin(k*2*Math.PI/count));let low=0,high=eyeSpacing*.48;
  if(visible(center.clone().addScaledVector(direction,high)))return null;
  for(let i=0;i<18;i++){const middle=(low+high)/2;if(visible(center.clone().addScaledVector(direction,middle)))low=middle;else high=middle;}
  const eye=shoot(center.clone().addScaledVector(direction,low),eyes);if(!eye||low<eyeSpacing*.015)return null;
  points.push(face.nearest(eye.point).point);
 }
 return points;
}
