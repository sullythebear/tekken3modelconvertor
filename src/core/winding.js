import * as THREE from 'three';
import {geometryEdges} from './mesh-integrity.js';
// Solve orientation parity on actual shared geometric edges. UV/skin attributes
// stay attached to their original vertices. Nonorientable cycles are reported.
export function repairWinding(g){
 if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
 const audit=geometryEdges(g),ids=g.index.array,n=ids.length/3,adj=Array.from({length:n},()=>[]),parity=new Int8Array(n).fill(-1),p=g.attributes.position,area=Array.from({length:n},(_,t)=>new THREE.Triangle(...[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,ids[t*3+k]))).getArea());
 for(const es of audit.edges.values())if(es.length===2){const[a,b]=es,flip=Number(a.forward===b.forward);adj[a.triangle].push([b.triangle,flip]);adj[b.triangle].push([a.triangle,flip]);}
 let flipped=0,nonorientable=0,components=0;
 for(let start=0;start<n;start++)if(parity[start]<0){components++;const queue=[start];parity[start]=0;let conflict=false;
  for(let q=0;q<queue.length;q++){const t=queue[q];for(const[u,xor]of adj[t]){const next=parity[t]^xor;if(parity[u]<0){parity[u]=next;queue.push(u);}else if(parity[u]!==next)conflict=true;}}
  if(conflict){nonorientable++;continue;}
  const costs=[0,0];for(const t of queue)costs[parity[t]]+=area[t];const invert=Number(costs[1]>costs[0]);
  for(const t of queue)if(parity[t]^invert){const a=ids[t*3+1];ids[t*3+1]=ids[t*3+2];ids[t*3+2]=a;flipped++;}
 }
 if(flipped){g.index.needsUpdate=true;g.computeVertexNormals();}
 return {before:audit.inconsistent,after:geometryEdges(g).inconsistent,flippedTriangles:flipped,components,nonorientableComponents:nonorientable,policy:'Shared-edge parity with minimum changed surface area; no vertex/UV/weight relocation'};
}
