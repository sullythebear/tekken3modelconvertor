import * as THREE from 'three';

export const REFINEMENT_VERSION=1;
const MAX_POINTS=1_000_000,MAX_COMMANDS=64;
const topologyCache=new WeakMap();
export function refinementMeshes(root){const out=[];root.traverse(m=>{if(m.isMesh&&!m.userData.refinementOverlay)out.push(m);});return out;}
const hash=s=>{let a=2166136261,b=5381;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b,33)^s.charCodeAt(i);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');};
const number=v=>{if(!Number.isFinite(v))throw Error('Niet-eindige geometrie kan niet worden verfijnd.');return Math.fround(v).toString();};
export function vertexKey(g,i){return ['position',...Object.keys(g.attributes).filter(k=>/^uv\d*$/.test(k)).sort(),'skinIndex','skinWeight',...Object.keys(g.attributes).filter(k=>/^(joints|weights)_\d+$/.test(k)).sort()].filter(n=>g.attributes[n]).map(n=>{const a=g.attributes[n];return n+':'+Array.from({length:a.itemSize},(_,k)=>number(a.getComponent(i,k))).join(',');}).join('|');}
export function triangleCount(mesh){return (mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;}
export function triangleIds(g,t){return [0,1,2].map(k=>g.index?g.index.getX(t*3+k):t*3+k);}
export function meshTopology(mesh){
 const g=mesh.geometry,stamp=Object.entries(g.attributes).map(([k,a])=>k+':'+a.version+':'+a.count).join('|')+':'+(g.index?.version??0);const cached=topologyCache.get(g);if(cached?.stamp===stamp&&cached.index===g.index&&cached.attributes.length===Object.values(g.attributes).length&&cached.attributes.every((a,i)=>a===Object.values(g.attributes)[i]))return cached.value;if(!g.attributes.position||triangleCount(mesh)%1)throw Error('Ongeldige driehoekgeometrie.');
 const vertexKeys=Array.from({length:g.attributes.position.count},(_,i)=>vertexKey(g,i)),triangles=Array.from({length:triangleCount(mesh)},(_,t)=>{const ids=triangleIds(g,t);if(ids.some(i=>i<0||i>=vertexKeys.length))throw Error('Ongeldige vertexreferentie.');return hash(ids.map(i=>vertexKeys[i]).join(';'));});
 if(new Set(triangles).size!==triangles.length)throw Error('Dubbele of dubbelzinnige driehoeken: selecteer een andere mesh.');
 const value={vertexKeys,triangles,signature:hash(triangles.join(':'))};topologyCache.set(g,{stamp,value,index:g.index,attributes:Object.values(g.attributes)});return value;
}
export function identifyRefinementMeshes(root){const ids=new Set();return refinementMeshes(root).map((mesh,i)=>{const id=mesh.userData.t3csRefinementId??`mesh-${i}-${hash(mesh.name)}`;if(typeof id!=='string'||!/^[\w-]{1,100}$/.test(id)||ids.has(id))throw Error('Dubbelzinnige bewerkingsidentiteit.');ids.add(id);mesh.userData.t3csRefinementId=id;return {mesh,id};});}
export function primitiveAt(mesh,t){const count=triangleCount(mesh)*3;return (mesh.geometry.groups.length?mesh.geometry.groups:[{start:0,count,materialIndex:0}]).find(g=>t*3>=g.start&&t*3+2<g.start+g.count);}
export function selectionFromTriangles(mesh,triangles){const topology=meshTopology(mesh),list=[...new Set(triangles)].sort((a,b)=>a-b);if(list.some(t=>!Number.isInteger(t)||t<0||t>=topology.triangles.length))throw Error('Selectie verwijst naar ontbrekende driehoeken.');return {meshId:mesh.userData.t3csRefinementId,signature:topology.signature,faces:list.map(t=>topology.triangles[t])};}
export function resolveSelection(root,selection){if(!selection)return null;const found=refinementMeshes(root).filter(m=>m.userData.t3csRefinementId===selection.meshId);if(found.length!==1)throw Error('De geselecteerde mesh is gewijzigd of ontbreekt.');const mesh=found[0],topology=meshTopology(mesh);if(topology.signature!==selection.signature)throw Error('De topologie is gewijzigd; wijs het gebied opnieuw aan.');const lookup=new Map(topology.triangles.map((k,i)=>[k,i])),triangles=selection.faces.map(k=>lookup.get(k));if(triangles.some(t=>t===undefined))throw Error('Selectie-identiteit is niet meer betrouwbaar.');return {mesh,topology,triangles};}
export function selectionPoints(root,selection){const r=resolveSelection(root,selection);if(!r||!r.triangles.length)throw Error('Selecteer eerst een oppervlak.');return [...new Set(r.triangles.flatMap(t=>triangleIds(r.mesh.geometry,t).map(i=>r.topology.vertexKeys[i])))].sort();}
export function triangleAdjacency(mesh){
 const g=mesh.geometry,topology=meshTopology(mesh),edges=new Map(),adj=Array.from({length:topology.triangles.length},()=>[]);
 for(let t=0;t<adj.length;t++){const ids=triangleIds(g,t),material=primitiveAt(mesh,t)?.materialIndex??0;for(let k=0;k<3;k++){const a=topology.vertexKeys[ids[k]],b=topology.vertexKeys[ids[(k+1)%3]],key=material+':'+[a,b].sort().join(';');if(!edges.has(key))edges.set(key,[]);edges.get(key).push({t,a,b});}}
 for(const owners of edges.values())if(owners.length===2&&owners[0].a===owners[1].b&&owners[0].b===owners[1].a){adj[owners[0].t].push(owners[1].t);adj[owners[1].t].push(owners[0].t);}return adj;
}
export function changeSelection(root,selection,action){const r=resolveSelection(root,selection);if(!r)return null;const {mesh,triangles}=r,adj=triangleAdjacency(mesh),set=new Set(triangles);
 if(action==='grow'){for(const t of triangles)adj[t].forEach(n=>set.add(n));}
 else if(action==='shrink'){const original=new Set(set);for(const t of triangles)if(adj[t].length<3||adj[t].some(n=>!original.has(n)))set.delete(t);}
 else if(action==='connected'){const queue=[...triangles];for(let i=0;i<queue.length;i++)for(const n of adj[queue[i]])if(!set.has(n)){set.add(n);queue.push(n);}}
 else if(action==='material'){const materials=new Set(triangles.map(t=>primitiveAt(mesh,t)?.materialIndex??0));for(let t=0;t<triangleCount(mesh);t++)if(materials.has(primitiveAt(mesh,t)?.materialIndex??0))set.add(t);}
 else throw Error('Onbekende selectieactie.');return selectionFromTriangles(mesh,[...set]);}
export function emptyRefinementState(){return {version:REFINEMENT_VERSION,commands:[],cursor:0,selection:null};}
export function validateRefinementState(input){
 if(!input||input.version!==REFINEMENT_VERSION||!Array.isArray(input.commands)||input.commands.length>MAX_COMMANDS||!Number.isInteger(input.cursor)||input.cursor<0||input.cursor>input.commands.length)throw Error('Ongeldige of niet-ondersteunde bewerkingsgeschiedenis.');
 let points=0;for(const c of input.commands){if(c.type!=='protect'||typeof c.enabled!=='boolean'||typeof c.meshId!=='string'||!Number.isFinite(c.level)||c.level<0||c.level>100||!Array.isArray(c.points)||c.points.some(p=>typeof p!=='string'||p.length>2048))throw Error('Ongeldige detailbescherming.');if(c.sourceLink){const l=c.sourceLink;if(!['matched','uncertain','unknown'].includes(l.status)||typeof l.scope!=='string'||l.scope.length>500||l.sourceTriangle!=null&&!Number.isInteger(l.sourceTriangle)||l.barycentric&&(l.barycentric.length!==3||l.barycentric.some(v=>!Number.isFinite(v))))throw Error('Ongeldige broncorrespondentie.');}points+=c.points.length;}if(points>MAX_POINTS)throw Error('Te veel lokale bewerkingspunten.');
 if(input.selection&&(typeof input.selection.meshId!=='string'||typeof input.selection.signature!=='string'||!Array.isArray(input.selection.faces)||input.selection.faces.length>MAX_POINTS||input.selection.faces.some(x=>typeof x!=='string'||!/^[a-f0-9]{16}$/.test(x))))throw Error('Ongeldige opgeslagen selectie.');return structuredClone(input);
}
export function addProtection(state,root,selection,level,sourceLink=null){const next=validateRefinementState(state),r=resolveSelection(root,selection);next.commands=next.commands.slice(0,next.cursor);next.commands.push({type:'protect',enabled:true,meshId:r.mesh.userData.t3csRefinementId,points:selectionPoints(root,selection),level:Number(level),...(sourceLink?{sourceLink}:{} )});next.cursor=next.commands.length;next.selection=selection;return validateRefinementState(next);}
// Validate every reference before changing any mesh; no partial application.
export function applyDetailProtection(root,state,{requireAll=true}={}){
 state=validateRefinementState(state);const meshes=identifyRefinementMeshes(root),plans=meshes.map(({mesh,id})=>{const g=mesh.geometry,points=new Map();for(const c of state.commands.slice(0,state.cursor))if(c.enabled&&c.meshId===id)for(const p of c.points)points.set(p,Math.max(points.get(p)??0,c.level));const keys=Array.from({length:g.attributes.position.count},(_,i)=>vertexKey(g,i)),available=new Set(keys);if(requireAll&&[...points.keys()].some(p=>!available.has(p)))throw Error('Beschermingspunten ontbreken in de artistieke basis.');return {mesh,values:keys.map(k=>points.get(k)??0)};});
 if(state.commands.slice(0,state.cursor).some(c=>c.enabled&&!meshes.some(m=>m.id===c.meshId)))throw Error('Bewerkte mesh ontbreekt.');
 for(const {mesh,values}of plans)if(values.some(v=>v>0))mesh.userData.t3csDetailProtection=values;else delete mesh.userData.t3csDetailProtection;
 return plans.reduce((n,p)=>n+p.values.filter(v=>v>0).length,0);
}
export function refinementVertexMask(mesh){const values=mesh.userData.t3csDetailProtection;if(!values)return null;if(!Array.isArray(values)||values.length!==mesh.geometry.attributes.position.count||values.some(v=>!Number.isFinite(v)||v<0||v>100))throw Error('Detailbescherming past niet op deze geometrie.');const mask=new Uint8Array(values.length);for(let i=0;i<mask.length;i++)if(values[i]>0&&(values[i]>=100||((Math.imul(i+1,2654435761)>>>0)%100)<values[i]))mask[i]=1;return mask;}
