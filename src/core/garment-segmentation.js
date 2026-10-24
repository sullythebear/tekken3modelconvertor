import * as THREE from 'three';
import {surfaceConnectivity} from './surface-connectivity.js';
// Short garment islands may be weighted to the thigh. Keep those islands in
// the hip surface instead of sweeping them into a cylindrical leg envelope.
export function shortGarmentTriangles(mesh,g,group,roles){
 const uv=g.attributes.uv,p=g.attributes.position,index=g.index;if(!uv||!mesh.skeleton)return new Set();
 const inverse=mesh.matrixWorld.clone().invert(),bone=role=>mesh.skeleton.bones.find(b=>roles(b.name)===role),hips=['leftUpperLeg','rightUpperLeg'].map(bone).filter(Boolean),knees=['leftLowerLeg','rightLowerLeg'].map(bone).filter(Boolean);
 if(!hips.length||!knees.length)return new Set();
 const height=bs=>bs.reduce((n,b)=>n+b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse).y,0)/bs.length,hipY=height(hips),length=hipY-height(knees);if(length<=0)return new Set();
 const records=[];for(let t=group.start;t<group.start+group.count;t+=3){const ids=[0,1,2].map(k=>index.getX(t+k));records.push({t,ids,points:ids.map(i=>new THREE.Vector3(uv.getX(i),uv.getY(i),0))});}
 const selected=new Set();for(const chart of surfaceConnectivity(records).components){let minY=Infinity,maxY=-Infinity;for(const r of chart.records)for(const id of r.ids){minY=Math.min(minY,p.getY(id));maxY=Math.max(maxY,p.getY(id));}if(minY>hipY-length*.7&&maxY<hipY+length*.5)for(const r of chart.records)selected.add(r.t);}
 return selected;
}
