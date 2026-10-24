import * as THREE from 'three';
import Delaunator from 'delaunator';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Rebuild topology in the source chart, rather than selecting surviving source
// vertices. Every generated point has an explicit source triangle correspondence.
// Ambiguous overlapping UV surfaces are rejected, never silently welded.
function reconstructChart(g, {target = 800, anchors = []} = {}) {
  const p = g.attributes.position, uv = g.attributes.uv, index = g.index;
  if (!uv || !index || target < 4) return {geometry:null, reason:'Indexed UV surface required'};
  const triangles = [], bins = new Map(), resolution = 64;
  const key = (x,y) => `${x},${y}`;
  for(let t=0;t<index.count;t+=3){
    const ids=[0,1,2].map(k=>index.getX(t+k));
    const points=ids.map(i=>new THREE.Vector2().fromBufferAttribute(uv,i));
    const area=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    if(Math.abs(area)<1e-12)continue;
    const tri={ids,points,area};triangles.push(tri);
    const min=new THREE.Vector2(Infinity,Infinity),max=new THREE.Vector2(-Infinity,-Infinity);
    points.forEach(q=>{min.min(q);max.max(q);});
    if((max.x-min.x)*resolution>256||(max.y-min.y)*resolution>256)return {geometry:null,reason:'Unbounded UV chart'};
    for(let x=Math.floor(min.x*resolution);x<=Math.floor(max.x*resolution);x++)for(let y=Math.floor(min.y*resolution);y<=Math.floor(max.y*resolution);y++){
      const k=key(x,y);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(tri);
    }
  }
  const bbox=new THREE.Box3().setFromBufferAttribute(p), tolerance=bbox.getSize(new THREE.Vector3()).length()*1e-4;
  let ambiguous=false;
  function locate(q){
    let found=null;
    for(const tri of bins.get(key(Math.floor(q.x*resolution),Math.floor(q.y*resolution)))??[]){
      const [a,b,c]=tri.points;
      const v=q.clone().sub(a), ab=b.clone().sub(a),ac=c.clone().sub(a);
      const weights=[0,v.cross(ac)/tri.area,ab.cross(v)/tri.area];weights[0]=1-weights[1]-weights[2];
      if(weights.some(w=>w< -1e-7))continue;
      const point=new THREE.Vector3();tri.ids.forEach((id,k)=>point.addScaledVector(new THREE.Vector3().fromBufferAttribute(p,id),weights[k]));
      if(found && point.distanceTo(found.point)>tolerance){ambiguous=true;return null;}
      found={tri,weights,point};
    }
    return found;
  }
  const seeds=[],hits=[],unique=new Set();
  function add(q){const k=`${Math.round(q.x*1e8)},${Math.round(q.y*1e8)}`;if(unique.has(k))return;const hit=locate(q);if(!hit)return;unique.add(k);seeds.push(q);hits.push(hit);}
  // Keep chart boundary curves. Interior vertices are newly sampled.
  const edges=new Map();
  for(const tri of triangles)for(let k=0;k<3;k++){
    const a=tri.ids[k],b=tri.ids[(k+1)%3],ka=[uv.getX(a),uv.getY(a)].join(','),kb=[uv.getX(b),uv.getY(b)].join(','),ek=[ka,kb].sort().join('|');
    const edge=edges.get(ek);if(edge)edge.count++;else edges.set(ek,{a,b,count:1});
  }
  for(const e of edges.values())if(e.count===1){add(new THREE.Vector2().fromBufferAttribute(uv,e.a));add(new THREE.Vector2().fromBufferAttribute(uv,e.b));}
  const min=new THREE.Vector2(Infinity,Infinity),max=new THREE.Vector2(-Infinity,-Infinity);triangles.forEach(t=>t.points.forEach(q=>{min.min(q);max.max(q);}));
  const span=max.clone().sub(min),step=Math.sqrt(Math.max(span.x*span.y,1e-12)*2/target);
  if(span.x/step>100000||span.y/step>100000)return {geometry:null,reason:'Extreme chart aspect ratio'};
  for(let y=min.y+step/2;y<max.y;y+=step)for(let x=min.x+step/2;x<max.x;x+=step)add(new THREE.Vector2(x,y));
  // Semantic source landmarks create fitted support rings in chart space.
  for(const anchor of anchors){const q=new THREE.Vector2().fromBufferAttribute(uv,anchor.vertex);add(q);for(let k=0;k<8;k++){const angle=k*Math.PI/4;add(q.clone().add(new THREE.Vector2(Math.cos(angle)*step*.55,Math.sin(angle)*step*.35)));}}
  if(ambiguous)return {geometry:null,reason:'Overlapping UV surfaces: explicit chart separation required'};
  if(seeds.length<3)return {geometry:null,reason:'No valid UV samples'};
  const delaunay=Delaunator.from(seeds,q=>q.x,q=>q.y),out=[];
  for(let t=0;t<delaunay.triangles.length;t+=3){
    let ids=Array.from(delaunay.triangles.slice(t,t+3)),valid=true;
    // Test interior and edges, so holes/chart gaps are not filled by a convex hull.
    for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
      const q=new THREE.Vector2();ids.forEach((id,k)=>q.addScaledVector(seeds[id],weights[k]));if(!locate(q)){valid=false;break;}
    }
    if(!valid)continue;
    const points=ids.map(i=>hits[i].point),cross=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    if(cross.lengthSq()<1e-18)continue;
    const hit=hits[ids[0]],sourceNormal=new THREE.Triangle(...hit.tri.ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id))).getNormal(new THREE.Vector3());
    if(cross.dot(sourceNormal)<0)ids=[ids[0],ids[2],ids[1]];
    out.push(...ids);
  }
  if(ambiguous)return {geometry:null,reason:'Overlapping UV surfaces during validation'};
  const sourceArea=triangles.reduce((n,t)=>n+Math.abs(t.area)/2,0);
  let outputArea=0;for(let t=0;t<out.length;t+=3){const [a,b,c]=out.slice(t,t+3).map(i=>seeds[i]);outputArea+=Math.abs(b.clone().sub(a).cross(c.clone().sub(a)))/2;}
  if(!sourceArea||Math.abs(outputArea/sourceArea-1)>.03)return {geometry:null,reason:'Chart coverage differs by more than 3 percent'};
  if(out.length>index.count)return {geometry:null,reason:'Reconstruction increases source triangle count'};
  const geometry=new THREE.BufferGeometry();
  for(const [name,a]of Object.entries(g.attributes)){
    const data=new a.array.constructor(seeds.length*a.itemSize);
    hits.forEach((hit,i)=>{
      // Initialize categorical attributes from one source corner. The skin
      // pass below aggregates by bone ID across all sets, never interpolating IDs.
      const skin=/^(skinIndex|skinWeight|joints_\d+|weights_\d+)$/.test(name),nearest=hit.weights.indexOf(Math.max(...hit.weights));
      for(let k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=skin?a.array[hit.tri.ids[nearest]*a.itemSize+k]:hit.tri.ids.reduce((sum,id,j)=>sum+a.array[id*a.itemSize+k]*hit.weights[j],0);
    });
    geometry.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize,a.normalized));
  }
  const sets=[['skinIndex','skinWeight'],...Object.keys(g.attributes).filter(n=>/^joints_\d+$/.test(n)).sort((a,b)=>Number(a.slice(7))-Number(b.slice(7))).map(n=>[n,n.replace('joints_','weights_')])].filter(([j,w])=>g.attributes[j]&&g.attributes[w]);
  const capacity=sets.reduce((n,[j])=>n+g.attributes[j].itemSize,0);
  let maximumDiscardedWeight=0;
  hits.forEach((hit,i)=>{
    if(!sets.length)return;
    const weights=new Map();
    hit.tri.ids.forEach((id,k)=>{for(const [j,w]of sets)for(let c=0;c<g.attributes[j].itemSize;c++){
      const bone=g.attributes[j].getComponent(id,c),weight=g.attributes[w].getComponent(id,c)*Math.max(0,hit.weights[k]);
      if(weight>0)weights.set(bone,(weights.get(bone)??0)+weight);
    }});
    const sorted=[...weights].sort((a,b)=>b[1]-a[1]),kept=sorted.slice(0,capacity),total=kept.reduce((n,v)=>n+v[1],0);
    maximumDiscardedWeight=Math.max(maximumDiscardedWeight,sorted.slice(capacity).reduce((n,v)=>n+v[1],0));
    let cursor=0;for(const [j,w]of sets)for(let c=0;c<g.attributes[j].itemSize;c++,cursor++){
      geometry.attributes[j].setComponent(i,c,kept[cursor]?.[0]??0);
      geometry.attributes[w].setComponent(i,c,total?(kept[cursor]?.[1]??0)/total:0);
    }
  });
  geometry.setIndex(out);geometry.computeVertexNormals();
  return {geometry,method:'source-chart surface reconstruction',generatedVertices:seeds.length,semanticAnchors:anchors.length,triangles:out.length/3,skinTransfer:'barycentric bone-weight aggregation across all influence sets',maximumDiscardedWeight,note:'UV-fitted topology; not a calibrated Tekken facial template'};
}

// Separate disconnected physical charts before any UV-domain triangulation.
// Coincident seam copies with different normals/weights share a chart, but
// nearby clothing layers and mirrored UV islands never share topology.
export function reconstructUVSurface(g, options={}) {
 const target=options.target??800;
 if(!Number.isInteger(target)||target<4||target>100000)throw Error('Reconstruction target must be an integer in 4..100000');
 const p=g.attributes.position,uv=g.attributes.uv,index=g.index;
 if(!uv||!index)return {geometry:null,reason:'Indexed UV surface required'};
 for(let i=0;i<p.count;i++)if(![p.getX(i),p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i)].every(Number.isFinite))return {geometry:null,reason:'Non-finite source coordinates'};
 const parent=Array.from({length:p.count},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{parent[find(a)]=find(b);},copies=new Map();
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i)].map(v=>Math.round(v*1e6)).join(',');
  if(copies.has(key))join(i,copies.get(key));else copies.set(key,i);
 }
 for(let t=0;t<index.count;t+=3){join(index.getX(t),index.getX(t+1));join(index.getX(t),index.getX(t+2));}
 const components=new Map();for(let t=0;t<index.count;t+=3){const key=find(index.getX(t));if(!components.has(key))components.set(key,[]);components.get(key).push(index.getX(t),index.getX(t+1),index.getX(t+2));}
 if(components.size===1)return reconstructChart(g,options);
 const outputs=[],charts=[];
 for(const indices of components.values()){
  const old=[...new Set(indices)],mapping=new Map(old.map((v,i)=>[v,i])),part=new THREE.BufferGeometry();
  for(const [name,a]of Object.entries(g.attributes)){const data=new a.array.constructor(old.length*a.itemSize);old.forEach((id,i)=>{for(let k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=a.array[id*a.itemSize+k];});part.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize,a.normalized));}
  part.setIndex(indices.map(i=>mapping.get(i)));
  const result=reconstructChart(part,{target:Math.max(4,Math.round((options.target??800)*indices.length/index.count)),anchors:(options.anchors??[]).filter(a=>mapping.has(a.vertex)).map(a=>({...a,vertex:mapping.get(a.vertex)}))});
  if(!result.geometry){outputs.push(part);charts.push({sourceTriangles:indices.length/3,fallback:result.reason});}else{outputs.push(result.geometry);part.dispose();const {geometry,...metadata}=result;charts.push(metadata);}
 }
 const retained=charts.reduce((n,c)=>n+(c.sourceTriangles??0),0);
 if(retained>index.count/6){outputs.forEach(g=>g.dispose());return {geometry:null,reason:'Majority of source charts ambiguous; preserve previous reconstruction',charts};}
 if(!charts.some(c=>c.generatedVertices)){outputs.forEach(g=>g.dispose());return {geometry:null,reason:'All physical charts rejected',charts};}
 const geometry=mergeGeometries(outputs);outputs.forEach(g=>g.dispose());
 return {geometry,method:'separate physical-chart reconstruction',generatedVertices:charts.reduce((n,c)=>n+(c.generatedVertices??0),0),charts,triangles:geometry.index.count/3,semanticAnchors:options.anchors?.length??0};
}
