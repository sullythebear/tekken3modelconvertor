import {bakeUVAttribute} from './bake-uv.js';
import * as THREE from 'three';
import {SurfaceIndex,triangleRecord} from './surface.js';
import {refinementMeshes,triangleIds,primitiveAt} from './refinement.js';
// Lazy per-original-primitive BVH. No name or character heuristics.
export class RefinementCorrespondence {
 constructor(sourceRoot){this.root=sourceRoot;this.meshes=refinementMeshes(sourceRoot);this.cache=new Map();sourceRoot.updateWorldMatrix(true,true);this.scale=new THREE.Box3().setFromObject(sourceRoot).applyMatrix4(sourceRoot.matrixWorld.clone().invert()).getSize(new THREE.Vector3()).length()||1;}
 points(root,mesh,t){const inverse=root.matrixWorld.clone().invert();return triangleIds(mesh.geometry,t).map(i=>mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));}
 query(resultRoot,mesh,t){
  this.root.updateWorldMatrix(true,true);resultRoot.updateWorldMatrix(true,true);for(const m of this.meshes)m.skeleton?.update();mesh.skeleton?.update();
  const meshIndex=mesh.userData.studioSourceMeshIndex,group=primitiveAt(mesh,t),region=mesh.userData.studioRegions?.find(r=>r.start===group?.start),materialIndex=region?.sourceMaterialIndex;
  if(!Number.isInteger(meshIndex)||!Number.isInteger(materialIndex)||!this.meshes[meshIndex])return {status:'unknown',reason:'Oorspronkelijke mesh/materiaalverwijzing ontbreekt.'};
  const source=this.meshes[meshIndex],g=source.geometry,material=(Array.isArray(source.material)?source.material:[source.material])[materialIndex],uvSet=bakeUVAttribute(material),sourceUV=g.attributes[uvSet],key=meshIndex+':'+materialIndex;let index=this.cache.get(key);
  if(!index){const records=[];for(let i=0;i<(g.index?.count??g.attributes.position.count)/3;i++)if(primitiveAt(source,i)?.materialIndex===materialIndex){const ids=triangleIds(g,i),record=triangleRecord(this.points(this.root,source,i),{uvs:sourceUV?ids.map(id=>new THREE.Vector2().fromBufferAttribute(sourceUV,id)):null});if(record){record.ids=ids;record.sourceTriangle=i;records.push(record);}}if(!records.length)return{status:'unknown',reason:'Bronprimitive bevat geen betrouwbaar oppervlak.'};index=new SurfaceIndex(records);this.cache.set(key,index);}
  const points=this.points(resultRoot,mesh,t),tri=new THREE.Triangle(...points),normal=tri.getNormal(new THREE.Vector3()),center=tri.getMidpoint(new THREE.Vector3()),hit=index.nearest(center,this.scale*.025);
  if(!hit)return {status:'uncertain',reason:'Te grote afstand tot de oorspronkelijke oppervlakte.'};
  const agreement=normal.dot(hit.triangle.normal);if(agreement<.7)return{status:'uncertain',reason:'Tegengestelde of afwijkende oppervlakterichting.',distance:hit.distance};
  const other=index.nearest(center,hit.distance+this.scale*1e-5,{acceptTriangle:r=>r!==hit.triangle&&!r.ids.some(i=>hit.triangle.ids.includes(i))});
  if(other&&Math.abs(other.distance-hit.distance)<this.scale*1e-5)return{status:'uncertain',reason:'Meerdere overlappende bronoppervlakken zijn mogelijk.'};
  const uv=hit.triangle.uvs?hit.triangle.uvs.reduce((p,q,i)=>p.addScaledVector(q,hit.barycentric.getComponent(i)),new THREE.Vector2()).toArray():null;
  return{status:'matched',method:'same-original-mesh-and-material nearest surface; conservative distance/orientation/ambiguity gates',meshIndex,materialIndex,sourceTriangle:hit.triangle.sourceTriangle,sourceVertices:hit.triangle.ids,uvSet,barycentric:hit.barycentric.toArray(),uv,distance:hit.distance,normalAgreement:agreement,skinAvailable:!!g.attributes.skinWeight,scope:'Eerste oppervlaktecorrespondentie, geen bewezen anatomische of reparatiekoppeling.'};
 }
}
