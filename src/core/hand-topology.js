import * as THREE from 'three';
// Improve hand triangle layout without moving vertices, changing the count or
// closing a finger gap. UV and every skin channel participate in edge identity.
export function regularizeHandTopology(g,input=g.index.array){
 const p=g.attributes.position,uv=g.attributes.uv,ids=new Uint32Array(input),canonical=new Map(),keys=[],attributes=Object.entries(g.attributes).filter(([n])=>n==='uv'||/skin|joints_|weights_/.test(n));
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i),...attributes.flatMap(([,a])=>Array.from({length:a.itemSize},(_,k)=>a.getComponent(i,k)))].map(n=>Math.round(n*1e6)).join(',');if(!canonical.has(key))canonical.set(key,canonical.size);keys[i]=canonical.get(key);}
 const point=i=>new THREE.Vector3().fromBufferAttribute(p,i),area=(a,b,c)=>new THREE.Triangle(point(a),point(b),point(c)).getArea(),quality=(a,b,c)=>4*Math.sqrt(3)*area(a,b,c)/(point(a).distanceToSquared(point(b))+point(b).distanceToSquared(point(c))+point(c).distanceToSquared(point(a))||1),normal=(a,b,c)=>new THREE.Triangle(point(a),point(b),point(c)).getNormal(new THREE.Vector3());
 const scale=new THREE.Box3().setFromBufferAttribute(p).getSize(new THREE.Vector3()).length();let flips=0,attempts=0;
 for(let pass=0;pass<2;pass++){const edges=new Map(),used=new Set();for(let t=0;t<ids.length;t+=3)for(let k=0;k<3;k++){const a=ids[t+k],b=ids[t+(k+1)%3],c=ids[t+(k+2)%3],key=[keys[a],keys[b]].sort((a,b)=>a-b).join('/');if(!edges.has(key))edges.set(key,[]);edges.get(key).push({t,a,b,c});}
  for(const pair of edges.values()){if(pair.length!==2)continue;const[x,y]=pair;if(used.has(x.t)||used.has(y.t)||keys[x.a]!==keys[y.b]||keys[x.b]!==keys[y.a]||keys[x.c]===keys[y.c])continue;attempts++;const a=x.a,b=x.b,c=x.c,d=y.c,old=Math.min(quality(a,b,c),quality(b,a,d)),next=Math.min(quality(c,d,b),quality(d,c,a));if(next<old+.06||next<.3)continue;
   const n=normal(a,b,c),m=normal(b,a,d);if(n.dot(m)<.94||normal(c,d,b).dot(n)<.96||normal(d,c,a).dot(m)<.96)continue;
   const oldLength=point(a).distanceTo(point(b)),newLength=point(c).distanceTo(point(d));if(newLength>oldLength*1.1)continue;
   const midpoint=point(c).lerp(point(d),.5),distance=Math.min(new THREE.Triangle(point(a),point(b),point(c)).closestPointToPoint(midpoint,new THREE.Vector3()).distanceTo(midpoint),new THREE.Triangle(point(b),point(a),point(d)).closestPointToPoint(midpoint,new THREE.Vector3()).distanceTo(midpoint));if(distance>scale*.002)continue;
   if(uv){const signed=(i,j,k)=>(uv.getX(j)-uv.getX(i))*(uv.getY(k)-uv.getY(i))-(uv.getY(j)-uv.getY(i))*(uv.getX(k)-uv.getX(i)),sign=Math.sign(signed(a,b,c));if(!sign||Math.sign(signed(b,a,d))!==sign||Math.sign(signed(c,d,b))!==sign||Math.sign(signed(d,c,a))!==sign)continue;}
   ids.set([c,d,b],x.t);ids.set([d,c,a],y.t);used.add(x.t);used.add(y.t);flips++;
  }
 }
 return{indices:ids,report:{method:'Constrained hand diagonal regularization; no added vertices or triangles',flips,attempts,positionsMoved:0,trianglesAdded:0}};
}
