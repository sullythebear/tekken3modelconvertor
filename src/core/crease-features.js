import * as THREE from 'three';
// Measure physical dihedral creases across UV duplicates. Flat tessellation
// edges are not features; nonmanifold intersections are not guessed into seams.
export function creaseFeatures(g,{minAngle=55,lowerFraction=.6,maxEdges=24}={}){
 const p=g.attributes.position,index=g.index,box=new THREE.Box3().setFromBufferAttribute(p),size=box.getSize(new THREE.Vector3()),key=id=>[p.getX(id),p.getY(id),p.getZ(id)].map(v=>Math.round(v*1e5)).join(','),edges=new Map(),points=new Map();
 for(let t=0;t<index.count;t+=3){const ids=[0,1,2].map(k=>index.getX(t+k)),vertices=ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i)),normal=new THREE.Triangle(...vertices).getNormal(new THREE.Vector3());for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3],ka=key(a),kb=key(b),edge=ka<kb?ka+'|'+kb:kb+'|'+ka;if(!edges.has(edge))edges.set(edge,[]);edges.get(edge).push({a,b,normal});points.set(ka,vertices[k]);points.set(kb,vertices[(k+1)%3]);}}
 const candidates=[];
 for(const pair of edges.values())if(pair.length===2){const a=new THREE.Vector3().fromBufferAttribute(p,pair[0].a),b=new THREE.Vector3().fromBufferAttribute(p,pair[0].b),length=a.distanceTo(b),cos=pair[0].normal.dot(pair[1].normal);if((a.y+b.y)/2<=box.min.y+size.y*lowerFraction&&cos<Math.cos(minAngle*Math.PI/180)&&length>size.length()*.003)candidates.push({a:pair[0].a,b:pair[0].b,score:length*(1-cos)});}
 candidates.sort((a,b)=>b.score-a.score);const selected=candidates.slice(0,maxEdges),keys=new Set(selected.flatMap(e=>[key(e.a),key(e.b)])),mask=new Uint8Array(p.count);for(let i=0;i<p.count;i++)if(keys.has(key(i)))mask[i]=1;
 return {mask,points:[...keys].map(k=>points.get(k).toArray()),report:{method:'Measured lower-region dihedral creases; source UV seams welded only for analysis',selectedEdges:selected.length,availableEdges:candidates.length,minAngle,lowerFraction,maxEdges}};
}
