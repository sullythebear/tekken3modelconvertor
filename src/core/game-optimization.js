import {optimizationSheetIds} from './surface-components.js';
import {cutoutOpacityBound,stripEmptyRenderMeshes} from './cutout-visibility.js';
import {simplifyCoincidentCollars} from './collar-reduction.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rebakeTorso} from './torso-bake.js';
import {repairWinding} from './winding.js';
import {copySkinField} from './skin-surface.js';
import {reduceBodySurface} from './body-surface.js';
import {sceneIntegrity,integritySummary,compareBoundaries} from './mesh-integrity.js';
import {simplifyCardComponents} from './card-optimization.js';
import * as THREE from 'three';
import {subsetSurface} from './projected-topology.js';
import {meshHealth,landmarkDrift,geometricBoundaryMask} from './art-director.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptSimplifier} from 'meshoptimizer';
import {allocateBudget} from './converter.js';
import {configureSkinning} from './skinning.js';
import {facialLandmarkLocks} from './landmarks.js';
import {inspectScene} from './importer.js';
import {analyzeSkeleton,deformationProbe,boneSemantic} from './skeleton.js';

// A separate lossy candidate stage. A requested triangle count is not evidence
// of donor capacity, native topology, bind calibration or runtime compatibility.
export async function optimizeGameCandidate(artistic,{triangles=900,binaryCutout=true}={}){
 if(typeof binaryCutout!=='boolean')throw Error('Unknown binary-cutout preparation mode');
 await MeshoptSimplifier.ready;
 let root=clone(artistic.root);const parts=[],materials=new Map(),textures=new Map();root.updateMatrixWorld(true);
 root.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry=mesh.geometry.clone();const copy=material=>{if(materials.has(material))return materials.get(material);const m=material.clone();copySkinField(material,m);for(const [k,v]of Object.entries(m))if(v?.isTexture){if(!textures.has(v))textures.set(v,v.clone());m[k]=textures.get(v);}materials.set(material,m);return m;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);});
 const collarReduction=simplifyCoincidentCollars(root);
 root.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry;if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const [i,group]of (g.groups.length?g.groups:[{start:0,count:g.index.count,materialIndex:0}]).entries()){const name=(mats[group.materialIndex]??(!Array.isArray(mesh.material)?mats[0]:null))?.name??'',region=mesh.userData.studioRegions?.[i]?.role??'unknown',count=group.count/3,priority=/head|face/i.test(name)&&!/hair|faceacc/i.test(name)?6:/hair|faceacc/i.test(name)?4:/envelope/i.test(name)?3:1;parts.push({mesh,g,group:Array.isArray(mesh.material)?group:{...group,materialIndex:0},name,region,protectedPoints:mesh.userData.studioRegions?.[i]?.protectedPoints,faceContours:mesh.userData.studioRegions?.[i]?.faceContours,triangles:count,importance:priority/Math.sqrt(Math.max(1,count))});}});
 for(const p of parts){
  const name=p.name,face=(/head|face/i.test(name)||p.region==='head')&&!/hair|faceacc|eye|iris|sclera|lash|teeth/i.test(name),hair=/hair|faceacc/i.test(name)&&!/^(left|right)Foot$/.test(p.region),eyes=/eye|iris|sclera|lash/i.test(name)&&!/teeth/i.test(name),boot=/envelope/i.test(name),torso=/spine|hips/.test(p.region);
  const hand=/^(left|right)Hand$/.test(p.region);p.continuous=/^(hips|spine|(?:left|right)(Shoulder|UpperArm|LowerArm|Hand|UpperLeg|LowerLeg|Foot))$/.test(p.region)&&!boot;
  const support=hair&&/_volume$/i.test(name)&&(Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material]).some(m=>/_cards$/i.test(m.name)),teeth=/teeth/i.test(name);
  p.kind=support?'hair-support':teeth?'teeth':face?'face':hair?'hair':eyes?'eyes':boot?'boots':torso?'clothing':'body';
  p.minimum=Math.min(p.triangles,support?48:teeth?8:face?240:hair?/fringe|cards/i.test(name)?150:140:eyes?/iris/i.test(name)?24:/sclera/i.test(name)?36:24:boot?64:torso?50:hand?160:p.region==='unknown'?0:8);
  if(p.continuous)p.minimum=Math.min(p.triangles,hand?80:24);
  const material=(Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material])[p.group.materialIndex];p.cutoutVisibility=cutoutOpacityBound(material,{binaryCutout});
  p.importance=(support?2:teeth?.3:face?10:hair?7:eyes?10:boot?4:torso?3:hand?8:2)/Math.sqrt(Math.max(1,p.triangles));if(p.cutoutVisibility.invisible){p.minimum=0;p.importance=0;}
 }
 const budgets=allocateBudget(parts.map(p=>p.cutoutVisibility.invisible?{...p,triangles:0}:p),triangles,parts.map(p=>p.minimum)),byMesh=new Map(),report=[];

 // Anatomical labels are not physical cuts. Reduce a continuous material
 // surface jointly, then reassign surviving triangles by source vertex votes.
 const jointResults=new Map(),activeCreases=new Map(),buckets=[];
 for(let i=0;i<parts.length;i++){const p=parts[i];if(!p.continuous||p.cutoutVisibility.invisible)continue;const hand=/Hand$/.test(p.region);let bucket=buckets.find(b=>b.mesh===p.mesh&&b.hand===hand&&(!hand||b.material===p.group.materialIndex));if(!bucket){bucket={mesh:p.mesh,hand,material:p.group.materialIndex,members:[]};buckets.push(bucket);}bucket.members.push(i);}
 for(const bucket of buckets){const all=[],owners=new Map(),matByVertex=new Map(),ignoreUV=new Set(),mats=Array.isArray(bucket.mesh.material)?bucket.mesh.material:[bucket.mesh.material];for(const i of bucket.members){const p=parts[i],reproject=mats[p.group.materialIndex].userData?.t3csProjection==='physical-front-back';for(const v of p.g.index.array.slice(p.group.start,p.group.start+p.group.count)){all.push(v);owners.set(v,i);matByVertex.set(v,p.group.materialIndex);if(reproject)ignoreUV.add(v);}}
  const ids=[...new Set(all)],view=subsetSurface(parts[bucket.members[0]].g,all),locks=new Uint8Array(ids.length);
  for(const i of bucket.members){const points=parts[i].protectedPoints??[],limit=mats[parts[i].group.materialIndex].userData?.t3csProjection==='physical-front-back'?Math.max(8,Math.floor(budgets[i]/3)):points.length,selected=[];if(points.length)selected.push(points[0]);while(selected.length<Math.min(points.length,limit)){let next=null,distance=-1;for(const p of points){const d=Math.min(...selected.map(q=>(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2));if(d>distance){distance=d;next=p;}}if(distance<=0)break;selected.push(next);}activeCreases.set(i,selected);}
  for(const i of bucket.members)for(const point of activeCreases.get(i)??[]){let best=-1,distance=Infinity;for(let v=0;v<ids.length;v++){const p=view.attributes.position,d=(p.getX(v)-point[0])**2+(p.getY(v)-point[1])**2+(p.getZ(v)-point[2])**2;if(d<distance){distance=d;best=v;}}if(best>=0){locks[best]=1;if(bucket.hand){const p=view.attributes.position,epsilon=MeshoptSimplifier.getScale(p.array,3)*1e-6,limit=Math.max(distance*1.01,epsilon*epsilon);for(let v=0;v<ids.length;v++)if((p.getX(v)-point[0])**2+(p.getY(v)-point[1])**2+(p.getZ(v)-point[2])**2<=limit)locks[v]=1;}}}
  let boneMap=null;if(!bucket.hand&&bucket.mesh.skeleton){const categories=new Map();boneMap=bucket.mesh.skeleton.bones.map(b=>{let p=b;while(p&&!boneSemantic(p))p=p.parent;const key=p?boneSemantic(p):'unmapped';if(!categories.has(key))categories.set(key,categories.size);return categories.get(key);});if(categories.size<2)boneMap=null;}
  const charts=optimizationSheetIds(view,ids.map(v=>matByVertex.get(v)),ids.map(v=>ignoreUV.has(v)));if(charts)for(let v=0;v<locks.length;v++)locks[v]|=charts.ambiguous[v];
  const target=bucket.members.reduce((n,i)=>n+budgets[i],0),reduced=reduceBodySurface(view,bucket.hand?parts[bucket.members[0]].region:'joined-body',MeshoptSimplifier,{target,featureMask:locks,candidate:true,boneMap,materialIds:charts?Array.from(charts.labels):ids.map(v=>matByVertex.get(v)),uvMask:ids.map(v=>ignoreUV.has(v)),maximumError:bucket.hand?null:.018}),assigned=new Map(bucket.members.map(i=>[i,[]]));
  if(bucket.hand)for(const[name,a]of Object.entries(view.attributes))for(let v=0;v<ids.length;v++)for(let k=0;k<a.itemSize;k++)parts[bucket.members[0]].g.attributes[name].setComponent(ids[v],k,a.getComponent(v,k));
  let mixed=0;for(let t=0;t<reduced.indices.length;t+=3){const tri=Array.from(reduced.indices.slice(t,t+3),v=>ids[v]);if(new Set(tri.map(v=>matByVertex.get(v))).size!==1)mixed++;}
  const selected=mixed?view.index.array:reduced.indices;
  for(let t=0;t<selected.length;t+=3){const tri=Array.from(selected.slice(t,t+3),v=>ids[v]),votes=tri.map(v=>owners.get(v)),owner=votes.find(v=>votes.filter(x=>x===v).length>=2)??votes[0];assigned.get(owner).push(...tri);}
  for(const i of bucket.members){const p=parts[i],material=mats[p.group.materialIndex];if(material.userData?.t3csProjection!=='physical-front-back')continue;const source=subsetSurface(p.g,p.g.index.array.slice(p.group.start,p.group.start+p.group.count)),low=subsetSurface(p.g,assigned.get(i)),bake=rebakeTorso(source,low,material,{side:(material.map?.image?.width??256)/2,height:material.map?.image?.height??128});source.dispose();low.dispose();if(bake){p.geometry=bake.geometry;mats[p.group.materialIndex]=bake.material;bucket.mesh.material=mats;}}
  const {indices:discard,...metadata}=reduced;metadata.mixedMaterialTriangles=mixed;metadata.uvChartCount=charts?.count??0;metadata.uvChartConstraint=charts?'Categorical UV-sheet identity in the existing material-cost channel; source UVs and skin channels remain separate':null;if(mixed)metadata.fallbackReason='Mixed material ownership rejected; reliable input retained';
  for(const i of bucket.members)jointResults.set(i,{indices:new Uint32Array(assigned.get(i)),metadata:{...metadata,uvTransfer:ignoreUV.size?'Physical torso charts rebaked; original limb UVs retained':'Source UV correspondence retained',jointRegions:bucket.members.map(i=>parts[i].region),sharedGroupBefore:all.length/3,sharedGroupAfter:selected.length/3}});view.dispose();
 }

 for(let i=0;i<parts.length;i++){
  const p=parts[i],position=p.g.attributes.position,uv=p.g.attributes.uv,attrs=new Float32Array(position.count*2);for(let v=0;v<position.count;v++)attrs.set([uv?.getX(v)??0,uv?.getY(v)??0],v*2);
  const input=new Uint32Array(p.g.index.array.slice(p.group.start,p.group.start+p.group.count)),locks=facialLandmarkLocks(p.mesh,p.g,p.name,input),mask=locks?.mask??new Uint8Array(position.count);
  if(['face','eyes','teeth','boots'].includes(p.kind)){
   const view=new THREE.BufferGeometry();view.setAttribute('position',position);view.setIndex(new THREE.BufferAttribute(input,1));const boundary=geometricBoundaryMask(view);for(let v=0;v<mask.length;v++)mask[v]|=boundary[v];
   const used=[...new Set(input)];for(const contour of p.faceContours??[])for(const point of contour.points){let nearest=-1,distance=Infinity;for(const v of used){const d=(position.getX(v)-point[0])**2+(position.getY(v)-point[1])**2+(position.getZ(v)-point[2])**2;if(d<distance){nearest=v;distance=d;}}if(nearest>=0)mask[nearest]=1;}
  }
  for(const point of activeCreases.get(i)??p.protectedPoints??[]){let nearest=-1,distance=Infinity;for(const v of new Set(input)){const d=(position.getX(v)-point[0])**2+(position.getY(v)-point[1])**2+(position.getZ(v)-point[2])**2;if(d<distance){distance=d;nearest=v;}}if(nearest>=0)mask[nearest]=1;}
  // Keep measured outline extrema at several heights; do not lock every card
  // vertex, which would prevent useful simplification of its interior.
  if(['face','hair','boots'].includes(p.kind)){
   const used=[...new Set(input)],box=new THREE.Box3();used.forEach(v=>box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position,v)));const h=box.max.y-box.min.y;
   for(let row=0;row<4;row++)for(let angle=0;angle<8;angle++){
    const candidates=used.filter(v=>Math.min(3,Math.floor((position.getY(v)-box.min.y)/(h||1)*4))===row);let best=-1,score=-Infinity;
    for(const v of candidates){const value=position.getX(v)*Math.cos(angle*Math.PI/4)+position.getZ(v)*Math.sin(angle*Math.PI/4);if(value>score){score=value;best=v;}}if(best>=0)mask[best]=1;
   }
  }
  const anatomical=p.region!=='unknown',errorLimit=!anatomical?1:p.kind==='hair-support'?.08:p.kind==='teeth'?.15:p.kind==='face'?.01:p.kind==='hair'?.018:p.kind==='eyes'?.01:.012;

  const jointReduction=p.continuous&&!p.cutoutVisibility.invisible?jointResults.get(i):null,componentCards=!p.cutoutVisibility.invisible&&p.kind==='hair'&&/cards|fringe/i.test(p.name)&&input.length>budgets[i]*3;
  // These routes already have their own measured reduction. Running a second
  // generic simplifier here only discards its output and consumes CPU/buffers.
  let [indices,error]=jointReduction||componentCards?[input,0]:p.cutoutVisibility.invisible?[new Uint32Array(),0]:input.length>budgets[i]*3?MeshoptSimplifier.simplifyWithAttributes(input,position.array,3,attrs,2,p.kind==='eyes'&&/sclera|eyeshell/i.test(p.name)?[.25,.25]:[2,2],mask,budgets[i]*3,errorLimit,p.kind==='eyes'||/fringe|cards/i.test(p.name)?['RegularizeLight']:['Permissive','RegularizeLight']):[input,0];
  let bodyOptimization=null;
  if(jointReduction){const reduced=jointReduction;indices=reduced.indices;error=reduced.metadata.error;bodyOptimization=reduced.metadata;}
  let componentOptimization=null;
  if(componentCards){const reduced=simplifyCardComponents(p.g,input,MeshoptSimplifier,{target:budgets[i],errorLimit,mask});indices=reduced.indices;error=reduced.error;componentOptimization=reduced.report;}
  let boundaryValidation=null;
  if(['face','eyes','teeth','boots'].includes(p.kind)){
   const before=new THREE.BufferGeometry(),after=new THREE.BufferGeometry();before.setAttribute('position',position);before.setIndex(new THREE.BufferAttribute(input,1));after.setAttribute('position',position);after.setIndex(new THREE.BufferAttribute(indices,1));const attempted=compareBoundaries(before,after),fallback=attempted.unexpectedOpenEdges>0||attempted.inconsistentWinding>attempted.sourceInconsistentWinding;
   if(fallback){indices=input;error=0;}
   boundaryValidation={attempted,fallback,reason:fallback?'Protected surface boundary/winding changed; artistic source surface retained':null};
  }
  if(!byMesh.has(p.mesh))byMesh.set(p.mesh,[]);byMesh.get(p.mesh).push({...p,indices});
  report.push({mesh:p.mesh.name,region:p.region,material:p.name,before:p.triangles,target:budgets[i],after:indices.length/3,error,errorLimit,kind:p.kind,protectedMinimum:p.minimum,lockedVertices:[...new Set(input)].reduce((n,v)=>n+(mask[v]?1:0),0),protectedCreasePoints:(activeCreases.get(i)??p.protectedPoints)?.length??0,sourceCreasePoints:p.protectedPoints?.length??0,cutoutVisibility:p.cutoutVisibility,contourPoints:p.faceContours?.reduce((n,c)=>n+c.points.length,0)??0,componentOptimization,bodyOptimization,boundaryValidation,qualityLimited:indices.length>budgets[i]*3,retainedFraction:indices.length/input.length,warning:p.cutoutVisibility.invisible?'Invisible under the existing binary-cutout preparation; blended source geometry retained':indices.length>budgets[i]*3?'Requested count exceeded to retain protected features / bounded geometric error':indices.length<input.length?'Lossy geometry reduction; inspect this region in the report':null});
 }
 for(const [mesh,groups]of byMesh){const chunks=[],ranges=[];let offset=0;for(const p of groups){const chunk=p.geometry??subsetSurface(p.g,p.indices);chunks.push(chunk);ranges.push({start:offset,count:chunk.index.count,materialIndex:p.group.materialIndex,role:p.region,faceContours:p.faceContours,protectedPoints:p.protectedPoints});offset+=chunk.index.count;}const old=mesh.geometry,compact=mergeGeometries(chunks,false);if(!compact)throw Error('Incompatible attributes in anatomical candidate');for(const chunk of chunks)chunk.dispose();for(const range of ranges)compact.addGroup(range.start,range.count,range.materialIndex);old.dispose();mesh.geometry=compact;mesh.geometry.computeVertexNormals();mesh.userData.studioRegions=ranges.map(({start,count,role,faceContours,protectedPoints})=>({start,count,role,...(faceContours?{faceContours}:{}),...(protectedPoints?{protectedPoints}:{})}));}

 const emptyRenderNodes=stripEmptyRenderMeshes(root);root=emptyRenderNodes.root;
 const windingRepairs=[];root.traverse(m=>{if(m.isMesh)windingRepairs.push({mesh:m.name,...repairWinding(m.geometry)});});
 configureSkinning(root);const stats=inspectScene(root),skeleton=analyzeSkeleton(root),poses=deformationProbe(root,skeleton,()=>{},{extended:true});
 return {...artistic,root,stats,skeleton,poses,report,settings:{...artistic.settings,triangles,phase:'optimized candidate'},gameVerified:false,quality:{...artistic.quality,windingRepairs,integrity:integritySummary(sceneIntegrity(root,artistic.root)),facialLandmarks:{...landmarkDrift(artistic.root,root),reference:'artistic intermediate'},outputHealth:meshHealth(root),finiteAnimationPoses:poses.some(p=>p.samples>0)&&poses.every(p=>p.finite),extremeDeformationEdges:poses.map(p=>({pose:p.pose,edges:p.extremeEdges})),triangles:stats.triangles,budgetMet:stats.triangles<=triangles,artisticAcceptance:'REQUIRES HUMAN REVIEW AFTER LOSSY OPTIMIZATION',gameCompatibility:'NOT VERIFIED'},optimization:{binaryCutoutPreparation:binaryCutout,collarReduction,removedEmptyRenderNodes:emptyRenderNodes.removed,artisticTriangles:artistic.stats.triangles,candidateTriangles:stats.triangles,requestedTriangles:triangles,budgetMet:stats.triangles<=triangles,capacityEvidence:'No original donor supplied; requested count is experimental. Protected features and geometric error bounds can exceed it',losses:report},warnings:[...artistic.warnings.map(w=>'Artistic stage: '+w),'Lossy candidate optimization performed. Native capacity and in-game appearance remain unverified.']};
}
