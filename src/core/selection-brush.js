import * as T from 'three';
import {triangleAdjacency,triangleIds,triangleCount} from './refinement.js';
// Cache excludes camera visibility: every dab rechecks the live frontmost surface.
const cache=new WeakMap();
export function brushSurface(mesh){const g=mesh.geometry,p=g.attributes.position,stamp=[p.version,g.index?.version,...Object.values(g.attributes).map(a=>a.version)].join(':');let c=cache.get(g);if(c?.stamp===stamp)return c;const adjacency=triangleAdjacency(mesh);c={stamp,adjacency};cache.set(g,c);return c;}
export function brushTriangles(mesh,seed,point,radius,{visible=()=>true,maxFaces=4000}={}){
 if(!Number.isInteger(seed)||seed<0||seed>=triangleCount(mesh)||!Number.isFinite(radius)||radius<=0)throw Error('Ongeldig penseeloppervlak.');
 const {adjacency}=brushSurface(mesh),centers=new Map(),center=t=>{if(!centers.has(t))centers.set(t,new T.Triangle(...triangleIds(mesh.geometry,t).map(i=>mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld))).getMidpoint(new T.Vector3()));return centers.get(t);};
 const distances=new Map([[seed,0]]),queue=[seed],selected=[];let scanned=0;
 for(let j=0;j<queue.length;j++){const t=queue[j],distance=distances.get(t);if(++scanned>maxFaces*8)throw Error('Penseelgebied te groot. Kies een kleiner penseel.');if(distance>radius||!visible(t,center(t)))continue;selected.push(t);if(selected.length>=maxFaces)break;for(const n of adjacency[t]){const next=distance+(t===seed?point.distanceTo(center(n)):center(t).distanceTo(center(n)));if(next<=radius&&next<(distances.get(n)??Infinity)){distances.set(n,next);queue.push(n);}}}
 return [...new Set(selected)];
}
