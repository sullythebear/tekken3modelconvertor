import * as THREE from 'three';
import {requireBakeUV} from './bake-uv.js';
// Texture-driven constraints, not facial recognition or a lipstick colour heuristic.
export function faceContrastMask(g,material){
 const map=material?.map,image=map?.image,mask=new Uint8Array(g.attributes.position.count),uv=requireBakeUV(g,material);
 if(!map||!image||!uv||image.width*image.height>16*1024*1024)return {mask,triangles:0,status:'unavailable'};
 let data=image.data;if(!data){if(typeof document==='undefined')return{mask,triangles:0,status:'unavailable'};const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);data=x.getImageData(0,0,c.width,c.height).data;}
 if(data.length!==image.width*image.height*4||data.BYTES_PER_ELEMENT!==1)return{mask,triangles:0,status:'unsupported pixel layout'};
 if(map.matrixAutoUpdate)map.updateMatrix();
 const read=(u,v)=>{const q=new THREE.Vector2(u,v);map.transformUv(q);const x=Math.min(image.width-1,Math.max(0,Math.floor(q.x*image.width))),y=Math.min(image.height-1,Math.max(0,Math.floor(q.y*image.height))),i=(y*image.width+x)*4;return [data[i],data[i+1],data[i+2],data[i+3]];};let triangles=0;
 const idx=g.index?.array??Array.from({length:mask.length},(_,i)=>i);
 for(let t=0;t<idx.length;t+=3){const ids=[idx[t],idx[t+1],idx[t+2]],p=ids.map(i=>[uv.getX(i),uv.getY(i)]),samples=[];for(let a=0;a<=4;a++)for(let b=0;b<=4-a;b++){const w=[a/4,b/4,1-(a+b)/4];samples.push(read(w.reduce((s,k,i)=>s+k*p[i][0],0),w.reduce((s,k,i)=>s+k*p[i][1],0)));}const opaque=samples.filter(s=>s[3]>=240);let contrast=0;for(let c=0;c<3;c++)contrast=Math.max(contrast,Math.max(...opaque.map(s=>s[c]))-Math.min(...opaque.map(s=>s[c])));if(opaque.length>=3&&contrast>=64){ids.forEach(i=>mask[i]=1);triangles++;}}
 return{mask,triangles,status:'measured',criterion:'opaque source RGB contrast >=64/255 on 15 barycentric samples; generic high-contrast constraint'};
}
