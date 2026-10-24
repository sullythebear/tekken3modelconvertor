import * as THREE from 'three';
import {SurfaceIndex,triangleRecord,materialSampler} from './surface.js';
import {sourceRecords,transferSurfaceAttributes,surfaceTexture,subsetSurface} from './projected-topology.js';

// Reconstruct a cut-out radial envelope from opaque source hair samples. The
// front hemisphere must contain real hair: back hair cannot close over a face.
export function reconstructHairVolume(g,material,{preservation=90,textureSize=128,headCenter=null,method='auto',eyeHeight=null}={}){
 const records=sourceRecords(g,material,triangleRecord);if(!records.length)return {geometry:null,reason:'No source hair surface'};
 const surface=new SurfaceIndex(records),sample=materialSampler([material]),box=new THREE.Box3().setFromBufferAttribute(g.attributes.position),size=box.getSize(new THREE.Vector3());
 // Current importer presents upright bind geometry. Reject sideways meshes
 // rather than silently treating a shoulder-to-shoulder axis as hair length.
 if(size.y<Math.min(size.x,size.z)*.3)return {geometry:null,reason:'Hair frame requires upright source geometry'};
 const center=headCenter?.clone()??box.getCenter(new THREE.Vector3()),radius=Math.hypot(size.x,size.z),height=size.y;
 const columns=20+Math.round(preservation/8),rows=14+Math.round(preservation/15);
 let alphaRejected=0,oppositeRejected=0;
 function project(angle,v){
  const direction=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),origin=new THREE.Vector3(center.x,box.min.y+(.0001+.9998*v)*height,center.z).addScaledVector(direction,radius*2);
  let travelled=0;
  for(let attempt=0;attempt<32;attempt++){
   const hit=surface.raycast(origin,direction.clone().negate(),radius*4-travelled);if(!hit)return null;
   hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());
   const radial=hit.point.clone().sub(new THREE.Vector3(center.x,hit.point.y,center.z)).dot(direction);
   if(radial<0){oppositeRejected++;return null;}
   if(sample(hit)[3]>0)return hit;
   alphaRejected++;const advance=hit.distance+Math.max(radius*1e-5,1e-6);origin.addScaledVector(direction,-advance);travelled+=advance;
  }
  return null;
 }
 const hits=[],positions=[],uvs=[],grid=[];
 for(let row=0;row<=rows;row++){
  const line=[];
  for(let col=0;col<=columns;col++){
   const v=row/rows,angle=-Math.PI+2*Math.PI*col/columns,hit=project(angle,v);
   if(!hit){line.push(-1);continue;}
   line.push(hits.length);hits.push(hit);positions.push(hit.point);uvs.push(new THREE.Vector2(col/columns,v));
  }
  grid.push(line);
 }
 // Fill short sampling gaps on the same ring. Long runs (including the
 // face opening) remain empty; this is an envelope, not alpha-tested cards.
 for(let row=0;row<=rows;row++)for(let col=1;col<columns;col++)if(grid[row][col]<0){
  let end=col;while(end<=columns&&grid[row][end]<0)end++;
  if(end-col>2||end>columns||grid[row][col-1]<0){col=end;continue;}
  const a=positions[grid[row][col-1]],b=positions[grid[row][end]];
  for(let k=col;k<end;k++){const point=a.clone().lerp(b,(k-col+1)/(end-col+1)),hit=surface.nearest(point);hit.point=point;grid[row][k]=hits.length;hits.push(hit);positions.push(point);uvs.push(new THREE.Vector2(k/columns,row/rows));}
  col=end;
 }
 const indices=[];
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const ids=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]];
  const occupied=ids.filter(i=>i>=0);if(occupied.length<3)continue;
  // Require occupied mid-cells, keeping the opening around the face intact.
  // Four occupied corners bound a volume cell; source alpha gaps inside
  // that cell belong in optional fringe cards, not holes in a solid envelope.
  const maxEdge=Math.max(...occupied.map((id,k)=>positions[id].distanceTo(positions[occupied[(k+1)%occupied.length]])));
  if(maxEdge>Math.max(radius*.42,height/rows*3))continue;
  for(let tri of occupied.length===3?[occupied]:[[ids[0],ids[1],ids[2]],[ids[0],ids[2],ids[3]]]){
   const p=tri.map(i=>positions[i]),normal=new THREE.Triangle(...p).getNormal(new THREE.Vector3()),outward=new THREE.Vector3(p[0].x-center.x,0,p[0].z-center.z);if(normal.dot(outward)<0)tri=[tri[0],tri[2],tri[1]];indices.push(...tri);
  }
 }
 if(indices.length<18)return {geometry:null,reason:'Insufficient connected opaque envelope; retain cards'};
 const transferred=transferSurfaceAttributes(g,hits,positions,uvs),geometry=transferred.geometry;geometry.setIndex(indices);geometry.computeVertexNormals();
 const rgba=new Uint8Array(textureSize*textureSize*4);
 for(let row=0;row<textureSize;row++)for(let col=0;col<textureSize;col++){
  const hit=project(-Math.PI+2*Math.PI*(col+.5)/textureSize,(row+.5)/textureSize),pixel=hit?sample(hit):[0,0,0,0];rgba.set(pixel,(row*textureSize+col)*4);
 }
 // Volume textures are opaque. Dilate measured colours into unused texels
 // instead of cutting large holes into a newly reconstructed solid surface.
 const queue=[],seen=new Uint8Array(textureSize*textureSize);
 for(let i=0;i<seen.length;i++)if(rgba[i*4+3]){seen[i]=1;queue.push(i);}
 for(let cursor=0;cursor<queue.length;cursor++){const id=queue[cursor],x=id%textureSize,y=Math.floor(id/textureSize);for(const next of [y*textureSize+(x+1)%textureSize,y*textureSize+(x+textureSize-1)%textureSize,id-textureSize,id+textureSize])if(next>=0&&next<seen.length&&!seen[next]){seen[next]=1;rgba.set(rgba.subarray(id*4,id*4+4),next*4);queue.push(next);}}
 const texture=surfaceTexture(rgba,textureSize,textureSize);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;
 const output=material.clone();output.name=material.name+'_volume';output.map=texture;output.color.set(0xffffff);output.normalMap=null;output.alphaMap=null;output.alphaTest=0;output.transparent=false;output.side=THREE.DoubleSide;
 const supplements=[];
 if(method==='hybrid'||method==='auto'&&(material.alphaMap||material.alphaTest>0)){
  const fringe=[];for(const t of records){const d=t.center.clone().sub(center);if(t.center.y>=(eyeHeight??box.max.y-height*.28)&&d.z>0&&Math.abs(Math.atan2(d.x,d.z))<1.15)fringe.push(...t.ids);}
  if(fringe.length){const cards=subsetSurface(g,fringe),p=cards.attributes.position;for(let i=0;i<p.count;i++){const direction=new THREE.Vector3(p.getX(i)-center.x,0,p.getZ(i)-center.z).normalize();p.setXYZ(i,p.getX(i)+direction.x*height*.002,p.getY(i),p.getZ(i)+direction.z*height*.002);}const m=material.clone();m.name+='_fringe';supplements.push({geometry:cards,material:m,role:'hair-fringe'});}
 }
 return {geometry,material:output,supplements,method:supplements.length?'hybrid opaque volume with original alpha-cutout fringe':'opacity-aware radial hair volume',generatedVertices:hits.length,triangles:indices.length/3,alphaRejected,oppositeRejected,maximumDiscardedWeight:transferred.maximumDiscardedWeight,limitations:'A radial envelope cannot preserve every separate ponytail or braid; review silhouette and root intersections'};
}

// Keep disconnected alpha sheets and their UVs. Permissive collapses can join
// unrelated sheets; bounded non-permissive reduction deliberately may exceed
// the suggested count when the original hairstyle cannot be represented there.
export function reconstructHairCards(g,material,simplifier,{preservation=90}={}){
 const input=new Uint32Array(g.index.array),target=Math.max(200,Math.round(input.length/3*(.03+preservation*.0015))),uv=g.attributes.uv;
 if(!uv)return {geometry:null,reason:'Hair cards require source UVs'};
 const [index,error]=simplifier.simplifyWithAttributes(input,g.attributes.position.array,3,uv.array,2,[4,4],null,target*3,.007,['RegularizeLight']);
 const geometry=subsetSurface(g,index);geometry.computeVertexNormals();return {geometry,material:material.clone(),generatedVertices:geometry.attributes.position.count,triangles:index.length/3,method:'UV-preserving disconnected alpha cards with bounded surface error',sourceTriangles:input.length/3,target,error,alphaPreserved:true};
}
