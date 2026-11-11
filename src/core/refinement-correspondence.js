import {bakeUVAttribute} from './bake-uv.js';
import * as THREE from 'three';
import {SurfaceIndex,triangleRecord} from './surface.js';
import {forEachInfluence} from './skinning.js';
import {refinementMeshes,triangleIds,primitiveAt,resolveSelection,refinementHash} from './refinement.js';

export function sourceGeometrySignature(mesh){const g=mesh.geometry;return refinementHash(Object.entries(g.attributes).filter(([k])=>k==='position'||/^uv\d*$|^skin|^joints_|^weights_/.test(k)).map(([k,a])=>k+':'+Array.from(a.array).join(',')).join('|')+'|'+Array.from(g.index?.array??[]).join(',')+'|'+(mesh.skeleton?mesh.skeleton.bones.map((b,i)=>b.name+':'+mesh.skeleton.boneInverses[i].elements.join(',')).join(';'):''));}
export class RefinementCorrespondence {
 constructor(sourceRoot){this.root=sourceRoot;this.meshes=refinementMeshes(sourceRoot);this.cache=new Map();this.signatures=new Map();this.refresh();}
 refresh(){this.root.updateWorldMatrix(true,true);for(const m of this.meshes)m.skeleton?.update();this.inverse=this.root.matrixWorld.clone().invert();const stamp=this.meshes.map(m=>[m.geometry.attributes.position.version,m.geometry.index?.version??0,...this.inverse.clone().multiply(m.matrixWorld).elements.map(Math.fround),...(m.skeleton?.bones.flatMap(b=>this.inverse.clone().multiply(b.matrixWorld).elements.map(Math.fround))??[])].join(',')).join('|');if(stamp!==this.poseStamp){this.cache.clear();this.signatures.clear();this.poseStamp=stamp;}this.scale=new THREE.Box3().setFromObject(this.root).applyMatrix4(this.inverse).getSize(new THREE.Vector3()).length()||1;}
 points(root,mesh,t){const inverse=root.matrixWorld.clone().invert();return triangleIds(mesh.geometry,t).map(i=>mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));}
 surface(mesh,t){
  const meshIndex=mesh.userData.studioSourceMeshIndex,group=primitiveAt(mesh,t),region=mesh.userData.studioRegions?.find(r=>t*3>=r.start&&t*3<r.start+r.count),materialIndex=region?.sourceMaterialIndex;
  if(!Number.isInteger(meshIndex)||!Number.isInteger(materialIndex)||!this.meshes[meshIndex])return null;
  const source=this.meshes[meshIndex],g=source.geometry,material=(Array.isArray(source.material)?source.material:[source.material])[materialIndex];if(!material)return null;
  const uvSet=bakeUVAttribute(material),sourceUV=g.attributes[uvSet],key=meshIndex+':'+materialIndex;let index=this.cache.get(key);
  if(!index){const records=[];for(let i=0;i<(g.index?.count??g.attributes.position.count)/3;i++)if(primitiveAt(source,i)?.materialIndex===materialIndex){const ids=triangleIds(g,i),record=triangleRecord(this.points(this.root,source,i),{uvs:sourceUV?ids.map(id=>new THREE.Vector2().fromBufferAttribute(sourceUV,id)):null,material});if(record){record.ids=ids;record.sourceTriangle=i;records.push(record);}}if(!records.length)return null;index=new SurfaceIndex(records);this.cache.set(key,index);}
  if(!this.signatures.has(meshIndex))this.signatures.set(meshIndex,sourceGeometrySignature(source));
  return {index,source,meshIndex,materialIndex,material,uvSet,signature:this.signatures.get(meshIndex)};
 }
 sample(mesh,t,point,normal,{barycentric=null,purpose='shape'}={}){
  const s=this.surface(mesh,t);if(!s)return{status:'unknown',reason:'Oorspronkelijke mesh/materiaalverwijzing ontbreekt.'};
  const hit=s.index.nearest(point,this.scale*.035);if(!hit)return{status:'uncertain',reason:'Te grote afstand tot de oorspronkelijke oppervlakte.'};
  const agreement=normal.dot(hit.triangle.normal);if(agreement<.7)return{status:'uncertain',reason:'Tegengestelde of afwijkende oppervlakterichting.',distance:hit.distance};
  const band=Math.max(this.scale*1e-5,hit.distance*.15),other=s.index.nearest(point,hit.distance+band,{acceptTriangle:r=>r!==hit.triangle&&!r.ids.some(i=>hit.triangle.ids.includes(i))});
  if(other&&other.distance-hit.distance<band)return{status:'ambiguous',reason:'Meerdere nabije bronoppervlakken zijn mogelijk.'};
  if(!!s.source.isSkinnedMesh!==!!mesh.isSkinnedMesh||mesh.isSkinnedMesh&&s.source.skeleton.bones.length!==mesh.skeleton.bones.length)return{status:'uncertain',reason:'Skeletonrelatie is niet betrouwbaar bevestigd.'};
  if(mesh.isSkinnedMesh&&barycentric){const weights=(m,ids,b)=>{const out=new Map();ids.forEach((id,k)=>forEachInfluence(m,id,(bone,w)=>out.set(bone,(out.get(bone)??0)+w*b.getComponent(k))));return out;},a=weights(mesh,triangleIds(mesh.geometry,t),barycentric),b=weights(s.source,hit.triangle.ids,hit.barycentric);const drift=[...new Set([...a.keys(),...b.keys()])].reduce((n,k)=>n+Math.abs((a.get(k)??0)-(b.get(k)??0)),0);if(drift>.45)return{status:'uncertain',reason:'Bronoppervlak hoort bij andere gewrichtsinvloeden.'};}
  const uv=hit.triangle.uvs?hit.triangle.uvs.reduce((p,q,i)=>p.addScaledVector(q,hit.barycentric.getComponent(i)),new THREE.Vector2()).toArray():null;
  return {status:'matched',meshIndex:s.meshIndex,materialIndex:s.materialIndex,sourceSignature:s.signature,sourceTriangle:hit.triangle.sourceTriangle,sourceVertices:hit.triangle.ids,uvSet:s.uvSet,barycentric:hit.barycentric.toArray(),uv,point:hit.point.toArray(),distance:hit.distance,normalAgreement:agreement,skinAvailable:!!s.source.geometry.attributes.skinWeight,scope:'Geometrische koppeling binnen oorspronkelijke mesh en materiaal; geen gameplaygarantie.'};
 }
 query(resultRoot,mesh,t){this.refresh();resultRoot.updateWorldMatrix(true,true);mesh.skeleton?.update();const p=this.points(resultRoot,mesh,t),tri=new THREE.Triangle(...p);const hit=this.sample(mesh,t,tri.getMidpoint(new THREE.Vector3()),tri.getNormal(new THREE.Vector3()),{barycentric:new THREE.Vector3(1/3,1/3,1/3)});return hit.status==='ambiguous'?{...hit,status:'uncertain'}:hit;}
 async region(resultRoot,selection,{checkpoint=async()=>{},purpose='shape'}={}){
  this.refresh();resultRoot.updateWorldMatrix(true,true);const {mesh,triangles}=resolveSelection(resultRoot,selection);mesh.skeleton?.update();if(triangles.length>12000)throw Error('Selecteer een kleiner reparatiegebied (maximaal 12.000 driehoeken).');
  const samples=[],perVertex=new Map(),counts={matched:0,uncertain:0,ambiguous:0,unknown:0},weights=[[1,0,0],[0,1,0],[0,0,1],[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]];
  for(let j=0;j<triangles.length;j++){const t=triangles[j],ids=triangleIds(mesh.geometry,t),p=this.points(resultRoot,mesh,t),normal=new THREE.Triangle(...p).getNormal(new THREE.Vector3());for(let wi=0;wi<weights.length;wi++){const w=new THREE.Vector3(...weights[wi]),point=p.reduce((v,q,k)=>v.addScaledVector(q,w.getComponent(k)),new THREE.Vector3()),hit=this.sample(mesh,t,point,normal,{barycentric:w,purpose});counts[hit.status]++;samples.push({triangle:t,sample:wi,...hit});if(wi<3){const previous=perVertex.get(ids[wi]);if(!previous||previous.status==='matched'&&hit.status!=='matched')perVertex.set(ids[wi],hit);else if(hit.status==='matched'&&previous.status==='matched'&&new THREE.Vector3(...hit.point).distanceTo(new THREE.Vector3(...previous.point))>this.scale*1e-4){counts.ambiguous++;perVertex.set(ids[wi],{status:'ambiguous',reason:'Aangrenzende driehoeken geven tegenstrijdige bronposities.'});}}}if(j%32===0)await checkpoint();}
  const reliable=counts.matched===samples.length&&counts.ambiguous===0&&[...perVertex.values()].every(h=>h.status==='matched'),status=reliable?'reliable':counts.ambiguous?'ambiguous':counts.matched?'partial':'unavailable';
  return {status,mesh,triangles,perVertex,samples,summary:{status,triangles:triangles.length,samples:samples.length,counts,matchedFraction:samples.length?counts.matched/samples.length:0,maxDistance:Math.max(0,...samples.map(s=>s.distance??0)),meanDistance:samples.reduce((n,s)=>n+(s.distance??0),0)/Math.max(1,counts.matched),scope:'7 samples per selected triangle plus shared-vertex consistency. Not a proof of missing topology or animation quality.'}};
 }
}
