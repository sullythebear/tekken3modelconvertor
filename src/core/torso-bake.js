import * as THREE from 'three';
import {SurfaceIndex,triangleRecord,materialSampler} from './surface.js';
import {sourceRecords,surfaceTexture} from './projected-topology.js';

// Give the torso a physical front/back chart. Resampling a whole modern body
// atlas wasted most PS1 texels on unused UV islands, destroying outfit patterns.
// Keep the existing low-poly torso geometry where its silhouette already works.
export function rebakeTorso(sourceGeometry,lowGeometry,material,{side=128}={}){
 const surface=new SurfaceIndex(sourceRecords(sourceGeometry,material,triangleRecord)),sample=materialSampler([material]),box=new THREE.Box3().setFromBufferAttribute(sourceGeometry.attributes.position),size=box.getSize(new THREE.Vector3());
 if(size.x<1e-6||size.y<1e-6)return null;
 const geometry=lowGeometry.index?lowGeometry.toNonIndexed():lowGeometry.clone(),p=geometry.attributes.position,uv=new Float32Array(p.count*2);
 for(let t=0;t<p.count;t+=3){const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,t+k)),front=new THREE.Triangle(...points).getNormal(new THREE.Vector3()).z>=0;for(let k=0;k<3;k++){const q=points[k];uv[(t+k)*2]=(front?0:.5)+.01+.48*(front?(q.x-box.min.x)/size.x:1-(q.x-box.min.x)/size.x);uv[(t+k)*2+1]=.01+.98*(q.y-box.min.y)/size.y;}}
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(Array.from({length:p.count},(_,i)=>i));
 const rgba=new Uint8Array(side*2*side*4),radius=Math.max(size.z,size.x);
 for(let half=0;half<2;half++)for(let row=0;row<side;row++)for(let col=0;col<side;col++){
  const u=Math.max(0,Math.min(1,((col+.5)/side-.02)/.96)),v=Math.max(0,Math.min(1,((row+.5)/side-.01)/.98)),x=box.min.x+(half?1-u:u)*size.x,y=box.min.y+v*size.y,origin=new THREE.Vector3(x,y,half?box.min.z-radius:box.max.z+radius),direction=new THREE.Vector3(0,0,half?1:-1);
  let hit=surface.raycast(origin,direction,radius*4+size.z);if(hit)hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());else hit=surface.nearest(origin);rgba.set(sample(hit),(row*side*2+half*side+col)*4);
 }
 const output=material.clone();output.name=material.name+'_rebaked';output.userData.t3csProjection='physical-front-back';output.map=surfaceTexture(rgba,side*2,side);output.color.set(0xffffff);output.normalMap=null;output.alphaMap=null;output.specularMap=null;output.aoMap=null;
 return {geometry,material:output,method:'physical front/back torso chart baked from outer source surface',textureWidth:side*2,textureHeight:side};
}
