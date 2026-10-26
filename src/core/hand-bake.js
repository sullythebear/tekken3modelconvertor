import * as THREE from 'three';
import {materialSampler,SurfaceIndex} from './surface.js';
import {sourceSkinLighting} from './skin-surface.js';
import {uvRasterLookup,dilateChartTexels} from './uv-raster.js';

// Bake only actual source surfaces. Unused parts of a modern body atlas must
// never become background colors in a new hand chart or its palette training.
export function bakeHandSurface({g,material,paths,palmSources,accessories=[],positions,outUV,digitFaces,size=256}){
 const uv=g.attributes.uv,normalMaterial=material.normalMap?new THREE.MeshBasicMaterial({map:material.normalMap}):null,normalSample=normalMaterial?materialSampler([normalMaterial],{filter:'linear'}):null,sample=materialSampler([material],{filter:'linear'});
 const lightingUV=old=>{let mapped=null,fallback=1;if(normalSample){const n=normalSample({triangle:{material:normalMaterial,uvs:[old,old,old]},barycentric:new THREE.Vector3(1,0,0)});mapped=new THREE.Vector3((n[0]/127.5-1)*(material.normalScale?.x??1),(n[1]/127.5-1)*(material.normalScale?.y??1),n[2]/127.5-1).normalize();fallback=.7+.3*Math.max(0,mapped.dot(new THREE.Vector3(-.3,.5,.8)));}return sourceSkinLighting(material,old.x,old.y,mapped,fallback);};
 const lighting=hit=>lightingUV(hit.triangle.ids.reduce((q,i,k)=>q.addScaledVector(new THREE.Vector2().fromBufferAttribute(uv,i),hit.barycentric.getComponent(k)),new THREE.Vector2()));
 const faces=digitFaces.flat(),fingerLookup=uvRasterLookup(faces.map(tri=>tri.map(i=>outUV[i])),size),palmLookup=uvRasterLookup(palmSources.map(r=>r.uvs.map(q=>new THREE.Vector2(q.x,.55+q.y*.45))),size),seedUV=new Map();
 // A valid constant-color/very small UV chart may cover no pixel centre. Seed
 // its measured source centroid, never arbitrary neighboring atlas content.
 for(const r of palmSources){const q=r.uvs.reduce((q,v)=>q.add(v),new THREE.Vector2()).multiplyScalar(1/3),x=THREE.MathUtils.clamp(Math.floor(q.x*size),0,size-1),y=THREE.MathUtils.clamp(Math.floor((.55+.45*q.y)*size),0,size-1),pixel=y*size+x;if(palmLookup[pixel]<0&&!seedUV.has(pixel))seedUV.set(pixel,q);}
 const overlayReports=[],overlays=paths.map((path,d)=>{
  const radial=path.surface.triangles.flatMap(r=>r.points.map(q=>q.distanceTo(path.frame(path.projectArc(q)).center))).sort((a,b)=>a-b),radius=radial[Math.floor(radial.length/2)],included=[];
  for(const component of accessories.filter(a=>a.digit===d)){const bounds=new THREE.Box3().setFromPoints(component.records.flatMap(r=>r.points)),span=bounds.getSize(new THREE.Vector3()).length();let sum=0,area=0,max=0;for(const r of component.records){const distance=path.surface.nearest(r.center).distance,a=r.triangle.getArea();sum+=a*distance;area+=a;max=Math.max(max,distance);}const mean=sum/(area||1),eligible=span<=path.length*.6&&mean<=radius*.75&&max<=radius*1.5;overlayReports.push({finger:d,sourceTriangles:component.records.length,projected:eligible,spanOverFingerLength:span/path.length,meanOffsetOverSkinRadius:mean/radius,maxOffsetOverSkinRadius:max/radius});if(eligible)included.push(...component.records);}
  return included.length?{surface:new SurfaceIndex(included),radius}:null;
 });
 let accessoryTexels=0;
 const sampleFinger=(path,d,point)=>{const skin=path.surface.nearest(point),overlay=overlays[d];if(!overlay)return skin;const center=path.frame(path.projectArc(skin.point)).center,direction=skin.point.clone().sub(center);if(direction.lengthSq()<1e-12)return skin;direction.normalize();const epsilon=path.length*1e-6,hit=overlay.surface.raycast(skin.point.clone().addScaledVector(direction,overlay.radius*2+epsilon),direction.clone().negate(),overlay.radius*2+epsilon);if(!hit||hit.point.clone().sub(skin.point).dot(direction)<-epsilon)return skin;hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());if(sample(hit)[3]===0)return skin;accessoryTexels++;return hit;};
 const rgba=new Uint8Array(size*size*4),valid=new Uint8Array(size*size),charts=new Uint8Array(size*size);let rasterTexels=0,undersampledSeeds=0;
 for(let row=0;row<size;row++)for(let col=0;col<size;col++){
  const pixel=row*size+col,u=(col+.5)/size,v=(row+.5)/size,d=Math.min(paths.length-1,Math.floor(u*paths.length));charts[pixel]=v>=.5225?0:d+1;let color,light;
  if(charts[pixel]===0&&(palmLookup[pixel]>=0||seedUV.has(pixel))){const old=seedUV.get(pixel)??new THREE.Vector2(u,(v-.55)/.45),hit={triangle:{uvs:[old,old,old],material},barycentric:new THREE.Vector3(1,0,0)};color=sample(hit);light=lightingUV(old);if(seedUV.has(pixel))undersampledSeeds++;else rasterTexels++;}
  else if(v<.55&&fingerLookup[pixel]>=0){const tri=faces[fingerLookup[pixel]],[a,b,c]=tri.map(i=>outUV[i]),det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y),wa=((b.y-c.y)*(u-c.x)+(c.x-b.x)*(v-c.y))/det,wb=((c.y-a.y)*(u-c.x)+(a.x-c.x)*(v-c.y))/det,wc=1-wa-wb,point=positions[tri[0]].clone().multiplyScalar(wa).addScaledVector(positions[tri[1]],wb).addScaledVector(positions[tri[2]],wc),hit=sampleFinger(paths[d],d,point);color=sample(hit);light=lighting(hit);rasterTexels++;}
  else continue;
  for(let k=0;k<3;k++)color[k]*=light;rgba.set(color.map(v=>Math.round(v)),pixel*4);valid[pixel]=1;
 }
 const coverage={...dilateChartTexels(rgba,valid,charts,size),rasterTexels,undersampledSeeds,method:'Covered source UVs and source-surface projection; chart-isolated nearest measured gutter colors'};normalMaterial?.dispose();
 return coverage.unfilledTexels?{reason:'A hand texture chart has no reliable source texels'}:{rgba,coverage,accessoryTextureTransfer:{method:"Near-skin closed source details projected radially onto the underlying finger, without new geometry",components:overlayReports,paintedTexels:accessoryTexels}};
}
