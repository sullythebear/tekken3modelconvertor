import * as THREE from 'three';
import {subsetSurface} from './projected-topology.js';
import {meshHealth,landmarkDrift,geometricBoundaryMask} from './art-director.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import {allocateBudget} from './converter.js';
import {configureSkinning} from './skinning.js';
import {facialLandmarkLocks} from './landmarks.js';
import {inspectScene} from './importer.js';
import {analyzeSkeleton,deformationProbe} from './skeleton.js';

// A separate lossy candidate stage. A requested triangle count is not evidence
// of donor capacity, native topology, bind calibration or runtime compatibility.
export async function optimizeGameCandidate(artistic,{triangles=900}={}){
 await MeshoptSimplifier.ready;
 const root=clone(artistic.root),parts=[],materials=new Map(),textures=new Map();root.updateMatrixWorld(true);
 root.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry=mesh.geometry.clone();const copy=material=>{if(materials.has(material))return materials.get(material);const m=material.clone();for(const [k,v]of Object.entries(m))if(v?.isTexture){if(!textures.has(v))textures.set(v,v.clone());m[k]=textures.get(v);}materials.set(material,m);return m;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);const g=mesh.geometry;if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const [i,group]of (g.groups.length?g.groups:[{start:0,count:g.index.count,materialIndex:0}]).entries()){const name=mats[group.materialIndex]?.name??'',region=mesh.userData.studioRegions?.[i]?.role??'unknown',count=group.count/3,priority=/head|face/i.test(name)&&!/hair|faceacc/i.test(name)?6:/hair|faceacc/i.test(name)?4:/envelope/i.test(name)?3:1;parts.push({mesh,g,group,name,region,triangles:count,importance:priority/Math.sqrt(Math.max(1,count))});}});
 for(const p of parts){
  const name=p.name,face=(/head|face/i.test(name)||p.region==='head')&&!/hair|faceacc|eye|iris|sclera|lash|teeth/i.test(name),hair=/hair|faceacc/i.test(name),eyes=/eye|iris|sclera|lash/i.test(name)&&!/teeth/i.test(name),boot=/envelope/i.test(name),torso=/spine|hips/.test(p.region);
  p.kind=face?'face':hair?'hair':eyes?'eyes':boot?'boots':torso?'clothing':'body';
  p.minimum=Math.min(p.triangles,face?240:hair?/fringe|cards/i.test(name)?150:140:eyes?/iris/i.test(name)?24:/sclera/i.test(name)?36:24:boot?64:torso?50:p.region==='unknown'?0:8);
  p.importance=(face?10:hair?7:eyes?10:boot?4:torso?3:2)/Math.sqrt(Math.max(1,p.triangles));
 }
 const budgets=allocateBudget(parts,triangles),byMesh=new Map(),report=[];
 for(let i=0;i<parts.length;i++)budgets[i]=Math.max(budgets[i],parts[i].minimum);

 for(let i=0;i<parts.length;i++){
  const p=parts[i],position=p.g.attributes.position,uv=p.g.attributes.uv,attrs=new Float32Array(position.count*2);for(let v=0;v<position.count;v++)attrs.set([uv?.getX(v)??0,uv?.getY(v)??0],v*2);
  const input=new Uint32Array(p.g.index.array.slice(p.group.start,p.group.start+p.group.count)),locks=facialLandmarkLocks(p.mesh,p.g,p.name),mask=locks?.mask??new Uint8Array(position.count);
  if(p.kind==='face'){const boundary=geometricBoundaryMask(p.g);for(let v=0;v<mask.length;v++)mask[v]|=boundary[v];}
  // Keep measured outline extrema at several heights; do not lock every card
  // vertex, which would prevent useful simplification of its interior.
  if(['face','hair','boots'].includes(p.kind)){
   const used=[...new Set(input)],box=new THREE.Box3();used.forEach(v=>box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position,v)));const h=box.max.y-box.min.y;
   for(let row=0;row<4;row++)for(let angle=0;angle<8;angle++){
    const candidates=used.filter(v=>Math.min(3,Math.floor((position.getY(v)-box.min.y)/(h||1)*4))===row);let best=-1,score=-Infinity;
    for(const v of candidates){const value=position.getX(v)*Math.cos(angle*Math.PI/4)+position.getZ(v)*Math.sin(angle*Math.PI/4);if(value>score){score=value;best=v;}}if(best>=0)mask[best]=1;
   }
  }
  const anatomical=p.region!=='unknown',errorLimit=!anatomical?1:p.kind==='face'?.01:p.kind==='hair'?.012:p.kind==='eyes'?.01:.012;

  const [indices,error]=input.length>budgets[i]*3?MeshoptSimplifier.simplifyWithAttributes(input,position.array,3,attrs,2,[2,2],mask,budgets[i]*3,errorLimit,p.kind==='eyes'||/fringe|cards/i.test(p.name)?['RegularizeLight']:['Permissive','RegularizeLight']):[input,0];
  if(!byMesh.has(p.mesh))byMesh.set(p.mesh,[]);byMesh.get(p.mesh).push({...p,indices});
  report.push({mesh:p.mesh.name,region:p.region,material:p.name,before:p.triangles,target:budgets[i],after:indices.length/3,error,errorLimit,kind:p.kind,protectedMinimum:p.minimum,lockedVertices:mask.reduce((n,v)=>n+v,0),qualityLimited:indices.length>budgets[i]*3,retainedFraction:indices.length/input.length,warning:indices.length>budgets[i]*3?'Requested count exceeded to retain protected features / bounded geometric error':indices.length<input.length?'Lossy geometry reduction; inspect this region in the report':null});
 }
 for(const [mesh,groups]of byMesh){const index=[],ranges=[];for(const p of groups){const start=index.length;index.push(...p.indices);ranges.push({start,count:p.indices.length,materialIndex:p.group.materialIndex,role:p.region});}const old=mesh.geometry,compact=subsetSurface(old,index);for(const range of ranges)compact.addGroup(range.start,range.count,range.materialIndex);old.dispose();mesh.geometry=compact;mesh.geometry.computeVertexNormals();mesh.userData.studioRegions=ranges.map(({start,count,role})=>({start,count,role}));}
 configureSkinning(root);const stats=inspectScene(root),skeleton=analyzeSkeleton(root),poses=deformationProbe(root,skeleton,()=>{},{extended:true});
 return {...artistic,root,stats,skeleton,poses,report,settings:{...artistic.settings,triangles,phase:'optimized candidate'},gameVerified:false,quality:{...artistic.quality,facialLandmarks:{...landmarkDrift(artistic.root,root),reference:'artistic intermediate'},outputHealth:meshHealth(root),finiteAnimationPoses:poses.some(p=>p.samples>0)&&poses.every(p=>p.finite),extremeDeformationEdges:poses.map(p=>({pose:p.pose,edges:p.extremeEdges})),triangles:stats.triangles,budgetMet:stats.triangles<=triangles,artisticAcceptance:'REQUIRES HUMAN REVIEW AFTER LOSSY OPTIMIZATION',gameCompatibility:'NOT VERIFIED'},optimization:{artisticTriangles:artistic.stats.triangles,candidateTriangles:stats.triangles,requestedTriangles:triangles,budgetMet:stats.triangles<=triangles,capacityEvidence:'No original donor supplied; requested count is experimental. Protected features and geometric error bounds can exceed it',losses:report},warnings:[...artistic.warnings.map(w=>'Artistic stage: '+w),'Lossy candidate optimization performed. Native capacity and in-game appearance remain unverified.']};
}
