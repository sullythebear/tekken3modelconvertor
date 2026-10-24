import * as THREE from 'three';
// Weld geometric positions only for adjacency analysis, never for skin/UV
// attributes. A UV seam must not split one physical eyelid or garment shell.
export function surfaceConnectivity(records,tolerance=1e-5){
 const vertices=[],byPosition=new Map(),edges=new Map(),parent=records.map((_,i)=>i);
 const vertex=p=>{const key=p.toArray().map(x=>Math.round(x/tolerance)).join(',');if(!byPosition.has(key)){byPosition.set(key,vertices.length);vertices.push(p.clone());}return byPosition.get(key);};
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 records.forEach((r,t)=>{const ids=r.points.map(vertex);for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],key=a<b?`${a},${b}`:`${b},${a}`;if(!edges.has(key))edges.set(key,[]);const edge=edges.get(key);if(edge.length)parent[find(t)]=find(edge[0].triangle);edge.push({a,b,triangle:t});}});
 const components=new Map();records.forEach((r,t)=>{const id=find(t);if(!components.has(id))components.set(id,{id,records:[],bounds:new THREE.Box3()});const c=components.get(id);c.records.push(r);r.points.forEach(p=>c.bounds.expandByPoint(p));});
 const boundary=[...edges.values()].filter(e=>e.length===1).map(e=>e[0]),neighbors=new Map();for(const {a,b}of boundary)for(const [i,j]of [[a,b],[b,a]]){if(!neighbors.has(i))neighbors.set(i,[]);neighbors.get(i).push(j);}
 const seen=new Set(),loops=[];for(const start of neighbors.keys()){
  if(seen.has(start)||neighbors.get(start).length!==2)continue;const ids=[];let previous=-1,current=start;
  for(let guard=0;guard<=boundary.length;guard++){if(seen.has(current))break;seen.add(current);ids.push(current);const next=neighbors.get(current);if(next?.length!==2)break;const chosen=next.find(i=>i!==previous);previous=current;current=chosen;if(current===start){if(ids.length>=3)loops.push(ids.map(i=>vertices[i]));break;}}
 }
 return {components:[...components.values()],loops};
}
export function resampleClosedLoop(points,count){
 const lengths=points.map((p,i)=>p.distanceTo(points[(i+1)%points.length])),total=lengths.reduce((a,b)=>a+b,0),out=[];
 if(!total)throw Error('Degenerate boundary loop');
 for(let i=0;i<count;i++){let distance=i*total/count,k=0;while(k<lengths.length-1&&distance>lengths[k])distance-=lengths[k++];out.push(points[k].clone().lerp(points[(k+1)%points.length],lengths[k]?distance/lengths[k]:0));}return out;
}
