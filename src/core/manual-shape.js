import * as T from 'three';
import {anchorSelection,positionSkinKey} from './repair-identity.js';
import {resolveSelection,triangleIds,triangleCount,primitiveAt} from './refinement.js';
import {boundaryField,bindPointFromRoot,geometryAudit} from './shape-repair.js';
import {rejectNewCrossings} from './repair-quality.js';

// Shortest paths on actual surface edges, never across spatially close layers.
export function surfaceDistances(nodes,seeds){
 const heap=[];const push=(k,d)=>{let i=heap.length;heap.push([k,d]);while(i){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[k,d];};
 const distances=new Map();for(const k of seeds){distances.set(k,0);push(k,0);}
 while(heap.length){const [k,d]=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][1]<heap[j][1])j++;if(last[1]<=heap[j][1])break;heap[i]=heap[j];i=j;}heap[i]=last;}if(d!==distances.get(k))continue;for(const [n,cost]of nodes.get(k)?.edges??[]){const next=d+cost;if(next<(distances.get(n)??Infinity)){distances.set(n,next);push(n,next);}}}
 return distances;
}
export function manualField(root,mesh,triangles,falloff='normal'){
 root.updateWorldMatrix(true,true);root.updateMatrixWorld(true);mesh.skeleton?.update();
 const field=boundaryField(mesh,triangles),g=mesh.geometry,selected=new Set(triangles),points=new Map(),nodes=new Map(),seeds=new Set();
 for(const [k,n]of field.groups){const p=mesh.getVertexPosition(n.ids[0],new T.Vector3()).applyMatrix4(mesh.matrixWorld).applyMatrix4(root.matrixWorld.clone().invert());points.set(k,p);nodes.set(k,{edges:new Map()});if(n.inside&&(n.outside||n.distance===0))seeds.add(k);}
 // Pin material/UV seams and nonmanifold/open edges. Do not weld only by position.
 const wholeNeighbors=new Map([...field.groups.keys()].map(k=>[k,new Set()])),materials=new Set(triangles.map(t=>primitiveAt(mesh,t)?.materialIndex??0));
 const edges=new Map();for(let t=0;t<triangleCount(mesh);t++){const ids=triangleIds(g,t),keys=ids.map(i=>field.keyById[i]);for(let j=0;j<3;j++){const a=keys[j],b=keys[(j+1)%3],key=[a,b].sort().join(';');if(!edges.has(key))edges.set(key,[]);edges.get(key).push({t,a,b,material:primitiveAt(mesh,t)?.materialIndex??0,ids:[ids[j],ids[(j+1)%3]]});if(materials.has(primitiveAt(mesh,t)?.materialIndex??0)){wholeNeighbors.get(a).add(b);wholeNeighbors.get(b).add(a);}if(selected.has(t)){const cost=points.get(a).distanceTo(points.get(b));nodes.get(a).edges.set(b,cost);nodes.get(b).edges.set(a,cost);}}}
 const uvKey=i=>Object.keys(g.attributes).filter(n=>/^uv\d*$/.test(n)).sort().map(n=>{const a=g.attributes[n];return Array.from({length:a.itemSize},(_,k)=>a.getComponent(i,k)).join(',');}).join('|');
 for(const owners of edges.values())if(owners.some(o=>selected.has(o.t))){let seam=owners.length!==2||owners[0].material!==owners[1]?.material;if(!seam){const [a,b]=owners;seam=a.ids.some(i=>!b.ids.some(j=>field.keyById[i]===field.keyById[j]&&uvKey(i)===uvKey(j)));}if(seam)for(const o of owners){seeds.add(o.a);seeds.add(o.b);}}
 const distances=surfaceDistances(nodes,seeds),finite=[...distances.values()].filter(Number.isFinite),max=Math.max(0,...finite),weights=new Map();
 for(const [k,n]of field.groups){const d=distances.get(k)??Infinity;let w=0;if(n.inside&&!n.outside&&!seeds.has(k)){if(!Number.isFinite(d))w=1;else if(falloff==='sharp')w=1;else {const x=Math.min(1,d/Math.max(1e-12,max*(falloff==='soft'?1:.4)));w=x*x*(3-2*x);}}weights.set(k,w);}
 return {...field,points,weights,wholeNeighbors};
}
export async function proposeManualShape(baseRoot,resultRoot,selection,{tool='thickness',amount=0,axis='auto',falloff='normal',checkpoint=async()=>{},validate=true}={}){
 if(!['thickness','scale','move'].includes(tool)||!Number.isFinite(amount)||Math.abs(amount)>30||amount===0||!['auto','x','y','z'].includes(axis)||!['sharp','normal','soft'].includes(falloff))throw Error('Ongeldige vorminstelling. Gebruik een sterkte tussen −30 en 30.');
 const anchor=anchorSelection(baseRoot,resultRoot,selection),{mesh,triangles}=resolveSelection(resultRoot,selection);if(triangles.length>12000)throw Error('Selecteer maximaal 12.000 driehoeken.');if(mesh.isInstancedMesh||mesh.isBatchedMesh)throw Error('Deze mesh ondersteunt nog geen veilige lokale vormbewerking.');
 const g=mesh.geometry,field=manualField(resultRoot,mesh,triangles,falloff),keys=[...field.groups].filter(([,n])=>n.inside).map(([k])=>k),center=new T.Vector3();for(const k of keys)center.add(field.points.get(k));center.divideScalar(keys.length);const box=new T.Box3().setFromPoints(keys.map(k=>field.points.get(k))),size=box.getSize(new T.Vector3()),scale=size.length();if(scale<1e-10)throw Error('Selectie is te klein.');
 let direction=new T.Vector3();if(axis!=='auto')direction[axis]=1;else if(tool==='move')throw Error('Kies X, Y of Z voor verplaatsen.');else {direction.set(1,.71,.43).normalize();for(let i=0;i<24;i++){const next=new T.Vector3();for(const k of keys){const d=field.points.get(k).clone().sub(center);next.addScaledVector(d,d.dot(direction));}if(next.lengthSq()<1e-20)break;direction.copy(next.normalize());}}
 // Estimate the radial centre from the connected cross-section, not the
 // visible painted patch alone. Never include a nearby disconnected garment.
 if(tool==='thickness'){const connected=new Set(keys),queue=[...keys];for(let i=0;i<queue.length;i++)for(const k of field.wholeNeighbors.get(queue[i]))if(!connected.has(k)){connected.add(k);queue.push(k);}const axial=keys.map(k=>field.points.get(k).dot(direction)),lo=Math.min(...axial),hi=Math.max(...axial),epsilon=Math.max(scale*.001,(hi-lo)*.05),section=new T.Vector3();let count=0;for(const k of connected){const p=field.points.get(k),a=p.dot(direction);if(a>=lo-epsilon&&a<=hi+epsilon){section.add(p);count++;}}if(count){section.divideScalar(count);center.copy(section.addScaledVector(direction,center.dot(direction)-section.dot(direction)));}}
 const changes=[],after=g.clone();try{for(const k of keys){const w=field.weights.get(k);if(!w)continue;const node=field.groups.get(k),p=field.points.get(k),next=p.clone(),d=p.clone().sub(center);if(tool==='move')next.addScaledVector(direction,amount/100*scale*w);else if(tool==='scale')next.addScaledVector(d,amount/100*w);else next.addScaledVector(d.clone().addScaledVector(direction,-d.dot(direction)),amount/100*w);
  for(const id of node.ids){const old=new T.Vector3().fromBufferAttribute(g.attributes.position,id),target=bindPointFromRoot(resultRoot,mesh,id,next);if(old.distanceTo(target)<scale*1e-9)continue;const position=target.toArray().map(Math.fround);after.attributes.position.setXYZ(id,...position);changes.push({origin:g.attributes.t3csOrigin.getX(id),before:old.toArray(),after:position});}}
 if(!changes.length)throw Error('Geen veilige binnenvertices. Vergroot de selectie of kies een andere richting.');const audit=geometryAudit(g,after,triangles);if(audit.flipped||audit.degenerate||audit.maxEdgeRatio>2.5||audit.minAreaRatio<.15)throw Error('Deze sterkte maakt onveilige driehoeken. Kies een kleinere sterkte of zachtere overgang.');
 const points=(root,m,t)=>triangleIds(m.geometry,t).map(i=>m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld).applyMatrix4(root.matrixWorld.clone().invert()));if(validate)await rejectNewCrossings(resultRoot,mesh,after,triangles,{points},checkpoint);
 const unique=new Map(changes.map(c=>[c.origin,c]));return {type:'shape',enabled:true,meshId:anchor.meshId,anchor,sources:[],changes:[...unique.values()],manual:{tool,amount,axis,falloff,space:'root-posed-inverse-skin-v1',center:center.toArray(),direction:direction.toArray()},correspondence:{status:'manual',label:'Handmatige vormkeuze; geen SOURCE-herstelclaim'},metrics:{changedVertices:unique.size,triangleDelta:0,outsidePositionChanges:0,newBoundaryEdges:0,newSegmentCrossings:0,...audit},scope:'Intentional local edit; pinned surface boundary, geodesic falloff and actual inverse skin; no source-shape improvement claim'};
 }finally{after.dispose();}
}
