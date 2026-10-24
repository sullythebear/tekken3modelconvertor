import * as THREE from 'three';
export const ART_PRESETS = {
 authentic: {name:'Tekken 3 Authentic',stylization:55,face:90,angular:35,pixelation:50,hair:90},
 classic: {name:'Classic PS1',stylization:85,face:75,angular:65,pixelation:90,hair:75},
 expanded: {name:'Tekken 3 Expanded',stylization:30,face:100,angular:20,pixelation:20,hair:100},
};
export function artSettings(input={}) {
 const preset=input.preset??'authentic';
 if(!ART_PRESETS[preset])throw Error('Unknown art preset');
 const out={...ART_PRESETS[preset],...input,preset};
 for(const key of ['stylization','face','angular','pixelation','hair']){
  if(!Number.isFinite(out[key])||out[key]<0||out[key]>100)throw Error('Art parameter outside 0..100: '+key);
 }
 out.regions??={};out.corrections??={};
 if(![undefined,0,15,31].includes(out.colorLevels))throw Error('Invalid color quantization');
 if(![undefined,'nearest','linear'].includes(out.filter))throw Error('Invalid texture filter');
 for(const c of Object.values(out.corrections)){
  if(!c||typeof c!=='object'||(c.remove!=null&&typeof c.remove!=='boolean'))throw Error('Invalid local correction');
  if(c.scale!=null&&(!Number.isFinite(c.scale)||c.scale<.8||c.scale>1.2))throw Error('Local proportion scale must be 0.8..1.2');
 }
 return out;
}
export function artRegion(role,material='') {
 if(role?.startsWith('manual:'))return role.slice(7);
 if(['clothing','accessories'].includes(role))return role;
 if(/hair|faceacc|strand/i.test(material))return 'hair';
 if(/head|face|eye|lash|teeth/i.test(material)||role==='head')return 'head';
 if(/arm|hand|shoulder/i.test(role))return 'arms';
 if(/leg|foot/i.test(role))return 'legs';
 return 'torso';
}
export function artPriority(role,material,a) {
 const r=artRegion(role,material),manual=a.regions[r]??1;
 if(!Number.isFinite(manual)||manual<.25||manual>4)throw Error('Region priority must be 0.25..4');
 return manual*(r==='head'?1+a.face/25:r==='hair'?1+a.hair/30:1);
}
export function calibrateRegionBudgets(parts,reference) {
 if(!reference?.roleFractions)return;
 const totals=new Map();for(const p of parts)totals.set(p.role,(totals.get(p.role)??0)+p.triangles);
 for(const p of parts){const fraction=reference.roleFractions[p.role];if(Number.isFinite(fraction)&&fraction>0)p.importance*=fraction*Math.sqrt(p.triangles)/totals.get(p.role);}
}
export function geometricBoundaryMask(g) {
 const p=g.attributes.position,keys=Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',')),edges=new Map(),index=g.index.array;
 for(let t=0;t<index.length;t+=3)for(let k=0;k<3;k++){
  const a=keys[index[t+k]],b=keys[index[t+(k+1)%3]];if(a===b)continue;
  const key=[a,b].sort().join('|');edges.set(key,(edges.get(key)??0)+1);
 }
 const boundary=new Set();for(const [edge,count]of edges)if(count===1)edge.split('|').forEach(k=>boundary.add(k));
 return new Uint8Array(keys.map(k=>boundary.has(k)?1:0));
}
// Adaptive surface-sample clustering rebuilds connectivity, rather than deleting
// faces with a count-only decimator. Representatives retain source UVs and ALL
// skin attributes. Feature anchors and extremal silhouette samples never merge.
export function reconstructClusters(g,target,{featureMask=null,art,role,material}={}) {
 const p=g.attributes.position,uv=g.attributes.uv,n=p.count;
 const box=new THREE.Box3().setFromBufferAttribute(p),extent=box.getSize(new THREE.Vector3()),diag=extent.length();
 const region=artRegion(role,material),locked=new Uint8Array(n);
 if(featureMask)locked.set(featureMask);
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  let best=0;for(let i=1;i<n;i++)if(sign*p.getComponent(i,axis)>sign*p.getComponent(best,axis))best=i;
  // Include copies of the same extremum; this avoids separating seam copies.
  for(let i=0;i<n;i++)if(new THREE.Vector3().fromBufferAttribute(p,i).distanceToSquared(new THREE.Vector3().fromBufferAttribute(p,best))<1e-12)locked[i]=1;
 }
 const original=g.index.array;
 const active=new Set(original);
 const seeds=locked.slice();
 for(let t=0;t<original.length;t+=3)if([0,1,2].some(k=>seeds[original[t+k]]))for(let k=0;k<3;k++)locked[original[t+k]]=1;
 function attempt(step) {
  const groups=new Map(),mapping=new Uint32Array(n);
  for(let i=0;i<n;i++){
   if(!active.has(i))continue;
   const key=locked[i]?'lock:'+i:[0,1,2].map(k=>Math.floor((p.getComponent(i,k)-box.min.getComponent(k))/step)).join(',')+
    // Preserve broad UV chart boundaries, including translated eye/teeth tiles.
    ':'+(uv?[Math.floor(uv.getX(i)*64),Math.floor(uv.getY(i)*64)].join(','):'none');
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);
  }
  let maxDistance=0;
  for(const ids of groups.values()){
   const center=new THREE.Vector3();for(const i of ids)center.add(new THREE.Vector3().fromBufferAttribute(p,i));center.divideScalar(ids.length);
   let representative=ids[0],best=Infinity;
   for(const i of ids){const d=new THREE.Vector3().fromBufferAttribute(p,i).distanceToSquared(center);if(d<best){representative=i;best=d;}}
   const rp=new THREE.Vector3().fromBufferAttribute(p,representative);
   for(const i of ids){mapping[i]=representative;maxDistance=Math.max(maxDistance,rp.distanceTo(new THREE.Vector3().fromBufferAttribute(p,i)));}
  }
  const out=[],seen=new Set();
  for(let t=0;t<original.length;t+=3){
   const ids=[mapping[original[t]],mapping[original[t+1]],mapping[original[t+2]]];
   if(new Set(ids).size!==3)continue;
   const key=ids.slice().sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);out.push(...ids);
  }
  return {indices:new Uint32Array(out),maxDistance,clusters:groups.size};
 }
 let low=Math.max(diag/10000,1e-8),high=Math.max(diag*.25,low),best=null;
 // Do not sacrifice entire sheets/parts just to achieve a number.
 const maxDeviation=diag*(region==='head'?.018+(100-art.face)*.0004:region==='hair'?.025+(100-art.hair)*.0007:.04+art.stylization*.0006);
 for(let iteration=0;iteration<13;iteration++){
  const step=(low+high)/2,result=attempt(step);
  if(result.indices.length&&result.maxDistance<=maxDeviation&&(!best||Math.abs(result.indices.length/3-target)<Math.abs(best.indices.length/3-target)))best={...result,step};
  if(result.indices.length/3>target&&result.maxDistance<=maxDeviation)low=step;else high=step;
 }
 return best?{...best,method:'feature-constrained surface clustering',region,maxDeviation,lockedVertices:locked.reduce((s,v)=>s+v,0)}:
  {indices:new Uint32Array(original),method:'source retained: reconstruction exceeded deviation guard',region,maxDeviation,lockedVertices:locked.reduce((s,v)=>s+v,0),maxDistance:0};
}
export function shapeRegion(g,art,role,material,pivot=null) {
 const region=artRegion(role,material),c=art.corrections[region]??{},p=g.attributes.position;
 const box=new THREE.Box3().setFromBufferAttribute(p),center=pivot??box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const dimensions=size.toArray().filter(v=>v>1e-6),scale=c.scale??1,step=(dimensions.length?Math.min(...dimensions):0)*(['head','hair'].includes(region)?0:art.angular/100*.025);
 for(let i=0;i<p.count;i++)for(let k=0;k<3;k++){
  let value=center.getComponent(k)+(p.getComponent(i,k)-center.getComponent(k))*scale;
  if(step>0)value+= (Math.round(value/step)*step-value)*art.stylization/100;
  p.setComponent(i,k,value);
 }
 p.needsUpdate=true;g.computeVertexNormals();
 return {region,scale,snapStep:step};
}
export function measureArtQuality(source,converted) {
 const regions=converted.report,missing=regions.filter(p=>p.before>0&&!p.after);
 return {facialLandmarks:landmarkDrift(source.root,converted.root),sourceHealth:meshHealth(source.root),outputHealth:meshHealth(converted.root),budgetMet:converted.stats.triangles<=converted.settings.triangles,missingRegions:missing.map(p=>p.region),
  triangles:converted.stats.triangles,sourceTriangles:source.stats.triangles,
  reconstruction:regions.map(p=>({region:p.region,material:p.material,...p.reconstruction})),
  finiteAnimationPoses:converted.poses.every(p=>p.finite),extremeDeformationEdges:converted.poses.map(p=>({pose:p.pose,edges:p.extremeEdges})),
  artisticAcceptance:'REQUIRES HUMAN REVIEW',gameCompatibility:'NOT VERIFIED',
  referenceCalibration:converted.settings.art?.reference?'Local reference row-density measurements applied; source authenticity not independently verified.':'Provisional artistic settings. No authentic character geometry measurements supplied.'};
}
export function landmarkDrift(original,result){
 const collect=root=>{const points=[],parentInverse=root.parent?root.parent.matrixWorld.clone().invert():new THREE.Matrix4();root.updateMatrixWorld(true);root.traverse(m=>{if(!m.isMesh)return;const names=(Array.isArray(m.material)?m.material:[m.material]).map(m=>m.name).join(' ');if(!/head|face/i.test(names)||/faceacc|hair/i.test(names))return;for(let i=0;i<m.geometry.attributes.position.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld).applyMatrix4(parentInverse));});return points;};
 const before=collect(original),after=collect(result),anchors=[];if(!before.length||!after.length)return {status:'NOT MEASURED: no semantic face surface'};
 original.traverse(b=>{if(b.isBone&&/^FACIAL_[CLR]_(NoseTip|LipCorner|LipUpper|LipLower|EyelidUpperA|EyelidLowerA)$/i.test(b.name))anchors.push(b);});
 const nearest=(points,target)=>points.reduce((best,p)=>!best||p.distanceToSquared(target)<best.distanceToSquared(target)?p:best,null);
 const parentInverse=original.parent?original.parent.matrixWorld.clone().invert():new THREE.Matrix4();
 const values=anchors.map(b=>{const target=nearest(before,b.getWorldPosition(new THREE.Vector3()).applyMatrix4(parentInverse));return {name:b.name,distance:nearest(after,target).distanceTo(target)};});
 return {status:values.length?'MEASURED':'NOT MEASURED: facial source bones unavailable',values,maxDistance:values.length?Math.max(...values.map(v=>v.distance)):null,note:'Nearest surviving source landmark samples; not facial recognition'};
}
export function meshHealth(root){
 let triangles=0,degenerate=0,missingUV=0,invalidUV=0,reversedNormals=0,uvLogSum=0,uvLogSquares=0,uvSamples=0;
 root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal,index=g.index,total=index?.count??p.count;
 for(let t=0;t<total;t+=3){triangles++;const ids=[0,1,2].map(k=>index?index.getX(t+k):t+k),points=ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i)),cross=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])),area=cross.length()*.5;
 if(area<1e-10){degenerate++;continue;}if(n){const avg=new THREE.Vector3();ids.forEach(i=>avg.add(new THREE.Vector3().fromBufferAttribute(n,i)));if(cross.dot(avg)<-1e-8)reversedNormals++;}
 if(!uv){missingUV++;continue;}const u=ids.map(i=>new THREE.Vector2().fromBufferAttribute(uv,i));if(u.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.y))){invalidUV++;continue;}
 const uvArea=Math.abs((u[1].x-u[0].x)*(u[2].y-u[0].y)-(u[1].y-u[0].y)*(u[2].x-u[0].x))*.5;
 if(uvArea>1e-12){const value=Math.log(uvArea/area);uvLogSum+=value;uvLogSquares+=value*value;uvSamples++;}
 }});
 return {triangles,degenerate,missingUV,invalidUV,reversedNormals,uvDensityLogStdDev:uvSamples?Math.sqrt(Math.max(0,uvLogSquares/uvSamples-(uvLogSum/uvSamples)**2)):null,uvMetricNote:'Area-density variation; not a perceptual score or direct correspondence error'};
}
