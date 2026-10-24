import * as THREE from 'three';
import {SurfaceIndex,triangleRecord,materialSampler} from './surface.js';
import {surfaceConnectivity} from './surface-connectivity.js';
import {sourceRecords,transferSurfaceAttributes,surfaceTexture} from './projected-topology.js';

// Horizontal source cross-sections preserve the toe/heel offsets. Outermost
// ray intersections select the visible clothing shell over underlying skin.
export function reconstructBootEnvelope(g,material,{columns=12,textureSize=128,projectionGeometry=g}={}){
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
 const nearestVisible=(point,u,v)=>bootSurface&&point.y<=cuff-size.y*.001?bootSurface.nearest(point):project(u,v);
 const levels=[0,.015,.03,.05,.08,.12,.18,.26,.36,.48,.6,.72,.84,.94,1],hits=[],positions=[],uvs=[],indices=[];
 for(const v of levels)for(let col=0;col<=columns;col++){const uv=new THREE.Vector2(col/columns,v),hit=project(uv.x,uv.y);hits.push(hit);positions.push(hit.point);uvs.push(uv);}
 for(let row=0;row<levels.length-1;row++)for(let col=0;col<columns;col++){
  const a=row*(columns+1)+col,b=a+1,c=b+columns+1,d=a+columns+1;
  for(let tri of [[a,b,c],[a,c,d]]){const points=tri.map(i=>positions[i]),normal=new THREE.Triangle(...points).getNormal(new THREE.Vector3()),outward=points[0].clone().sub(slice(levels[row]).center);if(normal.dot(outward)<0)tri=[tri[0],tri[2],tri[1]];if(new THREE.Triangle(...points).getArea()>1e-10)indices.push(...tri);}
 }
 // The sole is a deliberate fan, rather than a torn UV-chart boundary.
 const soleCenter=slice(0).center,soleHit=source.nearest(soleCenter),soleId=hits.length;hits.push(soleHit);positions.push(soleHit.point);uvs.push(new THREE.Vector2(.5,0));
 for(let col=0;col<columns;col++){let tri=[soleId,col,col+1];if(new THREE.Triangle(...tri.map(i=>positions[i])).getNormal(new THREE.Vector3()).y>0)tri=[soleId,col+1,col];indices.push(...tri);}
 const transfer=transferSurfaceAttributes(projectionGeometry,hits,positions,uvs),geometry=transfer.geometry;geometry.setIndex(indices);geometry.computeVertexNormals();
 const sample=materialSampler([material]),rgba=new Uint8Array(textureSize*textureSize*4);for(let row=0;row<textureSize;row++)for(let col=0;col<textureSize;col++){
  const u=(col+.5)/textureSize,v=(row+.5)/textureSize,c=Math.min(columns-1,Math.floor(u*columns)),r=Math.min(levels.length-2,Math.max(0,levels.findIndex(y=>y>v)-1)),s=u*columns-c,t=(v-levels[r])/(levels[r+1]-levels[r]),a=r*(columns+1)+c,b=a+1,d=a+columns+1,e=d+1;
  const ids=s>=t?[a,b,e]:[a,e,d],weights=s>=t?[1-s,s-t,t]:[1-t,s,t-s],point=new THREE.Vector3();ids.forEach((id,k)=>point.addScaledVector(positions[id],weights[k]));rgba.set(sample(nearestVisible(point,u,v)),(row*textureSize+col)*4);
 };
 const map=surfaceTexture(rgba,textureSize,textureSize);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.needsUpdate=true;
 const output=material.clone();output.name=material.name+'_envelope';output.color.set(0xffffff);output.map=map;output.normalMap=null;output.alphaMap=null;output.specularMap=null;
 return {geometry,material:output,method:'joint-region outer-shell reconstruction with toe/heel cross-sections and sole cap',generatedVertices:hits.length,projectionTriangles:source.triangles.length,outerLayer:{components:components.length,isolated:!!bootSurface,charts:charts.length,garmentCharts:garmentCharts.length,cuffFraction:(cuff-box.min.y)/size.y,exteriorVotes:chosen?.[1]??0,textureCorrespondence:'Actual low-poly triangles, nearest connected exterior garment where identified'},triangles:indices.length/3,maximumDiscardedWeight:transfer.maximumDiscardedWeight,coverage:'Continuous thigh/knee/shaft/ankle/foot region when upper leg is available',clothingSelection:'Outermost spatial surface; does not infer every garment layer from names'};
}
