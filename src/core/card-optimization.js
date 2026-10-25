import * as THREE from 'three';import {surfaceConnectivity} from './surface-connectivity.js';import {sourceRecords} from './projected-topology.js';import {triangleRecord} from './surface.js';
// UV-seam relaxation is confined to one edge-connected sheet at a time. No
// collapse can connect independent cards, and all existing outline locks apply.
export function simplifyCardComponents(g,input,simplifier,{target,errorLimit,mask}){
 const view=new THREE.BufferGeometry();view.setAttribute('position',g.attributes.position);if(g.attributes.uv)view.setAttribute('uv',g.attributes.uv);view.setIndex(new THREE.BufferAttribute(input,1));
 const safeMask=new Uint8Array(mask),atPosition=new Map(),signatureByVertex=new Map(),p=g.attributes.position,sets=[['skinIndex','skinWeight'],...Object.keys(g.attributes).filter(n=>/^joints_\d+$/.test(n)).map(n=>[n,n.replace('joints_','weights_')])].filter(([j,w])=>g.attributes[j]&&g.attributes[w]);
 for(const id of new Set(input)){
  const weights=new Map();for(const [j,w]of sets)for(let k=0;k<g.attributes[j].itemSize;k++){const bone=g.attributes[j].getComponent(id,k),weight=g.attributes[w].getComponent(id,k);if(weight>0)weights.set(bone,(weights.get(bone)??0)+weight);}
  const signature=[...weights].sort((a,b)=>a[0]-b[0]).map(([j,w])=>`${j}:${Math.round(w*10000)}`).join(','),key=[p.getX(id),p.getY(id),p.getZ(id)].map(n=>Math.round(n*1e5)).join(',');
  signatureByVertex.set(id,signature);if(!atPosition.has(key))atPosition.set(key,[]);const previous=atPosition.get(key);if(previous.some(v=>v.signature!==signature)){safeMask[id]=1;for(const v of previous)safeMask[v.id]=1;}previous.push({id,signature});
 }
 const components=surfaceConnectivity(sourceRecords(view,null,triangleRecord)).components,scale=simplifier.getScale(g.attributes.position.array,3),uv=g.attributes.uv,attrs=new Float32Array(g.attributes.position.count*2);
 for(let i=0;i<g.attributes.position.count;i++)attrs.set([uv?.getX(i)??0,uv?.getY(i)??0],i*2);
 const minimums=components.map(c=>Math.min(2,c.records.length)),floor=minimums.reduce((n,v)=>n+v,0),available=Math.max(0,target-floor),work=components.reduce((n,c,i)=>n+c.records.length-minimums[i],0),out=[],losses=[];
 let maxError=0;
 for(let i=0;i<components.length;i++){
  const c=components[i],indices=new Uint32Array(c.records.flatMap(t=>t.ids)),quota=Math.min(c.records.length,minimums[i]+Math.floor(available*(c.records.length-minimums[i])/(work||1)));
  const rigid=new Set([...new Set(indices)].map(id=>signatureByVertex.get(id))).size<=1,flags=[...(rigid?['Permissive']:[]),'RegularizeLight','Sparse','ErrorAbsolute'];
  const [next,error]=indices.length>quota*3?simplifier.simplifyWithAttributes(indices,g.attributes.position.array,3,attrs,2,[2,2],safeMask,quota*3,errorLimit*scale,flags):[indices,0];
  out.push(...next);maxError=Math.max(maxError,error/(scale||1));losses.push({before:indices.length/3,after:next.length/3,target:quota,errorAbsolute:error,relaxedUV:rigid,fallback:rigid?null:'Mixed skin influences retain conservative UV topology'});
 }
 return {indices:new Uint32Array(out),error:maxError,report:{method:'Independent connected-sheet simplification; UV error bounded; component bridging impossible',components:components.length,componentFloor:floor,deformationSeamLocks:[...new Set(input)].filter(v=>safeMask[v]&&!mask[v]).length,losses}};
}
