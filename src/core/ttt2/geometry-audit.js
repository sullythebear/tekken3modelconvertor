// Numeric, local-only measurements. Exact positions classify seams, never weld them.
export function auditGeometry(g){
 const p=g.attributes.position,ix=g.index,n=p.count,parent=Array.from({length:n},(_,i)=>i),used=new Set(),edges=new Map(),positionEdges=new Map();
 function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
 function join(a,b){a=find(a);b=find(b);if(a!==b)parent[b]=a;}
 const keys=Array.from({length:n},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)].join(','));
 function edge(map,a,b){const key=a<b?`${a}|${b}`:`${b}|${a}`,r=map.get(key)||{count:0,balance:0};r.count++;r.balance+=a<b?1:-1;map.set(key,r);}
 for(let i=0;i<(ix?.count??n);i+=3){const ids=[0,1,2].map(k=>ix?ix.getX(i+k):i+k);for(const id of ids)used.add(id);for(let k=0;k<3;k++){const a=ids[k],b=ids[(k+1)%3];join(a,b);edge(edges,a,b);edge(positionEdges,keys[a],keys[b]);}}
 const groups=new Map();for(const id of used){const key=find(id),r=groups.get(key)||{vertices:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};r.vertices++;for(let k=0;k<3;k++){const x=p.getComponent(id,k);r.min[k]=Math.min(r.min[k],x);r.max[k]=Math.max(r.max[k],x);}groups.set(key,r);}
 const summarize=map=>{let boundary=0,nonmanifold=0,sameDirection=0;for(const r of map.values()){boundary+=r.count===1;nonmanifold+=r.count>2;sameDirection+=r.count===2&&Math.abs(r.balance)===2;}return{boundary,nonmanifold,sameDirection};};
 const components=[...groups.values()].sort((a,b)=>b.vertices-a.vertices);
 return{usedVertices:used.size,unusedVertices:n-used.size,indexTopology:summarize(edges),exactPositionTopology:summarize(positionEdges),indexComponents:components.length,largestComponents:components.slice(0,8),componentBoundsTruncated:components.length>8,caution:'Per primitive, raw unskinned metres. Exact-position contacts are not welded. Boundaries may be intentional; other primitives may complete them.'};
}
