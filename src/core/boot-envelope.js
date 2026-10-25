import {boundaryLoops} from './boundary-loops.js';
import {sourceDiffuse} from './skin-surface.js';
import * as THREE from 'three';
import {SurfaceIndex,triangleRecord,materialSampler} from './surface.js';
import {surfaceConnectivity} from './surface-connectivity.js';
import {sourceRecords,transferSurfaceAttributes,surfaceTexture} from './projected-topology.js';

// Horizontal source cross-sections preserve the toe/heel offsets. Outermost
// ray intersections select the visible clothing shell over underlying skin.
export function reconstructBootEnvelope(g,material,{columns=12,textureSize=128,projectionGeometry=g,normalMatrix=new THREE.Matrix3(),collarEdges=null}={}){
 const box=new THREE.Box3().setFromBufferAttribute(g.attributes.position),size=box.getSize(new THREE.Vector3());
 // A same-side / below-hip test also admits a lowered hand. Keep projection
 // correspondences inside the measured leg's transverse footprint, otherwise
 // an outer ray selects the hand and stretches a boot all the way to it.
 const margin=Math.max(size.x,size.z)*.05;
 const records=sourceRecords(projectionGeometry,material,triangleRecord).filter(t=>{
  const center=t.points.reduce((p,v)=>p.add(v),new THREE.Vector3()).multiplyScalar(1/3);
  return center.x>=box.min.x-margin&&center.x<=box.max.x+margin&&center.z>=box.min.z-margin&&center.z<=box.max.z+margin;
 });
 if(!records.length)return {geometry:null,reason:'No source surface in measured leg footprint'};
 const source=new SurfaceIndex(records);
 if(Math.min(size.x,size.z)<size.y*.01||size.y<=0||size.y<Math.min(size.x,size.z)*.5)return {geometry:null,reason:'Leg envelope requires an upright longitudinal region'};
 const radius=Math.hypot(size.x,size.z),cache=new Map();
 function slice(v){
  const key=v.toFixed(7);if(cache.has(key))return cache.get(key);
  const y=box.min.y+Math.max(.0001,Math.min(.9999,v))*size.y,segments=[],bounds=new THREE.Box3();
  for(const t of source.triangles){const cross=[];for(let k=0;k<3;k++){const a=t.points[k],b=t.points[(k+1)%3];if((a.y-y)*(b.y-y)<0)cross.push(a.clone().lerp(b,(y-a.y)/(b.y-a.y)));}if(cross.length===2){segments.push(new THREE.Line3(...cross));cross.forEach(p=>bounds.expandByPoint(p));}}
  const result={y,segments,center:bounds.isEmpty()?box.getCenter(new THREE.Vector3()).setY(y):bounds.getCenter(new THREE.Vector3())};cache.set(key,result);return result;
 }
 function project(u,v){
  if(Math.abs(u-1)<1e-7)u=0;
  const row=slice(v),direction=new THREE.Vector3(Math.sin(u*Math.PI*2),0,Math.cos(u*Math.PI*2)),origin=row.center.clone().addScaledVector(direction,radius*2),hit=source.raycast(origin,direction.clone().negate(),radius*4);
  if(hit){hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());return hit;}
  let best=null,distance=Infinity;for(const segment of row.segments){const p=segment.closestPointToPoint(origin,true,new THREE.Vector3()),d=p.distanceToSquared(origin);if(d<distance){best=p;distance=d;}}
  return source.nearest(best??row.center);
 }
 // A foot can have an inner skin shell behind the boot. Identify the
 // connected garment shell from repeated exterior shaft/ankle intersections;
 // keep bare upper-leg correspondence above the measured garment boundary.
 const components=surfaceConnectivity(records).components,componentOf=new Map(),votes=new Map();
 for(const c of components)for(const t of c.records)componentOf.set(t,c);
 for(const v of [.06,.12,.2,.3])for(let k=0;k<12;k++){const hit=project(k/12,v),c=componentOf.get(hit.triangle);votes.set(c,(votes.get(c)??0)+1);}
 const chosen=[...votes].sort((a,b)=>b[1]-a[1])[0],bootComponent=components.length>1&&chosen?.[1]>=28&&chosen[0].bounds.min.y<=box.min.y+size.y*.12?chosen[0]:null;
 const uvRecords=records.filter(t=>t.uvs).map(original=>({original,points:original.uvs.map(p=>new THREE.Vector3(p.x,p.y,0))})),charts=uvRecords.length?surfaceConnectivity(uvRecords).components.map(c=>({records:c.records.map(t=>t.original),bounds:new THREE.Box3().setFromPoints(c.records.flatMap(t=>t.original.points))})):[];
 const chartOf=new Map();charts.forEach(c=>c.records.forEach(t=>chartOf.set(t,c)));const shaftVotes=new Map();for(const v of [.25,.35])for(let k=0;k<16;k++){const c=chartOf.get(project(k/16,v).triangle);if(c)shaftVotes.set(c,(shaftVotes.get(c)??0)+1);}
 const shaft=[...shaftVotes].sort((a,b)=>b[1]-a[1])[0],cuff=shaft?.[0].bounds.max.y;
 const garmentCharts=shaft?.[1]>=12&&cuff<box.max.y-size.y*.08?charts.filter(c=>c.bounds.max.y<=cuff+size.y*.015):[];
 const garmentRecords=garmentCharts.flatMap(c=>c.records),bootSurface=garmentRecords.length?new SurfaceIndex(garmentRecords):null;
 const nearestVisible=(point,u,v)=>bootSurface&&point.y<=cuff-size.y*.001?bootSurface.nearest(point):source.nearest(point);
 const levels=[0,.015,.03,.05,.08,.12,.18,.26,.36,.48,.6,.72,.84,.94,1],hits=[],positions=[],uvs=[],indices=[];
 const positionKey=i=>[g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i)].map(v=>Math.round(v*1e5)).join(','),collarScore=loop=>loop.reduce((n,i,k)=>n+(collarEdges?.has([positionKey(i),positionKey(loop[(k+1)%loop.length])].sort().join('|'))?1:0),0)/loop.length;
 const collarLoops=boundaryLoops(g).filter(loop=>loop.every(i=>g.attributes.position.getY(i)>box.min.y+size.y*.8)&&(!collarEdges?.size||collarScore(loop)>.8)),collarLoop=collarLoops.sort((a,b)=>collarScore(b)-collarScore(a)||b.reduce((n,i)=>n+g.attributes.position.getY(i),0)/b.length-a.reduce((n,i)=>n+g.attributes.position.getY(i),0)/a.length)[0];
 const gridLevels=collarLoop?levels.slice(0,-1):levels;
 for(const v of gridLevels)for(let col=0;col<=columns;col++){const uv=new THREE.Vector2(col/columns,v),hit=project(uv.x,uv.y);hits.push(hit);positions.push(hit.point);uvs.push(uv);}
 for(let row=0;row<gridLevels.length-1;row++)for(let col=0;col<columns;col++){
  const a=row*(columns+1)+col,b=a+1,c=b+columns+1,d=a+columns+1;
  for(const tri of [[a,b,c],[a,c,d]])if(new THREE.Triangle(...tri.map(i=>positions[i])).getArea()>1e-10)indices.push(...tri);
 }
 if(collarLoop){
  const center=slice(.94).center,ring=collarLoop.map(i=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i)),angle=p=>(Math.atan2(p.x-center.x,p.z-center.z)/(Math.PI*2)+1)%1;
  let cut=null;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if((a.x-center.x)*(b.x-center.x)<=0&&Math.abs(b.x-a.x)>1e-8){const q=a.clone().lerp(b,(center.x-a.x)/(b.x-a.x));if(q.z>center.z){cut=q;break;}}}
  if(!cut)throw Error('Measured leg collar lacks a valid periodic seam');
  const ordered=[{point:cut,u:0},...ring.map(point=>({point,u:angle(point)})).filter(p=>p.u>1e-7&&p.u<1-1e-7).sort((a,b)=>a.u-b.u),{point:cut,u:1}],top=[];
  for(const item of ordered){top.push(hits.length);hits.push(source.nearest(item.point));positions.push(item.point);uvs.push(new THREE.Vector2(item.u,1));}
  const base=(gridLevels.length-1)*(columns+1);let a=0,b=0;
  while(a<columns||b<top.length-1){if(b===top.length-1||a<columns&&(a+1)/columns<=ordered[b+1].u){indices.push(base+a,base+a+1,top[b]);a++;}else{indices.push(base+a,top[b+1],top[b]);b++;}}
 }
 // The sole is a deliberate fan, rather than a torn UV-chart boundary.
 const soleCenter=positions.slice(0,columns).reduce((center,p)=>center.add(p),new THREE.Vector3()).multiplyScalar(1/columns),soleHit=source.nearest(soleCenter),soleId=hits.length;hits.push(soleHit);positions.push(soleCenter);uvs.push(new THREE.Vector2(.5,0));
 for(let col=0;col<columns;col++){indices.push(soleId,col+1,col);}
 const transfer=transferSurfaceAttributes(projectionGeometry,hits,positions,uvs),geometry=transfer.geometry;geometry.setIndex(indices);geometry.computeVertexNormals();
 const sample=materialSampler([material]),rgba=new Uint8Array(textureSize*textureSize*4);
 const bakeBins=new Map(),binSize=16;for(let t=0;t<indices.length;t+=3){const ids=indices.slice(t,t+3),q=ids.map(i=>uvs[i]),minX=Math.max(0,Math.floor(Math.min(...q.map(p=>p.x))*binSize)),maxX=Math.min(binSize-1,Math.floor(Math.max(...q.map(p=>p.x))*binSize)),minY=Math.max(0,Math.floor(Math.min(...q.map(p=>p.y))*binSize)),maxY=Math.min(binSize-1,Math.floor(Math.max(...q.map(p=>p.y))*binSize));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const key=y*binSize+x;if(!bakeBins.has(key))bakeBins.set(key,[]);bakeBins.get(key).push(ids);}}
 for(let row=0;row<textureSize;row++)for(let col=0;col<textureSize;col++){
  const u=(col+.5)/textureSize,v=(row+.5)/textureSize;let point=null;
  for(const ids of bakeBins.get(Math.floor(v*binSize)*binSize+Math.floor(u*binSize))??[]){const [a,b,c]=ids.map(i=>uvs[i]),det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(det)<1e-12)continue;const wa=((b.y-c.y)*(u-c.x)+(c.x-b.x)*(v-c.y))/det,wb=((c.y-a.y)*(u-c.x)+(a.x-c.x)*(v-c.y))/det,wc=1-wa-wb;if(Math.min(wa,wb,wc)<-1e-7)continue;point=positions[ids[0]].clone().multiplyScalar(wa).addScaledVector(positions[ids[1]],wb).addScaledVector(positions[ids[2]],wc);break;}
  if(!point)point=project(u,v).point;const hit=nearestVisible(point,u,v),color=sample(hit),sourceNormals=projectionGeometry.attributes.normal;
  if(bootSurface&&point.y>cuff&&sourceNormals){const n=hit.triangle.ids.reduce((normal,id,k)=>normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(sourceNormals,id),hit.barycentric.getComponent(k)),new THREE.Vector3()).applyNormalMatrix(normalMatrix),shade=sourceDiffuse(n);for(let k=0;k<3;k++)color[k]=Math.round(color[k]*shade);}
  rgba.set(color,(row*textureSize+col)*4);
 }
 const map=surfaceTexture(rgba,textureSize,textureSize);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.needsUpdate=true;
 const output=material.clone();output.name=material.name+'_envelope';output.userData.t3csLegSurface=true;output.color.set(0xffffff);output.map=map;output.normalMap=null;output.alphaMap=null;output.specularMap=null;
 return {geometry,material:output,method:'joint-region outer-shell reconstruction with toe/heel cross-sections and sole cap',generatedVertices:hits.length,sourceCollarVertices:collarLoop?.length??0,projectionTriangles:source.triangles.length,outerLayer:{components:components.length,isolated:!!bootSurface,charts:charts.length,garmentCharts:garmentCharts.length,cuffFraction:(cuff-box.min.y)/size.y,exteriorVotes:chosen?.[1]??0,textureCorrespondence:'Actual low-poly triangles, nearest connected exterior garment where identified'},triangles:indices.length/3,maximumDiscardedWeight:transfer.maximumDiscardedWeight,coverage:'Continuous thigh/knee/shaft/ankle/foot region when upper leg is available',clothingSelection:'Outermost spatial surface; does not infer every garment layer from names'};
}
