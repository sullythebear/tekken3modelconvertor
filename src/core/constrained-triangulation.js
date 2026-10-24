// Lawson-style quality flips. Anatomical support-loop edges are constraints;
// only convex pairs with a better worst angle may change their diagonal.
export function improveTriangulation(points,triangles,constraints,{scaleY=1,maxPasses=80}={}){
 const key=(a,b)=>a<b?`${a},${b}`:`${b},${a}`;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const onSegment=(p,a,b)=>Math.abs(cross(a,b,p))<1e-9&&p.x>=Math.min(a.x,b.x)-1e-9&&p.x<=Math.max(a.x,b.x)+1e-9&&p.y>=Math.min(a.y,b.y)-1e-9&&p.y<=Math.max(a.y,b.y)+1e-9;
 const locked=(a,b)=>constraints.some(([c,d])=>onSegment(points[a],points[c],points[d])&&onSegment(points[b],points[c],points[d]));
 const metric=points.map(p=>({x:p.x,y:p.y*scaleY}));
 function score(ids){let worst=Infinity;for(let i=0;i<3;i++){const a=metric[ids[i]],b=metric[ids[(i+1)%3]],c=metric[ids[(i+2)%3]],ab=Math.hypot(b.x-a.x,b.y-a.y),ac=Math.hypot(c.x-a.x,c.y-a.y);if(ab*ac<1e-16)return 0;const cosine=Math.max(-1,Math.min(1,((b.x-a.x)*(c.x-a.x)+(b.y-a.y)*(c.y-a.y))/(ab*ac)));worst=Math.min(worst,Math.acos(cosine));}return worst;}
 let flips=0;
 for(let pass=0;pass<maxPasses;pass++){
  const edges=new Map(),touched=new Set();let changed=0;
  triangles.forEach((t,i)=>{for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],edge=key(a,b);if(!edges.has(edge))edges.set(edge,[]);edges.get(edge).push({i,a,b,opposite:t[(k+2)%3]});}});
  for(const pair of edges.values()){
   if(pair.length!==2)continue;const [one,two]=pair,a=one.a,b=one.b,c=one.opposite,d=two.opposite;
   if(touched.has(one.i)||touched.has(two.i)||c===d||edges.has(key(c,d))||locked(a,b))continue;
   if(cross(points[a],points[b],points[c])*cross(points[a],points[b],points[d])>=-1e-14||cross(points[c],points[d],points[a])*cross(points[c],points[d],points[b])>=-1e-14)continue;
   const before=Math.min(score(triangles[one.i]),score(triangles[two.i])),first=[c,d,a],second=[d,c,b],after=Math.min(score(first),score(second));
   if(after<=before+1e-8)continue;
   triangles[one.i]=first;triangles[two.i]=second;touched.add(one.i);touched.add(two.i);changed++;flips++;
  }
  if(!changed)break;
 }
 return {flips};
}
